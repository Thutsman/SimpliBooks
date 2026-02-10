import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import md5 from 'https://esm.sh/md5@2.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plan pricing for validation (ZAR)
const PLANS: Record<string, number> = {
  starter: 169.0,
  professional: 549.0,
  business: 1299.0,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse incoming form data from PayFast
    const formData = await req.formData()
    const data: Record<string, string> = {}
    const pfParamString: string[] = []

    for (const [key, value] of formData.entries()) {
      if (key !== 'signature') {
        if (typeof value === 'string') {
          data[key] = value.trim()
          const encodedValue = encodeURIComponent(value.trim())
            .replace(/%20/g, '+')
            .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase())
          pfParamString.push(`${key}=${encodedValue}`)
        }
      }
    }

    const receivedSignature = formData.get('signature')
    console.log('Received ITN:', JSON.stringify(data))

    // 2. Validate config
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return new Response('Server Error', { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Validate signature
    let signatureString = pfParamString.join('&')
    if (passphrase) {
      const encodedPassphrase = encodeURIComponent(passphrase.trim())
        .replace(/%20/g, '+')
        .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase())
      signatureString += `&passphrase=${encodedPassphrase}`
    }

    const calculatedSignature = md5(signatureString)
    const isProduction = Deno.env.get('PAYFAST_ENV') === 'production'

    if (calculatedSignature !== receivedSignature) {
      console.error('Signature Mismatch:', {
        calculated: calculatedSignature,
        received: receivedSignature,
        isProduction,
      })
      if (isProduction) {
        return new Response('Invalid Signature', { status: 400 })
      }
      console.warn('Signature validation failed but continuing in sandbox mode')
    } else {
      console.log('Signature Validated')
    }

    // 4. Extract and validate data
    const {
      payment_status,
      m_payment_id,
      pf_payment_id,
      amount_gross,
      custom_str1: userId,
      custom_str2: planId,
    } = data

    if (!userId || !planId || !pf_payment_id || !m_payment_id) {
      console.error('Missing required fields:', { userId, planId, pf_payment_id, m_payment_id })
      return new Response('Missing required fields', { status: 400 })
    }

    // 5. Idempotency check
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('payfast_payment_id', pf_payment_id)
      .single()

    if (existingPayment) {
      console.log(`Payment ${pf_payment_id} already processed with status ${existingPayment.status}`)
      return new Response('OK - Already Processed', { status: 200 })
    }

    // 6. Validate user exists
    const { data: userExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!userExists) {
      console.error(`User ${userId} not found`)
      return new Response('User not found', { status: 400 })
    }

    // 7. Log payment to audit trail
    const amount = parseFloat(amount_gross)

    const { error: logError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount,
        currency: 'ZAR',
        status: payment_status,
        payfast_payment_id: pf_payment_id,
        merchant_payment_id: m_payment_id,
        meta: data,
      })
      .select()
      .single()

    if (logError) {
      if (logError.code === '23505') {
        console.log(`Payment ${pf_payment_id} was inserted by concurrent request`)
        return new Response('OK - Already Processed', { status: 200 })
      }
      console.error('Failed to log payment:', logError)
      return new Response('Database Error', { status: 500 })
    }

    // 8. Process successful payment
    if (payment_status === 'COMPLETE') {
      // Validate amount
      if (PLANS[planId] && Math.abs(amount - PLANS[planId]) >= 1.0) {
        console.error(`Amount mismatch for plan ${planId}: expected ${PLANS[planId]}, got ${amount}`)
      }

      const now = new Date()
      const renewsAt = new Date(now)
      renewsAt.setMonth(renewsAt.getMonth() + 1)

      // Check for pending_plan (downgrade scheduled for renewal)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('pending_plan')
        .eq('user_id', userId)
        .single()

      const effectivePlan = existingSub?.pending_plan || planId

      // Upsert subscription (one per user)
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            plan: effectivePlan,
            status: 'active',
            started_at: now.toISOString(),
            renews_at: renewsAt.toISOString(),
            payfast_token: data.token || null,
            payfast_m_payment_id: m_payment_id,
            pending_plan: null, // Clear pending plan after applying
            updated_at: now.toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (subError) {
        console.error('Error updating subscription:', subError)
        return new Response('Database Error', { status: 500 })
      }

      // Update profile with subscription info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_tier: effectivePlan,
          subscription_start: now.toISOString(),
          subscription_end: renewsAt.toISOString(),
        })
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        return new Response('Database Error', { status: 500 })
      }

      console.log(`Activated ${effectivePlan} plan for user ${userId}`)
    } else if (payment_status === 'FAILED' || payment_status === 'CANCELLED') {
      console.log(`Payment ${payment_status}: ${pf_payment_id}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error processing ITN:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

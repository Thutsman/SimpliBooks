import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { company_id, email, role } = await req.json() as { company_id: string; email: string; role?: string }
    if (!company_id || !email) {
      return new Response(
        JSON.stringify({ error: 'company_id and email are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: member, error: memberError } = await adminClient
      .from('company_members')
      .select('id')
      .eq('company_id', company_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .maybeSingle()

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'You must be an Owner or Admin of this company to invite users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const inviteRole = role && ['admin', 'accountant', 'viewer'].includes(role) ? role : 'accountant'
    const normalizedEmail = email.toLowerCase().trim()

    const { data: existingInvite } = await adminClient
      .from('company_invitations')
      .select('id')
      .eq('company_id', company_id)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'An invitation is already pending for this email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    const { data: invitation, error: insertError } = await adminClient
      .from('company_invitations')
      .insert({
        company_id,
        email: normalizedEmail,
        role: inviteRole,
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const redirectTo = req.headers.get('Origin') || req.headers.get('Referer')?.replace(/\/$/, '') || ''
    const appRedirect = redirectTo ? `${redirectTo}/dashboard` : undefined

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: appRedirect,
      data: { company_id, role: inviteRole, invitation_id: invitation.id },
    })

    if (inviteError) {
      await adminClient.from('company_invitations').update({ status: 'cancelled' }).eq('id', invitation.id)
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, invitation_id: invitation.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

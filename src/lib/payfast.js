/**
 * PayFast Integration Helper for SimpliBooks
 * Adapted from SnapBooks — subscription plans only (no credit packs)
 */
import md5 from 'crypto-js/md5'

export const PAYFAST_PLANS = {
  starter: {
    name: 'Starter',
    price: 169.00,
    frequency: 3, // Monthly
    item_name: 'SimpliBooks Starter Plan',
  },
  professional: {
    name: 'Professional',
    price: 549.00,
    frequency: 3,
    item_name: 'SimpliBooks Professional Plan',
  },
  business: {
    name: 'Business',
    price: 1299.00,
    frequency: 3,
    item_name: 'SimpliBooks Business Plan',
  },
}

export const getPayFastConfig = () => {
  const isProduction = import.meta.env.VITE_PAYFAST_ENV === 'production'
  const baseUrl = isProduction
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process'

  const envAppUrl = import.meta.env.VITE_APP_URL
  const appBaseUrl = envAppUrl || window.location.origin

  return {
    merchant_id: import.meta.env.VITE_PAYFAST_MERCHANT_ID,
    merchant_key: import.meta.env.VITE_PAYFAST_MERCHANT_KEY,
    passphrase: import.meta.env.VITE_PAYFAST_PASSPHRASE,
    base_url: baseUrl,
    return_url: `${appBaseUrl}/dashboard?payment=success`,
    cancel_url: `${appBaseUrl}/dashboard/billing`,
    notify_url: import.meta.env.VITE_PAYFAST_NOTIFY_URL,
  }
}

export const generatePayFastForm = (user, planId) => {
  const config = getPayFastConfig()

  if (!config.merchant_id) throw new Error('PayFast Merchant ID not configured')

  const plan = PAYFAST_PLANS[planId]
  if (!plan) throw new Error(`Invalid plan: ${planId}`)

  const m_payment_id = `${user.id}-${planId}-${Date.now()}`

  let data = {
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    return_url: config.return_url,
    cancel_url: config.cancel_url,
    notify_url: config.notify_url,

    name_first: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'User',
    name_last: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.id.substring(0, 8),
    email_address: user.email,

    m_payment_id,
    amount: plan.price.toFixed(2),
    item_name: plan.item_name,

    custom_str1: user.id,
    custom_str2: planId,

    subscription_type: '1',
    billing_date: new Date().toISOString().split('T')[0],
    recurring_amount: plan.price.toFixed(2),
    frequency: plan.frequency,
    cycles: 0,
  }

  // PayFast requires parameters in a SPECIFIC ORDER
  const PAYFAST_PARAM_ORDER = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'email_confirmation', 'confirmation_address',
    'payment_method',
    'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
  ]

  // Build ordered data, excluding empty values
  const orderedData = {}
  PAYFAST_PARAM_ORDER.forEach((key) => {
    const val = data[key]
    if (val !== undefined && val !== null && val !== '') {
      orderedData[key] = val
    } else if (val === 0 || val === '0') {
      orderedData[key] = val
    }
  })

  data = orderedData

  // Generate signature
  const pfParamString = PAYFAST_PARAM_ORDER
    .filter((key) => {
      const val = data[key]
      if (val === 0 || val === '0') return true
      return val !== undefined && val !== null && val !== ''
    })
    .map((key) => {
      const value = data[key]
      const encodedValue = encodeURIComponent(String(value).trim()).replace(/%20/g, '+')
      return `${key}=${encodedValue}`
    })
    .join('&')

  let signatureString = pfParamString
  if (config.passphrase) {
    const encodedPass = encodeURIComponent(config.passphrase.trim()).replace(/%20/g, '+')
    signatureString += `&passphrase=${encodedPass}`
  }

  const signature = md5(signatureString).toString()
  data.signature = signature

  return {
    action: config.base_url,
    fields: data,
  }
}

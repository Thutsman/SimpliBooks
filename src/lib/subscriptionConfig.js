/**
 * Subscription plan limits configuration
 */

// Admin emails get unlimited (business-tier) access regardless of subscription
export const ADMIN_EMAILS = [
  'thulanidube45@gmail.com',
]

export const isAdminEmail = (email) =>
  email && ADMIN_EMAILS.includes(email.toLowerCase())

export const PLAN_LIMITS = {
  trial: {
    companies: 3,
    invoices: Infinity,
    employees: 10,
    team: 5,
    inventory: true,
    multiCurrency: true,
  },
  starter: {
    companies: 1,
    invoices: 100,
    employees: 0,
    team: 1,
    inventory: false,
    multiCurrency: false,
  },
  professional: {
    companies: 3,
    invoices: Infinity,
    employees: 10,
    team: 5,
    inventory: true,
    multiCurrency: true,
  },
  business: {
    companies: Infinity,
    invoices: Infinity,
    employees: Infinity,
    team: Infinity,
    inventory: true,
    multiCurrency: true,
  },
  expired: {
    companies: 0,
    invoices: 0,
    employees: 0,
    team: 0,
    inventory: false,
    multiCurrency: false,
  },
}

export const PLAN_PRICES_ZAR = {
  starter: 169,
  professional: 549,
  business: 1299,
}

export const PLAN_NAMES = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
}

/**
 * Get the effective plan key based on subscription status
 */
export const getEffectivePlan = (subscription) => {
  if (!subscription) return 'expired'

  const { status, plan, trial_ends_at } = subscription

  if (status === 'trialing') {
    const trialEnd = new Date(trial_ends_at)
    if (trialEnd > new Date()) return 'trial'
    return 'expired'
  }

  if (status === 'active') return plan || 'starter'
  if (status === 'past_due') return plan || 'starter'
  if (status === 'canceled' || status === 'expired') return 'expired'

  return 'expired'
}

/**
 * Get plan limits for a given subscription
 */
export const getPlanLimits = (subscription) => {
  const effectivePlan = getEffectivePlan(subscription)
  return PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.expired
}

/**
 * Subscription queries and limit enforcement
 */
import { getEffectivePlan, getPlanLimits, isAdminEmail } from './subscriptionConfig'

/**
 * Check if a user is an admin (unlimited access) by looking up their email
 */
const isAdminUser = async (supabase, userId) => {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()
  return isAdminEmail(data?.email)
}

/**
 * Fetch the user's subscription row
 */
export const getUserSubscription = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data || null
}

/**
 * Get a summary of the user's subscription with limits and trial info
 */
export const getSubscriptionSummary = async (supabase, userId) => {
  const subscription = await getUserSubscription(supabase, userId)
  const effectivePlan = getEffectivePlan(subscription)
  const limits = getPlanLimits(subscription)

  let trialDaysRemaining = 0
  if (subscription?.status === 'trialing' && subscription.trial_ends_at) {
    const msRemaining = new Date(subscription.trial_ends_at) - new Date()
    trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
  }

  return {
    subscription,
    plan: effectivePlan,
    status: subscription?.status || 'none',
    limits,
    trialDaysRemaining,
    isTrialing: subscription?.status === 'trialing' && trialDaysRemaining > 0,
    isExpired: effectivePlan === 'expired',
    isReadOnly: effectivePlan === 'expired',
    renewsAt: subscription?.renews_at,
  }
}

/**
 * Check if user can create another company
 */
export const checkCompanyLimit = async (supabase, userId) => {
  if (await isAdminUser(supabase, userId)) return { allowed: true }
  const subscription = await getUserSubscription(supabase, userId)
  const limits = getPlanLimits(subscription)

  if (limits.companies === 0) return { allowed: false, reason: 'Your subscription has expired. Please subscribe to create companies.' }
  if (limits.companies === Infinity) return { allowed: true }

  const { count, error } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) throw error

  if (count >= limits.companies) {
    return {
      allowed: false,
      reason: `Your ${getEffectivePlan(subscription)} plan allows up to ${limits.companies} ${limits.companies === 1 ? 'company' : 'companies'}. Upgrade to add more.`,
    }
  }

  return { allowed: true }
}

/**
 * Check if user can create another invoice this month
 */
export const checkInvoiceLimit = async (supabase, userId, companyId) => {
  if (await isAdminUser(supabase, userId)) return { allowed: true }
  const subscription = await getUserSubscription(supabase, userId)
  const limits = getPlanLimits(subscription)

  if (limits.invoices === 0) return { allowed: false, reason: 'Your subscription has expired. Please subscribe to create invoices.' }
  if (limits.invoices === Infinity) return { allowed: true }

  const monthKey = new Date().toISOString().slice(0, 7) // "2026-02"

  const { data } = await supabase
    .from('usage_monthly')
    .select('invoices_created')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('month_yyyymm', monthKey)
    .single()

  const used = data?.invoices_created || 0

  if (used >= limits.invoices) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.invoices} invoices. Upgrade your plan for unlimited invoices.`,
    }
  }

  return { allowed: true }
}

/**
 * Check if user can add another employee
 */
export const checkEmployeeLimit = async (supabase, userId, companyId) => {
  if (await isAdminUser(supabase, userId)) return { allowed: true }
  const subscription = await getUserSubscription(supabase, userId)
  const limits = getPlanLimits(subscription)

  if (limits.employees === 0) {
    return {
      allowed: false,
      reason: 'Payroll is not available on your current plan. Upgrade to Professional or Business.',
    }
  }
  if (limits.employees === Infinity) return { allowed: true }

  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (error) throw error

  if (count >= limits.employees) {
    return {
      allowed: false,
      reason: `Your plan allows up to ${limits.employees} employees. Upgrade to Business for unlimited payroll.`,
    }
  }

  return { allowed: true }
}

/**
 * Check if user can invite another team member
 */
export const checkTeamMemberLimit = async (supabase, userId, companyId) => {
  if (await isAdminUser(supabase, userId)) return { allowed: true }
  const subscription = await getUserSubscription(supabase, userId)
  const limits = getPlanLimits(subscription)

  if (limits.team === 0) return { allowed: false, reason: 'Your subscription has expired. Please subscribe to invite team members.' }
  if (limits.team === Infinity) return { allowed: true }

  const { count, error } = await supabase
    .from('company_members')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (error) throw error

  // team limit includes the owner
  if (count >= limits.team) {
    return {
      allowed: false,
      reason: `Your plan allows up to ${limits.team} team ${limits.team === 1 ? 'member' : 'members'}. Upgrade for more.`,
    }
  }

  return { allowed: true }
}

/**
 * Record an invoice creation in usage_monthly
 */
export const recordInvoiceCreation = async (supabase, userId, companyId) => {
  const monthKey = new Date().toISOString().slice(0, 7)

  const { error } = await supabase.rpc('increment_invoice_usage', {
    p_user_id: userId,
    p_company_id: companyId,
    p_month: monthKey,
  })

  // If RPC doesn't exist, fall back to upsert
  if (error) {
    const { data: existing } = await supabase
      .from('usage_monthly')
      .select('invoices_created')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('month_yyyymm', monthKey)
      .single()

    if (existing) {
      await supabase
        .from('usage_monthly')
        .update({ invoices_created: existing.invoices_created + 1 })
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('month_yyyymm', monthKey)
    } else {
      await supabase
        .from('usage_monthly')
        .insert({
          user_id: userId,
          company_id: companyId,
          month_yyyymm: monthKey,
          invoices_created: 1,
        })
    }
  }
}

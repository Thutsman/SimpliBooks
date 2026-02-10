import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getEffectivePlan, getPlanLimits, PLAN_LIMITS, isAdminEmail } from '../lib/subscriptionConfig'

export const useSubscription = () => {
  const { user } = useAuth()

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  })

  // Admin override — unlimited access for admin emails
  const admin = isAdminEmail(user?.email)

  if (admin) {
    return {
      subscription,
      plan: 'business',
      status: 'active',
      isLoading,
      error,
      isTrialing: false,
      trialDaysRemaining: 0,
      isExpired: false,
      isReadOnly: false,
      isAdmin: true,
      limits: PLAN_LIMITS.business,
      canCreateCompany: true,
      canCreateInvoice: true,
      canUsePayroll: true,
      canUseInventory: true,
      canUseMultiCurrency: true,
      canInviteMembers: true,
    }
  }

  const effectivePlan = getEffectivePlan(subscription)
  const limits = getPlanLimits(subscription)
  const status = subscription?.status || 'none'

  let trialDaysRemaining = 0
  if (subscription?.status === 'trialing' && subscription.trial_ends_at) {
    const msRemaining = new Date(subscription.trial_ends_at) - new Date()
    trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
  }

  const isTrialing = status === 'trialing' && trialDaysRemaining > 0
  const isExpired = effectivePlan === 'expired'
  const isReadOnly = isExpired

  return {
    subscription,
    plan: effectivePlan,
    status,
    isLoading,
    error,
    isTrialing,
    trialDaysRemaining,
    isExpired,
    isReadOnly,
    isAdmin: false,
    limits,
    canCreateCompany: !isReadOnly && limits.companies > 0,
    canCreateInvoice: !isReadOnly && limits.invoices > 0,
    canUsePayroll: !isReadOnly && limits.employees > 0,
    canUseInventory: !isReadOnly && limits.inventory,
    canUseMultiCurrency: !isReadOnly && limits.multiCurrency,
    canInviteMembers: !isReadOnly && limits.team > 1,
  }
}

import { useSubscription } from '../../hooks/useSubscription'
import { PLAN_NAMES } from '../../lib/subscriptionConfig'

const SubscriptionBadge = () => {
  const { plan, isTrialing, trialDaysRemaining, isExpired, status } = useSubscription()

  if (status === 'none') return null

  let label = ''
  let colorClasses = ''

  if (isTrialing) {
    label = `Trial - ${trialDaysRemaining}d left`
    colorClasses = 'bg-blue-500/20 text-blue-300'
  } else if (isExpired) {
    label = 'Expired'
    colorClasses = 'bg-red-500/20 text-red-300'
  } else if (status === 'active') {
    label = PLAN_NAMES[plan] || plan
    colorClasses = 'bg-green-500/20 text-green-300'
  } else if (status === 'past_due') {
    label = 'Past Due'
    colorClasses = 'bg-amber-500/20 text-amber-300'
  } else {
    return null
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses}`}>
      {label}
    </span>
  )
}

export default SubscriptionBadge

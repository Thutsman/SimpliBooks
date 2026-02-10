import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, CheckCircle, Check, Loader2, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import { generatePayFastForm, PAYFAST_PLANS } from '../lib/payfast'
import { PLAN_NAMES } from '../lib/subscriptionConfig'

const Billing = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const { subscription, plan: effectivePlan, status, isTrialing, trialDaysRemaining, isExpired } = useSubscription()

  // Payment history
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
  })

  // Handle return from PayFast
  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your subscription is being activated.')
      setSearchParams({}, { replace: true })
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, toast])

  const handlePayFastPayment = (planId) => {
    try {
      setLoading(true)
      setSelectedPlan(planId)
      const { action, fields } = generatePayFastForm(user, planId)

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = action

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit()
    } catch (error) {
      console.error('Payment initialization error:', error)
      toast.error(error.message || 'Failed to initialize payment')
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  const plans = [
    {
      id: 'starter',
      name: PAYFAST_PLANS.starter.name,
      price: `R${PAYFAST_PLANS.starter.price}`,
      features: [
        '1 Company',
        '100 Invoices/month',
        'Full Accounting Engine',
        'VAT 201 Reports',
        'Email Support',
      ],
    },
    {
      id: 'professional',
      name: PAYFAST_PLANS.professional.name,
      price: `R${PAYFAST_PLANS.professional.price}`,
      popular: true,
      features: [
        '3 Companies',
        'Unlimited Invoices',
        'Inventory Management',
        'Payroll (Up to 10 employees)',
        'Multi-Currency Support',
        'Up to 5 Team Members',
        'Priority Support',
      ],
    },
    {
      id: 'business',
      name: PAYFAST_PLANS.business.name,
      price: `R${PAYFAST_PLANS.business.price.toLocaleString()}`,
      features: [
        'Unlimited Companies',
        'Unlimited Invoices',
        'Unlimited Payroll',
        'Unlimited Team Members',
        'Advanced Inventory',
        'Custom Integrations',
        'Dedicated Account Manager',
      ],
    },
  ]

  const currentPlanId = subscription?.plan

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your subscription and payment details</p>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Plan</p>
            <p className="text-lg font-semibold text-gray-900">
              {isTrialing ? 'Professional (Trial)' : PLAN_NAMES[currentPlanId] || 'No Plan'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className={`text-lg font-semibold ${
              status === 'active' ? 'text-green-600' :
              isTrialing ? 'text-blue-600' :
              isExpired ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {isTrialing ? `Trial - ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left` :
               status === 'active' ? 'Active' :
               status === 'past_due' ? 'Past Due' :
               status === 'canceled' ? 'Canceled' :
               isExpired ? 'Expired' :
               'No Subscription'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">
              {isTrialing ? 'Trial Ends' : subscription?.renews_at ? 'Next Billing' : ''}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {isTrialing && subscription?.trial_ends_at
                ? new Date(subscription.trial_ends_at).toLocaleDateString()
                : subscription?.renews_at
                ? new Date(subscription.renews_at).toLocaleDateString()
                : '-'}
            </p>
          </div>
        </div>
        {isExpired && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Your subscription has expired. Your account is in read-only mode.
              Subscribe to a plan below to regain full access.
            </p>
          </div>
        )}
      </div>

      {/* Plan Selection */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((planItem) => {
            const isCurrentPlan = currentPlanId === planItem.id && status === 'active'
            const isSelected = selectedPlan === planItem.id

            return (
              <div
                key={planItem.id}
                className={`bg-white rounded-xl border-2 p-6 shadow-sm relative ${
                  planItem.popular
                    ? 'border-accent-500 shadow-lg scale-[1.02]'
                    : isSelected
                    ? 'border-accent-500'
                    : 'border-gray-200'
                }`}
              >
                {planItem.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{planItem.name}</h3>
                  <div className="mt-2 flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-gray-900">{planItem.price}</span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {planItem.features.map((feature) => (
                    <li key={feature} className="text-sm text-gray-700 flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <CheckCircle className="h-4 w-4" /> Current Plan
                  </button>
                ) : isSelected ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => handlePayFastPayment(planItem.id)}
                      disabled={loading}
                      className="w-full bg-accent-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-accent-700 flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Pay with PayFast
                    </button>
                    <button
                      onClick={() => setSelectedPlan(null)}
                      className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(planItem.id)}
                    className={`w-full px-4 py-2.5 rounded-lg border inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                      planItem.popular
                        ? 'bg-accent-600 text-white border-transparent hover:bg-accent-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" /> Choose {planItem.name}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      R{Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'COMPLETE'
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status === 'COMPLETE' ? (
                          <><CheckCircle className="w-3 h-3" /> Complete</>
                        ) : payment.status === 'FAILED' ? (
                          <><AlertCircle className="w-3 h-3" /> Failed</>
                        ) : (
                          <><Clock className="w-3 h-3" /> {payment.status}</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {payment.payfast_payment_id || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center shadow-2xl">
            <Loader2 className="w-12 h-12 text-accent-600 animate-spin mb-4" />
            <p className="text-lg font-semibold text-gray-900">Redirecting to PayFast...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we set up your payment.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Billing

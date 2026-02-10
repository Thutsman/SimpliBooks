import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'
import { useSubscription } from '../../hooks/useSubscription'
import { PLAN_NAMES } from '../../lib/subscriptionConfig'

const UpgradePrompt = ({ message, onClose }) => {
  const navigate = useNavigate()
  const { plan, isExpired } = useSubscription()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isExpired ? 'Subscription Required' : 'Upgrade Required'}
            </h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-gray-600 mb-2">{message}</p>

        {!isExpired && (
          <p className="text-sm text-gray-500 mb-6">
            Current plan: <span className="font-medium">{PLAN_NAMES[plan] || plan}</span>
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              navigate('/dashboard/billing')
              onClose?.()
            }}
            className="flex-1 bg-accent-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-accent-700 flex items-center justify-center gap-2 text-sm transition-colors"
          >
            View Plans <ArrowRight className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpgradePrompt

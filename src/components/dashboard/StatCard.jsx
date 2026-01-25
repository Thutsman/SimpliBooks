import { ArrowUp, ArrowDown } from 'lucide-react'

const StatCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
}) => {
  const changeColors = {
    positive: 'text-accent-600 bg-accent-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>

          {(change !== undefined || description) && (
            <div className="mt-2 flex items-center gap-2">
              {change !== undefined && (
                <span
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                    ${changeColors[changeType]}
                  `}
                >
                  {changeType === 'positive' && <ArrowUp className="w-3 h-3" />}
                  {changeType === 'negative' && <ArrowDown className="w-3 h-3" />}
                  {change}
                </span>
              )}
              {description && (
                <span className="text-sm text-gray-500">{description}</span>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div className="w-12 h-12 bg-accent-50 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-accent-600" />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard

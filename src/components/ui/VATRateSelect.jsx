import { getVATRatesForCountry } from '../../lib/constants'

const VATRateSelect = ({
  value,
  onChange,
  country = 'South Africa',
  className = '',
  showDescription = false,
  disabled = false,
}) => {
  const vatRates = getVATRatesForCountry(country)

  const handleChange = (e) => {
    const selectedRate = vatRates.find(r => r.rate.toString() === e.target.value)
    onChange(e.target.value, selectedRate)
  }

  return (
    <div className={className}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {vatRates.map((rate) => (
          <option key={rate.id} value={rate.rate}>
            {rate.name}
          </option>
        ))}
      </select>
      {showDescription && (
        <p className="mt-1 text-xs text-gray-500">
          {vatRates.find(r => r.rate.toString() === value?.toString())?.description || ''}
        </p>
      )}
    </div>
  )
}

// Compact inline version for line items
export const VATRateInlineSelect = ({
  value,
  onChange,
  country = 'South Africa',
  disabled = false,
}) => {
  const vatRates = getVATRatesForCountry(country)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      title={vatRates.find(r => r.rate.toString() === value?.toString())?.description || ''}
    >
      {vatRates.map((rate) => (
        <option key={rate.id} value={rate.rate}>
          {rate.rate}%
        </option>
      ))}
    </select>
  )
}

export default VATRateSelect

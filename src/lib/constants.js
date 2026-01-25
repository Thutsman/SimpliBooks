// Default Chart of Accounts
export const DEFAULT_ACCOUNTS = [
  // Assets
  { code: '1000', name: 'Bank Account', type: 'asset', sub_type: 'current_asset', is_system: true },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', sub_type: 'current_asset', is_system: true },
  { code: '1200', name: 'Inventory', type: 'asset', sub_type: 'current_asset', is_system: false },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', sub_type: 'current_asset', is_system: false },
  { code: '1500', name: 'Equipment', type: 'asset', sub_type: 'fixed_asset', is_system: false },
  { code: '1510', name: 'Accumulated Depreciation - Equipment', type: 'asset', sub_type: 'fixed_asset', is_system: false },
  { code: '1600', name: 'Vehicles', type: 'asset', sub_type: 'fixed_asset', is_system: false },
  { code: '1610', name: 'Accumulated Depreciation - Vehicles', type: 'asset', sub_type: 'fixed_asset', is_system: false },

  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'liability', sub_type: 'current_liability', is_system: true },
  { code: '2100', name: 'VAT Payable', type: 'liability', sub_type: 'current_liability', is_system: true },
  { code: '2200', name: 'PAYE Payable', type: 'liability', sub_type: 'current_liability', is_system: false },
  { code: '2300', name: 'Accrued Expenses', type: 'liability', sub_type: 'current_liability', is_system: false },
  { code: '2500', name: 'Loans Payable', type: 'liability', sub_type: 'long_term_liability', is_system: false },

  // Equity
  { code: '3000', name: 'Owner\'s Capital', type: 'equity', sub_type: 'equity', is_system: true },
  { code: '3100', name: 'Retained Earnings', type: 'equity', sub_type: 'equity', is_system: true },
  { code: '3200', name: 'Drawings', type: 'equity', sub_type: 'equity', is_system: false },

  // Income
  { code: '4000', name: 'Sales Revenue', type: 'income', sub_type: 'operating_revenue', is_system: true },
  { code: '4100', name: 'Service Revenue', type: 'income', sub_type: 'operating_revenue', is_system: false },
  { code: '4200', name: 'Interest Income', type: 'income', sub_type: 'other_income', is_system: false },
  { code: '4300', name: 'Other Income', type: 'income', sub_type: 'other_income', is_system: false },

  // Expenses
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', sub_type: 'cost_of_sales', is_system: true },
  { code: '5100', name: 'Purchases', type: 'expense', sub_type: 'cost_of_sales', is_system: true },
  { code: '6000', name: 'Salaries & Wages', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6100', name: 'Rent Expense', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6200', name: 'Utilities', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6300', name: 'Insurance', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6400', name: 'Office Supplies', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6500', name: 'Marketing & Advertising', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6600', name: 'Professional Fees', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6700', name: 'Travel & Entertainment', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6800', name: 'Vehicle Expenses', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '6900', name: 'Depreciation Expense', type: 'expense', sub_type: 'operating_expense', is_system: false },
  { code: '7000', name: 'Bank Charges', type: 'expense', sub_type: 'other_expense', is_system: false },
  { code: '7100', name: 'Interest Expense', type: 'expense', sub_type: 'other_expense', is_system: false },
  { code: '7200', name: 'Bad Debt Expense', type: 'expense', sub_type: 'other_expense', is_system: false },
  { code: '7900', name: 'Other Expenses', type: 'expense', sub_type: 'other_expense', is_system: false },
]

// Supported Countries
export const SUPPORTED_COUNTRIES = [
  { value: 'South Africa', label: 'South Africa', currency: 'ZAR', code: 'ZA' },
  { value: 'Botswana', label: 'Botswana', currency: 'BWP', code: 'BW' },
  { value: 'Zimbabwe', label: 'Zimbabwe', currency: 'USD', code: 'ZW' },
]

// VAT Rates by Country
export const VAT_RATES_BY_COUNTRY = {
  'South Africa': [
    { id: 'za-std', name: 'Standard Rate (15%)', rate: 15, is_default: true, description: 'Standard VAT rate for most goods and services' },
    { id: 'za-zero', name: 'Zero Rated (0%)', rate: 0, is_default: false, description: 'Zero-rated supplies (basic foodstuffs, exports, etc.)' },
    { id: 'za-exempt', name: 'Exempt', rate: 0, is_default: false, description: 'VAT exempt supplies (financial services, residential rent, etc.)' },
    { id: 'za-export', name: 'Export (0%)', rate: 0, is_default: false, description: 'Goods and services exported outside SA' },
    { id: 'za-diesel', name: 'Diesel Rebate', rate: 15, is_default: false, description: 'Diesel purchases eligible for rebate' },
    { id: 'za-capital', name: 'Capital Goods (15%)', rate: 15, is_default: false, description: 'Capital goods purchases' },
    { id: 'za-import', name: 'Import VAT (15%)', rate: 15, is_default: false, description: 'VAT on imported goods' },
  ],
  'Botswana': [
    { id: 'bw-std', name: 'Standard Rate (14%)', rate: 14, is_default: true, description: 'Standard VAT rate' },
    { id: 'bw-zero', name: 'Zero Rated (0%)', rate: 0, is_default: false, description: 'Zero-rated supplies (exports, basic necessities)' },
    { id: 'bw-exempt', name: 'Exempt', rate: 0, is_default: false, description: 'VAT exempt supplies' },
  ],
  'Zimbabwe': [
    { id: 'zw-std', name: 'Standard Rate (15%)', rate: 15, is_default: true, description: 'Standard VAT rate' },
    { id: 'zw-zero', name: 'Zero Rated (0%)', rate: 0, is_default: false, description: 'Zero-rated supplies (exports, basic commodities)' },
    { id: 'zw-exempt', name: 'Exempt', rate: 0, is_default: false, description: 'VAT exempt supplies' },
  ],
}

// Get VAT rates for a country (with fallback to South Africa)
export const getVATRatesForCountry = (country) => {
  return VAT_RATES_BY_COUNTRY[country] || VAT_RATES_BY_COUNTRY['South Africa']
}

// Get default VAT rate for a country
export const getDefaultVATRate = (country) => {
  const rates = getVATRatesForCountry(country)
  const defaultRate = rates.find(r => r.is_default)
  return defaultRate ? defaultRate.rate : 15
}

// Legacy: Default VAT/Tax Rates (for backward compatibility)
export const DEFAULT_VAT_RATES = [
  { name: 'Standard Rate', rate: 15, is_default: true },
  { name: 'Zero Rate', rate: 0, is_default: false },
  { name: 'Exempt', rate: 0, is_default: false },
]

// Quotation Statuses
export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'accepted', label: 'Accepted', color: 'green' },
  { value: 'declined', label: 'Declined', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'orange' },
  { value: 'converted', label: 'Converted to Invoice', color: 'purple' },
]

// Account Types
export const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset', color: 'blue' },
  { value: 'liability', label: 'Liability', color: 'red' },
  { value: 'equity', label: 'Equity', color: 'purple' },
  { value: 'income', label: 'Income', color: 'green' },
  { value: 'expense', label: 'Expense', color: 'orange' },
]

// Account Sub-Types
export const ACCOUNT_SUB_TYPES = {
  asset: [
    { value: 'current_asset', label: 'Current Asset' },
    { value: 'fixed_asset', label: 'Fixed Asset' },
    { value: 'other_asset', label: 'Other Asset' },
  ],
  liability: [
    { value: 'current_liability', label: 'Current Liability' },
    { value: 'long_term_liability', label: 'Long-term Liability' },
    { value: 'other_liability', label: 'Other Liability' },
  ],
  equity: [
    { value: 'equity', label: 'Equity' },
  ],
  income: [
    { value: 'operating_revenue', label: 'Operating Revenue' },
    { value: 'other_income', label: 'Other Income' },
  ],
  expense: [
    { value: 'cost_of_sales', label: 'Cost of Sales' },
    { value: 'operating_expense', label: 'Operating Expense' },
    { value: 'other_expense', label: 'Other Expense' },
  ],
}

// Invoice Statuses
export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
]

// Purchase Invoice Statuses
export const PURCHASE_STATUSES = [
  { value: 'unpaid', label: 'Unpaid', color: 'yellow' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
]

// Currency Formatter
export const formatCurrency = (amount, currency = 'ZAR') => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
  }).format(amount || 0)
}

// Date Formatter
export const formatDate = (date) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

// Status Badge Colors
export const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-accent-100 text-accent-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    unpaid: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-accent-100 text-accent-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
    converted: 'bg-purple-100 text-purple-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

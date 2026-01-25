import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency } from '../../lib/constants'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const CashFlowChart = () => {
  const { activeCompanyId, activeCompany } = useCompany()

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['cash-flow-chart', activeCompanyId],
    queryFn: async () => {
      // Get last 6 months of data
      const months = []
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i)
        months.push({
          month: format(date, 'MMM'),
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString(),
        })
      }

      // Fetch invoices (income)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, issue_date')
        .eq('company_id', activeCompanyId)
        .eq('status', 'paid')

      // Fetch purchases (expenses)
      const { data: purchases } = await supabase
        .from('supplier_invoices')
        .select('total, issue_date')
        .eq('company_id', activeCompanyId)
        .eq('status', 'paid')

      // Aggregate by month
      return months.map(({ month, start, end }) => {
        const monthIncome = (invoices || [])
          .filter((inv) => inv.issue_date >= start.split('T')[0] && inv.issue_date <= end.split('T')[0])
          .reduce((sum, inv) => sum + Number(inv.total), 0)

        const monthExpenses = (purchases || [])
          .filter((pur) => pur.issue_date >= start.split('T')[0] && pur.issue_date <= end.split('T')[0])
          .reduce((sum, pur) => sum + Number(pur.total), 0)

        return {
          month,
          income: monthIncome,
          expenses: monthExpenses,
        }
      })
    },
    enabled: !!activeCompanyId,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse w-full h-full bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  // Calculate max value for Y-axis domain
  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.income || 0, d.expenses || 0)),
    1000 // Minimum scale of 1000 when no data
  )

  // Format Y-axis ticks properly
  const formatYAxis = (value) => {
    if (value === 0) return '0'
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    return value.toString()
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <p className="text-sm text-green-600">
            Income: {formatCurrency(payload[0]?.value || 0, activeCompany?.currency)}
          </p>
          <p className="text-sm text-red-600">
            Expenses: {formatCurrency(payload[1]?.value || 0, activeCompany?.currency)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatYAxis}
              domain={[0, maxValue]}
              allowDataOverflow={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#incomeGradient)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#expenseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-600">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-sm text-gray-600">Expenses</span>
        </div>
      </div>
    </div>
  )
}

export default CashFlowChart

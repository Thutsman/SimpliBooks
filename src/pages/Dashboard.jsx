import { useQuery } from '@tanstack/react-query'
import { DollarSign, FileText, ShoppingCart, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { formatCurrency } from '../lib/constants'
import StatCard from '../components/dashboard/StatCard'
import RecentInvoices from '../components/dashboard/RecentInvoices'
import CashFlowChart from '../components/dashboard/CashFlowChart'

const Dashboard = () => {
  const { activeCompany, activeCompanyId, companies, companiesLoading, companiesError } = useCompany()

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', activeCompanyId],
    queryFn: async () => {
      // Get invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('company_id', activeCompanyId)

      // Get purchases
      const { data: purchases } = await supabase
        .from('supplier_invoices')
        .select('total, status')
        .eq('company_id', activeCompanyId)

      const totalRevenue = (invoices || [])
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.total), 0)

      const totalExpenses = (purchases || [])
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.total), 0)

      const outstandingReceivables = (invoices || [])
        .filter((i) => ['sent', 'overdue'].includes(i.status))
        .reduce((sum, i) => sum + Number(i.total), 0)

      const overdueInvoices = (invoices || []).filter(
        (i) => i.status === 'overdue'
      ).length

      return {
        totalRevenue,
        totalExpenses,
        outstandingReceivables,
        overdueInvoices,
        totalInvoices: (invoices || []).length,
        totalPurchases: (purchases || []).length,
      }
    },
    enabled: !!activeCompanyId,
  })

  // Show loading state while fetching companies
  if (companiesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mb-4"></div>
        <p className="text-gray-600 mb-2">Loading your companies...</p>
        <p className="text-sm text-gray-500">This may take a few moments</p>
      </div>
    )
  }

  // Show error state if there's an error
  if (companiesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Error Loading Companies
        </h1>
        <p className="text-gray-600 mb-6 max-w-md">
          {companiesError?.message || 'Unable to load companies. Please try refreshing the page.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // Show welcome screen if no company
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-accent-100 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-accent-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to SimpliBooks
        </h1>
        <p className="text-gray-600 mb-6 max-w-md">
          Get started by creating your first company. You'll be able to manage
          invoices, track expenses, and generate reports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{activeCompany?.name ? `, ${activeCompany.name}` : ''}
        </h1>
        <p className="text-gray-600">Here's what's happening with your business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0, activeCompany?.currency)}
          description="Paid invoices"
          icon={DollarSign}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats?.totalExpenses || 0, activeCompany?.currency)}
          description="Paid purchases"
          icon={ShoppingCart}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats?.outstandingReceivables || 0, activeCompany?.currency)}
          description="Unpaid invoices"
          icon={FileText}
        />
        <StatCard
          title="Overdue"
          value={stats?.overdueInvoices || 0}
          description="Invoices need attention"
          icon={AlertCircle}
          changeType={stats?.overdueInvoices > 0 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CashFlowChart />
        <RecentInvoices />
      </div>
    </div>
  )
}

export default Dashboard

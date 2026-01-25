import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, getStatusColor } from '../../lib/constants'
import { ArrowRight } from 'lucide-react'

const RecentInvoices = () => {
  const { activeCompanyId, activeCompany } = useCompany()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['recent-invoices', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(name)
        `)
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
        <Link
          to="/dashboard/invoices"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No invoices yet.</p>
          <Link
            to="/dashboard/invoices/new"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              to={`/dashboard/invoices/${invoice.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {invoice.invoice_number}
                </p>
                <p className="text-sm text-gray-500">
                  {invoice.client?.name || 'No client'}
                </p>
              </div>

              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {formatCurrency(invoice.total, activeCompany?.currency)}
                </p>
                <span
                  className={`
                    inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize
                    ${getStatusColor(invoice.status)}
                  `}
                >
                  {invoice.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentInvoices

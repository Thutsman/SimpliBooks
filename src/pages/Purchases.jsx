import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Trash2, MoreVertical, CheckCircle } from 'lucide-react'
import { usePurchases } from '../hooks/usePurchases'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'
import { formatCurrency, formatDate, getStatusColor, PURCHASE_STATUSES } from '../lib/constants'
import { useCompany } from '../context/CompanyContext'
import { usePermissions } from '../hooks/usePermissions'

const Purchases = () => {
  const { activeCompany } = useCompany()
  const { canEditTransactions } = usePermissions()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [showActionsId, setShowActionsId] = useState(null)

  const navigate = useNavigate()
  const toast = useToast()

  const { purchases, isLoading, deletePurchase, updateStatus, isDeleting } = usePurchases({
    status: statusFilter,
  })

  const handleDelete = async () => {
    try {
      await deletePurchase(selectedPurchase.id)
      toast.success('Purchase deleted successfully')
      setShowDeleteModal(false)
      setSelectedPurchase(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete purchase')
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus({ id, status })
      toast.success(`Purchase marked as ${status}`)
      setShowActionsId(null)
    } catch (error) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const columns = [
    {
      header: 'Invoice',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.invoice_number}</p>
          <p className="text-sm text-gray-500">{formatDate(row.issue_date)}</p>
        </div>
      ),
    },
    {
      header: 'Supplier',
      cell: (row) => (
        <span className="text-gray-600">{row.supplier?.name || 'No supplier'}</span>
      ),
    },
    {
      header: 'Due Date',
      cell: (row) => (
        <span className="text-gray-600">{formatDate(row.due_date)}</span>
      ),
    },
    {
      header: 'Amount',
      align: 'right',
      cell: (row) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(row.total, activeCompany?.currency)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <span
          className={`
            inline-block px-2 py-1 rounded-full text-xs font-medium capitalize
            ${getStatusColor(row.status)}
          `}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="relative">
          <div className="flex items-center justify-end gap-2">
            <Link
              to={`/dashboard/purchases/${row.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowActionsId(showActionsId === row.id ? null : row.id)
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {showActionsId === row.id && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {['unpaid', 'overdue', 'part_paid'].includes(row.status) &&
                (Number(row.total || 0) - Number(row.amount_paid || 0) > 0.005) && (
                <button
                  onClick={() => {
                    setShowActionsId(null)
                    navigate(`/dashboard/payments/supplier?supplierInvoiceId=${row.id}`)
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-50 w-full"
                >
                  <CheckCircle className="w-4 h-4" />
                  Record Payment
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedPurchase(row)
                  setShowDeleteModal(true)
                  setShowActionsId(null)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-600">Track supplier invoices and expenses</p>
        </div>
        {canEditTransactions && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate('/dashboard/payments/supplier')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
            <Link to="/dashboard/purchases/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Purchase
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setStatusFilter('all')}
          className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${statusFilter === 'all'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }
          `}
        >
          All
        </button>
        {PURCHASE_STATUSES.map((status) => (
          <button
            key={status.value}
            onClick={() => setStatusFilter(status.value)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap
              ${statusFilter === status.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {status.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={purchases}
        isLoading={isLoading}
        searchPlaceholder="Search purchases..."
        emptyMessage="No purchases yet. Record your first purchase to get started."
        onRowClick={(row) => navigate(`/dashboard/purchases/${row.id}`)}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Purchase"
        message={`Are you sure you want to delete purchase "${selectedPurchase?.invoice_number}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={isDeleting}
      />
    </div>
  )
}

export default Purchases

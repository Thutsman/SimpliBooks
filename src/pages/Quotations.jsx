import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Trash2, MoreVertical, Send, CheckCircle, XCircle, FileText } from 'lucide-react'
import { useQuotations } from '../hooks/useQuotations'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'
import { formatCurrency, formatDate, getStatusColor, QUOTATION_STATUSES } from '../lib/constants'
import { useCompany } from '../context/CompanyContext'
import { usePermissions } from '../hooks/usePermissions'

const Quotations = () => {
  const { activeCompany } = useCompany()
  const { canEditTransactions } = usePermissions()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [showActionsId, setShowActionsId] = useState(null)

  const navigate = useNavigate()
  const toast = useToast()

  const {
    quotations,
    isLoading,
    deleteQuotation,
    updateStatus,
    convertToInvoice,
    isDeleting,
    isConverting
  } = useQuotations({
    status: statusFilter,
  })

  const handleDelete = async () => {
    try {
      await deleteQuotation(selectedQuotation.id)
      toast.success('Quotation deleted successfully')
      setShowDeleteModal(false)
      setSelectedQuotation(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete quotation')
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus({ id, status })
      toast.success(`Quotation marked as ${status}`)
      setShowActionsId(null)
    } catch (error) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const handleConvertToInvoice = async () => {
    try {
      const invoice = await convertToInvoice(selectedQuotation.id)
      toast.success('Quotation converted to invoice successfully')
      setShowConvertModal(false)
      setSelectedQuotation(null)
      navigate(`/dashboard/invoices/${invoice.id}`)
    } catch (error) {
      toast.error(error.message || 'Failed to convert quotation')
    }
  }

  const columns = [
    {
      header: 'Quotation',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.quotation_number}</p>
          <p className="text-sm text-gray-500">{formatDate(row.issue_date)}</p>
        </div>
      ),
    },
    {
      header: 'Client',
      cell: (row) => (
        <span className="text-gray-600">{row.client?.name || 'No client'}</span>
      ),
    },
    {
      header: 'Expiry Date',
      cell: (row) => (
        <span className="text-gray-600">{row.expiry_date ? formatDate(row.expiry_date) : '-'}</span>
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
              to={`/dashboard/quotations/${row.id}`}
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

          {/* Actions Dropdown */}
          {showActionsId === row.id && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {row.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange(row.id, 'sent')}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                >
                  <Send className="w-4 h-4" />
                  Mark as Sent
                </button>
              )}
              {['draft', 'sent'].includes(row.status) && (
                <>
                  <button
                    onClick={() => handleStatusChange(row.id, 'accepted')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-50 w-full"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Accepted
                  </button>
                  <button
                    onClick={() => handleStatusChange(row.id, 'declined')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full"
                  >
                    <XCircle className="w-4 h-4" />
                    Mark as Declined
                  </button>
                </>
              )}
              {row.status === 'accepted' && (
                <button
                  onClick={() => {
                    setSelectedQuotation(row)
                    setShowConvertModal(true)
                    setShowActionsId(null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-gray-50 w-full"
                >
                  <FileText className="w-4 h-4" />
                  Convert to Invoice
                </button>
              )}
              {row.status !== 'converted' && (
                <button
                  onClick={() => {
                    setSelectedQuotation(row)
                    setShowDeleteModal(true)
                    setShowActionsId(null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600">Create and manage customer quotations</p>
        </div>
        {canEditTransactions && (
          <Link to="/dashboard/quotations/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Quotation
            </Button>
          </Link>
        )}
      </div>

      {/* Status Tabs */}
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
        {QUOTATION_STATUSES.map((status) => (
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        searchPlaceholder="Search quotations..."
        emptyMessage="No quotations yet. Create your first quotation to get started."
        onRowClick={(row) => navigate(`/dashboard/quotations/${row.id}`)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation "${selectedQuotation?.quotation_number}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={isDeleting}
      />

      {/* Convert to Invoice Confirmation */}
      <ConfirmModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onConfirm={handleConvertToInvoice}
        title="Convert to Invoice"
        message={`Convert quotation "${selectedQuotation?.quotation_number}" to an invoice? This will create a new invoice with the same details.`}
        confirmText="Convert"
        loading={isConverting}
      />
    </div>
  )
}

export default Quotations

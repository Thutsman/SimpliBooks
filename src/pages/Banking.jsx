import { useState, useRef } from 'react'
import { Upload, CheckCircle, Circle, Tag, Trash2, Filter } from 'lucide-react'
import { useBanking } from '../hooks/useBanking'
import { useClients } from '../hooks/useClients'
import { useSuppliers } from '../hooks/useSuppliers'
import { useAccounts } from '../hooks/useAccounts'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'
import { formatCurrency, formatDate } from '../lib/constants'
import { parseCSV } from '../lib/utils'
import { useCompany } from '../context/CompanyContext'

const Banking = () => {
  const { activeCompany } = useCompany()
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [filterReconciled, setFilterReconciled] = useState('all')
  const [importedData, setImportedData] = useState([])
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    description: '',
    amount: '',
    reference: '',
  })
  const [categoryForm, setCategoryForm] = useState({
    categoryType: '',
    categoryId: '',
    invoiceId: '',
  })
  const fileInputRef = useRef(null)

  const {
    transactions,
    isLoading,
    importTransactions,
    categorizeTransaction,
    reconcileTransaction,
    deleteTransaction,
    isImporting,
    isCategorizing,
  } = useBanking({
    reconciled: filterReconciled === 'all' ? undefined : filterReconciled === 'reconciled',
  })

  const { clients } = useClients()
  const { suppliers } = useSuppliers()
  const { accounts } = useAccounts()
  const toast = useToast()

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await parseCSV(file)
      setImportedData(data)

      // Auto-detect columns
      if (data.length > 0) {
        const headers = Object.keys(data[0])
        setColumnMapping({
          date: headers.find((h) => h.includes('date')) || '',
          description: headers.find((h) => h.includes('description') || h.includes('details')) || '',
          amount: headers.find((h) => h.includes('amount') || h.includes('value')) || '',
          reference: headers.find((h) => h.includes('reference') || h.includes('ref')) || '',
        })
      }

      setShowImportModal(true)
    } catch (error) {
      toast.error('Failed to parse CSV file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
      toast.error('Please map the required columns (Date, Description, Amount)')
      return
    }

    const parsedTransactions = importedData
      .map((row) => {
        const amount = parseFloat(row[columnMapping.amount]?.replace(/[^-\d.]/g, '') || '0')
        return {
          date: row[columnMapping.date],
          description: row[columnMapping.description],
          amount: Math.abs(amount),
          type: amount >= 0 ? 'credit' : 'debit',
          reference: row[columnMapping.reference] || '',
        }
      })
      .filter((t) => t.date && t.description)

    try {
      const result = await importTransactions(parsedTransactions)
      toast.success(
        `Imported ${result.imported} transactions${result.duplicates > 0 ? ` (${result.duplicates} duplicates skipped)` : ''}`
      )
      setShowImportModal(false)
      setImportedData([])
    } catch (error) {
      toast.error(error.message || 'Failed to import transactions')
    }
  }

  const handleCategorize = async () => {
    if (!categoryForm.categoryType || !categoryForm.categoryId) {
      toast.error('Please select a category')
      return
    }

    try {
      await categorizeTransaction({
        id: selectedTransaction.id,
        categoryType: categoryForm.categoryType,
        categoryId: categoryForm.categoryId,
        invoiceId: categoryForm.invoiceId || null,
      })
      toast.success('Transaction categorized')
      setShowCategoryModal(false)
      setSelectedTransaction(null)
      setCategoryForm({ categoryType: '', categoryId: '', invoiceId: '' })
    } catch (error) {
      toast.error(error.message || 'Failed to categorize transaction')
    }
  }

  const handleReconcile = async (transaction) => {
    try {
      await reconcileTransaction({
        id: transaction.id,
        reconciled: !transaction.is_reconciled,
      })
      toast.success(transaction.is_reconciled ? 'Transaction unmarked' : 'Transaction reconciled')
    } catch (error) {
      toast.error(error.message || 'Failed to update transaction')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTransaction(selectedTransaction.id)
      toast.success('Transaction deleted')
      setShowDeleteModal(false)
      setSelectedTransaction(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete transaction')
    }
  }

  const categoryOptions = {
    client: clients.map((c) => ({ value: c.id, label: c.name })),
    supplier: suppliers.map((s) => ({ value: s.id, label: s.name })),
    account: accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` })),
  }

  const columns = [
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-gray-600">{formatDate(row.date)}</span>
      ),
    },
    {
      header: 'Description',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 truncate max-w-xs">
            {row.description}
          </p>
          {row.reference && (
            <p className="text-xs text-gray-500">Ref: {row.reference}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (row) => {
        if (!row.category_type) {
          return <span className="text-gray-400 text-sm">Uncategorized</span>
        }
        return (
          <span className="text-sm text-gray-600">
            {row.client?.name || row.supplier?.name || row.account?.name}
          </span>
        )
      },
    },
    {
      header: 'Amount',
      align: 'right',
      cell: (row) => (
        <span
          className={`font-medium ${row.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}
        >
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(row.amount, activeCompany?.currency)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReconcile(row)
          }}
          className={`flex items-center gap-1 text-sm ${row.is_reconciled ? 'text-green-600' : 'text-gray-400'}`}
        >
          {row.is_reconciled ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          {row.is_reconciled ? 'Reconciled' : 'Pending'}
        </button>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedTransaction(row)
              setCategoryForm({
                categoryType: row.category_type || '',
                categoryId: row.client_id || row.supplier_id || row.account_id || '',
                invoiceId: row.invoice_id || row.supplier_invoice_id || '',
              })
              setShowCategoryModal(true)
            }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Categorize"
          >
            <Tag className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedTransaction(row)
              setShowDeleteModal(true)
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banking</h1>
          <p className="text-gray-600">Import and reconcile bank transactions</p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select
            value={filterReconciled}
            onChange={(e) => setFilterReconciled(e.target.value)}
            options={[
              { value: 'all', label: 'All Transactions' },
              { value: 'pending', label: 'Pending' },
              { value: 'reconciled', label: 'Reconciled' },
            ]}
            className="w-48"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        isLoading={isLoading}
        searchPlaceholder="Search transactions..."
        emptyMessage="No transactions yet. Import a bank statement to get started."
      />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Bank Statement"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Found {importedData.length} rows. Map the columns below:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Date Column *"
              value={columnMapping.date}
              onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
              options={Object.keys(importedData[0] || {}).map((h) => ({
                value: h,
                label: h,
              }))}
              placeholder="Select column"
            />
            <Select
              label="Description Column *"
              value={columnMapping.description}
              onChange={(e) =>
                setColumnMapping({ ...columnMapping, description: e.target.value })
              }
              options={Object.keys(importedData[0] || {}).map((h) => ({
                value: h,
                label: h,
              }))}
              placeholder="Select column"
            />
            <Select
              label="Amount Column *"
              value={columnMapping.amount}
              onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
              options={Object.keys(importedData[0] || {}).map((h) => ({
                value: h,
                label: h,
              }))}
              placeholder="Select column"
            />
            <Select
              label="Reference Column"
              value={columnMapping.reference}
              onChange={(e) =>
                setColumnMapping({ ...columnMapping, reference: e.target.value })
              }
              options={Object.keys(importedData[0] || {}).map((h) => ({
                value: h,
                label: h,
              }))}
              placeholder="Select column (optional)"
            />
          </div>

          {importedData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 rows)</p>
              <div className="text-sm text-gray-600 space-y-1">
                {importedData.slice(0, 3).map((row, i) => (
                  <div key={i} className="flex gap-4">
                    <span>{row[columnMapping.date]}</span>
                    <span className="truncate flex-1">{row[columnMapping.description]}</span>
                    <span>{row[columnMapping.amount]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} loading={isImporting}>
              Import {importedData.length} Transactions
            </Button>
          </div>
        </div>
      </Modal>

      {/* Categorize Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Categorize Transaction"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Transaction</p>
            <p className="font-medium">{selectedTransaction?.description}</p>
            <p className={selectedTransaction?.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
              {selectedTransaction?.type === 'credit' ? '+' : '-'}
              {formatCurrency(selectedTransaction?.amount, activeCompany?.currency)}
            </p>
          </div>

          <Select
            label="Category Type"
            value={categoryForm.categoryType}
            onChange={(e) =>
              setCategoryForm({ ...categoryForm, categoryType: e.target.value, categoryId: '' })
            }
            options={[
              { value: 'client', label: 'Client (Income)' },
              { value: 'supplier', label: 'Supplier (Expense)' },
              { value: 'account', label: 'Account' },
            ]}
            placeholder="Select category type"
          />

          {categoryForm.categoryType && (
            <Select
              label={
                categoryForm.categoryType === 'client'
                  ? 'Client'
                  : categoryForm.categoryType === 'supplier'
                  ? 'Supplier'
                  : 'Account'
              }
              value={categoryForm.categoryId}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, categoryId: e.target.value })
              }
              options={categoryOptions[categoryForm.categoryType]}
              placeholder={`Select ${categoryForm.categoryType}`}
            />
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCategorize} loading={isCategorizing}>
              Save Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}

export default Banking

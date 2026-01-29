import { useState, useRef, useEffect } from 'react'
import { Upload, CheckCircle, Circle, Tag, Trash2, Filter, Link2, History, Zap } from 'lucide-react'
import { useBanking } from '../hooks/useBanking'
import { useClients } from '../hooks/useClients'
import { useSuppliers } from '../hooks/useSuppliers'
import { useAccounts } from '../hooks/useAccounts'
import { useInvoices } from '../hooks/useInvoices'
import { usePurchases } from '../hooks/usePurchases'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input, { Textarea } from '../components/ui/Input'
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
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [filterReconciled, setFilterReconciled] = useState('all')
  const [matchingSuggestions, setMatchingSuggestions] = useState([])
  const [matchForm, setMatchForm] = useState({
    matchToType: '',
    matchToId: '',
    notes: '',
    autoReconcile: false,
  })
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
    matchTransaction,
    autoMatchTransactions,
    getMatchingSuggestions,
    reconciliationHistory,
    isImporting,
    isCategorizing,
    isMatching,
    isAutoMatching,
  } = useBanking({
    reconciled: filterReconciled === 'all' ? undefined : filterReconciled === 'reconciled',
  })

  const { clients } = useClients()
  const { suppliers } = useSuppliers()
  const { accounts } = useAccounts()
  const { invoices } = useInvoices({ status: 'all' })
  const { purchases } = usePurchases({ status: 'all' })
  const toast = useToast()

  // Load suggestions when match modal opens
  useEffect(() => {
    if (showMatchModal && selectedTransaction) {
      getMatchingSuggestions(selectedTransaction.id).then(setMatchingSuggestions).catch(() => setMatchingSuggestions([]))
    }
  }, [showMatchModal, selectedTransaction])

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

  const handleMatch = async () => {
    if (!matchForm.matchToType || !matchForm.matchToId) {
      toast.error('Please select what to match this transaction to')
      return
    }

    try {
      await matchTransaction({
        transactionId: selectedTransaction.id,
        matchToType: matchForm.matchToType,
        matchToId: matchForm.matchToId,
        notes: matchForm.notes || null,
        autoReconcile: matchForm.autoReconcile,
      })
      toast.success('Transaction matched' + (matchForm.autoReconcile ? ' and reconciled' : ''))
      setShowMatchModal(false)
      setSelectedTransaction(null)
      setMatchForm({ matchToType: '', matchToId: '', notes: '', autoReconcile: false })
      setMatchingSuggestions([])
    } catch (error) {
      toast.error(error.message || 'Failed to match transaction')
    }
  }

  const handleAutoMatch = async () => {
    try {
      const result = await autoMatchTransactions({})
      toast.success(`Auto-matched ${result.matched} transaction(s)`)
      if (result.errors?.length > 0) {
        toast.error(`${result.errors.length} error(s) occurred`)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to auto-match transactions')
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setMatchForm({
      matchToType: suggestion.type,
      matchToId: suggestion.id,
      notes: '',
      autoReconcile: false,
    })
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
              setMatchForm({
                matchToType: row.invoice_id ? 'invoice' : row.supplier_invoice_id ? 'supplier_invoice' : row.account_id ? 'account' : '',
                matchToId: row.invoice_id || row.supplier_invoice_id || row.account_id || '',
                notes: '',
                autoReconcile: false,
              })
              setShowMatchModal(true)
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Match"
          >
            <Link2 className="w-4 h-4" />
          </button>
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
          <Button variant="outline" onClick={handleAutoMatch} loading={isAutoMatching} className="w-full sm:w-auto">
            <Zap className="w-4 h-4 mr-2" />
            Auto-Match
          </Button>
          <Button variant="outline" onClick={() => setShowHistoryModal(true)} className="w-full sm:w-auto">
            <History className="w-4 h-4 mr-2" />
            History
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

      {/* Match Modal */}
      <Modal
        isOpen={showMatchModal}
        onClose={() => {
          setShowMatchModal(false)
          setMatchForm({ matchToType: '', matchToId: '', notes: '', autoReconcile: false })
          setMatchingSuggestions([])
        }}
        title="Match Transaction"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Transaction</p>
            <p className="font-medium">{selectedTransaction?.description}</p>
            <p className={selectedTransaction?.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
              {selectedTransaction?.type === 'credit' ? '+' : '-'}
              {formatCurrency(selectedTransaction?.amount, activeCompany?.currency)}
            </p>
            <p className="text-sm text-gray-500">{formatDate(selectedTransaction?.date)}</p>
          </div>

          {/* Suggestions */}
          {matchingSuggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Suggestions</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {matchingSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {s.type === 'invoice' ? `Invoice ${s.invoice_number}` : `Purchase ${s.invoice_number}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.client || s.supplier} • {formatDate(s.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(s.amount, activeCompany?.currency)}</p>
                        <p className="text-xs text-gray-500">Score: {Math.round(s.score)}%</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Select
            label="Match To"
            value={matchForm.matchToType}
            onChange={(e) => setMatchForm({ ...matchForm, matchToType: e.target.value, matchToId: '' })}
            options={[
              { value: 'invoice', label: 'Invoice' },
              { value: 'supplier_invoice', label: 'Supplier Invoice' },
              { value: 'account', label: 'Account' },
            ]}
            placeholder="Select match type"
          />

          {matchForm.matchToType === 'invoice' && (
            <Select
              label="Invoice"
              value={matchForm.matchToId}
              onChange={(e) => setMatchForm({ ...matchForm, matchToId: e.target.value })}
              options={(invoices || []).map((inv) => ({
                value: inv.id,
                label: `${inv.invoice_number} - ${inv.client?.name || 'Unknown'} - ${formatCurrency(inv.total, activeCompany?.currency)}`,
              }))}
              placeholder="Select invoice"
            />
          )}

          {matchForm.matchToType === 'supplier_invoice' && (
            <Select
              label="Supplier Invoice"
              value={matchForm.matchToId}
              onChange={(e) => setMatchForm({ ...matchForm, matchToId: e.target.value })}
              options={(purchases || []).map((pur) => ({
                value: pur.id,
                label: `${pur.invoice_number} - ${pur.supplier?.name || 'Unknown'} - ${formatCurrency(pur.total, activeCompany?.currency)}`,
              }))}
              placeholder="Select supplier invoice"
            />
          )}

          {matchForm.matchToType === 'account' && (
            <Select
              label="Account"
              value={matchForm.matchToId}
              onChange={(e) => setMatchForm({ ...matchForm, matchToId: e.target.value })}
              options={accounts.map((acc) => ({
                value: acc.id,
                label: `${acc.code} - ${acc.name}`,
              }))}
              placeholder="Select account"
            />
          )}

          <Textarea
            label="Notes (optional)"
            value={matchForm.notes}
            onChange={(e) => setMatchForm({ ...matchForm, notes: e.target.value })}
            placeholder="Add notes about this match"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoReconcile"
              checked={matchForm.autoReconcile}
              onChange={(e) => setMatchForm({ ...matchForm, autoReconcile: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="autoReconcile" className="text-sm text-gray-700">
              Automatically reconcile after matching
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowMatchModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleMatch} loading={isMatching}>
              Match Transaction
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Reconciliation History"
        size="lg"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto">
            {reconciliationHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No reconciliation history yet</p>
            ) : (
              <div className="space-y-3">
                {reconciliationHistory.map((entry) => (
                  <div key={entry.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {entry.bank_transaction?.description || 'Transaction'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(entry.reconciled_at)} • {entry.match_method === 'manual' ? 'Manual' : entry.match_method === 'auto_rule' ? 'Auto Rule' : 'Suggestion'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        entry.action === 'reconciled' ? 'bg-green-100 text-green-700' :
                        entry.action === 'matched' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {entry.action}
                      </span>
                    </div>
                    {entry.matched_to_type && (
                      <p className="text-xs text-gray-600">
                        Matched to: {entry.matched_to_type} {entry.matched_to_id ? `(${entry.matched_to_id.substring(0, 8)}...)` : ''}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-gray-500 mt-1">Note: {entry.notes}</p>
                    )}
                    {entry.reconciled_by_profile && (
                      <p className="text-xs text-gray-400 mt-1">
                        By: {entry.reconciled_by_profile.full_name || entry.reconciled_by_profile.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
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

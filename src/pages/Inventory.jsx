import { useState, useEffect } from 'react'
import { Package, AlertTriangle, Plus, CheckCircle, ClipboardList } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useStockAdjustments } from '../hooks/useInventory'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'
import { formatCurrency, formatDate } from '../lib/constants'
import { format } from 'date-fns'

const Inventory = () => {
  const { activeCompany } = useCompany()
  const toast = useToast()
  const { products, lowStockProducts, isLoading } = useProducts({ activeOnly: true })
  const {
    adjustments,
    isLoading: adjustmentsLoading,
    getNextAdjustmentNumber,
    createStockAdjustment,
    postStockAdjustment,
    isCreating,
    isPosting,
  } = useStockAdjustments()
  const [filterTracked] = useState(true)
  const trackedProducts = filterTracked ? products.filter((p) => p.track_inventory) : products

  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showPostConfirm, setShowPostConfirm] = useState(false)
  const [adjustmentToPost, setAdjustmentToPost] = useState(null)
  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustment_number: '',
    adjustment_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  })
  const [adjustmentLines, setAdjustmentLines] = useState([
    { product_id: '', qty_before: 0, qty_after: '', unit_cost: 0 },
  ])

  useEffect(() => {
    if (showAdjustmentModal && trackedProducts.length > 0) {
      getNextAdjustmentNumber().then((num) => {
        setAdjustmentForm((prev) => ({ ...prev, adjustment_number: num }))
      }).catch(() => setAdjustmentForm((prev) => ({ ...prev, adjustment_number: 'ADJ-0001' })))
    }
  }, [showAdjustmentModal, getNextAdjustmentNumber, trackedProducts.length])

  const totalValuation = trackedProducts.reduce(
    (sum, p) => sum + Number(p.qty_on_hand || 0) * Number(p.avg_cost || 0),
    0
  )

  const handleAddAdjustmentLine = () => {
    setAdjustmentLines([
      ...adjustmentLines,
      { product_id: '', qty_before: 0, qty_after: '', unit_cost: 0 },
    ])
  }

  const handleRemoveAdjustmentLine = (index) => {
    if (adjustmentLines.length > 1) {
      setAdjustmentLines(adjustmentLines.filter((_, i) => i !== index))
    }
  }

  const handleAdjustmentLineProduct = (index, productId) => {
    const product = trackedProducts.find((p) => p.id === productId)
    const newLines = [...adjustmentLines]
    newLines[index] = {
      product_id: productId || '',
      qty_before: product ? Number(product.qty_on_hand) : 0,
      qty_after: product ? Number(product.qty_on_hand) : '',
      unit_cost: product ? Number(product.avg_cost) : 0,
    }
    setAdjustmentLines(newLines)
  }

  const handleAdjustmentLineChange = (index, field, value) => {
    const newLines = [...adjustmentLines]
    newLines[index] = { ...newLines[index], [field]: value }
    setAdjustmentLines(newLines)
  }

  const handleSaveAdjustment = async (e) => {
    e.preventDefault()
    const validLines = adjustmentLines.filter((l) => l.product_id && l.qty_after !== '' && l.qty_after !== null)
    if (validLines.length === 0) {
      toast.error('Add at least one line with a product and quantity')
      return
    }
    const lines = validLines.map((l) => {
      const qtyAfter = Number(l.qty_after)
      const qtyBefore = Number(l.qty_before)
      return {
        product_id: l.product_id,
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        qty_delta: qtyAfter - qtyBefore,
        unit_cost: Number(l.unit_cost) || 0,
      }
    })
    try {
      await createStockAdjustment({
        ...adjustmentForm,
        status: 'draft',
        lines,
      })
      toast.success('Stock adjustment created')
      setShowAdjustmentModal(false)
      setAdjustmentForm({ adjustment_number: '', adjustment_date: format(new Date(), 'yyyy-MM-dd'), reason: '' })
      setAdjustmentLines([{ product_id: '', qty_before: 0, qty_after: '', unit_cost: 0 }])
    } catch (err) {
      toast.error(err.message || 'Failed to create adjustment')
    }
  }

  const handlePostAdjustment = async () => {
    if (!adjustmentToPost) return
    try {
      await postStockAdjustment(adjustmentToPost.id)
      toast.success('Stock adjustment posted')
      setShowPostConfirm(false)
      setAdjustmentToPost(null)
    } catch (err) {
      toast.error(err.message || 'Failed to post adjustment')
    }
  }

  const productOptions = trackedProducts.map((p) => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name }))

  const columns = [
    {
      header: 'Product',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            {row.sku && <p className="text-xs text-gray-500">SKU: {row.sku}</p>}
          </div>
          {Number(row.reorder_level) > 0 && Number(row.qty_on_hand) <= Number(row.reorder_level) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3 h-3" />
              Low stock
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'On Hand',
      align: 'right',
      cell: (row) => (
        <span className="font-mono font-medium text-gray-900">{Number(row.qty_on_hand)}</span>
      ),
    },
    {
      header: 'Reorder Level',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-gray-600">{Number(row.reorder_level) || '—'}</span>
      ),
    },
    {
      header: 'Avg Cost',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-gray-600">
          {formatCurrency(row.avg_cost, activeCompany?.currency)}
        </span>
      ),
    },
    {
      header: 'Value',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-gray-900">
          {formatCurrency(Number(row.qty_on_hand || 0) * Number(row.avg_cost || 0), activeCompany?.currency)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Stock levels, valuation, and stock take</p>
        </div>
        <Button
          onClick={() => setShowAdjustmentModal(true)}
          disabled={trackedProducts.length === 0}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Stock Adjustment
        </Button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{lowStockProducts.length}</strong> product(s) at or below reorder level. Adjust stock via Purchases or run a stock take.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Tracked Products</p>
          <p className="text-2xl font-bold text-gray-900">{trackedProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Low Stock Items</p>
          <p className="text-2xl font-bold text-amber-600">{lowStockProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Inventory Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalValuation, activeCompany?.currency)}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={trackedProducts}
        isLoading={isLoading}
        searchPlaceholder="Search products..."
        emptyMessage="No inventory-tracked products. Enable “Track inventory” on products, then record purchases to see stock and value here."
      />

      {/* Stock Adjustments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Stock Adjustments
        </h2>
        {adjustmentsLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded" />
        ) : adjustments.length === 0 ? (
          <p className="text-gray-500 text-sm">No stock adjustments yet. Use “Stock Adjustment” to run a stock take or correct quantities.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{adj.adjustment_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(adj.adjustment_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{adj.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          adj.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {adj.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {adj.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustmentToPost(adj)
                            setShowPostConfirm(true)
                          }}
                          loading={isPosting && adjustmentToPost?.id === adj.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Post
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title="New Stock Adjustment"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <Input
            label="Adjustment Number"
            value={adjustmentForm.adjustment_number}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustment_number: e.target.value })}
            required
          />
          <Input
            label="Date"
            type="date"
            value={adjustmentForm.adjustment_date}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustment_date: e.target.value })}
            required
          />
          <Textarea
            label="Reason"
            value={adjustmentForm.reason}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
            placeholder="e.g. Stock take, damage, found"
            rows={2}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Lines</p>
            <div className="space-y-3">
              {adjustmentLines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-12 sm:col-span-4">
                    <Select
                      placeholder="Product"
                      value={line.product_id || ''}
                      onChange={(e) => handleAdjustmentLineProduct(index, e.target.value)}
                      options={productOptions}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input label="Before" type="number" value={line.qty_before} disabled />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      label="After"
                      type="number"
                      value={line.qty_after}
                      onChange={(e) => handleAdjustmentLineChange(index, 'qty_after', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      label="Unit cost"
                      type="number"
                      value={line.unit_cost}
                      onChange={(e) => handleAdjustmentLineChange(index, 'unit_cost', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveAdjustmentLine(index)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                      disabled={adjustmentLines.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={handleAddAdjustmentLine} className="mt-2 w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Line
            </Button>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAdjustmentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Create Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={handlePostAdjustment}
        title="Post Stock Adjustment"
        message={
          adjustmentToPost
            ? `Post "${adjustmentToPost.adjustment_number}"? This will update stock levels and create journal entries. This cannot be undone.`
            : ''
        }
        confirmText="Post"
        loading={isPosting}
      />
    </div>
  )
}

export default Inventory

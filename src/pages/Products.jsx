import { useState } from 'react'
import { Plus, Edit, Trash2, Package, AlertTriangle } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'
import { formatCurrency } from '../lib/constants'
import { useCompany } from '../context/CompanyContext'

const PRODUCT_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
]

const Products = () => {
  const { activeCompany } = useCompany()
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [formData, setFormData] = useState({
    type: 'product',
    name: '',
    sku: '',
    description: '',
    sales_price: 0,
    purchase_cost: 0,
    vat_rate_default: 15,
    track_inventory: false,
    reorder_level: 0,
    reorder_quantity: 0,
    is_active: true,
  })

  const {
    products,
    lowStockProducts,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreating,
    isUpdating,
    isDeleting,
  } = useProducts({ type: typeFilter })
  const toast = useToast()

  const resetForm = () => {
    setFormData({
      type: 'product',
      name: '',
      sku: '',
      description: '',
      sales_price: 0,
      purchase_cost: 0,
      vat_rate_default: 15,
      track_inventory: false,
      reorder_level: 0,
      reorder_quantity: 0,
      is_active: true,
    })
    setSelectedProduct(null)
  }

  const handleOpenModal = (product = null) => {
    if (product) {
      setSelectedProduct(product)
      setFormData({
        type: product.type || 'product',
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        sales_price: Number(product.sales_price) || 0,
        purchase_cost: Number(product.purchase_cost) || 0,
        vat_rate_default: Number(product.vat_rate_default) ?? 15,
        track_inventory: product.track_inventory || false,
        reorder_level: Number(product.reorder_level) || 0,
        reorder_quantity: Number(product.reorder_quantity) || 0,
        is_active: product.is_active !== false,
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        sales_price: Number(formData.sales_price) || 0,
        purchase_cost: Number(formData.purchase_cost) || 0,
        vat_rate_default: Number(formData.vat_rate_default) ?? 15,
        reorder_level: Number(formData.reorder_level) || 0,
        reorder_quantity: Number(formData.reorder_quantity) || 0,
      }
      if (selectedProduct) {
        await updateProduct({ id: selectedProduct.id, ...payload })
        toast.success('Product updated successfully')
      } else {
        await createProduct(payload)
        toast.success('Product created successfully')
      }
      setShowModal(false)
      resetForm()
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProduct(selectedProduct.id)
      toast.success('Product deleted successfully')
      setShowDeleteModal(false)
      setSelectedProduct(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete product')
    }
  }

  const isLowStock = (row) =>
    row.track_inventory && Number(row.reorder_level) > 0 && Number(row.qty_on_hand) <= Number(row.reorder_level)

  const columns = [
    {
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            {row.sku && <p className="text-xs text-gray-500">SKU: {row.sku}</p>}
          </div>
          {isLowStock(row) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="Low stock">
              <AlertTriangle className="w-3 h-3" />
              Low
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (row) => (
        <span className="capitalize text-gray-600">{row.type}</span>
      ),
    },
    {
      header: 'Sales Price',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-gray-900">
          {formatCurrency(row.sales_price, activeCompany?.currency)}
        </span>
      ),
    },
    {
      header: 'Purchase Cost',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-gray-600">
          {formatCurrency(row.purchase_cost, activeCompany?.currency)}
        </span>
      ),
    },
    {
      header: 'Stock',
      align: 'right',
      cell: (row) =>
        row.track_inventory ? (
          <span className="font-mono text-gray-900">{Number(row.qty_on_hand)}</span>
        ) : (
          <span className="text-gray-400">—</span>
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
              handleOpenModal(row)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedProduct(row)
              setShowDeleteModal(true)
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
          <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
          <p className="text-gray-600">Manage your product and service catalog</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{lowStockProducts.length}</strong> product(s) below reorder level. Review in Inventory or adjust reorder levels.
          </p>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            typeFilter === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All
        </button>
        {PRODUCT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              typeFilter === t.value ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchPlaceholder="Search products..."
        emptyMessage="No products yet. Add your first product or service to get started."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedProduct ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={PRODUCT_TYPES}
          />
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Product or service name"
            required
          />
          <Input
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Stock keeping unit (optional)"
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sales Price"
              type="number"
              min="0"
              step="0.01"
              value={formData.sales_price}
              onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
            />
            <Input
              label="Purchase Cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.purchase_cost}
              onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
            />
          </div>
          <Input
            label="Default VAT %"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.vat_rate_default}
            onChange={(e) => setFormData({ ...formData, vat_rate_default: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="track_inventory"
              checked={formData.track_inventory}
              onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="track_inventory" className="text-sm font-medium text-gray-700">
              Track inventory (stock levels)
            </label>
          </div>
          {formData.track_inventory && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <Input
                label="Reorder Level"
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                helperText="Alert when stock at or below"
              />
              <Input
                label="Reorder Quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_quantity}
                onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                helperText="Suggested order qty"
              />
            </div>
          )}
          {selectedProduct && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (show in catalog)
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {selectedProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This will deactivate the product.`}
        confirmText="Delete"
        loading={isDeleting}
      />
    </div>
  )
}

export default Products

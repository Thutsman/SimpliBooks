import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, UserPlus } from 'lucide-react'
import { usePurchases } from '../hooks/usePurchases'
import { useSuppliers } from '../hooks/useSuppliers'
import { useAccounts } from '../hooks/useAccounts'
import { useProducts } from '../hooks/useProducts'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../lib/constants'
import { format, addDays } from 'date-fns'

const PurchaseDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !id || id === 'new'

  const { activeCompany } = useCompany()
  const { suppliers, createSupplier, isCreating: isCreatingSupplier } = useSuppliers()
  const { accounts } = useAccounts()
  const { products, isLoading: productsLoading, refetchProducts } = useProducts()

  // Quick Add Supplier modal state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const {
    usePurchase,
    createPurchase,
    updatePurchase,
    isCreating,
    isUpdating,
  } = usePurchases()

  // Always call the hook unconditionally - the enabled option inside handles the condition
  const { data: purchaseData, isLoading: purchaseLoading } = usePurchase(isNew ? null : id)

  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: '',
    reference: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'unpaid',
    notes: '',
  })

  const [items, setItems] = useState([
    { product_id: '', description: '', quantity: 1, unit_price: 0, vat_rate: 15, account_id: '' },
  ])
  const itemsLocked = !isNew

  // Refetch products when opening New Purchase so the dropdown has the latest list (e.g. after creating a product)
  useEffect(() => {
    if (isNew) refetchProducts()
  }, [isNew, refetchProducts])

  useEffect(() => {
    if (purchaseData) {
      setFormData({
        invoice_number: purchaseData.invoice_number || '',
        supplier_id: purchaseData.supplier_id || '',
        reference: purchaseData.reference || '',
        issue_date: purchaseData.issue_date || format(new Date(), 'yyyy-MM-dd'),
        due_date: purchaseData.due_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: purchaseData.status || 'unpaid',
        notes: purchaseData.notes || '',
      })
      if (purchaseData.items && purchaseData.items.length > 0) {
        setItems(
          purchaseData.items.map((item) => ({
            product_id: item.product_id || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: Number(item.unit_price) || 0,
            vat_rate: Number(item.vat_rate) || 15,
            account_id: item.account_id || '',
          }))
        )
      }
    }
  }, [purchaseData])

  const calculateLineTotal = (item) => {
    const subtotal = Number(item.quantity) * Number(item.unit_price)
    const vat = subtotal * (Number(item.vat_rate) / 100)
    return { subtotal, vat, total: subtotal + vat }
  }

  const totals = items.reduce(
    (acc, item) => {
      const { subtotal, vat, total } = calculateLineTotal(item)
      return {
        subtotal: acc.subtotal + subtotal,
        vat: acc.vat + vat,
        total: acc.total + total,
      }
    },
    { subtotal: 0, vat: 0, total: 0 }
  )

  const handleAddItem = () => {
    setItems([
      ...items,
      { product_id: '', description: '', quantity: 1, unit_price: 0, vat_rate: 15, account_id: '' },
    ])
  }

  const handleSelectProduct = (index, productId) => {
    if (!productId) {
      handleItemChange(index, 'product_id', '')
      return
    }
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      product_id: product.id,
      description: product.name || newItems[index].description,
      unit_price: Number(product.purchase_cost) || 0,
      vat_rate: Number(product.vat_rate_default) ?? 15,
    }
    setItems(newItems)
  }

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  // Quick Add Supplier handlers
  const handleQuickAddSupplier = async (e) => {
    e.preventDefault()
    if (!newSupplierData.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    try {
      const newSupplier = await createSupplier(newSupplierData)
      toast.success('Supplier created successfully')
      // Auto-select the new supplier
      setFormData((prev) => ({ ...prev, supplier_id: newSupplier.id }))
      // Reset and close modal
      setNewSupplierData({ name: '', email: '', phone: '' })
      setShowAddSupplierModal(false)
    } catch (error) {
      toast.error(error.message || 'Failed to create supplier')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.invoice_number) {
      toast.error('Please enter an invoice number')
      return
    }

    if (items.every((item) => !item.description)) {
      toast.error('Please add at least one line item')
      return
    }

    const preparedItems = items
      .filter((item) => item.description)
      .map((item) => {
        const { subtotal, vat } = calculateLineTotal(item)
        return {
          product_id: item.product_id || null,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
          vat_amount: vat,
          line_total: subtotal + vat,
          account_id: item.account_id || null,
        }
      })

    const purchasePayload = {
      ...formData,
      subtotal: totals.subtotal,
      vat_amount: totals.vat,
      total: totals.total,
      items: preparedItems,
    }

    try {
      if (isNew) {
        const purchase = await createPurchase(purchasePayload)
        toast.success('Purchase created successfully')
        navigate(`/dashboard/purchases/${purchase.id}`)
      } else {
        await updatePurchase({ id, ...purchasePayload })
        toast.success('Purchase updated successfully')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save purchase')
    }
  }

  const expenseAccounts = accounts.filter((a) => a.type === 'expense')
  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }))
  const accountOptions = expenseAccounts.map((a) => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
  }))
  const productOptions = products.map((p) => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name }))

  if (!isNew && purchaseLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/purchases')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isNew ? 'New Purchase' : `Purchase ${formData.invoice_number}`}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {isNew ? 'Record a supplier invoice' : 'Edit purchase details'}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} loading={isCreating || isUpdating} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {isNew ? 'Create' : 'Save'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Number *"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number: e.target.value })
                }
                placeholder="Supplier's invoice number"
                required
              />
              <Input
                label="Reference"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                placeholder="Your reference"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Supplier"
                    value={formData.supplier_id}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_id: e.target.value })
                    }
                    options={supplierOptions}
                    placeholder="Select a supplier (optional)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg border border-accent-200 transition-colors"
                  title="Add new supplier"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
              {suppliers.length === 0 && (
                <p className="text-xs text-gray-500">
                  No suppliers yet. Click "New" to add your first supplier.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Issue Date"
                type="date"
                value={formData.issue_date}
                onChange={(e) =>
                  setFormData({ ...formData, issue_date: e.target.value })
                }
                required
              />
              <Input
                label="Due Date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
              {itemsLocked && (
                <span className="text-sm text-amber-600 font-medium">Line items locked (purchase already recorded)</span>
              )}
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start p-4 bg-gray-50 rounded-lg"
                >
                  <div className="col-span-12 sm:col-span-2">
                    <Select
                      label="Product"
                      placeholder={productsLoading ? 'Loading...' : 'Select product...'}
                      value={item.product_id || ''}
                      onChange={(e) => handleSelectProduct(index, e.target.value)}
                      options={productOptions}
                      disabled={itemsLocked || productsLoading}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-2">
                    <Input
                      label="Description"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                      disabled={itemsLocked}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Select
                      label="Account"
                      value={item.account_id}
                      onChange={(e) =>
                        handleItemChange(index, 'account_id', e.target.value)
                      }
                      options={accountOptions}
                      placeholder="Account"
                      disabled={itemsLocked}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Input
                      label="Qty"
                      type="number"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                      min="0"
                      step="0.01"
                      disabled={itemsLocked}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input
                      label="Price"
                      type="number"
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleItemChange(index, 'unit_price', e.target.value)
                      }
                      min="0"
                      step="0.01"
                      disabled={itemsLocked}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input
                      label="VAT %"
                      type="number"
                      placeholder="0"
                      value={item.vat_rate}
                      onChange={(e) =>
                        handleItemChange(index, 'vat_rate', e.target.value)
                      }
                      min="0"
                      max="100"
                      disabled={itemsLocked}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1 flex items-end justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:pointer-events-none"
                      disabled={items.length === 1 || itemsLocked}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="col-span-12 text-right text-sm text-gray-600">
                    Line Total: {formatCurrency(calculateLineTotal(item).total, activeCompany?.currency)}
                  </div>
                </div>
              ))}
            </div>

            {!itemsLocked && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes about this purchase"
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Summary
            </h3>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal, activeCompany?.currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT</span>
              <span>{formatCurrency(totals.vat, activeCompany?.currency)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
              <span>Total</span>
              <span>{formatCurrency(totals.total, activeCompany?.currency)}</span>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Supplier Modal */}
      <Modal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        title="Quick Add Supplier"
      >
        <form onSubmit={handleQuickAddSupplier} className="space-y-4">
          <Input
            label="Supplier Name *"
            value={newSupplierData.name}
            onChange={(e) =>
              setNewSupplierData({ ...newSupplierData, name: e.target.value })
            }
            placeholder="Enter supplier name"
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={newSupplierData.email}
            onChange={(e) =>
              setNewSupplierData({ ...newSupplierData, email: e.target.value })
            }
            placeholder="supplier@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={newSupplierData.phone}
            onChange={(e) =>
              setNewSupplierData({ ...newSupplierData, phone: e.target.value })
            }
            placeholder="+27 12 345 6789"
          />
          <p className="text-xs text-gray-500">
            You can add more details later from the Suppliers page.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddSupplierModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isCreatingSupplier}>
              Add Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PurchaseDetail

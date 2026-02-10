import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, UserPlus, Printer, FileDown, FileSpreadsheet } from 'lucide-react'
import { usePurchases } from '../hooks/usePurchases'
import { useSuppliers } from '../hooks/useSuppliers'
import { useAccounts } from '../hooks/useAccounts'
import { useProducts } from '../hooks/useProducts'
import { useCompany } from '../context/CompanyContext'
import { useCompanyCurrencies } from '../hooks/useCompanyCurrencies'
import { useExchangeRateForDate } from '../hooks/useExchangeRates'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { formatCurrency, getDefaultVATRate } from '../lib/constants'
import DocumentPrintView from '../components/documents/DocumentPrintView'
import { exportToPDF, exportToExcel } from '../lib/utils'
import { format, addDays } from 'date-fns'

const PurchaseDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !id || id === 'new'

  const { activeCompany } = useCompany()
  const baseCurrency = activeCompany?.currency || 'ZAR'
  const { enabledCurrencies } = useCompanyCurrencies()
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

  // Default VAT rate based on company country (supports fractional rates like 15.5% for Zimbabwe)
  const defaultVatRate = getDefaultVATRate(activeCompany?.country)

  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: '',
    reference: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'unpaid',
    notes: '',
    currency_code: '',
    fx_rate: 1,
    fx_rate_date: '',
  })

  const documentCurrency = formData.currency_code || baseCurrency
  const isForeignCurrency = documentCurrency !== baseCurrency
  const { data: suggestedRate } = useExchangeRateForDate(
    isForeignCurrency ? documentCurrency : null,
    formData.issue_date
  )

  const [items, setItems] = useState([
    { product_id: '', description: '', quantity: 1, unit_price: 0, vat_rate: defaultVatRate, account_id: '' },
  ])
  const itemsLocked = !isNew

  useEffect(() => {
    if (isForeignCurrency && suggestedRate?.rate && formData.fx_rate === 1) {
      setFormData((prev) => ({ ...prev, fx_rate: suggestedRate.rate }))
    }
  }, [suggestedRate?.rate, isForeignCurrency])

  // Refetch products when opening New Purchase so the dropdown has the latest list (e.g. after creating a product)
  useEffect(() => {
    if (isNew) refetchProducts()
  }, [isNew, refetchProducts])

  useEffect(() => {
    if (isNew && activeCompany && (!formData.currency_code || formData.currency_code === '')) {
      setFormData((prev) => ({
        ...prev,
        currency_code: baseCurrency,
        fx_rate: 1,
        fx_rate_date: format(new Date(), 'yyyy-MM-dd'),
      }))
    }
  }, [isNew, activeCompany, baseCurrency])

  useEffect(() => {
    if (purchaseData) {
      const docCur = purchaseData.currency_code || baseCurrency
      const useFx = docCur !== baseCurrency
      setFormData({
        invoice_number: purchaseData.invoice_number || '',
        supplier_id: purchaseData.supplier_id || '',
        reference: purchaseData.reference || '',
        issue_date: purchaseData.issue_date || format(new Date(), 'yyyy-MM-dd'),
        due_date: purchaseData.due_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: purchaseData.status || 'unpaid',
        notes: purchaseData.notes || '',
        currency_code: docCur,
        fx_rate: Number(purchaseData.fx_rate) || 1,
        fx_rate_date: purchaseData.fx_rate_date || purchaseData.issue_date || '',
      })
      if (purchaseData.items && purchaseData.items.length > 0) {
        setItems(
          purchaseData.items.map((item) => {
            const lineVatRate =
              item.vat_rate !== null && item.vat_rate !== undefined
                ? Number(item.vat_rate)
                : defaultVatRate
            return {
              product_id: item.product_id || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: Number(useFx && item.unit_price_fx != null ? item.unit_price_fx : item.unit_price) || 0,
              vat_rate: lineVatRate,
              account_id: item.account_id || '',
            }
          })
        )
      }
    }
  }, [purchaseData, baseCurrency])

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
      { product_id: '', description: '', quantity: 1, unit_price: 0, vat_rate: defaultVatRate, account_id: '' },
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
        vat_rate: Number(product.vat_rate_default ?? defaultVatRate),
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
    const fxRate = Number(formData.fx_rate) || 1
    if (fxRate <= 0) {
      toast.error('Exchange rate must be greater than 0')
      return
    }
    const allowedCodes = enabledCurrencies.length ? enabledCurrencies.map((ec) => ec.currency_code) : [baseCurrency]
    if (!allowedCodes.includes(documentCurrency)) {
      toast.error('Selected currency is not enabled for this company. Enable it in Settings > Currencies.')
      return
    }

    const isForeign = documentCurrency !== baseCurrency
    const subtotalDoc = totals.subtotal
    const vatDoc = totals.vat
    const totalDoc = totals.total

    const preparedItems = items
      .filter((item) => item.description)
      .map((item) => {
        const { subtotal, vat } = calculateLineTotal(item)
        const lineTotalDoc = subtotal + vat
        const unitPriceBase = isForeign ? Number(item.unit_price) * fxRate : Number(item.unit_price)
        const vatBase = isForeign ? vat * fxRate : vat
        const lineTotalBase = isForeign ? lineTotalDoc * fxRate : lineTotalDoc
        return {
          product_id: item.product_id || null,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: unitPriceBase,
          vat_rate: Number(item.vat_rate),
          vat_amount: vatBase,
          line_total: lineTotalBase,
          account_id: item.account_id || null,
          unit_price_fx: isForeign ? Number(item.unit_price) : unitPriceBase,
          vat_amount_fx: isForeign ? vat : vatBase,
          line_total_fx: isForeign ? lineTotalDoc : lineTotalBase,
        }
      })

    const subtotalBase = isForeign ? subtotalDoc * fxRate : subtotalDoc
    const vatBase = isForeign ? vatDoc * fxRate : vatDoc
    const totalBase = isForeign ? totalDoc * fxRate : totalDoc

    const purchasePayload = {
      ...formData,
      supplier_id: formData.supplier_id || null,
      currency_code: documentCurrency,
      fx_rate: fxRate,
      fx_rate_date: formData.fx_rate_date || formData.issue_date,
      subtotal: subtotalBase,
      vat_amount: vatBase,
      total: totalBase,
      subtotal_fx: subtotalDoc,
      vat_amount_fx: vatDoc,
      total_fx: totalDoc,
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
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none">
            <Printer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await exportToPDF('purchase-print-view', `Purchase-${formData.invoice_number || 'draft'}`)
                toast.success('PDF downloaded')
              } catch (e) {
                toast.error(e?.message || 'PDF export failed')
              }
            }}
            className="flex-1 sm:flex-none"
          >
            <FileDown className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const rows = items
                .filter((i) => i.description || i.quantity || i.unit_price)
                .map((i) => {
                  const { subtotal, vat, total } = calculateLineTotal(i)
                  return {
                    Description: i.description || '',
                    Qty: Number(i.quantity) || 0,
                    'Unit Price': Number(i.unit_price) || 0,
                    'VAT %': Number(i.vat_rate) || 0,
                    Subtotal: subtotal,
                    VAT: vat,
                    Total: total,
                  }
                })
              exportToExcel(rows, `Purchase-${formData.invoice_number || 'draft'}-lines`, 'Lines')
              toast.success('Excel downloaded')
            }}
            className="flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button onClick={handleSubmit} loading={isCreating || isUpdating} className="flex-1 sm:flex-none">
            <Save className="w-4 h-4 mr-2" />
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
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

            {isNew && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Currency"
                  value={documentCurrency}
                  onChange={(e) => {
                    const code = e.target.value
                    setFormData((prev) => ({
                      ...prev,
                      currency_code: code,
                      fx_rate: code === baseCurrency ? 1 : (suggestedRate?.rate || prev.fx_rate || 1),
                      fx_rate_date: prev.fx_rate_date || prev.issue_date || format(new Date(), 'yyyy-MM-dd'),
                    }))
                  }}
                  options={(enabledCurrencies.length ? enabledCurrencies.map((ec) => ({ value: ec.currency_code, label: ec.currency_code })) : [{ value: baseCurrency, label: baseCurrency }])}
                />
                {isForeignCurrency && (
                  <div className="space-y-1">
                    <Input
                      label={`Exchange rate (1 ${documentCurrency} = ? ${baseCurrency})`}
                      type="number"
                      step="0.000001"
                      min="0.000001"
                      value={formData.fx_rate}
                      onChange={(e) => setFormData({ ...formData, fx_rate: e.target.value })}
                      placeholder={suggestedRate?.rate ? String(suggestedRate.rate) : ''}
                    />
                  </div>
                )}
              </div>
            )}
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
                      step="0.01"
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
                    Line Total: {formatCurrency(calculateLineTotal(item).total, documentCurrency)}
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
              <span>{formatCurrency(totals.subtotal, documentCurrency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT</span>
              <span>{formatCurrency(totals.vat, documentCurrency)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
              <span>Total</span>
              <span>{formatCurrency(totals.total, documentCurrency)}</span>
            </div>
            {isForeignCurrency && (
              <p className="text-xs text-gray-500 pt-1">
                ≈ {formatCurrency(totals.total * (Number(formData.fx_rate) || 1), baseCurrency)} in {baseCurrency}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Hidden print/PDF view */}
      <div className="fixed left-[-9999px] top-0 w-[210mm]" aria-hidden="true">
        <DocumentPrintView
          id="purchase-print-view"
          type="purchase"
          company={activeCompany || {}}
          party={suppliers.find((s) => s.id === formData.supplier_id) || {}}
          formData={formData}
          items={items}
          totals={totals}
          baseCurrency={baseCurrency}
          documentCurrency={documentCurrency}
          fxRate={Number(formData.fx_rate) || 1}
        />
      </div>

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

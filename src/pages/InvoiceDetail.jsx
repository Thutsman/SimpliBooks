import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer, UserPlus } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import { useClients } from '../hooks/useClients'
import { useAccounts } from '../hooks/useAccounts'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { formatCurrency, getDefaultVATRate } from '../lib/constants'
import { VATRateInlineSelect } from '../components/ui/VATRateSelect'
import { format, addDays } from 'date-fns'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !id || id === 'new'

  const { activeCompany } = useCompany()
  const { clients, createClient, isCreating: isCreatingClient } = useClients()
  const { accounts } = useAccounts()

  // Quick Add Client modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const {
    useInvoice,
    getNextInvoiceNumber,
    createInvoice,
    updateInvoice,
    isCreating,
    isUpdating,
  } = useInvoices()

  // Always call the hook unconditionally - the enabled option inside handles the condition
  const { data: invoiceData, isLoading: invoiceLoading } = useInvoice(isNew ? null : id)

  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    reference: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'draft',
    notes: '',
    terms: '',
  })

  // Get default VAT rate based on company country
  const defaultVatRate = getDefaultVATRate(activeCompany?.country)

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: defaultVatRate, account_id: '' },
  ])

  // Load invoice data
  useEffect(() => {
    if (isNew && activeCompany?.id) {
      getNextInvoiceNumber().then((num) => {
        setFormData((prev) => ({ ...prev, invoice_number: num }))
      }).catch((error) => {
        console.error('Error getting next invoice number:', error)
        // Fallback to default if there's an error
        setFormData((prev) => ({ ...prev, invoice_number: 'INV-0001' }))
      })
    } else if (invoiceData) {
      setFormData({
        invoice_number: invoiceData.invoice_number || '',
        client_id: invoiceData.client_id || '',
        reference: invoiceData.reference || '',
        issue_date: invoiceData.issue_date || format(new Date(), 'yyyy-MM-dd'),
        due_date: invoiceData.due_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: invoiceData.status || 'draft',
        notes: invoiceData.notes || '',
        terms: invoiceData.terms || '',
      })
      if (invoiceData.items && invoiceData.items.length > 0) {
        setItems(
          invoiceData.items.map((item) => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: Number(item.unit_price) || 0,
            vat_rate: Number(item.vat_rate) || 15,
            account_id: item.account_id || '',
          }))
        )
      }
    }
  }, [isNew, invoiceData, activeCompany?.id])

  // Calculate totals
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
      { description: '', quantity: 1, unit_price: 0, vat_rate: defaultVatRate, account_id: '' },
    ])
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

  // Quick Add Client handlers
  const handleQuickAddClient = async (e) => {
    e.preventDefault()

    if (!newClientData.name.trim()) {
      toast.error('Client name is required')
      return
    }

    try {
      const newClient = await createClient(newClientData)
      toast.success('Client created successfully')
      // Auto-select the new client
      setFormData((prev) => ({ ...prev, client_id: newClient.id }))
      // Reset and close modal
      setNewClientData({ name: '', email: '', phone: '' })
      setShowAddClientModal(false)
    } catch (error) {
      toast.error(error.message || 'Failed to create client')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate
    if (!formData.client_id) {
      toast.error('Please select a client')
      return
    }

    if (items.every((item) => !item.description)) {
      toast.error('Please add at least one line item')
      return
    }

    // Prepare items with calculated values
    const preparedItems = items
      .filter((item) => item.description)
      .map((item) => {
        const { subtotal, vat } = calculateLineTotal(item)
        return {
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
          vat_amount: vat,
          line_total: subtotal + vat,
          account_id: item.account_id || null,
        }
      })

    const invoicePayload = {
      ...formData,
      subtotal: totals.subtotal,
      vat_amount: totals.vat,
      total: totals.total,
      items: preparedItems,
    }

    try {
      if (isNew) {
        const invoice = await createInvoice(invoicePayload)
        toast.success('Invoice created successfully')
        navigate(`/dashboard/invoices/${invoice.id}`)
      } else {
        await updateInvoice({ id, ...invoicePayload })
        toast.success('Invoice updated successfully')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save invoice')
    }
  }

  const incomeAccounts = accounts.filter((a) => a.type === 'income')
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }))
  const accountOptions = incomeAccounts.map((a) => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
  }))

  if (!isNew && invoiceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isNew ? 'New Invoice' : `Invoice ${formData.invoice_number}`}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {isNew ? 'Create a new customer invoice' : 'Edit invoice details'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none">
            <Printer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button onClick={handleSubmit} loading={isCreating || isUpdating} className="flex-1 sm:flex-none">
            <Save className="w-4 h-4 mr-2" />
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Number"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number: e.target.value })
                }
                required
              />
              <Input
                label="Reference"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                placeholder="PO number, job code, etc."
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Client"
                    value={formData.client_id}
                    onChange={(e) =>
                      setFormData({ ...formData, client_id: e.target.value })
                    }
                    options={clientOptions}
                    placeholder="Select a client"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg border border-accent-200 transition-colors"
                  title="Add new client"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
              {clients.length === 0 && (
                <p className="text-xs text-gray-500">
                  No clients yet. Click "New" to add your first client.
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

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-start p-4 bg-gray-50 rounded-lg"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleItemChange(index, 'unit_price', e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <VATRateInlineSelect
                      value={item.vat_rate}
                      onChange={(value) =>
                        handleItemChange(index, 'vat_rate', value)
                      }
                      country={activeCompany?.country}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      disabled={items.length === 1}
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

            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes visible to the client"
              rows={3}
            />
            <Textarea
              label="Terms & Conditions"
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              placeholder="Payment terms, late fees, etc."
              rows={3}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              From
            </h3>
            {activeCompany?.logo_url && (
              <div className="mb-3">
                <img
                  src={activeCompany.logo_url}
                  alt={activeCompany.name}
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
            )}
            <p className="font-medium text-gray-900">{activeCompany?.name}</p>
            {activeCompany?.address_line1 && (
              <p className="text-sm text-gray-600">{activeCompany.address_line1}</p>
            )}
            {activeCompany?.city && activeCompany?.postal_code && (
              <p className="text-sm text-gray-600">
                {activeCompany.city}, {activeCompany.postal_code}
              </p>
            )}
            {activeCompany?.vat_number && (
              <p className="text-sm text-gray-600">VAT: {activeCompany.vat_number}</p>
            )}
            {activeCompany?.email && (
              <p className="text-sm text-gray-600">{activeCompany.email}</p>
            )}
            {activeCompany?.phone && (
              <p className="text-sm text-gray-600">{activeCompany.phone}</p>
            )}
          </div>

          {/* Banking Details */}
          {(activeCompany?.bank_name || activeCompany?.bank_account_number) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Banking Details
              </h3>
              {activeCompany?.bank_name && (
                <p className="text-sm text-gray-900 font-medium">{activeCompany.bank_name}</p>
              )}
              {activeCompany?.bank_account_name && (
                <p className="text-sm text-gray-600">{activeCompany.bank_account_name}</p>
              )}
              {activeCompany?.bank_account_number && (
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">Acc: </span>
                  {activeCompany.bank_account_number}
                </p>
              )}
              {activeCompany?.bank_branch_code && (
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">Branch: </span>
                  {activeCompany.bank_branch_code}
                </p>
              )}
              {activeCompany?.bank_swift_code && (
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">SWIFT: </span>
                  {activeCompany.bank_swift_code}
                </p>
              )}
              {activeCompany?.bank_reference && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="text-gray-500">Reference: </span>
                  {activeCompany.bank_reference}
                </p>
              )}
            </div>
          )}

          {/* Totals */}
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

      {/* Quick Add Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title="Quick Add Client"
      >
        <form onSubmit={handleQuickAddClient} className="space-y-4">
          <Input
            label="Client Name *"
            value={newClientData.name}
            onChange={(e) =>
              setNewClientData({ ...newClientData, name: e.target.value })
            }
            placeholder="Enter client name"
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={newClientData.email}
            onChange={(e) =>
              setNewClientData({ ...newClientData, email: e.target.value })
            }
            placeholder="client@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={newClientData.phone}
            onChange={(e) =>
              setNewClientData({ ...newClientData, phone: e.target.value })
            }
            placeholder="+27 12 345 6789"
          />
          <p className="text-xs text-gray-500">
            You can add more details later from the Clients page.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddClientModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isCreatingClient}>
              Add Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default InvoiceDetail

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer, FileText } from 'lucide-react'
import { useQuotations } from '../hooks/useQuotations'
import { useClients } from '../hooks/useClients'
import { useAccounts } from '../hooks/useAccounts'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import { ConfirmModal } from '../components/ui/Modal'
import { formatCurrency, getDefaultVATRate } from '../lib/constants'
import { VATRateInlineSelect } from '../components/ui/VATRateSelect'
import { format, addDays } from 'date-fns'

const QuotationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !id || id === 'new'

  const { activeCompany } = useCompany()
  const { clients } = useClients()
  const { accounts } = useAccounts()
  const {
    useQuotation,
    getNextQuotationNumber,
    createQuotation,
    updateQuotation,
    convertToInvoice,
    isCreating,
    isUpdating,
    isConverting,
  } = useQuotations()

  const { data: quotationData, isLoading: quotationLoading } = isNew
    ? { data: null, isLoading: false }
    : useQuotation(id)

  const [showConvertModal, setShowConvertModal] = useState(false)
  const [formData, setFormData] = useState({
    quotation_number: '',
    client_id: '',
    reference: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'draft',
    notes: '',
    terms: '',
  })

  // Get default VAT rate based on company country
  const defaultVatRate = getDefaultVATRate(activeCompany?.country)

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: defaultVatRate, account_id: '' },
  ])

  // Load quotation data
  useEffect(() => {
    if (isNew && activeCompany?.id) {
      getNextQuotationNumber().then((num) => {
        setFormData((prev) => ({ ...prev, quotation_number: num }))
      }).catch((error) => {
        console.error('Error getting next quotation number:', error)
        // Fallback to default if there's an error
        setFormData((prev) => ({ ...prev, quotation_number: 'QTN-0001' }))
      })
    } else if (quotationData) {
      setFormData({
        quotation_number: quotationData.quotation_number || '',
        client_id: quotationData.client_id || '',
        reference: quotationData.reference || '',
        issue_date: quotationData.issue_date || format(new Date(), 'yyyy-MM-dd'),
        expiry_date: quotationData.expiry_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: quotationData.status || 'draft',
        notes: quotationData.notes || '',
        terms: quotationData.terms || '',
      })
      if (quotationData.items && quotationData.items.length > 0) {
        setItems(
          quotationData.items.map((item) => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: Number(item.unit_price) || 0,
            vat_rate: Number(item.vat_rate) || 15,
            account_id: item.account_id || '',
          }))
        )
      }
    }
  }, [isNew, quotationData, activeCompany?.id])

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

    const quotationPayload = {
      ...formData,
      subtotal: totals.subtotal,
      vat_amount: totals.vat,
      total: totals.total,
      items: preparedItems,
    }

    try {
      if (isNew) {
        const quotation = await createQuotation(quotationPayload)
        toast.success('Quotation created successfully')
        navigate(`/dashboard/quotations/${quotation.id}`)
      } else {
        await updateQuotation({ id, ...quotationPayload })
        toast.success('Quotation updated successfully')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save quotation')
    }
  }

  const handleConvertToInvoice = async () => {
    try {
      const invoice = await convertToInvoice(id)
      toast.success('Quotation converted to invoice successfully')
      setShowConvertModal(false)
      navigate(`/dashboard/invoices/${invoice.id}`)
    } catch (error) {
      toast.error(error.message || 'Failed to convert quotation')
    }
  }

  const incomeAccounts = accounts.filter((a) => a.type === 'income')
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }))
  const accountOptions = incomeAccounts.map((a) => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
  }))

  const canConvert = quotationData?.status === 'accepted'

  if (!isNew && quotationLoading) {
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
            onClick={() => navigate('/dashboard/quotations')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isNew ? 'New Quotation' : `Quotation ${formData.quotation_number}`}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {isNew ? 'Create a new customer quotation' : 'Edit quotation details'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {canConvert && (
            <Button variant="outline" onClick={() => setShowConvertModal(true)} className="flex-1 sm:flex-none">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Convert to Invoice</span>
              <span className="sm:hidden">Convert</span>
            </Button>
          )}
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
          {/* Quotation Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Quotation Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Quotation Number"
                value={formData.quotation_number}
                onChange={(e) =>
                  setFormData({ ...formData, quotation_number: e.target.value })
                }
                required
              />
              <Input
                label="Reference"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                placeholder="Project name, RFQ number, etc."
              />
            </div>

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
                label="Expiry Date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) =>
                  setFormData({ ...formData, expiry_date: e.target.value })
                }
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
              placeholder="Validity period, payment terms, etc."
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

          {/* Status */}
          {!isNew && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Status
              </h3>
              <span
                className={`
                  inline-block px-3 py-1 rounded-full text-sm font-medium capitalize
                  ${formData.status === 'accepted' ? 'bg-green-100 text-green-700' : ''}
                  ${formData.status === 'sent' ? 'bg-blue-100 text-blue-700' : ''}
                  ${formData.status === 'draft' ? 'bg-gray-100 text-gray-700' : ''}
                  ${formData.status === 'declined' ? 'bg-red-100 text-red-700' : ''}
                  ${formData.status === 'expired' ? 'bg-orange-100 text-orange-700' : ''}
                  ${formData.status === 'converted' ? 'bg-purple-100 text-purple-700' : ''}
                `}
              >
                {formData.status}
              </span>
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

      {/* Convert to Invoice Modal */}
      <ConfirmModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onConfirm={handleConvertToInvoice}
        title="Convert to Invoice"
        message={`Convert quotation "${formData.quotation_number}" to an invoice? This will create a new invoice with the same details and mark this quotation as converted.`}
        confirmText="Convert"
        loading={isConverting}
      />
    </div>
  )
}

export default QuotationDetail

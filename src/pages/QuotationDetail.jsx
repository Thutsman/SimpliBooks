import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Printer, FileText, FileDown, FileSpreadsheet } from 'lucide-react'
import { useQuotations } from '../hooks/useQuotations'
import { useClients } from '../hooks/useClients'
import { useAccounts } from '../hooks/useAccounts'
import { useCompany } from '../context/CompanyContext'
import { useCompanyCurrencies } from '../hooks/useCompanyCurrencies'
import { useExchangeRateForDate } from '../hooks/useExchangeRates'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import { ConfirmModal } from '../components/ui/Modal'
import { formatCurrency, getDefaultVATRate } from '../lib/constants'
import { VATRateInlineSelect } from '../components/ui/VATRateSelect'
import DocumentPrintView from '../components/documents/DocumentPrintView'
import { exportToPDF, exportToExcel } from '../lib/utils'
import { format, addDays } from 'date-fns'

const QuotationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !id || id === 'new'

  const { activeCompany } = useCompany()
  const baseCurrency = activeCompany?.currency || 'ZAR'
  const { enabledCurrencies } = useCompanyCurrencies()
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

  // Get default VAT rate based on company country
  const defaultVatRate = getDefaultVATRate(activeCompany?.country)

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit_price: 0, vat_rate: defaultVatRate, account_id: '' },
  ])

  // Load quotation data
  useEffect(() => {
    if (isNew && activeCompany?.id) {
      getNextQuotationNumber().then((num) => {
        setFormData((prev) => ({
          ...prev,
          quotation_number: num,
          currency_code: baseCurrency,
          fx_rate: 1,
          fx_rate_date: format(new Date(), 'yyyy-MM-dd'),
        }))
      }).catch((error) => {
        console.error('Error getting next quotation number:', error)
        setFormData((prev) => ({ ...prev, quotation_number: 'QTN-0001', currency_code: baseCurrency, fx_rate: 1, fx_rate_date: format(new Date(), 'yyyy-MM-dd') }))
      })
    } else if (quotationData) {
      const docCur = quotationData.currency_code || baseCurrency
      const useFx = docCur !== baseCurrency
      setFormData({
        quotation_number: quotationData.quotation_number || '',
        client_id: quotationData.client_id || '',
        reference: quotationData.reference || '',
        issue_date: quotationData.issue_date || format(new Date(), 'yyyy-MM-dd'),
        expiry_date: quotationData.expiry_date || quotationData.validity_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: quotationData.status || 'draft',
        notes: quotationData.notes || '',
        terms: quotationData.terms || '',
        currency_code: docCur,
        fx_rate: Number(quotationData.fx_rate) || 1,
        fx_rate_date: quotationData.fx_rate_date || quotationData.issue_date || '',
      })
      if (quotationData.items && quotationData.items.length > 0) {
        setItems(
          quotationData.items.map((item) => ({
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: Number(useFx && item.unit_price_fx != null ? item.unit_price_fx : item.unit_price) || 0,
            vat_rate: Number(item.vat_rate) || 15,
            account_id: item.account_id || '',
          }))
        )
      }
    }
  }, [isNew, quotationData, activeCompany?.id, baseCurrency])

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
    if (isForeignCurrency && suggestedRate?.rate && formData.fx_rate === 1) {
      setFormData((prev) => ({ ...prev, fx_rate: suggestedRate.rate }))
    }
  }, [suggestedRate?.rate, isForeignCurrency])

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

    if (!formData.client_id) {
      toast.error('Please select a client')
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

    const quotationPayload = {
      ...formData,
      validity_date: formData.expiry_date,
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
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await exportToPDF('quotation-print-view', `Quotation-${formData.quotation_number || 'draft'}`)
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
              exportToExcel(rows, `Quotation-${formData.quotation_number || 'draft'}-lines`, 'Lines')
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
                    Line Total: {formatCurrency(calculateLineTotal(item).total, documentCurrency)}
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
          id="quotation-print-view"
          type="quotation"
          company={activeCompany || {}}
          party={clients.find((c) => c.id === formData.client_id) || {}}
          formData={{ ...formData, expiry_date: formData.expiry_date }}
          items={items}
          totals={totals}
          baseCurrency={baseCurrency}
          documentCurrency={documentCurrency}
          fxRate={Number(formData.fx_rate) || 1}
        />
      </div>

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

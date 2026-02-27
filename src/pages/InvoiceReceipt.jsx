import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, FileDown } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import { useInvoicePayments } from '../hooks/useInvoicePayments'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import ReceiptPrintView from '../components/documents/ReceiptPrintView'
import { exportToPDF } from '../lib/utils'

const InvoiceReceipt = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { activeCompany } = useCompany()
  const { useInvoice } = useInvoices()
  const { data: invoiceData, isLoading: invoiceLoading } = useInvoice(id)
  const { payments, isLoading: paymentsLoading } = useInvoicePayments(id)

  const isLoading = invoiceLoading || paymentsLoading
  const hasPayments = payments && payments.length > 0
  const amountPaid = Number(invoiceData?.amount_paid ?? 0)
  const canShowReceipt = hasPayments || amountPaid > 0.005

  const handlePrint = () => window.print()
  const handlePDF = async () => {
    try {
      await exportToPDF(
        'receipt-print-view',
        `Receipt-Invoice-${invoiceData?.invoice_number || id}`
      )
      toast.success('PDF downloaded')
    } catch (e) {
      toast.error(e?.message || 'PDF export failed')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!invoiceData) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/dashboard/invoices')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-gray-600">Invoice not found.</p>
      </div>
    )
  }

  if (!canShowReceipt) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(`/dashboard/invoices/${id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-gray-600">
          No payments have been recorded for this invoice yet. A receipt can be generated once a payment is received.
        </p>
        <Button onClick={() => navigate(`/dashboard/invoices/${id}`)}>
          Back to Invoice
        </Button>
      </div>
    )
  }

  const currency = invoiceData.currency_code || activeCompany?.currency || 'ZAR'
  const client = invoiceData.client || {}
  const serviceDescription = (invoiceData.items || [])
    .filter((i) => i.description && String(i.description).trim())
    .map((i) => i.description.trim())
    .join(', ') || ''
  const receiptDate = payments.length > 0
    ? payments[payments.length - 1].payment_date
    : new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/dashboard/invoices/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Receipt for Invoice {invoiceData.invoice_number}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Payment confirmation for {client.name || 'customer'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 sm:mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handlePDF}>
            <FileDown className="w-4 h-4 sm:mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="print:block">
        <ReceiptPrintView
          id="receipt-print-view"
          company={activeCompany || {}}
          client={client}
          invoiceNumber={invoiceData.invoice_number}
          invoiceTotal={invoiceData.total}
          amountPaid={amountPaid}
          payments={payments}
          currency={currency}
          receiptDate={receiptDate}
          serviceDescription={serviceDescription}
        />
      </div>
    </div>
  )
}

export default InvoiceReceipt

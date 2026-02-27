import { formatCurrency } from '../../lib/constants'
import { format } from 'date-fns'

/**
 * Print/PDF view for a payment receipt corresponding to an invoice.
 * Shows payment(s) received for the invoice.
 */
const ReceiptPrintView = ({
  id,
  company = {},
  client = {},
  invoiceNumber = '',
  invoiceTotal = 0,
  amountPaid = 0,
  payments = [],
  currency = 'ZAR',
  receiptDate,
  serviceDescription = '',
}) => {
  const receiptDateFormatted = receiptDate
    ? format(new Date(receiptDate), 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy')
  const balance = Number(invoiceTotal || 0) - Number(amountPaid || 0)

  return (
    <div
      id={id}
      className="bg-white text-gray-900 p-8 max-w-[210mm] mx-auto"
      style={{ fontFamily: 'system-ui, sans-serif', fontSize: '12px' }}
    >
      <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6">
        <div>
          {company.logo_url && (
            <img src={company.logo_url} alt={company.name} className="max-h-14 mb-2" />
          )}
          <p className="font-semibold text-lg">{company.name}</p>
          {company.address_line1 && <p className="text-gray-600">{company.address_line1}</p>}
          {company.address_line2 && <p className="text-gray-600">{company.address_line2}</p>}
          {(company.city || company.postal_code) && (
            <p className="text-gray-600">{[company.city, company.postal_code].filter(Boolean).join(', ')}</p>
          )}
          {company.vat_number && <p className="text-gray-600">VAT: {company.vat_number}</p>}
          {company.email && <p className="text-gray-600">{company.email}</p>}
          {company.phone && <p className="text-gray-600">{company.phone}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold uppercase text-gray-800">Receipt</h1>
          <p className="mt-2 text-gray-600">For Invoice {invoiceNumber}</p>
          <p className="text-sm text-gray-500 mt-1">Date: {receiptDateFormatted}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Received From</p>
          <p className="font-medium">{client.name || '—'}</p>
          {client.email && <p className="text-gray-600">{client.email}</p>}
          {client.phone && <p className="text-gray-600">{client.phone}</p>}
          {client.address_line1 && <p className="text-gray-600">{client.address_line1}</p>}
          {client.address_line2 && <p className="text-gray-600">{client.address_line2}</p>}
          {(client.city || client.postal_code) && (
            <p className="text-gray-600">{[client.city, client.postal_code].filter(Boolean).join(', ')}</p>
          )}
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Payment Date</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 && amountPaid > 0.005 ? (
            <tr>
              <td className="border border-gray-300 px-3 py-2">{receiptDateFormatted}</td>
              <td className="border border-gray-300 px-3 py-2">{serviceDescription || '—'}</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                {formatCurrency(amountPaid, currency)}
              </td>
            </tr>
          ) : (
            payments.map((p, idx) => (
            <tr key={idx}>
              <td className="border border-gray-300 px-3 py-2">
                {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : '—'}
              </td>
              <td className="border border-gray-300 px-3 py-2">{serviceDescription || '—'}</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                {formatCurrency(Number(p.allocated_amount ?? p.amount ?? 0), currency)}
              </td>
            </tr>
          )))}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Invoice Total</span>
            <span>{formatCurrency(invoiceTotal || 0, currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-300 text-green-700">
            <span>Amount Received</span>
            <span>{formatCurrency(amountPaid || 0, currency)}</span>
          </div>
          {balance > 0.005 && (
            <div className="flex justify-between text-gray-600">
              <span>Balance Due</span>
              <span>{formatCurrency(balance, currency)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mt-6 text-center text-sm text-gray-500">
        This receipt confirms payment received for Invoice {invoiceNumber}. Thank you for your business.
      </div>
    </div>
  )
}

export default ReceiptPrintView

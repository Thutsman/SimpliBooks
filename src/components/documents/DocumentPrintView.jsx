import { formatCurrency } from '../../lib/constants'
import { format } from 'date-fns'

const TITLE = { invoice: 'Invoice', quotation: 'Quotation', purchase: 'Purchase Order' }

/**
 * Reusable print/PDF view for invoice, quotation, and purchase documents.
 * Renders a clean A4-style layout. Pass an id for exportToPDF(elementId, filename).
 */
const DocumentPrintView = ({
  id,
  type = 'invoice',
  company = {},
  party = {},
  formData = {},
  items = [],
  totals = { subtotal: 0, vat: 0, total: 0 },
  baseCurrency = 'ZAR',
  documentCurrency = 'ZAR',
  fxRate = 1,
}) => {
  const isForeign = documentCurrency !== baseCurrency
  const docNumber = formData.invoice_number || formData.quotation_number || formData.reference || '—'
  const dueLabel = type === 'quotation' ? 'Expiry' : 'Due'
  const dueDate = formData.expiry_date || formData.due_date || formData.validity_date || '—'
  const dueFormatted = dueDate === '—' ? '—' : format(new Date(dueDate), 'dd MMM yyyy')

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
          {(company.city || company.postal_code) && (
            <p className="text-gray-600">{[company.city, company.postal_code].filter(Boolean).join(', ')}</p>
          )}
          {company.vat_number && <p className="text-gray-600">VAT: {company.vat_number}</p>}
          {company.email && <p className="text-gray-600">{company.email}</p>}
          {company.phone && <p className="text-gray-600">{company.phone}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold uppercase text-gray-800">{TITLE[type] || type}</h1>
          <p className="mt-2 font-medium">{docNumber}</p>
          {formData.reference && <p className="text-gray-600">Ref: {formData.reference}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
            {type === 'purchase' ? 'Supplier' : 'Bill To'}
          </p>
          <p className="font-medium">{party.name || '—'}</p>
          {party.email && <p className="text-gray-600">{party.email}</p>}
          {party.phone && <p className="text-gray-600">{party.phone}</p>}
          {party.address_line1 && <p className="text-gray-600">{party.address_line1}</p>}
          {(party.city || party.postal_code) && (
            <p className="text-gray-600">{[party.city, party.postal_code].filter(Boolean).join(', ')}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-600">
            <span className="font-medium text-gray-800">Issue date:</span>{' '}
            {formData.issue_date ? format(new Date(formData.issue_date), 'dd MMM yyyy') : '—'}
          </p>
          <p className="text-gray-600">
            <span className="font-medium text-gray-800">{dueLabel} date:</span> {dueFormatted}
          </p>
          {isForeign && formData.fx_rate_date && (
            <p className="text-gray-500 text-xs mt-1">
              Rate 1 {documentCurrency} = {Number(fxRate).toFixed(4)} {baseCurrency} ({formData.fx_rate_date})
            </p>
          )}
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-20">Qty</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-24">Unit Price</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-20">VAT %</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.filter((i) => i.description || i.quantity || i.unit_price).map((item, idx) => {
            const qty = Number(item.quantity) || 0
            const price = Number(item.unit_price) || 0
            const vatPct = Number(item.vat_rate) || 0
            const subtotal = qty * price
            const vat = subtotal * (vatPct / 100)
            const total = subtotal + vat
            return (
              <tr key={idx}>
                <td className="border border-gray-300 px-3 py-2">{item.description || '—'}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{qty}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(price, documentCurrency)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">{vatPct}%</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {formatCurrency(total, documentCurrency)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency(totals.subtotal || 0, documentCurrency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">VAT</span>
            <span>{formatCurrency(totals.vat || 0, documentCurrency)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-300">
            <span>Total</span>
            <span>{formatCurrency(totals.total || 0, documentCurrency)}</span>
          </div>
          {isForeign && (
            <p className="text-xs text-gray-500 pt-1">
              ≈ {formatCurrency((totals.total || 0) * (Number(fxRate) || 1), baseCurrency)} in {baseCurrency}
            </p>
          )}
        </div>
      </div>

      {(formData.notes || formData.terms) && (
        <div className="border-t border-gray-200 pt-4 space-y-2 text-gray-600 text-sm">
          {formData.notes && (
            <div>
              <span className="font-medium text-gray-700">Notes:</span> {formData.notes}
            </div>
          )}
          {formData.terms && (
            <div>
              <span className="font-medium text-gray-700">Terms:</span> {formData.terms}
            </div>
          )}
        </div>
      )}

      {type === 'invoice' && (company.bank_name || company.bank_account_number) && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">Banking details</p>
          {company.bank_name && <p>{company.bank_name}</p>}
          {company.bank_account_name && <p>{company.bank_account_name}</p>}
          {company.bank_account_number && <p>Account: {company.bank_account_number}</p>}
          {company.bank_branch_code && <p>Branch: {company.bank_branch_code}</p>}
          {company.bank_reference && <p>Reference: {company.bank_reference}</p>}
        </div>
      )}
    </div>
  )
}

export default DocumentPrintView

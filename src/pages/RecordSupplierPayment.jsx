import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useSuppliers } from '../hooks/useSuppliers'
import { usePayments } from '../hooks/usePayments'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import { formatCurrency, formatDate } from '../lib/constants'
import { format } from 'date-fns'

const RecordSupplierPayment = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const preselectInvoiceId = searchParams.get('supplierInvoiceId')

  const { activeCompany, activeCompanyId } = useCompany()
  const { suppliers } = useSuppliers()
  const { createSupplierPayment, isCreatingSupplierPayment } = usePayments()

  const [supplierId, setSupplierId] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [allocations, setAllocations] = useState({})

  const { data: preselectInvoice } = useQuery({
    queryKey: ['supplier-invoice-preselect', activeCompanyId, preselectInvoiceId],
    queryFn: async () => {
      if (!preselectInvoiceId) return null
      const { data, error } = await supabase
        .from('supplier_invoices')
        .select('id, supplier_id, invoice_number, total, amount_paid, status')
        .eq('company_id', activeCompanyId)
        .eq('id', preselectInvoiceId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId && !!preselectInvoiceId,
  })

  useEffect(() => {
    if (preselectInvoice?.supplier_id && !supplierId) {
      setSupplierId(preselectInvoice.supplier_id)
    }
  }, [preselectInvoice?.supplier_id, supplierId])

  const { data: openPurchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['open-purchases', activeCompanyId, supplierId],
    queryFn: async () => {
      if (!supplierId) return []
      const { data, error } = await supabase
        .from('supplier_invoices')
        .select('id, invoice_number, issue_date, due_date, total, amount_paid, status')
        .eq('company_id', activeCompanyId)
        .eq('supplier_id', supplierId)
        .in('status', ['unpaid', 'overdue', 'part_paid'])
        .order('due_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!activeCompanyId && !!supplierId,
  })

  const rows = useMemo(() => {
    return (openPurchases || [])
      .map((inv) => {
        const outstanding = Number(inv.total || 0) - Number(inv.amount_paid || 0)
        return { ...inv, outstanding }
      })
      .filter((inv) => inv.outstanding > 0.005)
  }, [openPurchases])

  const allocationSum = useMemo(() => {
    return Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0)
  }, [allocations])

  const amountNum = Number(amount) || 0
  const remaining = amountNum - allocationSum

  const handleAutoAllocate = () => {
    const payment = Number(amount) || 0
    if (payment <= 0) {
      toast.error('Enter a payment amount first')
      return
    }
    let left = payment
    const next = {}
    for (const inv of rows) {
      if (left <= 0) break
      const alloc = Math.min(left, inv.outstanding)
      if (alloc > 0) {
        next[inv.id] = Number(alloc.toFixed(2))
        left -= alloc
      }
    }
    setAllocations(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supplierId) {
      toast.error('Select a supplier')
      return
    }
    if (!paymentDate) {
      toast.error('Payment date is required')
      return
    }
    if (amountNum <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }
    if (Math.abs(allocationSum - amountNum) > 0.005) {
      toast.error('Allocations must equal the payment amount')
      return
    }

    const payloadAllocs = Object.entries(allocations)
      .filter(([, v]) => (Number(v) || 0) > 0)
      .map(([supplier_invoice_id, v]) => ({ supplier_invoice_id, amount: Number(v) }))

    try {
      await createSupplierPayment({
        supplier_id: supplierId,
        payment_date: paymentDate,
        amount: amountNum,
        reference,
        allocations: payloadAllocs,
      })
      toast.success('Supplier payment recorded successfully')
      navigate('/dashboard/purchases')
    } catch (err) {
      toast.error(err?.message || 'Failed to record supplier payment')
    }
  }

  const supplierOptions = (suppliers || []).map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Supplier Payment</h1>
          <p className="text-gray-600">Record a payment and allocate it to supplier invoices</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setAllocations({})
                }}
                options={supplierOptions}
                placeholder="Select a supplier"
                required
              />
              <Input
                label="Payment date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Amount (base currency)"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Input
                label="Reference (optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Payment ref, EFT ref, etc."
              />
            </div>
            <p className="text-sm text-gray-500">
              Base currency: <span className="font-medium">{activeCompany?.currency || 'ZAR'}</span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Allocate to Purchases</h2>
              <Button type="button" variant="outline" onClick={handleAutoAllocate}>
                <Wand2 className="w-4 h-4 mr-2" />
                Auto allocate
              </Button>
            </div>

            {purchasesLoading ? (
              <div className="text-sm text-gray-500">Loading purchases...</div>
            ) : !supplierId ? (
              <div className="text-sm text-gray-500">Select a supplier to load open purchases.</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-gray-500">No open supplier invoices found for this supplier.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Due</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Outstanding</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Allocate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((inv) => (
                      <tr key={inv.id} className={inv.id === preselectInvoiceId ? 'bg-primary-50' : ''}>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                          {inv.invoice_number}
                          <div className="text-xs text-gray-500">
                            Issued {formatDate(inv.issue_date)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(inv.due_date)}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                          {formatCurrency(inv.outstanding, activeCompany?.currency)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={inv.outstanding}
                            value={allocations[inv.id] ?? ''}
                            onChange={(e) => setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent text-right font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500">Payment</div>
                <div className="font-mono font-semibold">{formatCurrency(amountNum || 0, activeCompany?.currency)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-gray-500">Allocated</div>
                <div className="font-mono font-semibold">{formatCurrency(allocationSum || 0, activeCompany?.currency)}</div>
              </div>
              <div className={`rounded-lg p-3 border ${Math.abs(remaining) <= 0.005 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <div className="text-gray-500">Remaining</div>
                <div className="font-mono font-semibold">{formatCurrency(remaining || 0, activeCompany?.currency)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Actions</h3>
            <Button type="submit" loading={isCreatingSupplierPayment} className="w-full">
              Record payment
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/dashboard/purchases')}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default RecordSupplierPayment


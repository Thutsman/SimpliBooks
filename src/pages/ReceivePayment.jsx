import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useClients } from '../hooks/useClients'
import { usePayments } from '../hooks/usePayments'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import { formatCurrency, formatDate } from '../lib/constants'
import { format } from 'date-fns'

const ReceivePayment = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const preselectInvoiceId = searchParams.get('invoiceId')

  const { activeCompany, activeCompanyId } = useCompany()
  const { clients } = useClients()
  const { createInvoicePayment, isCreatingInvoicePayment } = usePayments()

  const [clientId, setClientId] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [allocations, setAllocations] = useState({})

  // Preselect client from invoiceId if provided
  const { data: preselectInvoice } = useQuery({
    queryKey: ['invoice-preselect', activeCompanyId, preselectInvoiceId],
    queryFn: async () => {
      if (!preselectInvoiceId) return null
      const { data, error } = await supabase
        .from('invoices')
        .select('id, client_id, invoice_number, total, amount_paid, status')
        .eq('company_id', activeCompanyId)
        .eq('id', preselectInvoiceId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId && !!preselectInvoiceId,
  })

  useEffect(() => {
    if (preselectInvoice?.client_id && !clientId) {
      setClientId(preselectInvoice.client_id)
    }
  }, [preselectInvoice?.client_id, clientId])

  const { data: openInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['open-invoices', activeCompanyId, clientId],
    queryFn: async () => {
      if (!clientId) return []
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, due_date, total, amount_paid, status')
        .eq('company_id', activeCompanyId)
        .eq('client_id', clientId)
        .in('status', ['sent', 'overdue', 'part_paid'])
        .order('due_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!activeCompanyId && !!clientId,
  })

  const invoiceRows = useMemo(() => {
    return (openInvoices || [])
      .map((inv) => {
        const outstanding = Number(inv.total || 0) - Number(inv.amount_paid || 0)
        return { ...inv, outstanding }
      })
      .filter((inv) => inv.outstanding > 0.005)
  }, [openInvoices])

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
    for (const inv of invoiceRows) {
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
    if (!clientId) {
      toast.error('Select a customer')
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
      .map(([invoice_id, v]) => ({ invoice_id, amount: Number(v) }))

    try {
      await createInvoicePayment({
        client_id: clientId,
        payment_date: paymentDate,
        amount: amountNum,
        reference,
        allocations: payloadAllocs,
      })
      toast.success('Payment recorded successfully')
      navigate('/dashboard/invoices')
    } catch (err) {
      toast.error(err?.message || 'Failed to record payment')
    }
  }

  const clientOptions = (clients || []).map((c) => ({ value: c.id, label: c.name }))

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
          <h1 className="text-2xl font-bold text-gray-900">Receive Payment</h1>
          <p className="text-gray-600">Record a customer payment and allocate it to invoices</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Customer"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  setAllocations({})
                }}
                options={clientOptions}
                placeholder="Select a customer"
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
                onChange={(e) => {
                  setAmount(e.target.value)
                }}
                required
              />
              <Input
                label="Reference (optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt #, bank reference, etc."
              />
            </div>
            <p className="text-sm text-gray-500">
              Base currency: <span className="font-medium">{activeCompany?.currency || 'ZAR'}</span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Allocate to Invoices</h2>
              <Button type="button" variant="outline" onClick={handleAutoAllocate}>
                <Wand2 className="w-4 h-4 mr-2" />
                Auto allocate
              </Button>
            </div>

            {invoicesLoading ? (
              <div className="text-sm text-gray-500">Loading invoices...</div>
            ) : !clientId ? (
              <div className="text-sm text-gray-500">Select a customer to load open invoices.</div>
            ) : invoiceRows.length === 0 ? (
              <div className="text-sm text-gray-500">No open invoices found for this customer.</div>
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
                    {invoiceRows.map((inv) => (
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
                            onChange={(e) => {
                              const v = e.target.value
                              setAllocations((prev) => ({ ...prev, [inv.id]: v }))
                            }}
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
            <Button type="submit" loading={isCreatingInvoicePayment} className="w-full">
              Record payment
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/dashboard/invoices')}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ReceivePayment


import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Fetches all payments allocated to a given invoice (for receipt generation).
 */
export const useInvoicePayments = (invoiceId) => {
  const query = useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: async () => {
      const { data: allocations, error: allocError } = await supabase
        .from('invoice_payment_allocations')
        .select(`
          id,
          amount,
          invoice_payments(
            id,
            payment_date,
            amount,
            reference,
            currency_code,
            fx_rate
          )
        `)
        .eq('invoice_id', invoiceId)

      if (allocError) throw allocError
      const payments = (allocations || []).map((a) => {
        const pmt = a.invoice_payments
        return pmt ? { ...pmt, allocated_amount: a.amount } : null
      }).filter(Boolean)
      return payments.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))
    },
    enabled: !!invoiceId,
  })

  return {
    payments: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

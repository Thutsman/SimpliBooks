import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const usePayments = () => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const createInvoicePayment = useMutation({
    mutationFn: async ({ client_id, payment_date, amount, reference, allocations }) => {
      const { data, error } = await supabase.rpc('create_invoice_payment_with_allocations', {
        p_company_id: activeCompanyId,
        p_client_id: client_id || null,
        p_payment_date: payment_date || null,
        p_amount: Number(amount),
        p_reference: reference || null,
        p_allocations: allocations || [],
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['general-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['income-statement'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
      queryClient.invalidateQueries({ queryKey: ['vat-report'] })
      queryClient.invalidateQueries({ queryKey: ['vat201-report'] })
    },
  })

  const createSupplierPayment = useMutation({
    mutationFn: async ({ supplier_id, payment_date, amount, reference, allocations }) => {
      const { data, error } = await supabase.rpc('create_supplier_payment_with_allocations', {
        p_company_id: activeCompanyId,
        p_supplier_id: supplier_id || null,
        p_payment_date: payment_date || null,
        p_amount: Number(amount),
        p_reference: reference || null,
        p_allocations: allocations || [],
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      queryClient.invalidateQueries({ queryKey: ['general-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['income-statement'] })
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
      queryClient.invalidateQueries({ queryKey: ['vat-report'] })
      queryClient.invalidateQueries({ queryKey: ['vat201-report'] })
    },
  })

  return {
    createInvoicePayment: createInvoicePayment.mutateAsync,
    createSupplierPayment: createSupplierPayment.mutateAsync,
    isCreatingInvoicePayment: createInvoicePayment.isPending,
    isCreatingSupplierPayment: createSupplierPayment.isPending,
  }
}


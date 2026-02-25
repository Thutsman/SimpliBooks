import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const usePurchases = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const purchasesQuery = useQuery({
    queryKey: ['purchases', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('supplier_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, email)
        `)
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const usePurchase = (id) => useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const { data: purchase, error: purchaseError } = await supabase
        .from('supplier_invoices')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('id', id)
        .single()

      if (purchaseError) throw purchaseError

      const { data: items, error: itemsError } = await supabase
        .from('supplier_invoice_items')
        .select(`
          *,
          account:accounts(id, name, code)
        `)
        .eq('supplier_invoice_id', id)
        .order('sort_order')

      if (itemsError) throw itemsError

      return { ...purchase, items }
    },
    enabled: !!id,
  })

  const createPurchase = useMutation({
    mutationFn: async ({ items, ...purchaseData }) => {
      const { data: purchase, error: purchaseError } = await supabase
        .from('supplier_invoices')
        .insert({
          ...purchaseData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (purchaseError) throw purchaseError

      if (items && items.length > 0) {
        const itemsWithPurchaseId = items.map((item, index) => ({
          ...item,
          supplier_invoice_id: purchase.id,
          sort_order: index,
        }))

        const { error: itemsError } = await supabase
          .from('supplier_invoice_items')
          .insert(itemsWithPurchaseId)

        if (itemsError) throw itemsError
      }

      return purchase
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const updatePurchase = useMutation({
    mutationFn: async ({ id, items, ...purchaseData }) => {
      const { data: purchase, error: purchaseError } = await supabase
        .from('supplier_invoices')
        .update(purchaseData)
        .eq('id', id)
        .select()
        .single()

      if (purchaseError) throw purchaseError

      if (items) {
        await supabase.from('supplier_invoice_items').delete().eq('supplier_invoice_id', id)

        if (items.length > 0) {
          const itemsWithPurchaseId = items.map((item, index) => ({
            ...item,
            supplier_invoice_id: id,
            sort_order: index,
          }))

          const { error: itemsError } = await supabase
            .from('supplier_invoice_items')
            .insert(itemsWithPurchaseId)

          if (itemsError) throw itemsError
        }
      }

      return purchase
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const deletePurchase = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('supplier_invoices')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      if (status === 'paid') {
        throw new Error('Use Record Payment to record supplier payments (partial payments supported).')
      }
      const updateData = { status }

      const { data, error } = await supabase
        .from('supplier_invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  return {
    purchases: purchasesQuery.data || [],
    isLoading: purchasesQuery.isLoading,
    error: purchasesQuery.error,
    usePurchase,
    createPurchase: createPurchase.mutateAsync,
    updatePurchase: updatePurchase.mutateAsync,
    deletePurchase: deletePurchase.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
    isCreating: createPurchase.isPending,
    isUpdating: updatePurchase.isPending,
    isDeleting: deletePurchase.isPending,
  }
}

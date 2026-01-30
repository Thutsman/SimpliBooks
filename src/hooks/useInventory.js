import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useInventoryMovements = (productId = null, startDate = null, endDate = null) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['inventory-movements', activeCompanyId, productId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .eq('company_id', activeCompanyId)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)

      if (productId) query = query.eq('product_id', productId)
      if (startDate) query = query.gte('movement_date', startDate)
      if (endDate) query = query.lte('movement_date', endDate)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })
}

export const useStockAdjustments = () => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const adjustmentsQuery = useQuery({
    queryKey: ['stock-adjustments', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('adjustment_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const getNextAdjustmentNumber = async () => {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('adjustment_number')
      .eq('company_id', activeCompanyId)

    if (error) throw error
    let maxNum = 0
    const prefix = 'ADJ-'
    for (const row of data || []) {
      const match = (row.adjustment_number || '').match(new RegExp(prefix + '(\\d+)', 'i'))
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
  }

  const createStockAdjustment = useMutation({
    mutationFn: async ({ lines, ...header }) => {
      const { data: adj, error: adjError } = await supabase
        .from('stock_adjustments')
        .insert({
          ...header,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (adjError) throw adjError
      if (lines && lines.length > 0) {
        const linesWithId = lines.map((line, i) => ({
          ...line,
          stock_adjustment_id: adj.id,
          sort_order: i,
        }))
        const { error: linesError } = await supabase
          .from('stock_adjustment_lines')
          .insert(linesWithId)
        if (linesError) throw linesError
      }
      return adj
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
    },
  })

  const postStockAdjustment = useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .update({ status: 'posted' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
    },
  })

  return {
    adjustments: adjustmentsQuery.data || [],
    isLoading: adjustmentsQuery.isLoading,
    error: adjustmentsQuery.error,
    getNextAdjustmentNumber,
    createStockAdjustment: createStockAdjustment.mutateAsync,
    postStockAdjustment: postStockAdjustment.mutateAsync,
    isCreating: createStockAdjustment.isPending,
    isPosting: postStockAdjustment.isPending,
  }
}

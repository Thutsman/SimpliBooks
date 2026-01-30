import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useProducts = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const productsQuery = useQuery({
    queryKey: ['products', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('name')

      if (filters.activeOnly !== false) {
        query = query.eq('is_active', true)
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const lowStockQuery = useQuery({
    queryKey: ['products-low-stock', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .eq('track_inventory', true)
        .gt('reorder_level', 0)
        .order('name')

      if (error) throw error
      return (data || []).filter((p) => Number(p.qty_on_hand) <= Number(p.reorder_level))
    },
    enabled: !!activeCompanyId,
  })

  const createProduct = useMutation({
    mutationFn: async (productData) => {
      if (!activeCompanyId) throw new Error('No company selected.')
      const { data, error } = await supabase
        .from('products')
        .insert({ ...productData, company_id: activeCompanyId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] })
    },
  })

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: product, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] })
    },
  })

  const deleteProduct = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] })
    },
  })

  return {
    products: productsQuery.data || [],
    lowStockProducts: lowStockQuery.data || [],
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    refetchProducts: productsQuery.refetch,
    createProduct: createProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    isCreating: createProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
  }
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useSuppliers = () => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const createSupplier = useMutation({
    mutationFn: async (supplierData) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          ...supplierData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', activeCompanyId] })
    },
  })

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', activeCompanyId] })
    },
  })

  const deleteSupplier = useMutation({
    mutationFn: async (id) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', activeCompanyId] })
    },
  })

  return {
    suppliers: suppliersQuery.data || [],
    isLoading: suppliersQuery.isLoading,
    error: suppliersQuery.error,
    createSupplier: createSupplier.mutateAsync,
    updateSupplier: updateSupplier.mutateAsync,
    deleteSupplier: deleteSupplier.mutateAsync,
    isCreating: createSupplier.isPending,
    isUpdating: updateSupplier.isPending,
    isDeleting: deleteSupplier.isPending,
  }
}

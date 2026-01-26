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
      if (!activeCompanyId) {
        throw new Error('No company selected. Please select or create a company first.')
      }

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          ...supplierData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) {
        console.error('Supplier creation error:', error)
        throw new Error(error.message || 'Failed to create supplier')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', activeCompanyId] })
    },
  })

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...data }) => {
      if (!activeCompanyId) {
        throw new Error('No company selected')
      }

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supplier update error:', error)
        throw new Error(error.message || 'Failed to update supplier')
      }
      return supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', activeCompanyId] })
    },
  })

  const deleteSupplier = useMutation({
    mutationFn: async (id) => {
      if (!activeCompanyId) {
        throw new Error('No company selected')
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        console.error('Supplier delete error:', error)
        throw new Error(error.message || 'Failed to delete supplier')
      }
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

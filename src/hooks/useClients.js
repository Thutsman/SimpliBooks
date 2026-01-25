import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useClients = () => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const clientsQuery = useQuery({
    queryKey: ['clients', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const createClient = useMutation({
    mutationFn: async (clientData) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', activeCompanyId] })
    },
  })

  const updateClient = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: client, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', activeCompanyId] })
    },
  })

  const deleteClient = useMutation({
    mutationFn: async (id) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', activeCompanyId] })
    },
  })

  return {
    clients: clientsQuery.data || [],
    isLoading: clientsQuery.isLoading,
    error: clientsQuery.error,
    createClient: createClient.mutateAsync,
    updateClient: updateClient.mutateAsync,
    deleteClient: deleteClient.mutateAsync,
    isCreating: createClient.isPending,
    isUpdating: updateClient.isPending,
    isDeleting: deleteClient.isPending,
  }
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useAccounts = () => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const accountsQuery = useQuery({
    queryKey: ['accounts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const createAccount = useMutation({
    mutationFn: async (accountData) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...accountData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', activeCompanyId] })
    },
  })

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: account, error } = await supabase
        .from('accounts')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return account
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', activeCompanyId] })
    },
  })

  const deleteAccount = useMutation({
    mutationFn: async (id) => {
      // Check if account has transactions
      const { count: invoiceCount } = await supabase
        .from('invoice_items')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)

      const { count: purchaseCount } = await supabase
        .from('supplier_invoice_items')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)

      const { count: bankCount } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)

      if (invoiceCount > 0 || purchaseCount > 0 || bankCount > 0) {
        throw new Error('Cannot delete account with existing transactions')
      }

      // Soft delete
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', activeCompanyId] })
    },
  })

  // Group accounts by type
  const accountsByType = (accountsQuery.data || []).reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = []
    }
    acc[account.type].push(account)
    return acc
  }, {})

  return {
    accounts: accountsQuery.data || [],
    accountsByType,
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
    createAccount: createAccount.mutateAsync,
    updateAccount: updateAccount.mutateAsync,
    deleteAccount: deleteAccount.mutateAsync,
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending,
  }
}

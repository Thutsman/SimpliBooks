import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

/**
 * List enabled currencies for the active company (company_currencies).
 */
export const useCompanyCurrencies = () => {
  const { activeCompanyId, activeCompany } = useCompany()
  const queryClient = useQueryClient()
  const baseCurrency = activeCompany?.currency || 'ZAR'

  const companyCurrenciesQuery = useQuery({
    queryKey: ['company-currencies', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_currencies')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_enabled', true)
      if (error) throw error
      return data || []
    },
    enabled: !!activeCompanyId,
  })

  const addCurrency = useMutation({
    mutationFn: async (currency_code) => {
      const { data, error } = await supabase
        .from('company_currencies')
        .upsert(
          { company_id: activeCompanyId, currency_code, is_enabled: true },
          { onConflict: 'company_id,currency_code' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-currencies', activeCompanyId] })
    },
  })

  const removeCurrency = useMutation({
    mutationFn: async (currency_code) => {
      if (currency_code === baseCurrency) {
        throw new Error('Cannot remove base currency')
      }
      const { error } = await supabase
        .from('company_currencies')
        .delete()
        .eq('company_id', activeCompanyId)
        .eq('currency_code', currency_code)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-currencies', activeCompanyId] })
    },
  })

  return {
    enabledCurrencies: companyCurrenciesQuery.data || [],
    isLoading: companyCurrenciesQuery.isLoading,
    error: companyCurrenciesQuery.error,
    addCurrency: addCurrency.mutateAsync,
    removeCurrency: removeCurrency.mutateAsync,
    isAdding: addCurrency.isPending,
    isRemoving: removeCurrency.isPending,
    baseCurrency,
  }
}

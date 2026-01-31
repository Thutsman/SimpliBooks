import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

/**
 * List exchange rates for the active company.
 */
export const useExchangeRates = () => {
  const { activeCompanyId, activeCompany } = useCompany()
  const queryClient = useQueryClient()
  const baseCurrency = activeCompany?.currency || 'ZAR'

  const exchangeRatesQuery = useQuery({
    queryKey: ['exchange-rates', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('effective_date', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!activeCompanyId,
  })

  const createRate = useMutation({
    mutationFn: async ({ base_currency_code, quote_currency_code, rate, effective_date, source = 'manual' }) => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert({
          company_id: activeCompanyId,
          base_currency_code: base_currency_code || baseCurrency,
          quote_currency_code,
          rate: Number(rate),
          effective_date,
          source,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates', activeCompanyId] })
    },
  })

  const updateRate = useMutation({
    mutationFn: async ({ id, base_currency_code, quote_currency_code, rate, effective_date, source }) => {
      const payload = {}
      if (base_currency_code != null) payload.base_currency_code = base_currency_code
      if (quote_currency_code != null) payload.quote_currency_code = quote_currency_code
      if (rate != null) payload.rate = Number(rate)
      if (effective_date != null) payload.effective_date = effective_date
      if (source != null) payload.source = source

      const { data, error } = await supabase
        .from('exchange_rates')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates', activeCompanyId] })
    },
  })

  const deleteRate = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('exchange_rates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates', activeCompanyId] })
    },
  })

  return {
    exchangeRates: exchangeRatesQuery.data || [],
    isLoading: exchangeRatesQuery.isLoading,
    error: exchangeRatesQuery.error,
    createRate: createRate.mutateAsync,
    updateRate: updateRate.mutateAsync,
    deleteRate: deleteRate.mutateAsync,
    isCreating: createRate.isPending,
    isUpdating: updateRate.isPending,
    isDeleting: deleteRate.isPending,
    baseCurrency,
  }
}

/**
 * Lookup effective exchange rate for a quote currency and date.
 * Returns the most recent rate where effective_date <= date, or null.
 */
export const useExchangeRateForDate = (quoteCurrencyCode, date) => {
  const { activeCompanyId, activeCompany } = useCompany()
  const baseCurrency = activeCompany?.currency || 'ZAR'

  return useQuery({
    queryKey: ['exchange-rate-lookup', activeCompanyId, baseCurrency, quoteCurrencyCode, date],
    queryFn: async () => {
      if (!quoteCurrencyCode || !date || quoteCurrencyCode === baseCurrency) {
        return { rate: 1 }
      }
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('company_id', activeCompanyId)
        .eq('base_currency_code', baseCurrency)
        .eq('quote_currency_code', quoteCurrencyCode)
        .lte('effective_date', date)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data ? { rate: Number(data.rate) } : null
    },
    enabled: !!activeCompanyId && !!quoteCurrencyCode && !!date && quoteCurrencyCode !== baseCurrency,
  })
}

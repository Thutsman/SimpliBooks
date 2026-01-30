import { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { DEFAULT_ACCOUNTS, DEFAULT_VAT_RATES } from '../lib/constants'

const CompanyContext = createContext(null)

export const CompanyProvider = ({ children }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeCompanyId, setActiveCompanyId] = useState(() => {
    return localStorage.getItem('activeCompanyId') || null
  })

  // Fetch all companies for the user
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ['companies', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.warn('No user ID available')
        return []
      }

      console.log('Fetching companies for user:', user.id)

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching companies:', error)
        throw error
      }

      console.log('Companies fetched:', data?.length || 0)
      return data || []
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Set active company when companies load
  useEffect(() => {
    if (companies.length > 0) {
      // Check if current activeCompanyId is valid
      const currentCompany = companies.find(c => c.id === activeCompanyId)
      
      if (!currentCompany) {
        // Current ID is invalid, set a valid one
        const storedId = localStorage.getItem('activeCompanyId')
        const validCompany = companies.find(c => c.id === storedId)
        
        if (validCompany) {
          setActiveCompanyId(validCompany.id)
        } else {
          setActiveCompanyId(companies[0].id)
          localStorage.setItem('activeCompanyId', companies[0].id)
        }
      }
    } else if (companies.length === 0 && !companiesLoading && user && activeCompanyId) {
      // No companies exist and we're not loading - clear invalid activeCompanyId
      setActiveCompanyId(null)
      localStorage.removeItem('activeCompanyId')
    }
    // NOTE: activeCompanyId is intentionally NOT in dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, companiesLoading, user])

  // Get active company object
  const activeCompany = companies.find(c => c.id === activeCompanyId) || null
  
  // Determine if the context is ready (not stuck loading)
  const isReady = !companiesLoading && (companies.length === 0 || activeCompany !== null)

  // Switch company
  const switchCompany = (companyId) => {
    setActiveCompanyId(companyId)
    localStorage.setItem('activeCompanyId', companyId)
    // Invalidate company-specific queries
    queryClient.invalidateQueries({ queryKey: ['clients'] })
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['purchases'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['banking'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (companyData) => {
      // Create the company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          ...companyData,
          user_id: user.id,
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Seed default accounts
      const accounts = DEFAULT_ACCOUNTS.map(account => ({
        ...account,
        company_id: company.id,
      }))

      const { error: accountsError } = await supabase
        .from('accounts')
        .insert(accounts)

      if (accountsError) throw accountsError

      // Seed default VAT rates
      const vatRates = DEFAULT_VAT_RATES.map(rate => ({
        ...rate,
        company_id: company.id,
      }))

      const { error: vatError } = await supabase
        .from('vat_rates')
        .insert(vatRates)

      if (vatError) throw vatError

      return company
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setActiveCompanyId(company.id)
      localStorage.setItem('activeCompanyId', company.id)
    },
  })

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: company, error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      if (activeCompanyId === deletedId && companies.length > 1) {
        const nextCompany = companies.find(c => c.id !== deletedId)
        if (nextCompany) {
          switchCompany(nextCompany.id)
        }
      }
    },
  })

  const value = {
    companies,
    companiesLoading,
    companiesError,
    activeCompany,
    activeCompanyId,
    isReady,
    switchCompany,
    createCompany: createCompanyMutation.mutateAsync,
    updateCompany: updateCompanyMutation.mutateAsync,
    deleteCompany: deleteCompanyMutation.mutateAsync,
    isCreating: createCompanyMutation.isPending,
    isUpdating: updateCompanyMutation.isPending,
    isDeleting: deleteCompanyMutation.isPending,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

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

      console.log('Fetching companies for user:', user.id, user.email)
      
      try {
        // Verify session before querying
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Session error:', sessionError)
          throw new Error(`Session error: ${sessionError.message}`)
        }
        if (!session) {
          console.error('No session found')
          throw new Error('No active session. Please sign in again.')
        }
        
        console.log('Session verified, querying companies...')
        console.log('Query start time:', new Date().toISOString())
        
        // Query with timeout wrapper
        const queryPromise = supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
        })

        const result = await Promise.race([queryPromise, timeoutPromise])
        const { data, error } = result

        console.log('Query completed at:', new Date().toISOString())

        if (error) {
          console.error('Error fetching companies:', error)
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
          console.error('Error hint:', error.hint)
          console.error('Error details:', JSON.stringify(error, null, 2))
          
          // Check for specific error types
          if (error.code === 'PGRST116') {
            console.log('No companies found (this is normal for new users)')
            return []
          }
          
          throw error
        }
        
        console.log('Companies fetched successfully:', data?.length || 0, 'companies')
        if (data && data.length > 0) {
          console.log('Company names:', data.map(c => c.name))
        } else {
          console.log('No companies found - user needs to create one')
        }
        
        return data || []
      } catch (err) {
        console.error('Exception in companies query:', err)
        if (err.message?.includes('timeout')) {
          console.error('Query timed out - this might indicate a network or RLS policy issue')
          throw new Error('Request timed out. Please check your internet connection and Supabase RLS policies.')
        }
        throw err
      }
    },
    enabled: !!user,
    retry: (failureCount, error) => {
      // Don't retry on timeout or auth errors
      if (error?.message?.includes('timeout') || error?.message?.includes('session')) {
        return false
      }
      return failureCount < 1 // Only retry once
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Set active company when companies load
  useEffect(() => {
    if (companies.length > 0 && !activeCompanyId) {
      const storedId = localStorage.getItem('activeCompanyId')
      const validCompany = companies.find(c => c.id === storedId)
      if (validCompany) {
        setActiveCompanyId(validCompany.id)
      } else {
        setActiveCompanyId(companies[0].id)
        localStorage.setItem('activeCompanyId', companies[0].id)
      }
    }
  }, [companies, activeCompanyId])

  // Get active company object
  const activeCompany = companies.find(c => c.id === activeCompanyId) || null

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

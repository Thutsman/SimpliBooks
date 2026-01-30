import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export const useOnboarding = () => {
  const { user, loading: authLoading } = useAuth()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_completed_at')
        .eq('id', user.id)
        .single()

      if (error) {
        // If profile doesn't exist yet, onboarding is not complete
        if (error.code === 'PGRST116') {
          return { onboarding_completed: false }
        }
        // If column doesn't exist (42703 = undefined column), treat as onboarding not complete
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn('Onboarding columns not found in database. Please run migration 005.')
          return { onboarding_completed: false }
        }
        throw error
      }

      return data
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  })

  // Also check if user has any companies (backward compatibility)
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies-check', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 60000,
  })

  // If auth is still loading, report as loading
  if (authLoading) {
    return {
      needsOnboarding: false,
      isLoading: true,
      onboardingCompleted: false,
      completedAt: null,
      error: null,
    }
  }

  // User needs onboarding if:
  // 1. Profile says onboarding not completed, AND
  // 2. They have no companies (for backward compatibility with existing users)
  const needsOnboarding = !isLoading && !companiesLoading && (
    (!profile?.onboarding_completed) &&
    (companies?.length === 0)
  )

  return {
    needsOnboarding,
    isLoading: isLoading || companiesLoading,
    onboardingCompleted: profile?.onboarding_completed || false,
    completedAt: profile?.onboarding_completed_at,
    error,
  }
}

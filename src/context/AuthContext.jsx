import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, signIn, signUp, signOut, signInWithGoogle, resetPassword, updatePassword } from '../lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // getSession() is required to initialize the Supabase client's internal
    // session state so that authenticated database queries work properly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes (sign in, sign out, token refresh).
    // IMPORTANT: This callback must NOT be async and must NOT make Supabase
    // database queries — doing so can deadlock the client's internal auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Handle profile creation separately — outside the auth state change callback
  // to avoid deadlocking the Supabase client's auth lock.
  useEffect(() => {
    if (!user) return

    const ensureProfile = async () => {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, subscription_status')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
          })
        }

        // Create trial subscription for new users (idempotent — ON CONFLICT DO NOTHING)
        if (!existingProfile || !existingProfile.subscription_status || existingProfile.subscription_status === 'none') {
          await supabase.rpc('create_trial_subscription', { p_user_id: user.id }).catch(() => {})
        }
      } catch (err) {
        // Non-critical — don't block auth flow
        console.warn('Profile check/create failed:', err)
      }
    }

    ensureProfile()
  }, [user?.id]) // Only run when user ID changes (login/signup), not on every reference change

  const value = {
    user,
    session,
    loading,
    signIn: async (email, password) => {
      const result = await signIn(email, password)
      return result
    },
    signUp: async (email, password, fullName) => {
      const result = await signUp(email, password, fullName)
      return result
    },
    signOut: async () => {
      const result = await signOut()
      return result
    },
    signInWithGoogle: async () => {
      const result = await signInWithGoogle()
      return result
    },
    resetPassword: async (email) => {
      const result = await resetPassword(email)
      return result
    },
    updatePassword: async (password) => {
      const result = await updatePassword(password)
      return result
    },
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, signIn, signUp, signOut, signInWithGoogle, resetPassword, updatePassword } from '../lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Create profile on sign up
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single()

          if (!existingProfile) {
            await supabase.from('profiles').insert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
            })
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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

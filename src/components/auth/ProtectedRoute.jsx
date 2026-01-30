import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOnboarding } from '../../hooks/useOnboarding'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, skipOnboardingCheck = false }) => {
  const { user, loading } = useAuth()
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding()
  const location = useLocation()

  // Wait for auth to finish loading first
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Auth loaded but no user — redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Wait for onboarding check (only after we know user exists)
  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to onboarding if needed (unless we're already on onboarding or skipping check)
  if (!skipOnboardingCheck && needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

export default ProtectedRoute

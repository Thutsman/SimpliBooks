import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { useAuth } from '../../context/AuthContext'
import { useAcceptPendingInvitations } from '../../hooks/useCompanyInvitations'
import Sidebar from './Sidebar'
import Header from './Header'

const DashboardLayout = () => {
  const { isReady, companiesLoading, companiesError, companies } = useCompany()
  const { user } = useAuth()
  const acceptPending = useAcceptPendingInvitations()
  const acceptedRef = useRef(false)

  useEffect(() => {
    if (!user?.id || acceptedRef.current) return
    acceptedRef.current = true
    acceptPending.mutateAsync().then(({ accepted }) => {
      if (accepted > 0) acceptedRef.current = false
    }).catch(() => { acceptedRef.current = false })
  }, [user?.id])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed')
    return stored === 'true'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed)
  }, [sidebarCollapsed])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Show error if companies failed to load
  if (companiesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-800 mb-2">Error loading companies</p>
            <p className="text-sm text-red-700">{companiesError.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // Show loading while company context initializes
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {companiesLoading ? 'Loading companies...' : 'Initializing...'}
          </p>
        </div>
      </div>
    )
  }

  // Show message if no companies exist (should redirect to onboarding but just in case)
  if (companies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <p className="text-gray-600 mb-4">No companies found. Please complete onboarding.</p>
          <a
            href="/onboarding"
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 inline-block"
          >
            Go to Onboarding
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
          lg:hidden fixed left-0 top-0 h-full z-40
          transform transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          collapsed={false}
          isMobile={true}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div
        className={`
          transition-all duration-300
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout

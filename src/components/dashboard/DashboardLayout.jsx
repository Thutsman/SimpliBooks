import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const DashboardLayout = () => {
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

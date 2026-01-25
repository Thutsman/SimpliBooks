import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import CompanySelector from './CompanySelector'

const Header = ({ onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    console.log('Sign out button clicked')
    
    // Set a backup timeout to force navigation if signOut hangs
    const forceLogoutTimeout = setTimeout(() => {
      console.warn('Force logout timeout - navigating anyway')
      setUserMenuOpen(false)
      localStorage.clear()
      window.location.href = '/login'
    }, 6000)
    
    try {
      console.log('Calling signOut...')
      const result = await signOut()
      console.log('SignOut result:', result)
      
      // Clear the force timeout since signOut completed
      clearTimeout(forceLogoutTimeout)
      
      // Close menu after sign out attempt
      setUserMenuOpen(false)
      
      if (result && result.error) {
        console.error('Sign out error:', result.error)
        toast.error('Failed to sign out: ' + result.error.message)
      } else {
        console.log('Sign out successful, navigating to login...')
        toast.success('Signed out successfully')
        // Navigate to login
        navigate('/login', { replace: true })
      }
    } catch (err) {
      clearTimeout(forceLogoutTimeout)
      console.error('Sign out exception:', err)
      // Even on error, log out locally
      setUserMenuOpen(false)
      localStorage.clear()
      toast.error('Logged out locally')
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <CompanySelector />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-medium text-sm">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>

              <Link
                to="/dashboard/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Sign out button clicked - event handler')
                  handleSignOut()
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

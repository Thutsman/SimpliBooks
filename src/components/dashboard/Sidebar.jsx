import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  ShoppingCart,
  Users,
  Truck,
  Landmark,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  X,
  Package,
  Warehouse,
  History,
  Wallet,
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Quotations', href: '/dashboard/quotations', icon: ClipboardList },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
  { name: 'Accounts', href: '/dashboard/accounts', icon: CreditCard },
  { name: 'Banking', href: '/dashboard/banking', icon: Landmark },
  { name: 'Payroll', href: '/dashboard/payroll', icon: Wallet },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Activity Log', href: '/dashboard/activity', icon: History },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const Sidebar = ({ collapsed, onToggle, isMobile = false, onClose }) => {
  const location = useLocation()

  // Handle nav link click - close sidebar on mobile
  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  return (
    <aside
      className={`
        ${isMobile ? 'relative' : 'fixed left-0 top-0'} h-full bg-gray-900 text-white z-40
        transition-all duration-300 flex flex-col
        ${collapsed && !isMobile ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {(!collapsed || isMobile) && (
          <span className="text-xl font-bold text-white">SimpliBooks</span>
        )}
        <button
          onClick={isMobile ? onClose : onToggle}
          className={`
            p-2 rounded-lg hover:bg-gray-800 transition-colors
            ${collapsed && !isMobile ? 'mx-auto' : ''}
          `}
        >
          {isMobile ? (
            <X className="w-5 h-5" />
          ) : collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-hide">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-accent-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                  title={collapsed && !isMobile ? item.name : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

    </aside>
  )
}

export default Sidebar

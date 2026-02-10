import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CompanyProvider } from './context/CompanyContext'
import { ToastProvider } from './components/ui/Toast'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Security from './pages/Security'
import Onboarding from './pages/Onboarding'
import DashboardLayout from './components/dashboard/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Suppliers from './pages/Suppliers'
import Quotations from './pages/Quotations'
import QuotationDetail from './pages/QuotationDetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import Purchases from './pages/Purchases'
import PurchaseDetail from './pages/PurchaseDetail'
import Accounts from './pages/Accounts'
import Banking from './pages/Banking'
import Payroll from './pages/Payroll'
import PayrollRunDetail from './pages/PayrollRunDetail'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import ActivityLog from './pages/ActivityLog'
import Billing from './pages/Billing'
import Settings from './pages/Settings'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/security" element={<Security />} />

          {/* Onboarding - protected but skips onboarding check */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute skipOnboardingCheck>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CompanyProvider>
                  <DashboardLayout />
                </CompanyProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationDetail />} />
            <Route path="quotations/:id" element={<QuotationDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceDetail />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="purchases/new" element={<PurchaseDetail />} />
            <Route path="purchases/:id" element={<PurchaseDetail />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="banking" element={<Banking />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="payroll/runs/:id" element={<PayrollRunDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

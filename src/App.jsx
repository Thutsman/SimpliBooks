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
import Reports from './pages/Reports'
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
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

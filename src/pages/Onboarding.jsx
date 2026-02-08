import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  FileText,
  MapPin,
  Calculator,
  CreditCard,
  Image,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import { SUPPORTED_COUNTRIES, DEFAULT_ACCOUNTS, DEFAULT_VAT_RATES } from '../lib/constants'

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles, description: 'Let\'s set up your company' },
  { id: 'details', title: 'Business Details', icon: FileText, description: 'Registration & tax info' },
  { id: 'address', title: 'Address', icon: MapPin, description: 'Business location' },
  { id: 'financial', title: 'Financial', icon: Calculator, description: 'Currency & year settings' },
  { id: 'banking', title: 'Banking', icon: CreditCard, description: 'Payment details' },
  { id: 'complete', title: 'Complete', icon: CheckCircle, description: 'You\'re all set!' },
]

const Onboarding = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    // Welcome/Company Name
    name: '',
    // Business Details
    legal_name: '',
    registration_number: '',
    vat_number: '',
    email: '',
    phone: '',
    website: '',
    // Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'South Africa',
    // Financial
    currency: 'ZAR',
    financial_year_start: 3, // March (typical for SA)
    // Banking
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    bank_swift_code: '',
    bank_reference: '',
  })

  // Update currency when country changes
  useEffect(() => {
    const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.value === formData.country)
    if (selectedCountry && selectedCountry.currency !== formData.currency) {
      setFormData(prev => ({ ...prev, currency: selectedCountry.currency }))
    }
  }, [formData.country])

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 0) {
      if (!formData.name.trim()) {
        newErrors.name = 'Company name is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)

    try {
      // Use the server-side RPC function which handles everything atomically:
      // creates company, company_members row, seeds accounts/VAT rates,
      // and marks onboarding as complete.
      const { data: companyId, error } = await supabase.rpc('complete_onboarding', {
        p_company: formData,
        p_accounts: DEFAULT_ACCOUNTS,
        p_vat_rates: DEFAULT_VAT_RATES,
      })

      if (error) throw error

      // Store active company
      localStorage.setItem('activeCompanyId', companyId)

      // Invalidate queries so ProtectedRoute sees the updated state
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await queryClient.invalidateQueries({ queryKey: ['companies-check'] })
      await queryClient.invalidateQueries({ queryKey: ['companies'] })

      toast.success('Company setup complete!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error(error.message || 'Failed to complete setup')
    } finally {
      setIsSubmitting(false)
    }
  }

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'ZAR', label: 'ZAR - South African Rand' },
    { value: 'BWP', label: 'BWP - Botswana Pula' },
  ]

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-accent-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SimpliBooks</h2>
              <p className="text-gray-600">
                Let's get your business set up. This will only take a few minutes.
              </p>
            </div>

            <Input
              label="Company Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your company or business name"
              error={errors.name}
              autoFocus
            />

            <Input
              label="Business Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@yourcompany.com"
            />

            <Input
              label="Business Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+27 12 345 6789"
            />
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Details</h2>
              <p className="text-gray-600">
                Add your registration and tax information (optional).
              </p>
            </div>

            <Input
              label="Legal/Registered Name"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              placeholder="Registered company name (if different)"
              helperText="Leave blank if same as company name"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Registration Number"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="e.g., 2024/123456/07"
              />
              <Input
                label="VAT Number"
                value={formData.vat_number}
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                placeholder="e.g., 4123456789"
              />
            </div>

            <Input
              label="Website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.yourcompany.com"
            />
          </div>
        )

      case 'address':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Address</h2>
              <p className="text-gray-600">
                This address will appear on your invoices and quotations.
              </p>
            </div>

            <Input
              label="Street Address"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="123 Main Street"
            />

            <Input
              label="Address Line 2"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Suite, floor, building (optional)"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Johannesburg"
              />
              <Input
                label="State/Province"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Gauteng"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Postal Code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="2000"
              />
              <Select
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                options={SUPPORTED_COUNTRIES}
              />
            </div>
          </div>
        )

      case 'financial':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Settings</h2>
              <p className="text-gray-600">
                Configure your currency and financial year.
              </p>
            </div>

            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={currencies}
              helperText="This will be used for all invoices and reports"
            />

            <Select
              label="Financial Year Start"
              value={formData.financial_year_start}
              onChange={(e) => setFormData({ ...formData, financial_year_start: parseInt(e.target.value) })}
              options={months}
              helperText="When does your financial year begin?"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-1">VAT Rates</h4>
              <p className="text-sm text-blue-700">
                Default VAT rates for {formData.country} will be automatically configured.
                You can customize these later in Settings.
              </p>
            </div>
          </div>
        )

      case 'banking':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Banking Details</h2>
              <p className="text-gray-600">
                Add your bank details for invoice payments (optional).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="e.g., FNB, Standard Bank"
              />
              <Input
                label="Account Holder Name"
                value={formData.bank_account_name}
                onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                placeholder="Name on account"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Account Number"
                value={formData.bank_account_number}
                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                placeholder="Bank account number"
              />
              <Input
                label="Branch Code"
                value={formData.bank_branch_code}
                onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
                placeholder="e.g., 250655"
              />
            </div>

            <Input
              label="SWIFT/BIC Code"
              value={formData.bank_swift_code}
              onChange={(e) => setFormData({ ...formData, bank_swift_code: e.target.value })}
              placeholder="For international transfers (optional)"
            />

            <p className="text-sm text-gray-500">
              You can skip this step and add banking details later in Settings.
            </p>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-accent-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
              <p className="text-gray-600 mb-8">
                Your company "{formData.name}" is ready to go.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">What's included:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Pre-configured chart of accounts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">VAT rates for {formData.country}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Ready to create invoices and quotations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Bank reconciliation tools</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-1">Next Steps</h4>
              <p className="text-sm text-blue-700">
                After setup, you can add your company logo, import clients, and start creating invoices.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SimpliBooks</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        ${isCompleted ? 'bg-accent-500 text-white' : ''}
                        ${isActive ? 'bg-accent-100 text-accent-600 ring-2 ring-accent-500' : ''}
                        ${!isCompleted && !isActive ? 'bg-gray-100 text-gray-400' : ''}
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`
                        text-xs mt-2 font-medium hidden sm:block
                        ${isActive ? 'text-accent-600' : ''}
                        ${isCompleted ? 'text-gray-900' : ''}
                        ${!isCompleted && !isActive ? 'text-gray-400' : ''}
                      `}
                    >
                      {step.title}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={`
                        w-12 sm:w-24 h-0.5 mx-2
                        ${index < currentStep ? 'bg-accent-500' : 'bg-gray-200'}
                      `}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 0 ? (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                {currentStep === 0 ? 'Get Started' : 'Continue'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} loading={isSubmitting}>
                {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                {!isSubmitting && <CheckCircle className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>

        {/* Skip Link */}
        {currentStep > 0 && currentStep < STEPS.length - 1 && (
          <p className="text-center mt-4">
            <button
              type="button"
              onClick={handleNext}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip this step
            </button>
          </p>
        )}
      </main>
    </div>
  )
}

export default Onboarding

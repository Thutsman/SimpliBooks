import { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, Plus, Check, DollarSign } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useToast } from '../ui/Toast'

const CompanySelector = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const dropdownRef = useRef(null)
  const toast = useToast()

  const {
    companies,
    activeCompany,
    switchCompany,
    createCompany,
    updateCompany,
    isCreating,
  } = useCompany()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return

    try {
      await createCompany({ name: newCompanyName.trim() })
      toast.success('Company created successfully')
      setNewCompanyName('')
      setShowCreateModal(false)
    } catch (error) {
      toast.error(error.message || 'Failed to create company')
    }
  }

  const handleSelectCompany = (companyId) => {
    switchCompany(companyId)
    setIsOpen(false)
  }

  const handleCurrencyChange = async (currency) => {
    try {
      await updateCompany({ id: activeCompany.id, currency })
      toast.success(`Currency changed to ${currency}`)
      setIsOpen(false)
    } catch (error) {
      toast.error(error.message || 'Failed to update currency')
    }
  }

  const currencies = [
    { value: 'USD', label: 'USD', symbol: '$' },
    { value: 'ZAR', label: 'ZAR', symbol: 'R' },
    { value: 'BWP', label: 'BWP', symbol: 'P' },
  ]

  // Show create company prompt if no companies
  if (companies.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Create Company</span>
        </button>

        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Your First Company"
          description="Enter your business name to get started."
        >
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <Input
              label="Company Name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              required
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isCreating}>
                Create Company
              </Button>
            </div>
          </form>
        </Modal>
      </>
    )
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors min-w-[200px]"
        >
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center overflow-hidden">
            {activeCompany?.logo_url ? (
              <img
                src={activeCompany.logo_url}
                alt={activeCompany.name}
                className="w-full h-full object-contain p-0.5"
              />
            ) : (
              <Building2 className="w-4 h-4 text-primary-600" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
              {activeCompany?.name || 'Select Company'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-full min-w-[250px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* Quick Currency Selector */}
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Currency</p>
              <div className="flex gap-2">
                {currencies.map((curr) => (
                  <button
                    key={curr.value}
                    onClick={() => handleCurrencyChange(curr.value)}
                    className={`
                      flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeCompany?.currency === curr.value
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {curr.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase">Your Companies</p>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelectCompany(company.id)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 w-full text-left"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                    {company.name}
                  </span>
                  {company.id === activeCompany?.id && (
                    <Check className="w-4 h-4 text-primary-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 w-full text-left text-primary-600"
              >
                <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Add Company</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Company"
        description="Create a new company to manage separately."
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <Input
            label="Company Name"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="e.g., Acme Corporation"
            required
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Create Company
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default CompanySelector

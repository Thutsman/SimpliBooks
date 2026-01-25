import { useState, useEffect } from 'react'
import { Building2, Save, Trash2 } from 'lucide-react'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea, Select } from '../components/ui/Input'
import { ConfirmModal } from '../components/ui/Modal'
import LogoUpload from '../components/ui/LogoUpload'
import { SUPPORTED_COUNTRIES } from '../lib/constants'

const Settings = () => {
  const { activeCompany, updateCompany, deleteCompany, isUpdating, isDeleting } = useCompany()
  const toast = useToast()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    registration_number: '',
    vat_number: '',
    email: '',
    phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'South Africa',
    currency: 'ZAR',
    financial_year_start: 3,
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    bank_swift_code: '',
    bank_reference: '',
  })

  useEffect(() => {
    if (activeCompany) {
      setFormData({
        name: activeCompany.name || '',
        legal_name: activeCompany.legal_name || '',
        registration_number: activeCompany.registration_number || '',
        vat_number: activeCompany.vat_number || '',
        email: activeCompany.email || '',
        phone: activeCompany.phone || '',
        website: activeCompany.website || '',
        address_line1: activeCompany.address_line1 || '',
        address_line2: activeCompany.address_line2 || '',
        city: activeCompany.city || '',
        state: activeCompany.state || '',
        postal_code: activeCompany.postal_code || '',
        country: activeCompany.country || 'South Africa',
        currency: activeCompany.currency || 'ZAR',
        financial_year_start: activeCompany.financial_year_start || 3,
        bank_name: activeCompany.bank_name || '',
        bank_account_name: activeCompany.bank_account_name || '',
        bank_account_number: activeCompany.bank_account_number || '',
        bank_branch_code: activeCompany.bank_branch_code || '',
        bank_swift_code: activeCompany.bank_swift_code || '',
        bank_reference: activeCompany.bank_reference || '',
      })
    }
  }, [activeCompany])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await updateCompany({ id: activeCompany.id, ...formData })
      toast.success('Company settings updated')
    } catch (error) {
      toast.error(error.message || 'Failed to update settings')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCompany(activeCompany.id)
      toast.success('Company deleted')
      setShowDeleteModal(false)
    } catch (error) {
      toast.error(error.message || 'Failed to delete company')
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

  if (!activeCompany) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Company Selected</h2>
        <p className="text-gray-600">Please select or create a company first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your company settings</p>
        </div>
        <Button onClick={handleSubmit} loading={isUpdating}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Company Logo</h2>
          <p className="text-sm text-gray-600">
            Upload your company logo to display on invoices, quotations, and reports.
          </p>
          <LogoUpload
            companyId={activeCompany.id}
            currentLogoUrl={activeCompany.logo_url}
            onUploadComplete={async (logoUrl) => {
              try {
                await updateCompany({ id: activeCompany.id, logo_url: logoUrl })
                toast.success('Logo uploaded successfully')
              } catch (error) {
                toast.error(error.message || 'Failed to update logo')
              }
            }}
            onDeleteComplete={async () => {
              try {
                await updateCompany({ id: activeCompany.id, logo_url: null })
                toast.success('Logo removed successfully')
              } catch (error) {
                toast.error(error.message || 'Failed to remove logo')
              }
            }}
          />
        </div>

        {/* Company Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Company Details</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Legal Name"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              placeholder="Registered company name"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Registration Number"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              placeholder="Company registration number"
            />
            <Input
              label="VAT Number"
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              placeholder="VAT registration number"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://www.example.com"
          />
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Address</h2>

          <Input
            label="Address Line 1"
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            placeholder="Street address"
          />

          <Input
            label="Address Line 2"
            value={formData.address_line2}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
            placeholder="Suite, building, floor"
          />

          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State/Province"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Postal Code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            />
          </div>

          <Select
            label="Country"
            value={formData.country}
            onChange={(e) => {
              const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.value === e.target.value)
              setFormData({
                ...formData,
                country: e.target.value,
                // Auto-set currency when country changes
                currency: selectedCountry?.currency || formData.currency,
              })
            }}
            options={SUPPORTED_COUNTRIES}
          />
          <p className="text-xs text-gray-500 -mt-2">
            Country determines available VAT rates for invoices and quotations.
          </p>
        </div>

        {/* Financial Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Financial Settings</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={currencies}
            />
            <Select
              label="Financial Year Start"
              value={formData.financial_year_start}
              onChange={(e) =>
                setFormData({ ...formData, financial_year_start: parseInt(e.target.value) })
              }
              options={months}
            />
          </div>
        </div>

        {/* Banking Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Banking Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              These details will appear on your invoices and quotations for payment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Bank Name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="e.g., FNB, Standard Bank, ABSA"
            />
            <Input
              label="Account Holder Name"
              value={formData.bank_account_name}
              onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
              placeholder="Name as registered with bank"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
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

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="SWIFT/BIC Code"
              value={formData.bank_swift_code}
              onChange={(e) => setFormData({ ...formData, bank_swift_code: e.target.value })}
              placeholder="For international transfers"
            />
            <Input
              label="Default Payment Reference"
              value={formData.bank_reference}
              onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
              placeholder="e.g., Invoice number"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-gray-600 mb-4">
            Once you delete a company, there is no going back. All data associated with this
            company will be permanently deleted.
          </p>
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Company
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${activeCompany?.name}"? This will permanently delete all invoices, purchases, clients, suppliers, and other data. This action cannot be undone.`}
        confirmText="Delete Company"
        loading={isDeleting}
      />
    </div>
  )
}

export default Settings

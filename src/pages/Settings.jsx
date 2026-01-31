import { useState, useEffect } from 'react'
import { Building2, Save, Trash2, Plus, X, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea, Select } from '../components/ui/Input'
import { ConfirmModal } from '../components/ui/Modal'
import LogoUpload from '../components/ui/LogoUpload'
import { SUPPORTED_COUNTRIES, CURRENCY_OPTIONS } from '../lib/constants'
import { useCompanyCurrencies } from '../hooks/useCompanyCurrencies'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { usePermissions } from '../hooks/usePermissions'
import { useCompanyMembers } from '../hooks/useCompanyMembers'
import { useCompanyInvitations } from '../hooks/useCompanyInvitations'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

const MEMBER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'viewer', label: 'Viewer' },
]

const Settings = () => {
  const { activeCompany, updateCompany, deleteCompany, isUpdating, isDeleting } = useCompany()
  const { canEditCompany, canDeleteCompany, canManageMembers } = usePermissions()
  const {
    members,
    isLoading: membersLoading,
    addMember,
    updateMemberRole,
    removeMember,
    isAdding,
    isUpdating: isUpdatingMember,
    isRemoving,
  } = useCompanyMembers()
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('accountant')
  const [removeMemberId, setRemoveMemberId] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('accountant')
  const toast = useToast()
  const {
    invitations,
    isLoading: invitationsLoading,
    inviteByEmailViaEdge,
    cancelInvitation,
    isInvitingViaEdge,
    isCancelling,
  } = useCompanyInvitations()
  const {
    enabledCurrencies,
    isLoading: currenciesLoading,
    addCurrency: addEnabledCurrency,
    removeCurrency: removeEnabledCurrency,
    isAdding: isAddingCurrency,
    isRemoving: isRemovingCurrency,
    baseCurrency,
  } = useCompanyCurrencies()
  const {
    exchangeRates,
    isLoading: ratesLoading,
    createRate,
    deleteRate,
    isCreating: isCreatingRate,
    isDeleting: isDeletingRate,
    baseCurrency: baseCur,
  } = useExchangeRates()

  const { data: hasTransactions } = useQuery({
    queryKey: ['company-has-transactions', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return false
      const [inv, pur, quo] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('supplier_invoices').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('company_id', activeCompany.id),
      ])
      return (inv.count || 0) > 0 || (pur.count || 0) > 0 || (quo.count || 0) > 0
    },
    enabled: !!activeCompany?.id,
  })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newRate, setNewRate] = useState({ quote_currency_code: '', rate: '', effective_date: format(new Date(), 'yyyy-MM-dd') })
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

  const handleAddEnabledCurrency = async (currencyCode) => {
    try {
      await addEnabledCurrency(currencyCode)
      toast.success(`Currency ${currencyCode} enabled`)
    } catch (e) {
      toast.error(e.message || 'Failed to add currency')
    }
  }

  const handleRemoveEnabledCurrency = async (currencyCode) => {
    if (currencyCode === baseCurrency) {
      toast.error('Cannot remove base currency')
      return
    }
    try {
      await removeEnabledCurrency(currencyCode)
      toast.success(`Currency ${currencyCode} disabled`)
    } catch (e) {
      toast.error(e.message || 'Failed to remove currency')
    }
  }

  const handleAddExchangeRate = async (e) => {
    e.preventDefault()
    const rate = parseFloat(newRate.rate)
    if (!newRate.quote_currency_code || !rate || rate <= 0 || !newRate.effective_date) {
      toast.error('Enter quote currency, rate (positive), and effective date')
      return
    }
    if (newRate.quote_currency_code === baseCur) {
      toast.error('Quote currency must differ from base currency')
      return
    }
    try {
      await createRate({
        quote_currency_code: newRate.quote_currency_code,
        rate,
        effective_date: newRate.effective_date,
      })
      toast.success('Exchange rate added')
      setNewRate({ quote_currency_code: '', rate: '', effective_date: format(new Date(), 'yyyy-MM-dd') })
    } catch (e) {
      toast.error(e.message || 'Failed to add rate')
    }
  }

  const availableToEnable = CURRENCY_OPTIONS.filter(
    (c) => !enabledCurrencies.some((ec) => ec.currency_code === c.value)
  )

  if (!activeCompany) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Company Selected</h2>
        <p className="text-gray-600">Please select or create a company first.</p>
      </div>
    )
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    const email = newMemberEmail.trim()
    if (!email) {
      toast.error('Enter an email address')
      return
    }
    try {
      await addMember({ email, role: newMemberRole })
      toast.success('Member added')
      setNewMemberEmail('')
      setNewMemberRole('accountant')
    } catch (error) {
      toast.error(error.message || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (memberId) => {
    try {
      await removeMember(memberId)
      toast.success('Member removed')
      setRemoveMemberId(null)
    } catch (error) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const handleInviteByEmail = async (e) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      toast.error('Enter an email address')
      return
    }
    try {
      await inviteByEmailViaEdge({ email, role: inviteRole })
      toast.success('Invitation sent by email')
      setInviteEmail('')
      setInviteRole('accountant')
    } catch (error) {
      toast.error(error.message || 'Failed to send invitation')
    }
  }

  const handleCancelInvitation = async (invitationId) => {
    try {
      await cancelInvitation(invitationId)
      toast.success('Invitation cancelled')
    } catch (error) {
      toast.error(error.message || 'Failed to cancel invitation')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your company settings</p>
        </div>
        {canEditCompany && (
          <Button onClick={handleSubmit} loading={isUpdating}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Company Logo</h2>
          <p className="text-sm text-gray-600">
            Upload your company logo to display on invoices, quotations, and reports.
          </p>
          {canEditCompany && (
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
          )}
          {!canEditCompany && activeCompany?.logo_url && (
            <img src={activeCompany.logo_url} alt="Company logo" className="max-h-20 rounded" />
          )}
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
              disabled={!canEditCompany}
            />
            <Input
              label="Legal Name"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              placeholder="Registered company name"
              disabled={!canEditCompany}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Registration Number"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              placeholder="Company registration number"
              disabled={!canEditCompany}
            />
            <Input
              label="VAT Number"
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              placeholder="VAT registration number"
              disabled={!canEditCompany}
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
              disabled={!canEditCompany}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!canEditCompany}
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://www.example.com"
            disabled={!canEditCompany}
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
            disabled={!canEditCompany}
          />

          <Input
            label="Address Line 2"
            value={formData.address_line2}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
            placeholder="Suite, building, floor"
            disabled={!canEditCompany}
          />

          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={!canEditCompany}
            />
            <Input
              label="State/Province"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={!canEditCompany}
            />
            <Input
              label="Postal Code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              disabled={!canEditCompany}
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
                currency: selectedCountry?.currency || formData.currency,
              })
            }}
            options={SUPPORTED_COUNTRIES}
            disabled={!canEditCompany}
          />
          <p className="text-xs text-gray-500 -mt-2">
            Country determines available VAT rates for invoices and quotations.
          </p>
        </div>

        {/* Financial Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Financial Settings</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Base Currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                options={CURRENCY_OPTIONS}
                disabled={!!hasTransactions || !canEditCompany}
              />
              {hasTransactions && (
                <p className="text-xs text-amber-600 mt-1">
                  Base currency cannot be changed once you have invoices, purchases, or quotations.
                </p>
              )}
            </div>
            <Select
              label="Financial Year Start"
              value={formData.financial_year_start}
              onChange={(e) =>
                setFormData({ ...formData, financial_year_start: parseInt(e.target.value) })
              }
              options={months}
              disabled={!canEditCompany}
            />
          </div>
        </div>

        {/* Enabled Currencies (multi-currency) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Currencies</h2>
          <p className="text-sm text-gray-600">
            Enable which currencies you can use on invoices, purchases, and quotations. Base currency is always enabled.
          </p>
          {currenciesLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {enabledCurrencies.map((ec) => (
                  <span
                    key={ec.currency_code}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-sm"
                  >
                    {ec.currency_code}
                    {ec.currency_code === baseCurrency ? (
                      <span className="text-xs text-gray-500">(base)</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveEnabledCurrency(ec.currency_code)}
                        disabled={isRemovingCurrency || !canEditCompany}
                        className="p-0.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                        aria-label={`Remove ${ec.currency_code}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {availableToEnable.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-600">Add:</span>
                  {availableToEnable.map((c) => (
                    <Button
                      key={c.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddEnabledCurrency(c.value)}
                      disabled={isAddingCurrency || !canEditCompany}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {c.value}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Exchange Rates */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Exchange Rates</h2>
          <p className="text-sm text-gray-600">
            Add manual exchange rates (1 foreign unit = rate in {baseCur}). Used when creating invoices or purchases in foreign currency.
          </p>
          <form onSubmit={handleAddExchangeRate} className="flex flex-wrap items-end gap-3">
            <Select
              label="Currency"
              value={newRate.quote_currency_code}
              onChange={(e) => setNewRate({ ...newRate, quote_currency_code: e.target.value })}
              options={CURRENCY_OPTIONS.filter((c) => c.value !== baseCur)}
              className="w-40"
            />
            <Input
              label={`Rate (1 unit = ? ${baseCur})`}
              type="number"
              step="0.000001"
              min="0.000001"
              value={newRate.rate}
              onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
              placeholder="e.g. 0.055"
              className="w-32"
            />
            <Input
              label="Effective date"
              type="date"
              value={newRate.effective_date}
              onChange={(e) => setNewRate({ ...newRate, effective_date: e.target.value })}
              className="w-40"
            />
            <Button type="submit" disabled={isCreatingRate || !canEditCompany}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rate
            </Button>
          </form>
          {ratesLoading ? (
            <p className="text-sm text-gray-500">Loading rates...</p>
          ) : exchangeRates.length === 0 ? (
            <p className="text-sm text-gray-500">No exchange rates yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Quote</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Rate</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Effective date</th>
                    <th className="px-3 py-2 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {exchangeRates.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{r.quote_currency_code}</td>
                      <td className="px-3 py-2 font-mono">{Number(r.rate)}</td>
                      <td className="px-3 py-2">{format(new Date(r.effective_date), 'dd MMM yyyy')}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteRate(r.id)
                              toast.success('Rate removed')
                            } catch (e) {
                              toast.error(e.message || 'Failed to remove rate')
                            }
                          }}
                          disabled={isDeletingRate || !canEditCompany}
                          className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                          aria-label="Delete rate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              disabled={!canEditCompany}
            />
            <Input
              label="Account Holder Name"
              value={formData.bank_account_name}
              onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
              placeholder="Name as registered with bank"
              disabled={!canEditCompany}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Account Number"
              value={formData.bank_account_number}
              onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
              placeholder="Bank account number"
              disabled={!canEditCompany}
            />
            <Input
              label="Branch Code"
              value={formData.bank_branch_code}
              onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
              placeholder="e.g., 250655"
              disabled={!canEditCompany}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="SWIFT/BIC Code"
              value={formData.bank_swift_code}
              onChange={(e) => setFormData({ ...formData, bank_swift_code: e.target.value })}
              placeholder="For international transfers"
              disabled={!canEditCompany}
            />
            <Input
              label="Default Payment Reference"
              value={formData.bank_reference}
              onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
              placeholder="e.g., Invoice number"
              disabled={!canEditCompany}
            />
          </div>
        </div>

        {/* Team Members */}
        {canManageMembers && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </h2>
            <p className="text-sm text-gray-600">
              Invite by email (they receive a sign-up link) or add an existing user by email.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Invite by email</p>
                <form onSubmit={handleInviteByEmail} className="flex flex-wrap items-end gap-3">
                  <Input
                    label="Email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 min-w-[200px]"
                  />
                  <Select
                    label="Role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    options={MEMBER_ROLES}
                    className="w-40"
                  />
                  <Button type="submit" disabled={isInvitingViaEdge}>
                    {isInvitingViaEdge ? 'Sending…' : 'Send invite'}
                  </Button>
                </form>
              </div>
              {invitationsLoading ? null : invitations.filter((i) => i.status === 'pending').length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Pending invitations</p>
                  <ul className="text-sm space-y-1">
                    {invitations.filter((i) => i.status === 'pending').map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between gap-2 py-1">
                        <span>{inv.email} — {inv.role}</span>
                        <Button size="sm" variant="outline" onClick={() => handleCancelInvitation(inv.id)} disabled={isCancelling}>
                          Cancel
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-sm text-gray-500">Or add someone who already has an account:</p>
            </div>
            <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-3">
              <Input
                label="Email"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 min-w-[200px]"
              />
              <Select
                label="Role"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                options={MEMBER_ROLES}
                className="w-40"
              />
              <Button type="submit" disabled={isAdding}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </form>
            {membersLoading ? (
              <p className="text-sm text-gray-500">Loading members...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Role</th>
                      <th className="px-3 py-2 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{m.profile?.full_name || '-'}</td>
                        <td className="px-3 py-2">{m.profile?.email || m.user_id}</td>
                        <td className="px-3 py-2 capitalize">{m.role}</td>
                        <td className="px-3 py-2">
                          {m.role === 'owner' && <span className="text-gray-400">—</span>}
                          {m.role !== 'owner' && removeMemberId === m.id && (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="danger" onClick={() => handleRemoveMember(m.id)} loading={isRemoving}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setRemoveMemberId(null)}>Cancel</Button>
                            </div>
                          )}
                          {m.role !== 'owner' && removeMemberId !== m.id && (
                            <div className="flex items-center gap-2">
                              <select
                                value={m.role}
                                onChange={async (e) => {
                                  try {
                                    await updateMemberRole({ memberId: m.id, role: e.target.value })
                                    toast.success('Role updated')
                                  } catch (err) {
                                    toast.error(err.message || 'Failed to update role')
                                  }
                                }}
                                disabled={isUpdatingMember}
                                className="text-sm border rounded px-2 py-1"
                              >
                                {MEMBER_ROLES.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setRemoveMemberId(m.id)}
                                className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                                aria-label="Remove member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone */}
        {canDeleteCompany && (
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
        )}
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

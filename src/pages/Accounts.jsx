import { useState } from 'react'
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select, Textarea } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import { ACCOUNT_TYPES, ACCOUNT_SUB_TYPES } from '../lib/constants'

const Accounts = () => {
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [expandedTypes, setExpandedTypes] = useState(['asset', 'liability', 'equity', 'income', 'expense'])
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    sub_type: '',
    description: '',
  })

  const {
    accountsByType,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAccounts()
  const toast = useToast()

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: '',
      sub_type: '',
      description: '',
    })
    setSelectedAccount(null)
  }

  const handleOpenModal = (account = null) => {
    if (account) {
      setSelectedAccount(account)
      setFormData({
        code: account.code || '',
        name: account.name || '',
        type: account.type || '',
        sub_type: account.sub_type || '',
        description: account.description || '',
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (selectedAccount) {
        await updateAccount({ id: selectedAccount.id, ...formData })
        toast.success('Account updated successfully')
      } else {
        await createAccount(formData)
        toast.success('Account created successfully')
      }
      setShowModal(false)
      resetForm()
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAccount(selectedAccount.id)
      toast.success('Account deleted successfully')
      setShowDeleteModal(false)
      setSelectedAccount(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete account')
    }
  }

  const toggleType = (type) => {
    setExpandedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const typeColors = {
    asset: 'bg-blue-100 text-blue-700 border-blue-200',
    liability: 'bg-red-100 text-red-700 border-red-200',
    equity: 'bg-purple-100 text-purple-700 border-purple-200',
    income: 'bg-green-100 text-green-700 border-green-200',
    expense: 'bg-orange-100 text-orange-700 border-orange-200',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600">Manage your accounting categories</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="animate-pulse h-6 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {ACCOUNT_TYPES.map((type) => (
            <div
              key={type.value}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleType(type.value)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${typeColors[type.value]}`}
                  >
                    {type.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {(accountsByType[type.value] || []).length} accounts
                  </span>
                </div>
                {expandedTypes.includes(type.value) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedTypes.includes(type.value) && (
                <div className="border-t border-gray-200">
                  {(accountsByType[type.value] || []).length === 0 ? (
                    <p className="p-4 text-gray-500 text-sm text-center">
                      No accounts in this category
                    </p>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                            Code
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                            Sub-type
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(accountsByType[type.value] || []).map((account) => (
                          <tr key={account.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                              {account.code}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {account.name}
                              </p>
                              {account.description && (
                                <p className="text-xs text-gray-500">
                                  {account.description}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                              {account.sub_type?.replace(/_/g, ' ') || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenModal(account)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {!account.is_system && (
                                  <button
                                    onClick={() => {
                                      setSelectedAccount(account)
                                      setShowDeleteModal(true)
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedAccount ? 'Edit Account' : 'Add New Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Account Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., 1000"
              required
            />
            <Select
              label="Account Type *"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value, sub_type: '' })
              }
              options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              placeholder="Select type"
              required
            />
          </div>

          <Input
            label="Account Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Bank Account"
            required
          />

          {formData.type && ACCOUNT_SUB_TYPES[formData.type] && (
            <Select
              label="Sub-type"
              value={formData.sub_type}
              onChange={(e) =>
                setFormData({ ...formData, sub_type: e.target.value })
              }
              options={ACCOUNT_SUB_TYPES[formData.type]}
              placeholder="Select sub-type (optional)"
            />
          )}

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Optional description"
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {selectedAccount ? 'Update Account' : 'Add Account'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Are you sure you want to delete "${selectedAccount?.name}"? This action cannot be undone if the account has no transactions.`}
        confirmText="Delete"
        loading={isDeleting}
      />
    </div>
  )
}

export default Accounts

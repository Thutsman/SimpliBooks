import { useState } from 'react'
import { Plus, Edit, Trash2, Mail, Phone } from 'lucide-react'
import { useClients } from '../hooks/useClients'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'

const Clients = () => {
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vat_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    notes: '',
  })

  const {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
    isCreating,
    isUpdating,
    isDeleting,
  } = useClients()
  const toast = useToast()

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      vat_number: '',
      address_line1: '',
      address_line2: '',
      city: '',
      postal_code: '',
      notes: '',
    })
    setSelectedClient(null)
  }

  const handleOpenModal = (client = null) => {
    if (client) {
      setSelectedClient(client)
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        vat_number: client.vat_number || '',
        address_line1: client.address_line1 || '',
        address_line2: client.address_line2 || '',
        city: client.city || '',
        postal_code: client.postal_code || '',
        notes: client.notes || '',
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (selectedClient) {
        await updateClient({ id: selectedClient.id, ...formData })
        toast.success('Client updated successfully')
      } else {
        await createClient(formData)
        toast.success('Client created successfully')
      }
      setShowModal(false)
      resetForm()
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteClient(selectedClient.id)
      toast.success('Client deleted successfully')
      setShowDeleteModal(false)
      setSelectedClient(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete client')
    }
  }

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.vat_number && (
            <p className="text-xs text-gray-500">VAT: {row.vat_number}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (row) => (
        <div className="space-y-1">
          {row.email && (
            <div className="flex items-center gap-1 text-gray-600">
              <Mail className="w-3 h-3" />
              <span className="text-sm">{row.email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="w-3 h-3" />
              <span className="text-sm">{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (row) => (
        <span className="text-gray-600">
          {[row.city, row.postal_code].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleOpenModal(row)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedClient(row)
              setShowDeleteModal(true)
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={clients}
        isLoading={isLoading}
        searchPlaceholder="Search clients..."
        emptyMessage="No clients yet. Add your first client to get started."
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedClient ? 'Edit Client' : 'Add New Client'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Client name"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+27 12 345 6789"
            />
          </div>

          <Input
            label="VAT Number"
            value={formData.vat_number}
            onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
            placeholder="VAT number (optional)"
          />

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
            placeholder="Apartment, suite, etc."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
            />
            <Input
              label="Postal Code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              placeholder="Postal code"
            />
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about this client"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {selectedClient ? 'Update Client' : 'Add Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${selectedClient?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={isDeleting}
      />
    </div>
  )
}

export default Clients

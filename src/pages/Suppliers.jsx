import { useState } from 'react'
import { Plus, Edit, Trash2, Mail, Phone } from 'lucide-react'
import { useSuppliers } from '../hooks/useSuppliers'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'

const Suppliers = () => {
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
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
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    isCreating,
    isUpdating,
    isDeleting,
  } = useSuppliers()
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
    setSelectedSupplier(null)
  }

  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setSelectedSupplier(supplier)
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        vat_number: supplier.vat_number || '',
        address_line1: supplier.address_line1 || '',
        address_line2: supplier.address_line2 || '',
        city: supplier.city || '',
        postal_code: supplier.postal_code || '',
        notes: supplier.notes || '',
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (selectedSupplier) {
        await updateSupplier({ id: selectedSupplier.id, ...formData })
        toast.success('Supplier updated successfully')
      } else {
        await createSupplier(formData)
        toast.success('Supplier created successfully')
      }
      setShowModal(false)
      resetForm()
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteSupplier(selectedSupplier.id)
      toast.success('Supplier deleted successfully')
      setShowDeleteModal(false)
      setSelectedSupplier(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete supplier')
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
              setSelectedSupplier(row)
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
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Manage your supplier database</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        searchPlaceholder="Search suppliers..."
        emptyMessage="No suppliers yet. Add your first supplier to get started."
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Supplier name"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="supplier@example.com"
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
            placeholder="Additional notes about this supplier"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {selectedSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${selectedSupplier?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={isDeleting}
      />
    </div>
  )
}

export default Suppliers

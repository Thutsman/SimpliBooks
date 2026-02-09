import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, CalendarDays, Search, Trash2, Edit } from 'lucide-react'
import { useEmployees, usePayrollRuns } from '../hooks/usePayroll'
import { usePermissions } from '../hooks/usePermissions'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input, { Select, Textarea } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import DataTable from '../components/dashboard/DataTable'
import { formatCurrency, formatDate, getStatusColor } from '../lib/constants'
import { format } from 'date-fns'

const TABS = [
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'runs', label: 'Payroll Runs', icon: CalendarDays },
]

const SALARY_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'hourly', label: 'Hourly' },
]

const emptyEmployeeForm = {
  employee_number: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  id_number: '',
  tax_number: '',
  position: '',
  department: '',
  hire_date: format(new Date(), 'yyyy-MM-dd'),
  termination_date: '',
  salary_type: 'monthly',
  base_salary: '',
  bank_name: '',
  bank_branch_code: '',
  bank_account_number: '',
  address_line1: '',
  address_line2: '',
  city: '',
  province: '',
  postal_code: '',
  is_active: true,
}

const Payroll = () => {
  const navigate = useNavigate()
  const { activeCompany } = useCompany()
  const { canEditTransactions } = usePermissions()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('employees')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  // Employee state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm)

  // Payroll run state
  const [showRunModal, setShowRunModal] = useState(false)
  const [runForm, setRunForm] = useState({
    run_number: '',
    period_start: '',
    period_end: '',
    payment_date: '',
    notes: '',
  })

  const {
    employees,
    isLoading: employeesLoading,
    getNextEmployeeNumber,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    isCreating: isCreatingEmployee,
    isUpdating: isUpdatingEmployee,
    isDeleting: isDeletingEmployee,
  } = useEmployees({ active: showActiveOnly ? true : undefined })

  const {
    runs,
    isLoading: runsLoading,
    getNextRunNumber,
    createPayrollRun,
    isCreating: isCreatingRun,
  } = usePayrollRuns({ status: statusFilter || undefined })

  const currency = activeCompany?.currency || 'ZAR'

  // Auto-generate employee number when modal opens
  useEffect(() => {
    if (showEmployeeModal && !editingEmployee) {
      getNextEmployeeNumber()
        .then((num) => setEmployeeForm((prev) => ({ ...prev, employee_number: num })))
        .catch(() => {})
    }
  }, [showEmployeeModal, editingEmployee])

  // Auto-generate run number when modal opens
  useEffect(() => {
    if (showRunModal) {
      getNextRunNumber()
        .then((num) => setRunForm((prev) => ({ ...prev, run_number: num })))
        .catch(() => {})

      // Default period: current month
      const now = new Date()
      const start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
      const end = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
      const payDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
      setRunForm((prev) => ({
        ...prev,
        period_start: prev.period_start || start,
        period_end: prev.period_end || end,
        payment_date: prev.payment_date || payDate,
      }))
    }
  }, [showRunModal])

  // =============================================
  // Employee handlers
  // =============================================
  const handleOpenEmployeeModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee)
      setEmployeeForm({
        employee_number: employee.employee_number || '',
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        id_number: employee.id_number || '',
        tax_number: employee.tax_number || '',
        position: employee.position || '',
        department: employee.department || '',
        hire_date: employee.hire_date || '',
        termination_date: employee.termination_date || '',
        salary_type: employee.salary_type || 'monthly',
        base_salary: employee.base_salary ?? '',
        bank_name: employee.bank_name || '',
        bank_branch_code: employee.bank_branch_code || '',
        bank_account_number: employee.bank_account_number || '',
        address_line1: employee.address_line1 || '',
        address_line2: employee.address_line2 || '',
        city: employee.city || '',
        province: employee.province || '',
        postal_code: employee.postal_code || '',
        is_active: employee.is_active ?? true,
      })
    } else {
      setEditingEmployee(null)
      setEmployeeForm(emptyEmployeeForm)
    }
    setShowEmployeeModal(true)
  }

  const handleSaveEmployee = async () => {
    if (!employeeForm.first_name || !employeeForm.last_name || !employeeForm.hire_date) {
      toast.error('First name, last name, and hire date are required')
      return
    }

    try {
      const payload = {
        ...employeeForm,
        base_salary: Number(employeeForm.base_salary) || 0,
        termination_date: employeeForm.termination_date || null,
      }

      if (editingEmployee) {
        await updateEmployee({ id: editingEmployee.id, ...payload })
        toast.success('Employee updated')
      } else {
        await createEmployee(payload)
        toast.success('Employee created')
      }
      setShowEmployeeModal(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return
    try {
      await deleteEmployee(employeeToDelete.id)
      toast.success('Employee deleted')
      setShowDeleteModal(false)
      setEmployeeToDelete(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // =============================================
  // Payroll run handlers
  // =============================================
  const handleCreateRun = async () => {
    if (!runForm.period_start || !runForm.period_end || !runForm.payment_date) {
      toast.error('Period dates and payment date are required')
      return
    }

    try {
      const run = await createPayrollRun(runForm)
      toast.success('Payroll run created')
      setShowRunModal(false)
      navigate(`/dashboard/payroll/runs/${run.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // =============================================
  // Employee table columns
  // =============================================
  const employeeColumns = [
    { header: 'Number', accessor: 'employee_number' },
    {
      header: 'Name',
      cell: (row) => `${row.first_name} ${row.last_name}`,
    },
    { header: 'Position', accessor: 'position' },
    { header: 'Department', accessor: 'department' },
    {
      header: 'Salary Type',
      cell: (row) => row.salary_type === 'monthly' ? 'Monthly' : 'Hourly',
    },
    {
      header: 'Base Salary',
      align: 'right',
      cell: (row) => formatCurrency(row.base_salary, currency),
    },
    {
      header: 'Status',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(canEditTransactions
      ? [{
          header: '',
          align: 'right',
          cell: (row) => (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenEmployeeModal(row) }}
                className="p-1 text-gray-400 hover:text-accent-600 rounded"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEmployeeToDelete(row)
                  setShowDeleteModal(true)
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ),
        }]
      : []),
  ]

  // =============================================
  // Payroll runs table columns
  // =============================================
  const runColumns = [
    { header: 'Run Number', accessor: 'run_number' },
    {
      header: 'Period',
      cell: (row) => `${formatDate(row.period_start)} - ${formatDate(row.period_end)}`,
    },
    {
      header: 'Payment Date',
      cell: (row) => formatDate(row.payment_date),
    },
    {
      header: 'Status',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      header: 'Total Gross',
      align: 'right',
      cell: (row) => formatCurrency(row.total_gross, currency),
    },
    {
      header: 'Total Net',
      align: 'right',
      cell: (row) => formatCurrency(row.total_net, currency),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">Manage employees and process payroll</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-accent-500 text-accent-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                />
                Active only
              </label>
            </div>
            {canEditTransactions && (
              <Button onClick={() => handleOpenEmployeeModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            )}
          </div>

          <DataTable
            columns={employeeColumns}
            data={employees}
            searchPlaceholder="Search employees..."
            emptyMessage="No employees found. Add your first employee to get started."
            onRowClick={canEditTransactions ? handleOpenEmployeeModal : undefined}
          />
        </div>
      )}

      {activeTab === 'runs' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'processed', label: 'Processed' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                placeholder="All Statuses"
                className="w-40"
              />
            </div>
            {canEditTransactions && (
              <Button onClick={() => {
                setRunForm({ run_number: '', period_start: '', period_end: '', payment_date: '', notes: '' })
                setShowRunModal(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                New Payroll Run
              </Button>
            )}
          </div>

          <DataTable
            columns={runColumns}
            data={runs}
            searchable={false}
            emptyMessage="No payroll runs found. Create your first payroll run."
            onRowClick={(row) => navigate(`/dashboard/payroll/runs/${row.id}`)}
          />
        </div>
      )}

      {/* =============================================
          Employee Form Modal
          ============================================= */}
      <Modal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        size="xl"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Employee Number"
                value={employeeForm.employee_number}
                onChange={(e) => setEmployeeForm({ ...employeeForm, employee_number: e.target.value })}
                disabled={!!editingEmployee}
              />
              <div />
              <Input
                label="First Name *"
                value={employeeForm.first_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
              />
              <Input
                label="Last Name *"
                value={employeeForm.last_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
              />
              <Input
                label="ID Number"
                value={employeeForm.id_number}
                onChange={(e) => setEmployeeForm({ ...employeeForm, id_number: e.target.value })}
              />
              <Input
                label="Tax Number"
                value={employeeForm.tax_number}
                onChange={(e) => setEmployeeForm({ ...employeeForm, tax_number: e.target.value })}
              />
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Position"
                value={employeeForm.position}
                onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
              />
              <Input
                label="Department"
                value={employeeForm.department}
                onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
              />
              <Input
                label="Hire Date *"
                type="date"
                value={employeeForm.hire_date}
                onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
              />
              <Input
                label="Termination Date"
                type="date"
                value={employeeForm.termination_date}
                onChange={(e) => setEmployeeForm({ ...employeeForm, termination_date: e.target.value })}
              />
              <Select
                label="Salary Type"
                value={employeeForm.salary_type}
                onChange={(e) => setEmployeeForm({ ...employeeForm, salary_type: e.target.value })}
                options={SALARY_TYPE_OPTIONS}
                placeholder=""
              />
              <Input
                label="Base Salary"
                type="number"
                step="0.01"
                value={employeeForm.base_salary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, base_salary: e.target.value })}
              />
              {editingEmployee && (
                <label className="flex items-center gap-2 text-sm text-gray-700 col-span-2">
                  <input
                    type="checkbox"
                    checked={employeeForm.is_active}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                  />
                  Active Employee
                </label>
              )}
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bank Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={employeeForm.bank_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bank_name: e.target.value })}
              />
              <Input
                label="Branch Code"
                value={employeeForm.bank_branch_code}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bank_branch_code: e.target.value })}
              />
              <Input
                label="Account Number"
                value={employeeForm.bank_account_number}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account_number: e.target.value })}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Address Line 1"
                value={employeeForm.address_line1}
                onChange={(e) => setEmployeeForm({ ...employeeForm, address_line1: e.target.value })}
              />
              <Input
                label="Address Line 2"
                value={employeeForm.address_line2}
                onChange={(e) => setEmployeeForm({ ...employeeForm, address_line2: e.target.value })}
              />
              <Input
                label="City"
                value={employeeForm.city}
                onChange={(e) => setEmployeeForm({ ...employeeForm, city: e.target.value })}
              />
              <Input
                label="Province / State"
                value={employeeForm.province}
                onChange={(e) => setEmployeeForm({ ...employeeForm, province: e.target.value })}
              />
              <Input
                label="Postal Code"
                value={employeeForm.postal_code}
                onChange={(e) => setEmployeeForm({ ...employeeForm, postal_code: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEmployeeModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmployee}
              loading={isCreatingEmployee || isUpdatingEmployee}
            >
              {editingEmployee ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =============================================
          New Payroll Run Modal
          ============================================= */}
      <Modal
        isOpen={showRunModal}
        onClose={() => setShowRunModal(false)}
        title="New Payroll Run"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Run Number"
            value={runForm.run_number}
            onChange={(e) => setRunForm({ ...runForm, run_number: e.target.value })}
            disabled
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Period Start *"
              type="date"
              value={runForm.period_start}
              onChange={(e) => setRunForm({ ...runForm, period_start: e.target.value })}
            />
            <Input
              label="Period End *"
              type="date"
              value={runForm.period_end}
              onChange={(e) => setRunForm({ ...runForm, period_end: e.target.value })}
            />
          </div>
          <Input
            label="Payment Date *"
            type="date"
            value={runForm.payment_date}
            onChange={(e) => setRunForm({ ...runForm, payment_date: e.target.value })}
          />
          <Textarea
            label="Notes"
            value={runForm.notes}
            onChange={(e) => setRunForm({ ...runForm, notes: e.target.value })}
            placeholder="Optional notes for this payroll run..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowRunModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRun} loading={isCreatingRun}>
              Create Payroll Run
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setEmployeeToDelete(null) }}
        onConfirm={handleDeleteEmployee}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employeeToDelete?.first_name} ${employeeToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        loading={isDeletingEmployee}
      />
    </div>
  )
}

export default Payroll

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, CheckCircle, DollarSign, Ban, Plus, Trash2 } from 'lucide-react'
import { usePayrollRuns, usePayrollItems, useEmployees, calculatePAYE, calculateUIF, generatePayrollItems } from '../hooks/usePayroll'
import { usePermissions } from '../hooks/usePermissions'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import Modal, { ConfirmModal } from '../components/ui/Modal'
import { formatCurrency, formatDate, getStatusColor } from '../lib/constants'

const PayrollRunDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeCompany } = useCompany()
  const { canEditTransactions } = usePermissions()
  const toast = useToast()
  const currency = activeCompany?.currency || 'ZAR'
  const country = activeCompany?.country || 'South Africa'

  const { runs, updatePayrollRun, isUpdating } = usePayrollRuns()
  const { items, isLoading: itemsLoading, upsertPayrollItems, isUpserting } = usePayrollItems(id)
  const { employees } = useEmployees({ active: true })

  const [editableItems, setEditableItems] = useState([])
  const [showProcessConfirm, setShowProcessConfirm] = useState(false)
  const [showPaidConfirm, setShowPaidConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const run = runs.find((r) => r.id === id)
  const isDraft = run?.status === 'draft'
  const isProcessed = run?.status === 'processed'

  // Sync items from server to local editable state
  useEffect(() => {
    if (items.length > 0) {
      setEditableItems(items.map((item) => ({
        ...item,
        employee_name: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : '',
        employee_number: item.employee?.employee_number || '',
      })))
    }
  }, [items])

  // Employees not yet added to this run
  const availableEmployees = useMemo(() => {
    const usedIds = new Set(editableItems.map((item) => item.employee_id))
    return employees.filter((emp) => !usedIds.has(emp.id))
  }, [employees, editableItems])

  // Summary calculations
  const totals = useMemo(() => {
    return editableItems.reduce(
      (acc, item) => ({
        gross: acc.gross + Number(item.gross_pay || 0),
        paye: acc.paye + Number(item.paye || 0),
        uifEmployee: acc.uifEmployee + Number(item.uif_employee || 0),
        uifEmployer: acc.uifEmployer + Number(item.uif_employer || 0),
        otherDeductions: acc.otherDeductions + Number(item.other_deductions || 0),
        net: acc.net + Number(item.net_pay || 0),
      }),
      { gross: 0, paye: 0, uifEmployee: 0, uifEmployer: 0, otherDeductions: 0, net: 0 }
    )
  }, [editableItems])

  // =============================================
  // Handlers
  // =============================================

  const handleCalculateTaxes = () => {
    const updated = editableItems.map((item) => {
      const grossPay = Number(item.gross_pay) || 0
      const annualIncome = grossPay * 12
      const monthlyPAYE = calculatePAYE(annualIncome, country)
      const uif = calculateUIF(grossPay, country)
      const otherDeductions = Number(item.other_deductions) || 0
      const netPay = grossPay - monthlyPAYE - uif.employee - otherDeductions

      return {
        ...item,
        paye: monthlyPAYE,
        uif_employee: uif.employee,
        uif_employer: uif.employer,
        net_pay: Math.round(netPay * 100) / 100,
      }
    })
    setEditableItems(updated)
    toast.success('Taxes calculated for all employees')
  }

  const handleAddAllEmployees = () => {
    const newItems = generatePayrollItems(availableEmployees, country)
    const mapped = newItems.map((item) => ({
      ...item,
      employee_name: `${item.employee.first_name} ${item.employee.last_name}`,
      employee_number: item.employee.employee_number || '',
    }))
    setEditableItems([...editableItems, ...mapped])
    toast.success(`Added ${mapped.length} employees`)
  }

  const handleAddEmployee = () => {
    if (!selectedEmployeeId) return
    const emp = employees.find((e) => e.id === selectedEmployeeId)
    if (!emp) return

    const generated = generatePayrollItems([emp], country)
    if (generated.length === 0) return

    const newItem = {
      ...generated[0],
      employee_name: `${emp.first_name} ${emp.last_name}`,
      employee_number: emp.employee_number || '',
    }

    setEditableItems([...editableItems, newItem])
    setShowAddEmployeeModal(false)
    setSelectedEmployeeId('')
  }

  const handleRemoveItem = (index) => {
    setEditableItems(editableItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...editableItems]
    updated[index] = { ...updated[index], [field]: value }

    // Recalculate net pay when gross or deductions change
    if (['gross_pay', 'paye', 'uif_employee', 'other_deductions'].includes(field)) {
      const gross = Number(field === 'gross_pay' ? value : updated[index].gross_pay) || 0
      const paye = Number(field === 'paye' ? value : updated[index].paye) || 0
      const uifEmp = Number(field === 'uif_employee' ? value : updated[index].uif_employee) || 0
      const otherDed = Number(field === 'other_deductions' ? value : updated[index].other_deductions) || 0
      updated[index].net_pay = Math.round((gross - paye - uifEmp - otherDed) * 100) / 100
    }

    setEditableItems(updated)
  }

  const handleSaveItems = async () => {
    try {
      await upsertPayrollItems({ runId: id, items: editableItems })

      // Update run totals
      await updatePayrollRun({
        id,
        total_gross: totals.gross,
        total_paye: totals.paye,
        total_uif_employee: totals.uifEmployee,
        total_uif_employer: totals.uifEmployer,
        total_net: totals.net,
      })

      toast.success('Payroll items saved')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleProcess = async () => {
    try {
      // Save items first
      await upsertPayrollItems({ runId: id, items: editableItems })

      // Update totals and status
      await updatePayrollRun({
        id,
        status: 'processed',
        total_gross: totals.gross,
        total_paye: totals.paye,
        total_uif_employee: totals.uifEmployee,
        total_uif_employer: totals.uifEmployer,
        total_net: totals.net,
      })

      toast.success('Payroll run processed - journal entries created')
      setShowProcessConfirm(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleMarkPaid = async () => {
    try {
      await updatePayrollRun({ id, status: 'paid' })
      toast.success('Payroll run marked as paid - bank payment journal entry created')
      setShowPaidConfirm(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCancel = async () => {
    try {
      await updatePayrollRun({ id, status: 'cancelled' })
      toast.success('Payroll run cancelled')
      setShowCancelConfirm(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (!run && !itemsLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Payroll run not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/payroll')}>
          Back to Payroll
        </Button>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/payroll')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{run.run_number}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              {formatDate(run.period_start)} - {formatDate(run.period_end)} | Payment: {formatDate(run.payment_date)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isDraft && canEditTransactions && (
            <>
              <Button variant="outline" onClick={handleCalculateTaxes}>
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Taxes
              </Button>
              <Button variant="outline" onClick={handleSaveItems} loading={isUpserting}>
                Save Items
              </Button>
              <Button
                onClick={() => {
                  if (editableItems.length === 0) {
                    toast.error('Add at least one employee before processing')
                    return
                  }
                  setShowProcessConfirm(true)
                }}
                loading={isUpdating}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Process
              </Button>
            </>
          )}
          {isProcessed && canEditTransactions && (
            <>
              <Button onClick={() => setShowPaidConfirm(true)} loading={isUpdating}>
                <DollarSign className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
              <Button variant="danger" onClick={() => setShowCancelConfirm(true)}>
                <Ban className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Gross</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totals.gross, currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total PAYE</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totals.paye, currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total UIF (Employee + Employer)</p>
          <p className="text-xl font-bold text-orange-600 mt-1">
            {formatCurrency(totals.uifEmployee + totals.uifEmployer, currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Net Pay</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totals.net, currency)}</p>
        </div>
      </div>

      {/* Employee Items */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Employee Pay Items ({editableItems.length})
          </h2>
          {isDraft && canEditTransactions && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedEmployeeId(''); setShowAddEmployeeModal(true) }}
                disabled={availableEmployees.length === 0}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Employee
              </Button>
              {availableEmployees.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleAddAllEmployees}>
                  Add All ({availableEmployees.length})
                </Button>
              )}
            </div>
          )}
        </div>

        {editableItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No employees added to this payroll run yet.</p>
            {isDraft && canEditTransactions && (
              <p className="mt-2 text-sm">Click "Add All" to include all active employees, or add individually.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Employee</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Gross Pay</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">PAYE</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">UIF (Emp)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">UIF (Er)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Other Ded.</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Net Pay</th>
                  {isDraft && canEditTransactions && (
                    <th className="px-4 py-3 w-10" />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editableItems.map((item, index) => (
                  <tr key={item.id || item.employee_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{item.employee_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.employee_name || (item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isDraft && canEditTransactions ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.gross_pay}
                          onChange={(e) => handleItemChange(index, 'gross_pay', e.target.value)}
                          className="w-28 px-2 py-1 text-right border border-gray-300 rounded focus:ring-accent-500 focus:border-accent-500"
                        />
                      ) : (
                        formatCurrency(item.gross_pay, currency)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {isDraft && canEditTransactions ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.paye}
                          onChange={(e) => handleItemChange(index, 'paye', e.target.value)}
                          className="w-28 px-2 py-1 text-right border border-gray-300 rounded focus:ring-accent-500 focus:border-accent-500"
                        />
                      ) : (
                        formatCurrency(item.paye, currency)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      {formatCurrency(item.uif_employee, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      {formatCurrency(item.uif_employer, currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isDraft && canEditTransactions ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.other_deductions}
                          onChange={(e) => handleItemChange(index, 'other_deductions', e.target.value)}
                          className="w-28 px-2 py-1 text-right border border-gray-300 rounded focus:ring-accent-500 focus:border-accent-500"
                        />
                      ) : (
                        formatCurrency(item.other_deductions, currency)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(item.net_pay, currency)}
                    </td>
                    {isDraft && canEditTransactions && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-4 py-3" colSpan={2}>Totals</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totals.gross, currency)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totals.paye, currency)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totals.uifEmployee, currency)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totals.uifEmployer, currency)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totals.otherDeductions, currency)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totals.net, currency)}</td>
                  {isDraft && canEditTransactions && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {run.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{run.notes}</p>
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        title="Add Employee to Payroll"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Select Employee"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            options={availableEmployees.map((emp) => ({
              value: emp.id,
              label: `${emp.employee_number} - ${emp.first_name} ${emp.last_name}`,
            }))}
            placeholder="Choose an employee..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddEmployeeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={!selectedEmployeeId}>
              Add Employee
            </Button>
          </div>
        </div>
      </Modal>

      {/* Process Confirmation */}
      <ConfirmModal
        isOpen={showProcessConfirm}
        onClose={() => setShowProcessConfirm(false)}
        onConfirm={handleProcess}
        title="Process Payroll Run"
        message={`This will process the payroll run and create journal entries for ${formatCurrency(totals.gross, currency)} gross pay. This action cannot be easily undone. Continue?`}
        confirmText="Process"
        variant="primary"
        loading={isUpdating || isUpserting}
      />

      {/* Mark Paid Confirmation */}
      <ConfirmModal
        isOpen={showPaidConfirm}
        onClose={() => setShowPaidConfirm(false)}
        onConfirm={handleMarkPaid}
        title="Mark as Paid"
        message={`This will create a bank payment journal entry for ${formatCurrency(totals.net, currency)} net pay. Continue?`}
        confirmText="Mark Paid"
        variant="primary"
        loading={isUpdating}
      />

      {/* Cancel Confirmation */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Payroll Run"
        message="Are you sure you want to cancel this payroll run? Note: existing journal entries will NOT be automatically reversed."
        confirmText="Cancel Run"
        loading={isUpdating}
      />
    </div>
  )
}

export default PayrollRunDetail

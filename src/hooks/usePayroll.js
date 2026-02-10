import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'
import { getTaxTablesForCountry } from '../lib/payrollTaxTables'
import { checkEmployeeLimit } from '../lib/subscription'

// =============================================
// Pure tax calculation functions
// =============================================

/**
 * Calculate annual PAYE tax for a given annual income and country.
 * Returns monthly PAYE amount.
 */
export const calculatePAYE = (annualIncome, country = 'South Africa') => {
  const { tax } = getTaxTablesForCountry(country)
  if (annualIncome <= 0) return 0

  // Find applicable bracket
  let paye = 0
  for (const bracket of tax.brackets) {
    if (annualIncome >= bracket.min) {
      if (annualIncome <= (bracket.max === Infinity ? annualIncome : bracket.max)) {
        paye = bracket.baseAmount + (annualIncome - bracket.min + (bracket.min === 0 ? 0 : 1)) * bracket.rate
        // For the first bracket (min=0), calculate from 0
        if (bracket.min === 0) {
          paye = bracket.baseAmount + annualIncome * bracket.rate
        } else {
          paye = bracket.baseAmount + (annualIncome - bracket.min) * bracket.rate
        }
        break
      }
    }
  }

  // Apply rebates (SA has rebates, others have 0)
  paye -= tax.rebates.primary || 0
  if (paye < 0) paye = 0

  // Zimbabwe AIDS levy
  if (country === 'Zimbabwe' && tax.aidsLevy) {
    paye = paye * (1 + tax.aidsLevy)
  }

  // Return monthly amount (rounded to 2 decimal places)
  return Math.round((paye / 12) * 100) / 100
}

/**
 * Calculate monthly UIF/social security contributions.
 * Returns { employee, employer }
 */
export const calculateUIF = (monthlyGross, country = 'South Africa') => {
  const { social } = getTaxTablesForCountry(country)

  if (!social || (social.employeeRate === 0 && social.employerRate === 0)) {
    return { employee: 0, employer: 0 }
  }

  // Apply ceiling
  const applicableAmount = social.monthlyCeiling > 0
    ? Math.min(monthlyGross, social.monthlyCeiling)
    : monthlyGross

  return {
    employee: Math.round(applicableAmount * social.employeeRate * 100) / 100,
    employer: Math.round(applicableAmount * social.employerRate * 100) / 100,
  }
}

/**
 * Generate payroll items with auto-calculated taxes for active employees.
 */
export const generatePayrollItems = (employees, country = 'South Africa') => {
  return employees
    .filter((emp) => emp.is_active)
    .map((emp) => {
      const grossPay = Number(emp.base_salary) || 0
      const annualIncome = grossPay * 12
      const monthlyPAYE = calculatePAYE(annualIncome, country)
      const uif = calculateUIF(grossPay, country)
      const netPay = grossPay - monthlyPAYE - uif.employee

      return {
        employee_id: emp.id,
        employee: emp,
        gross_pay: grossPay,
        paye: monthlyPAYE,
        uif_employee: uif.employee,
        uif_employer: uif.employer,
        other_deductions: 0,
        other_deduction_notes: '',
        net_pay: Math.round(netPay * 100) / 100,
        hours_worked: emp.salary_type === 'hourly' ? 0 : null,
        overtime_hours: 0,
        overtime_rate: 1.5,
      }
    })
}

// =============================================
// Employees Hook
// =============================================
export const useEmployees = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const employeesQuery = useQuery({
    queryKey: ['employees', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('employee_number', { ascending: true })

      if (filters.active !== undefined) {
        query = query.eq('is_active', filters.active)
      }

      if (filters.department) {
        query = query.eq('department', filters.department)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const getNextEmployeeNumber = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('employee_number')
      .eq('company_id', activeCompanyId)

    if (error) throw error
    let maxNum = 0
    for (const row of data || []) {
      const match = (row.employee_number || '').match(/EMP-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    return `EMP-${String(maxNum + 1).padStart(4, '0')}`
  }

  const createEmployee = useMutation({
    mutationFn: async (employeeData) => {
      // Check subscription limit before creating
      if (user?.id && activeCompanyId) {
        const limitCheck = await checkEmployeeLimit(supabase, user.id, activeCompanyId)
        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason)
        }
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({
          ...employeeData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...employeeData }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const deleteEmployee = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  return {
    employees: employeesQuery.data || [],
    isLoading: employeesQuery.isLoading,
    error: employeesQuery.error,
    getNextEmployeeNumber,
    createEmployee: createEmployee.mutateAsync,
    updateEmployee: updateEmployee.mutateAsync,
    deleteEmployee: deleteEmployee.mutateAsync,
    isCreating: createEmployee.isPending,
    isUpdating: updateEmployee.isPending,
    isDeleting: deleteEmployee.isPending,
  }
}

// =============================================
// Payroll Runs Hook
// =============================================
export const usePayrollRuns = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const runsQuery = useQuery({
    queryKey: ['payroll-runs', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const getNextRunNumber = async () => {
    const year = new Date().getFullYear()
    const prefix = `PR-${year}-`

    const { data, error } = await supabase
      .from('payroll_runs')
      .select('run_number')
      .eq('company_id', activeCompanyId)
      .like('run_number', `${prefix}%`)

    if (error) throw error
    let maxNum = 0
    for (const row of data || []) {
      const match = (row.run_number || '').match(/PR-\d{4}-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    return `${prefix}${String(maxNum + 1).padStart(5, '0')}`
  }

  const createPayrollRun = useMutation({
    mutationFn: async (runData) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          ...runData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })

  const updatePayrollRun = useMutation({
    mutationFn: async ({ id, ...runData }) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .update(runData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    },
  })

  const deletePayrollRun = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('payroll_runs')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })

  return {
    runs: runsQuery.data || [],
    isLoading: runsQuery.isLoading,
    error: runsQuery.error,
    getNextRunNumber,
    createPayrollRun: createPayrollRun.mutateAsync,
    updatePayrollRun: updatePayrollRun.mutateAsync,
    deletePayrollRun: deletePayrollRun.mutateAsync,
    isCreating: createPayrollRun.isPending,
    isUpdating: updatePayrollRun.isPending,
    isDeleting: deletePayrollRun.isPending,
  }
}

// =============================================
// Payroll Items Hook
// =============================================
export const usePayrollItems = (runId) => {
  const queryClient = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['payroll-items', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_items')
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_number, position, department, base_salary, salary_type)
        `)
        .eq('payroll_run_id', runId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!runId,
  })

  const upsertPayrollItems = useMutation({
    mutationFn: async ({ runId: rid, items }) => {
      // Delete existing items for this run
      await supabase
        .from('payroll_items')
        .delete()
        .eq('payroll_run_id', rid)

      if (items.length === 0) return []

      const itemsWithRunId = items.map((item) => ({
        payroll_run_id: rid,
        employee_id: item.employee_id,
        gross_pay: item.gross_pay,
        paye: item.paye,
        uif_employee: item.uif_employee,
        uif_employer: item.uif_employer,
        other_deductions: item.other_deductions || 0,
        other_deduction_notes: item.other_deduction_notes || '',
        net_pay: item.net_pay,
        hours_worked: item.hours_worked,
        overtime_hours: item.overtime_hours || 0,
        overtime_rate: item.overtime_rate || 1.5,
      }))

      const { data, error } = await supabase
        .from('payroll_items')
        .insert(itemsWithRunId)
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_number, position, department, base_salary, salary_type)
        `)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-items'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    error: itemsQuery.error,
    upsertPayrollItems: upsertPayrollItems.mutateAsync,
    isUpserting: upsertPayrollItems.isPending,
  }
}

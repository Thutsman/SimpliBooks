import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useTrialBalance = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['trial-balance', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('code')

      if (accountsError) throw accountsError

      // Get invoice items (income)
      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          id, total, vat_amount, status, issue_date,
          invoice_items(account_id, line_total, vat_amount)
        `)
        .eq('company_id', activeCompanyId)
        .eq('status', 'paid')

      if (startDate) invoiceQuery = invoiceQuery.gte('issue_date', startDate)
      if (endDate) invoiceQuery = invoiceQuery.lte('issue_date', endDate)

      const { data: invoices } = await invoiceQuery

      // Get purchase items (expenses)
      let purchaseQuery = supabase
        .from('supplier_invoices')
        .select(`
          id, total, vat_amount, status, issue_date,
          supplier_invoice_items(account_id, line_total, vat_amount)
        `)
        .eq('company_id', activeCompanyId)
        .eq('status', 'paid')

      if (startDate) purchaseQuery = purchaseQuery.gte('issue_date', startDate)
      if (endDate) purchaseQuery = purchaseQuery.lte('issue_date', endDate)

      const { data: purchases } = await purchaseQuery

      // Calculate balances per account
      const accountBalances = {}

      accounts.forEach((account) => {
        accountBalances[account.id] = {
          ...account,
          debit: 0,
          credit: 0,
        }
      })

      // Process invoices (income is credit, AR is debit)
      const incomeAccount = accounts.find(
        (a) => a.code === '4000' || a.name.toLowerCase().includes('sales')
      )
      const arAccount = accounts.find(
        (a) => a.code === '1100' || a.name.toLowerCase().includes('receivable')
      )
      const vatPayableAccount = accounts.find(
        (a) => a.code === '2100' || a.name.toLowerCase().includes('vat payable')
      )

      ;(invoices || []).forEach((invoice) => {
        // Credit income
        const invoiceTotal = Number(invoice.total) - Number(invoice.vat_amount)
        if (incomeAccount && accountBalances[incomeAccount.id]) {
          accountBalances[incomeAccount.id].credit += invoiceTotal
        }

        // Credit VAT payable
        if (vatPayableAccount && accountBalances[vatPayableAccount.id]) {
          accountBalances[vatPayableAccount.id].credit += Number(invoice.vat_amount)
        }

        // Debit AR (bank when paid)
        if (arAccount && accountBalances[arAccount.id]) {
          accountBalances[arAccount.id].debit += Number(invoice.total)
        }
      })

      // Process purchases (expense is debit, AP is credit)
      const expenseDefault = accounts.find(
        (a) => a.code === '5100' || a.name.toLowerCase().includes('purchases')
      )
      const apAccount = accounts.find(
        (a) => a.code === '2000' || a.name.toLowerCase().includes('payable')
      )

      ;(purchases || []).forEach((purchase) => {
        // Debit expense accounts
        purchase.supplier_invoice_items?.forEach((item) => {
          if (item.account_id && accountBalances[item.account_id]) {
            accountBalances[item.account_id].debit += Number(item.line_total) - Number(item.vat_amount)
          } else if (expenseDefault && accountBalances[expenseDefault.id]) {
            accountBalances[expenseDefault.id].debit += Number(item.line_total) - Number(item.vat_amount)
          }
        })

        // Debit VAT (input VAT)
        if (vatPayableAccount && accountBalances[vatPayableAccount.id]) {
          accountBalances[vatPayableAccount.id].debit += Number(purchase.vat_amount)
        }

        // Credit AP
        if (apAccount && accountBalances[apAccount.id]) {
          accountBalances[apAccount.id].credit += Number(purchase.total)
        }
      })

      // Calculate net balances and totals
      let totalDebits = 0
      let totalCredits = 0

      const result = Object.values(accountBalances)
        .filter((a) => a.debit > 0 || a.credit > 0)
        .map((account) => {
          totalDebits += account.debit
          totalCredits += account.credit
          return {
            ...account,
            balance: account.debit - account.credit,
          }
        })

      return {
        accounts: result,
        totalDebits,
        totalCredits,
        balanced: Math.abs(totalDebits - totalCredits) < 0.01,
      }
    },
    enabled: !!activeCompanyId,
  })
}

export const useVATReport = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['vat-report', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      // Get invoices (output VAT)
      let invoiceQuery = supabase
        .from('invoices')
        .select('total, vat_amount, status, issue_date')
        .eq('company_id', activeCompanyId)
        .in('status', ['sent', 'paid'])

      if (startDate) invoiceQuery = invoiceQuery.gte('issue_date', startDate)
      if (endDate) invoiceQuery = invoiceQuery.lte('issue_date', endDate)

      const { data: invoices } = await invoiceQuery

      // Get purchases (input VAT)
      let purchaseQuery = supabase
        .from('supplier_invoices')
        .select('total, vat_amount, status, issue_date')
        .eq('company_id', activeCompanyId)
        .in('status', ['unpaid', 'paid'])

      if (startDate) purchaseQuery = purchaseQuery.gte('issue_date', startDate)
      if (endDate) purchaseQuery = purchaseQuery.lte('issue_date', endDate)

      const { data: purchases } = await purchaseQuery

      const outputVAT = (invoices || []).reduce(
        (sum, inv) => sum + Number(inv.vat_amount || 0),
        0
      )

      const inputVAT = (purchases || []).reduce(
        (sum, pur) => sum + Number(pur.vat_amount || 0),
        0
      )

      const totalSales = (invoices || []).reduce(
        (sum, inv) => sum + Number(inv.total || 0) - Number(inv.vat_amount || 0),
        0
      )

      const totalPurchases = (purchases || []).reduce(
        (sum, pur) => sum + Number(pur.total || 0) - Number(pur.vat_amount || 0),
        0
      )

      return {
        totalSales,
        totalPurchases,
        outputVAT,
        inputVAT,
        netVAT: outputVAT - inputVAT,
        invoiceCount: (invoices || []).length,
        purchaseCount: (purchases || []).length,
      }
    },
    enabled: !!activeCompanyId,
  })
}

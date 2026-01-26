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

// ================================
// GENERAL LEDGER - Uses Journal Entries
// ================================
export const useGeneralLedger = (startDate, endDate, accountId = null) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['general-ledger', activeCompanyId, startDate, endDate, accountId],
    queryFn: async () => {
      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('code')

      if (accountsError) throw accountsError

      // Build query for journal entry lines
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          id, debit, credit, description, line_order, created_at,
          account:accounts!inner(id, code, name, type, sub_type, company_id),
          journal_entry:journal_entries!inner(
            id, entry_number, entry_date, description, reference,
            entry_type, status, company_id
          )
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')

      if (startDate) query = query.gte('journal_entry.entry_date', startDate)
      if (endDate) query = query.lte('journal_entry.entry_date', endDate)
      if (accountId) query = query.eq('account_id', accountId)

      query = query.order('journal_entry(entry_date)', { ascending: true })

      const { data: lines, error: linesError } = await query

      if (linesError) throw linesError

      // Group by account
      const ledgerByAccount = {}

      accounts.forEach((account) => {
        ledgerByAccount[account.id] = {
          account,
          entries: [],
          openingBalance: 0,
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
        }
      })

      // Process lines
      ;(lines || []).forEach((line) => {
        const accountId = line.account?.id
        if (accountId && ledgerByAccount[accountId]) {
          ledgerByAccount[accountId].entries.push({
            date: line.journal_entry?.entry_date,
            entryNumber: line.journal_entry?.entry_number,
            description: line.description || line.journal_entry?.description,
            reference: line.journal_entry?.reference,
            entryType: line.journal_entry?.entry_type,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
          })
          ledgerByAccount[accountId].totalDebit += Number(line.debit) || 0
          ledgerByAccount[accountId].totalCredit += Number(line.credit) || 0
        }
      })

      // Calculate closing balances based on account type
      Object.values(ledgerByAccount).forEach((ledger) => {
        const { account, totalDebit, totalCredit } = ledger
        // Assets and Expenses have normal debit balances
        // Liabilities, Equity, and Income have normal credit balances
        if (['asset', 'expense'].includes(account.type)) {
          ledger.closingBalance = totalDebit - totalCredit
        } else {
          ledger.closingBalance = totalCredit - totalDebit
        }
      })

      // Filter to only accounts with activity
      const activeAccounts = Object.values(ledgerByAccount)
        .filter((l) => l.entries.length > 0 || accountId)
        .sort((a, b) => a.account.code.localeCompare(b.account.code))

      return {
        ledger: activeAccounts,
        accounts,
        totalEntries: lines?.length || 0,
      }
    },
    enabled: !!activeCompanyId,
  })
}

// ================================
// INCOME STATEMENT (Profit & Loss)
// ================================
export const useIncomeStatement = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['income-statement', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      // Get income and expense accounts with their journal entry totals
      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(id, code, name, type, sub_type, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .in('account.type', ['income', 'expense'])
        .gte('journal_entry.entry_date', startDate)
        .lte('journal_entry.entry_date', endDate)

      if (error) throw error

      // Group by account and calculate balances
      const accountTotals = {}

      ;(lines || []).forEach((line) => {
        const account = line.account
        if (!account) return

        if (!accountTotals[account.id]) {
          accountTotals[account.id] = {
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            subType: account.sub_type,
            debit: 0,
            credit: 0,
            balance: 0,
          }
        }

        accountTotals[account.id].debit += Number(line.debit) || 0
        accountTotals[account.id].credit += Number(line.credit) || 0
      })

      // Calculate balances (Income = Credit - Debit, Expense = Debit - Credit)
      Object.values(accountTotals).forEach((acc) => {
        if (acc.type === 'income') {
          acc.balance = acc.credit - acc.debit
        } else {
          acc.balance = acc.debit - acc.credit
        }
      })

      // Separate and group accounts
      const accounts = Object.values(accountTotals).sort((a, b) => a.code.localeCompare(b.code))

      const revenue = accounts.filter((a) => a.type === 'income' && a.subType === 'operating_revenue')
      const otherIncome = accounts.filter((a) => a.type === 'income' && a.subType !== 'operating_revenue')
      const costOfSales = accounts.filter((a) => a.type === 'expense' && a.subType === 'cost_of_sales')
      const operatingExpenses = accounts.filter((a) => a.type === 'expense' && a.subType === 'operating_expense')
      const otherExpenses = accounts.filter((a) => a.type === 'expense' && !['cost_of_sales', 'operating_expense'].includes(a.subType))

      const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0)
      const totalOtherIncome = otherIncome.reduce((sum, a) => sum + a.balance, 0)
      const totalCostOfSales = costOfSales.reduce((sum, a) => sum + a.balance, 0)
      const totalOperatingExpenses = operatingExpenses.reduce((sum, a) => sum + a.balance, 0)
      const totalOtherExpenses = otherExpenses.reduce((sum, a) => sum + a.balance, 0)

      const grossProfit = totalRevenue - totalCostOfSales
      const operatingProfit = grossProfit + totalOtherIncome - totalOperatingExpenses
      const netProfit = operatingProfit - totalOtherExpenses

      return {
        revenue,
        otherIncome,
        costOfSales,
        operatingExpenses,
        otherExpenses,
        totalRevenue,
        totalOtherIncome,
        totalCostOfSales,
        totalOperatingExpenses,
        totalOtherExpenses,
        grossProfit,
        operatingProfit,
        netProfit,
      }
    },
    enabled: !!activeCompanyId && !!startDate && !!endDate,
  })
}

// ================================
// BALANCE SHEET
// ================================
export const useBalanceSheet = (asOfDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['balance-sheet', activeCompanyId, asOfDate],
    queryFn: async () => {
      // Get asset, liability, and equity accounts with their journal entry totals
      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(id, code, name, type, sub_type, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .in('account.type', ['asset', 'liability', 'equity'])
        .lte('journal_entry.entry_date', asOfDate)

      if (error) throw error

      // Also get net income for the period (retained earnings)
      const { data: incomeLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(type, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .in('account.type', ['income', 'expense'])
        .lte('journal_entry.entry_date', asOfDate)

      // Calculate net income
      let netIncome = 0
      ;(incomeLines || []).forEach((line) => {
        if (line.account?.type === 'income') {
          netIncome += (Number(line.credit) || 0) - (Number(line.debit) || 0)
        } else {
          netIncome -= (Number(line.debit) || 0) - (Number(line.credit) || 0)
        }
      })

      // Group by account and calculate balances
      const accountTotals = {}

      ;(lines || []).forEach((line) => {
        const account = line.account
        if (!account) return

        if (!accountTotals[account.id]) {
          accountTotals[account.id] = {
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            subType: account.sub_type,
            debit: 0,
            credit: 0,
            balance: 0,
          }
        }

        accountTotals[account.id].debit += Number(line.debit) || 0
        accountTotals[account.id].credit += Number(line.credit) || 0
      })

      // Calculate balances based on account type
      Object.values(accountTotals).forEach((acc) => {
        if (acc.type === 'asset') {
          acc.balance = acc.debit - acc.credit
        } else {
          acc.balance = acc.credit - acc.debit
        }
      })

      // Separate and group accounts
      const accounts = Object.values(accountTotals).sort((a, b) => a.code.localeCompare(b.code))

      const currentAssets = accounts.filter((a) => a.type === 'asset' && a.subType === 'current_asset')
      const fixedAssets = accounts.filter((a) => a.type === 'asset' && a.subType === 'fixed_asset')
      const otherAssets = accounts.filter((a) => a.type === 'asset' && !['current_asset', 'fixed_asset'].includes(a.subType))

      const currentLiabilities = accounts.filter((a) => a.type === 'liability' && a.subType === 'current_liability')
      const longTermLiabilities = accounts.filter((a) => a.type === 'liability' && a.subType === 'long_term_liability')
      const otherLiabilities = accounts.filter((a) => a.type === 'liability' && !['current_liability', 'long_term_liability'].includes(a.subType))

      const equity = accounts.filter((a) => a.type === 'equity')

      const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.balance, 0)
      const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.balance, 0)
      const totalOtherAssets = otherAssets.reduce((sum, a) => sum + a.balance, 0)
      const totalAssets = totalCurrentAssets + totalFixedAssets + totalOtherAssets

      const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.balance, 0)
      const totalLongTermLiabilities = longTermLiabilities.reduce((sum, a) => sum + a.balance, 0)
      const totalOtherLiabilities = otherLiabilities.reduce((sum, a) => sum + a.balance, 0)
      const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities + totalOtherLiabilities

      const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0)
      const totalEquityWithRetainedEarnings = totalEquity + netIncome

      const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithRetainedEarnings

      return {
        // Assets
        currentAssets,
        fixedAssets,
        otherAssets,
        totalCurrentAssets,
        totalFixedAssets,
        totalOtherAssets,
        totalAssets,
        // Liabilities
        currentLiabilities,
        longTermLiabilities,
        otherLiabilities,
        totalCurrentLiabilities,
        totalLongTermLiabilities,
        totalOtherLiabilities,
        totalLiabilities,
        // Equity
        equity,
        totalEquity,
        retainedEarnings: netIncome,
        totalEquityWithRetainedEarnings,
        // Totals
        totalLiabilitiesAndEquity,
        balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      }
    },
    enabled: !!activeCompanyId && !!asOfDate,
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

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

// Trial Balance: derived from journal entries (double-entry source of truth)
export const useTrialBalance = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['trial-balance', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .order('code')

      if (accountsError) throw accountsError

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(id, code, name, type, sub_type, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')

      if (startDate) query = query.gte('journal_entry.entry_date', startDate)
      if (endDate) query = query.lte('journal_entry.entry_date', endDate)

      const { data: lines, error: linesError } = await query
      if (linesError) throw linesError

      const accountBalances = {}
      accounts.forEach((account) => {
        accountBalances[account.id] = {
          ...account,
          debit: 0,
          credit: 0,
        }
      })

      ;(lines || []).forEach((line) => {
        const accountId = line.account?.id
        if (accountId && accountBalances[accountId]) {
          accountBalances[accountId].debit += Number(line.debit) || 0
          accountBalances[accountId].credit += Number(line.credit) || 0
        }
      })

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

// ================================
// AR AGING (Accounts Receivable) - 30/60/90 days
// ================================
export const useARAging = (asOfDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['ar-aging', activeCompanyId, asOfDate],
    queryFn: async () => {
      const asOfStr = asOfDate || new Date().toISOString().split('T')[0]
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id, client_id, invoice_number, issue_date, due_date, total, amount_paid, status,
          client:clients(id, name, email)
        `)
        .eq('company_id', activeCompanyId)
        .in('status', ['sent', 'overdue', 'part_paid'])
        .lte('issue_date', asOfStr)

      if (error) throw error

      const asOf = new Date(asOfStr)
      const bucket = (dueDate) => {
        const d = new Date(dueDate)
        const days = Math.floor((asOf - d) / (24 * 60 * 60 * 1000))
        if (days <= 30) return 'current'
        if (days <= 60) return 'days_31_60'
        if (days <= 90) return 'days_61_90'
        return 'over_90'
      }

      const byClient = {}
      ;(invoices || []).forEach((inv) => {
        const outstanding = Number(inv.total || 0) - Number(inv.amount_paid || 0)
        if (outstanding <= 0) return
        const clientId = inv.client_id ?? inv.client?.id ?? 'unknown'
        const clientName = inv.client?.name || 'Unknown Client'
        if (!byClient[clientId]) {
          byClient[clientId] = {
            clientId,
            clientName,
            current: 0,
            days_31_60: 0,
            days_61_90: 0,
            over_90: 0,
            total: 0,
            invoices: [],
          }
        }
        const b = bucket(inv.due_date)
        byClient[clientId][b] += outstanding
        byClient[clientId].total += outstanding
        byClient[clientId].invoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          outstanding,
        })
      })

      const rows = Object.values(byClient).sort((a, b) => b.total - a.total)
      const totals = rows.reduce(
        (acc, r) => ({
          current: acc.current + r.current,
          days_31_60: acc.days_31_60 + r.days_31_60,
          days_61_90: acc.days_61_90 + r.days_61_90,
          over_90: acc.over_90 + r.over_90,
          total: acc.total + r.total,
        }),
        { current: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 }
      )
      return { rows, totals, asOfDate: asOf.toISOString().split('T')[0] }
    },
    enabled: !!activeCompanyId,
  })
}

// ================================
// AP AGING (Accounts Payable) - 30/60/90 days
// ================================
export const useAPAging = (asOfDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['ap-aging', activeCompanyId, asOfDate],
    queryFn: async () => {
      const asOfStr = asOfDate || new Date().toISOString().split('T')[0]
      const { data: purchases, error } = await supabase
        .from('supplier_invoices')
        .select(`
          id, supplier_id, invoice_number, issue_date, due_date, total, amount_paid, status,
          supplier:suppliers(id, name, email)
        `)
        .eq('company_id', activeCompanyId)
        .in('status', ['unpaid', 'overdue', 'part_paid'])
        .lte('issue_date', asOfStr)

      if (error) throw error

      const asOf = new Date(asOfStr)
      const bucket = (dueDate) => {
        const d = new Date(dueDate)
        const days = Math.floor((asOf - d) / (24 * 60 * 60 * 1000))
        if (days <= 30) return 'current'
        if (days <= 60) return 'days_31_60'
        if (days <= 90) return 'days_61_90'
        return 'over_90'
      }

      const bySupplier = {}
      ;(purchases || []).forEach((inv) => {
        const outstanding = Number(inv.total || 0) - Number(inv.amount_paid || 0)
        if (outstanding <= 0) return
        const supplierId = inv.supplier_id ?? inv.supplier?.id ?? 'unknown'
        const supplierName = inv.supplier?.name || 'Unknown Supplier'
        if (!bySupplier[supplierId]) {
          bySupplier[supplierId] = {
            supplierId,
            supplierName,
            current: 0,
            days_31_60: 0,
            days_61_90: 0,
            over_90: 0,
            total: 0,
            invoices: [],
          }
        }
        const b = bucket(inv.due_date)
        bySupplier[supplierId][b] += outstanding
        bySupplier[supplierId].total += outstanding
        bySupplier[supplierId].invoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          outstanding,
        })
      })

      const rows = Object.values(bySupplier).sort((a, b) => b.total - a.total)
      const totals = rows.reduce(
        (acc, r) => ({
          current: acc.current + r.current,
          days_31_60: acc.days_31_60 + r.days_31_60,
          days_61_90: acc.days_61_90 + r.days_61_90,
          over_90: acc.over_90 + r.over_90,
          total: acc.total + r.total,
        }),
        { current: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 }
      )
      return { rows, totals, asOfDate: asOf.toISOString().split('T')[0] }
    },
    enabled: !!activeCompanyId,
  })
}

export const useVATReport = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['vat-report', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      // VAT is computed from posted journal lines for VAT control accounts:
      // - Output VAT: VAT Payable (2100) credits - debits within period
      // - Input VAT: VAT Input (1150) debits - credits within period
      let vatLinesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(code, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .in('account.code', ['2100', '1150'])

      if (startDate) vatLinesQuery = vatLinesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) vatLinesQuery = vatLinesQuery.lte('journal_entry.entry_date', endDate)

      const { data: vatLines, error: vatErr } = await vatLinesQuery
      if (vatErr) throw vatErr

      let outputVAT = 0
      let inputVAT = 0
      ;(vatLines || []).forEach((l) => {
        const code = l.account?.code
        const debit = Number(l.debit) || 0
        const credit = Number(l.credit) || 0
        if (code === '2100') outputVAT += credit - debit
        if (code === '1150') inputVAT += debit - credit
      })

      // Sales (ex VAT): posted invoice income lines within period
      let salesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(type, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id, entry_type)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('journal_entry.entry_type', 'invoice')
        .eq('account.type', 'income')

      if (startDate) salesQuery = salesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) salesQuery = salesQuery.lte('journal_entry.entry_date', endDate)

      const { data: salesLines, error: salesErr } = await salesQuery
      if (salesErr) throw salesErr

      const totalSales = (salesLines || []).reduce((sum, l) => {
        return sum + ((Number(l.credit) || 0) - (Number(l.debit) || 0))
      }, 0)

      // Purchases (ex VAT): posted purchase debit lines excluding VAT input within period
      let purchaseLinesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit,
          account:accounts!inner(code, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id, entry_type)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('journal_entry.entry_type', 'purchase')
        .gt('debit', 0)
        .neq('account.code', '1150')

      if (startDate) purchaseLinesQuery = purchaseLinesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) purchaseLinesQuery = purchaseLinesQuery.lte('journal_entry.entry_date', endDate)

      const { data: purchaseLines, error: purErr } = await purchaseLinesQuery
      if (purErr) throw purErr

      const totalPurchases = (purchaseLines || []).reduce((sum, l) => sum + (Number(l.debit) || 0), 0)

      return {
        totalSales,
        totalPurchases,
        outputVAT,
        inputVAT,
        netVAT: outputVAT - inputVAT,
        vatLineCount: (vatLines || []).length,
      }
    },
    enabled: !!activeCompanyId,
  })
}

// ================================
// VAT 201 Report (South Africa - SARS style boxes)
// ================================
export const useVAT201Report = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()
  return useQuery({
    queryKey: ['vat201-report', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      // Use the same control-account logic as the VAT Report
      let vatLinesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(code, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .in('account.code', ['2100', '1150'])

      if (startDate) vatLinesQuery = vatLinesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) vatLinesQuery = vatLinesQuery.lte('journal_entry.entry_date', endDate)

      const { data: vatLines, error: vatErr } = await vatLinesQuery
      if (vatErr) throw vatErr

      let outputVAT = 0
      let inputVAT = 0
      ;(vatLines || []).forEach((l) => {
        const code = l.account?.code
        const debit = Number(l.debit) || 0
        const credit = Number(l.credit) || 0
        if (code === '2100') outputVAT += credit - debit
        if (code === '1150') inputVAT += debit - credit
      })
      const netVAT = outputVAT - inputVAT

      // Sales/purchases ex VAT for informational totals
      let salesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(type, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id, entry_type)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('journal_entry.entry_type', 'invoice')
        .eq('account.type', 'income')
      if (startDate) salesQuery = salesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) salesQuery = salesQuery.lte('journal_entry.entry_date', endDate)
      const { data: salesLines, error: salesErr } = await salesQuery
      if (salesErr) throw salesErr
      const totalSales = (salesLines || []).reduce((sum, l) => sum + ((Number(l.credit) || 0) - (Number(l.debit) || 0)), 0)

      let purchaseLinesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit,
          account:accounts!inner(code, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id, entry_type)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('journal_entry.entry_type', 'purchase')
        .gt('debit', 0)
        .neq('account.code', '1150')
      if (startDate) purchaseLinesQuery = purchaseLinesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) purchaseLinesQuery = purchaseLinesQuery.lte('journal_entry.entry_date', endDate)
      const { data: purchaseLines, error: purErr } = await purchaseLinesQuery
      if (purErr) throw purErr
      const totalPurchases = (purchaseLines || []).reduce((sum, l) => sum + (Number(l.debit) || 0), 0)

      return {
        box1OutputTax: outputVAT,
        box4InputTax: inputVAT,
        box7NetVAT: netVAT,
        totalSalesExcl: totalSales,
        totalPurchasesExcl: totalPurchases,
        totalSales,
        totalPurchases,
        outputVAT,
        inputVAT,
        netVAT,
        vatLineCount: (vatLines || []).length,
      }
    },
    enabled: !!activeCompanyId && !!startDate && !!endDate,
  })
}

// ================================
// CASH FLOW STATEMENT (Operating / Investing / Financing)
// ================================
export const useCashFlowStatement = (startDate, endDate) => {
  const { activeCompanyId } = useCompany()
  return useQuery({
    queryKey: ['cash-flow', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(id, code, name, type, sub_type, company_id),
          journal_entry:journal_entries!inner(entry_date, entry_type, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.entry_date', startDate)
        .lte('journal_entry.entry_date', endDate)
      if (error) throw error

      const netIncome = await (async () => {
        const { data: isData } = await supabase
          .from('journal_entry_lines')
          .select(`
            debit, credit,
            account:accounts!inner(type, company_id),
            journal_entry:journal_entries!inner(entry_date, status, company_id)
          `)
          .eq('journal_entry.company_id', activeCompanyId)
          .eq('journal_entry.status', 'posted')
          .in('account.type', ['income', 'expense'])
          .gte('journal_entry.entry_date', startDate)
          .lte('journal_entry.entry_date', endDate)
        let ni = 0
        ;(isData || []).forEach((line) => {
          if (line.account?.type === 'income') ni += (Number(line.credit) || 0) - (Number(line.debit) || 0)
          else ni -= (Number(line.debit) || 0) - (Number(line.credit) || 0)
        })
        return ni
      })()

      const operating = []
      const investing = []
      const financing = []
      const accountSums = {}
      ;(lines || []).forEach((line) => {
        const acc = line.account
        if (!acc) return
        const id = acc.id
        if (!accountSums[id]) accountSums[id] = { ...acc, debit: 0, credit: 0 }
        accountSums[id].debit += Number(line.debit) || 0
        accountSums[id].credit += Number(line.credit) || 0
      })
      Object.values(accountSums).forEach((a) => {
        const balance = ['asset', 'expense'].includes(a.type) ? a.debit - a.credit : a.credit - a.debit
        if (['income', 'expense'].includes(a.type) || (a.type === 'asset' && a.subType === 'current_asset') || (a.type === 'liability' && a.subType === 'current_liability')) {
          operating.push({ ...a, balance })
        } else if (a.type === 'asset' && a.subType === 'fixed_asset') {
          investing.push({ ...a, balance })
        } else if (a.type === 'equity' || (a.type === 'liability' && a.subType === 'long_term_liability')) {
          financing.push({ ...a, balance })
        } else {
          operating.push({ ...a, balance })
        }
      })

      const sum = (arr) => arr.reduce((s, a) => s + a.balance, 0)
      return {
        netIncome,
        operating: { items: operating, total: sum(operating) },
        investing: { items: investing, total: sum(investing) },
        financing: { items: financing, total: sum(financing) },
        netChangeInCash: sum(operating) + sum(investing) + sum(financing),
      }
    },
    enabled: !!activeCompanyId && !!startDate && !!endDate,
  })
}

// ================================
// PROFIT & LOSS BY PERIOD (comparison)
// ================================
export const useProfitLossByPeriod = (startDate1, endDate1, startDate2, endDate2, enabled = true) => {
  const { activeCompanyId } = useCompany()
  return useQuery({
    queryKey: ['pl-by-period', activeCompanyId, startDate1, endDate1, startDate2, endDate2],
    queryFn: async () => {
      const run = async (start, end) => {
        const { data: lines } = await supabase
          .from('journal_entry_lines')
          .select(`
            debit, credit,
            account:accounts!inner(id, code, name, type, sub_type, company_id),
            journal_entry:journal_entries!inner(entry_date, status, company_id)
          `)
          .eq('journal_entry.company_id', activeCompanyId)
          .eq('journal_entry.status', 'posted')
          .in('account.type', ['income', 'expense'])
          .gte('journal_entry.entry_date', start)
          .lte('journal_entry.entry_date', end)
        const accountTotals = {}
        ;(lines || []).forEach((line) => {
          const account = line.account
          if (!account) return
          if (!accountTotals[account.id]) accountTotals[account.id] = { ...account, debit: 0, credit: 0, balance: 0 }
          accountTotals[account.id].debit += Number(line.debit) || 0
          accountTotals[account.id].credit += Number(line.credit) || 0
        })
        Object.values(accountTotals).forEach((acc) => {
          acc.balance = acc.type === 'income' ? acc.credit - acc.debit : acc.debit - acc.credit
        })
        const revenue = Object.values(accountTotals).filter((a) => a.type === 'income').reduce((s, a) => s + a.balance, 0)
        const expenses = Object.values(accountTotals).filter((a) => a.type === 'expense').reduce((s, a) => s + a.balance, 0)
        return { period: { start, end }, revenue, expenses, netProfit: revenue - expenses, accountTotals: Object.values(accountTotals) }
      }
      const [period1, period2] = await Promise.all([
        run(startDate1, endDate1),
        run(startDate2, endDate2),
      ])
      return { period1, period2 }
    },
    enabled: !!activeCompanyId && !!startDate1 && !!endDate1 && !!startDate2 && !!endDate2 && !!enabled,
  })
}

// ================================
// CUSTOMER STATEMENT (per client)
// ================================
export const useCustomerStatement = (clientId, startDate, endDate) => {
  const { activeCompanyId } = useCompany()
  return useQuery({
    queryKey: ['customer-statement', activeCompanyId, clientId, startDate, endDate],
    queryFn: async () => {
      if (!clientId) return { openingBalance: 0, transactions: [], closingBalance: 0, client: null }
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('company_id', activeCompanyId)
        .single()
      if (!client) return { openingBalance: 0, transactions: [], closingBalance: 0, client: null }

      // Build statement from AR control account activity so it reconciles to the GL.
      const { data: arAccount, error: arErr } = await supabase
        .from('accounts')
        .select('id')
        .eq('company_id', activeCompanyId)
        .eq('code', '1100')
        .eq('is_active', true)
        .single()
      if (arErr || !arAccount?.id) throw (arErr || new Error('AR control account (1100) not found'))

      const { data: linesBefore, error: beforeErr } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('account_id', arAccount.id)
        .eq('client_id', clientId)
        .lt('journal_entry.entry_date', startDate)
      if (beforeErr) throw beforeErr

      let openingBalance = 0
      ;(linesBefore || []).forEach((line) => {
        openingBalance += (Number(line.debit) || 0) - (Number(line.credit) || 0)
      })

      const { data: lines, error: linesErr } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit, description,
          journal_entry:journal_entries!inner(
            entry_date, entry_number, entry_type, reference, description, status, company_id
          )
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('account_id', arAccount.id)
        .eq('client_id', clientId)
        .gte('journal_entry.entry_date', startDate)
        .lte('journal_entry.entry_date', endDate)
        .order('journal_entry(entry_date)', { ascending: true })
      if (linesErr) throw linesErr

      const transactions = (lines || []).map((l) => ({
        date: l.journal_entry?.entry_date,
        type: l.journal_entry?.entry_type || 'journal',
        reference: l.journal_entry?.reference || l.journal_entry?.entry_number,
        description: l.description || l.journal_entry?.description || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        balance: null,
      }))

      let running = openingBalance
      transactions.forEach((t) => {
        running += (t.debit || 0) - (t.credit || 0)
        t.balance = running
      })

      return {
        client,
        openingBalance,
        transactions,
        closingBalance: running,
      }
    },
    enabled: !!activeCompanyId && !!clientId && !!startDate && !!endDate,
  })
}

// ================================
// SUPPLIER STATEMENT (per supplier)
// ================================
export const useSupplierStatement = (supplierId, startDate, endDate) => {
  const { activeCompanyId } = useCompany()
  return useQuery({
    queryKey: ['supplier-statement', activeCompanyId, supplierId, startDate, endDate],
    queryFn: async () => {
      if (!supplierId) return { openingBalance: 0, transactions: [], closingBalance: 0, supplier: null }
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .eq('company_id', activeCompanyId)
        .single()
      if (!supplier) return { openingBalance: 0, transactions: [], closingBalance: 0, supplier: null }

      // Build statement from AP control account activity so it reconciles to the GL.
      const { data: apAccount, error: apErr } = await supabase
        .from('accounts')
        .select('id')
        .eq('company_id', activeCompanyId)
        .eq('code', '2000')
        .eq('is_active', true)
        .single()
      if (apErr || !apAccount?.id) throw (apErr || new Error('AP control account (2000) not found'))

      const { data: linesBefore, error: beforeErr } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('account_id', apAccount.id)
        .eq('supplier_id', supplierId)
        .lt('journal_entry.entry_date', startDate)
      if (beforeErr) throw beforeErr

      let openingBalance = 0
      ;(linesBefore || []).forEach((line) => {
        openingBalance += (Number(line.credit) || 0) - (Number(line.debit) || 0)
      })

      const { data: lines, error: linesErr } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit, description,
          journal_entry:journal_entries!inner(
            entry_date, entry_number, entry_type, reference, description, status, company_id
          )
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .eq('account_id', apAccount.id)
        .eq('supplier_id', supplierId)
        .gte('journal_entry.entry_date', startDate)
        .lte('journal_entry.entry_date', endDate)
        .order('journal_entry(entry_date)', { ascending: true })
      if (linesErr) throw linesErr

      const transactions = (lines || []).map((l) => ({
        date: l.journal_entry?.entry_date,
        type: l.journal_entry?.entry_type || 'journal',
        reference: l.journal_entry?.reference || l.journal_entry?.entry_number,
        description: l.description || l.journal_entry?.description || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        balance: null,
      }))

      let running = openingBalance
      transactions.forEach((t) => {
        running += (t.credit || 0) - (t.debit || 0)
        t.balance = running
      })

      return {
        supplier,
        openingBalance,
        transactions,
        closingBalance: running,
      }
    },
    enabled: !!activeCompanyId && !!supplierId && !!startDate && !!endDate,
  })
}

// ================================
// INTEGRITY / RECONCILIATION CHECKS
// ================================
export const useIntegrityChecks = (startDate, endDate, enabled = true) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['integrity-checks', activeCompanyId, startDate, endDate],
    queryFn: async () => {
      const asOfDate = endDate || new Date().toISOString().split('T')[0]

      // GL balances as-of date for control accounts
      const { data: controlLines, error: controlErr } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(code, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .lte('journal_entry.entry_date', asOfDate)
        .in('account.code', ['1100', '2000', '2100', '1150'])
      if (controlErr) throw controlErr

      let arGL = 0 // debit - credit
      let apGL = 0 // credit - debit
      let vatPayableGL = 0 // credit - debit
      let vatInputGL = 0 // debit - credit
      ;(controlLines || []).forEach((l) => {
        const code = l.account?.code
        const d = Number(l.debit) || 0
        const c = Number(l.credit) || 0
        if (code === '1100') arGL += d - c
        if (code === '2000') apGL += c - d
        if (code === '2100') vatPayableGL += c - d
        if (code === '1150') vatInputGL += d - c
      })

      // Subledger outstanding as-of date (based on operational docs)
      const { data: openInvoices, error: invErr } = await supabase
        .from('invoices')
        .select('total, amount_paid, issue_date, status')
        .eq('company_id', activeCompanyId)
        .in('status', ['sent', 'overdue', 'part_paid'])
        .lte('issue_date', asOfDate)
      if (invErr) throw invErr
      const arSubledger = (openInvoices || []).reduce((sum, inv) => {
        const outstanding = (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0)
        return sum + (outstanding > 0 ? outstanding : 0)
      }, 0)

      const { data: openPurchases, error: purErr } = await supabase
        .from('supplier_invoices')
        .select('total, amount_paid, issue_date, status')
        .eq('company_id', activeCompanyId)
        .in('status', ['unpaid', 'overdue', 'part_paid'])
        .lte('issue_date', asOfDate)
      if (purErr) throw purErr
      const apSubledger = (openPurchases || []).reduce((sum, inv) => {
        const outstanding = (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0)
        return sum + (outstanding > 0 ? outstanding : 0)
      }, 0)

      // VAT period movement checks (invoice-date basis)
      let vatLinesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:accounts!inner(code, company_id),
          journal_entry:journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entry.company_id', activeCompanyId)
        .eq('journal_entry.status', 'posted')
        .in('account.code', ['2100', '1150'])

      if (startDate) vatLinesQuery = vatLinesQuery.gte('journal_entry.entry_date', startDate)
      if (endDate) vatLinesQuery = vatLinesQuery.lte('journal_entry.entry_date', endDate)

      const { data: vatLines, error: vatErr } = await vatLinesQuery
      if (vatErr) throw vatErr

      let outputVAT = 0
      let inputVAT = 0
      ;(vatLines || []).forEach((l) => {
        const code = l.account?.code
        const d = Number(l.debit) || 0
        const c = Number(l.credit) || 0
        if (code === '2100') outputVAT += c - d
        if (code === '1150') inputVAT += d - c
      })

      return {
        asOfDate,
        ar: { gl: arGL, subledger: arSubledger, difference: arGL - arSubledger },
        ap: { gl: apGL, subledger: apSubledger, difference: apGL - apSubledger },
        vat: {
          period: { outputVAT, inputVAT, netVAT: outputVAT - inputVAT, lineCount: (vatLines || []).length },
          balances: { vatPayableGL, vatInputGL },
        },
      }
    },
    enabled: !!activeCompanyId && !!endDate && !!enabled,
  })
}

// ================================
// UNRECONCILED ITEMS REPORT
// ================================
export const useUnreconciledItemsReport = (asOfDate) => {
  const { activeCompanyId } = useCompany()

  return useQuery({
    queryKey: ['unreconciled-items', activeCompanyId, asOfDate],
    queryFn: async () => {
      const asOf = asOfDate || new Date().toISOString().split('T')[0]

      // Unreconciled bank transactions
      const { data: bankTransactions, error: btError } = await supabase
        .from('bank_transactions')
        .select('id, date, description, amount, type, reference')
        .eq('company_id', activeCompanyId)
        .eq('is_reconciled', false)
        .lte('date', asOf)
        .order('date', { ascending: false })

      if (btError) throw btError

      // Unpaid invoices (sent/overdue)
      const { data: unpaidInvoices, error: invError } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, issue_date, due_date, total, amount_paid, status,
          client:clients(id, name)
        `)
        .eq('company_id', activeCompanyId)
        .in('status', ['sent', 'overdue', 'part_paid'])
        .lte('due_date', asOf)

      if (invError) throw invError

      // Unpaid supplier invoices
      const { data: unpaidPurchases, error: purError } = await supabase
        .from('supplier_invoices')
        .select(`
          id, invoice_number, issue_date, due_date, total, amount_paid, status,
          supplier:suppliers(id, name)
        `)
        .eq('company_id', activeCompanyId)
        .in('status', ['unpaid', 'overdue', 'part_paid'])
        .lte('due_date', asOf)

      if (purError) throw purError

      // Calculate ages
      const calculateAge = (date) => {
        const d = new Date(date)
        const asOfDate = new Date(asOf)
        return Math.floor((asOfDate - d) / (1000 * 60 * 60 * 24))
      }

      const bankTxns = (bankTransactions || []).map((t) => ({
        ...t,
        itemType: 'bank_transaction',
        outstanding: Number(t.amount),
        age: calculateAge(t.date),
      }))

      const invoices = (unpaidInvoices || []).map((inv) => ({
        id: inv.id,
        itemType: 'invoice',
        reference: inv.invoice_number,
        date: inv.due_date,
        description: `Invoice ${inv.invoice_number} - ${inv.client?.name || 'Unknown'}`,
        outstanding: Number(inv.total) - Number(inv.amount_paid || 0),
        age: calculateAge(inv.due_date),
        client: inv.client?.name,
      }))

      const purchases = (unpaidPurchases || []).map((pur) => ({
        id: pur.id,
        itemType: 'supplier_invoice',
        reference: pur.invoice_number,
        date: pur.due_date,
        description: `Purchase ${pur.invoice_number} - ${pur.supplier?.name || 'Unknown'}`,
        outstanding: Number(pur.total) - Number(pur.amount_paid || 0),
        age: calculateAge(pur.due_date),
        supplier: pur.supplier?.name,
      }))

      const totalBankTxns = bankTxns.reduce((sum, t) => sum + t.outstanding, 0)
      const totalInvoices = invoices.reduce((sum, i) => sum + i.outstanding, 0)
      const totalPurchases = purchases.reduce((sum, p) => sum + p.outstanding, 0)

      return {
        bankTransactions: bankTxns,
        unpaidInvoices: invoices,
        unpaidPurchases: purchases,
        totals: {
          bankTransactions: totalBankTxns,
          unpaidInvoices: totalInvoices,
          unpaidPurchases: totalPurchases,
          total: totalBankTxns + totalInvoices + totalPurchases,
        },
        asOfDate: asOf,
      }
    },
    enabled: !!activeCompanyId,
  })
}

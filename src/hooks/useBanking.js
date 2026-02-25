import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { createHash } from '../lib/utils'

export const useBanking = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const transactionsQuery = useQuery({
    queryKey: ['banking', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select(`
          *,
          client:clients(id, name),
          supplier:suppliers(id, name),
          account:accounts(id, name, code),
          invoice:invoices(id, invoice_number),
          supplier_invoice:supplier_invoices(id, invoice_number)
        `)
        .eq('company_id', activeCompanyId)
        .order('date', { ascending: false })

      if (filters.reconciled !== undefined) {
        query = query.eq('is_reconciled', filters.reconciled)
      }

      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const importTransactions = useMutation({
    mutationFn: async (transactions) => {
      // Generate hash for each transaction to prevent duplicates
      const transactionsWithHash = transactions.map((t) => ({
        ...t,
        company_id: activeCompanyId,
        import_hash: createHash(`${t.date}-${t.description}-${t.amount}`),
      }))

      // Check for existing hashes
      const hashes = transactionsWithHash.map((t) => t.import_hash)
      const { data: existing } = await supabase
        .from('bank_transactions')
        .select('import_hash')
        .eq('company_id', activeCompanyId)
        .in('import_hash', hashes)

      const existingHashes = new Set(existing?.map((e) => e.import_hash) || [])
      const newTransactions = transactionsWithHash.filter(
        (t) => !existingHashes.has(t.import_hash)
      )

      if (newTransactions.length === 0) {
        return { imported: 0, duplicates: transactions.length }
      }

      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(newTransactions)
        .select()

      if (error) throw error

      return {
        imported: data.length,
        duplicates: transactions.length - data.length,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking'] })
    },
  })

  const categorizeTransaction = useMutation({
    mutationFn: async ({ id, categoryType, categoryId, invoiceId }) => {
      const updateData = {
        category_type: categoryType,
        client_id: categoryType === 'client' ? categoryId : null,
        supplier_id: categoryType === 'supplier' ? categoryId : null,
        account_id: categoryType === 'account' ? categoryId : null,
        invoice_id: categoryType === 'client' ? invoiceId : null,
        supplier_invoice_id: categoryType === 'supplier' ? invoiceId : null,
      }

      const { data, error } = await supabase
        .from('bank_transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking'] })
    },
  })

  const reconcileTransaction = useMutation({
    mutationFn: async ({ id, reconciled }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: reconciled,
          reconciled_at: reconciled ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking'] })
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking'] })
    },
  })

  // Get matching suggestions for a transaction
  const getMatchingSuggestions = async (transactionId) => {
    const { data: transaction, error: tError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (tError || !transaction) return []

    const suggestions = []
    const amount = Number(transaction.amount)
    const date = new Date(transaction.date)
    const tolerance = amount * 0.02 // 2% tolerance

    // Match to invoices (unpaid/sent)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, amount_paid, issue_date, due_date, client:clients(name)')
      .eq('company_id', activeCompanyId)
      .in('status', ['sent', 'overdue', 'part_paid'])
      .gte('total', amount - tolerance)
      .lte('total', amount + tolerance)

    ;(invoices || []).forEach((inv) => {
      const outstanding = Number(inv.total) - Number(inv.amount_paid || 0)
      const dateDiff = Math.abs((new Date(inv.due_date) - date) / (1000 * 60 * 60 * 24))
      if (Math.abs(outstanding - amount) <= tolerance && dateDiff <= 30) {
        suggestions.push({
          type: 'invoice',
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: outstanding,
          date: inv.due_date,
          client: inv.client?.name,
          score: 100 - (Math.abs(outstanding - amount) / amount * 100) - (dateDiff / 30 * 10),
        })
      }
    })

    // Match to supplier invoices (unpaid)
    const { data: purchases } = await supabase
      .from('supplier_invoices')
      .select('id, invoice_number, total, amount_paid, issue_date, due_date, supplier:suppliers(name)')
      .eq('company_id', activeCompanyId)
      .in('status', ['unpaid', 'overdue', 'part_paid'])
      .gte('total', amount - tolerance)
      .lte('total', amount + tolerance)

    ;(purchases || []).forEach((pur) => {
      const outstanding = Number(pur.total) - Number(pur.amount_paid || 0)
      const dateDiff = Math.abs((new Date(pur.due_date) - date) / (1000 * 60 * 60 * 24))
      if (Math.abs(outstanding - amount) <= tolerance && dateDiff <= 30) {
        suggestions.push({
          type: 'supplier_invoice',
          id: pur.id,
          invoice_number: pur.invoice_number,
          amount: outstanding,
          date: pur.due_date,
          supplier: pur.supplier?.name,
          score: 100 - (Math.abs(outstanding - amount) / amount * 100) - (dateDiff / 30 * 10),
        })
      }
    })

    return suggestions.sort((a, b) => b.score - a.score)
  }

  // Manual transaction matching
  const matchTransaction = useMutation({
    mutationFn: async ({ transactionId, matchToType, matchToId, notes, autoReconcile = false }) => {
      const { data: profile } = await supabase.auth.getUser()
      const userId = profile?.user?.id

      // Update transaction
      const updateData = {
        invoice_id: matchToType === 'invoice' ? matchToId : null,
        supplier_invoice_id: matchToType === 'supplier_invoice' ? matchToId : null,
        account_id: matchToType === 'account' ? matchToId : null,
        client_id: matchToType === 'client' ? matchToId : null,
        supplier_id: matchToType === 'supplier' ? matchToId : null,
        category_type: matchToType === 'invoice' || matchToType === 'client' ? 'client' : matchToType === 'supplier_invoice' || matchToType === 'supplier' ? 'supplier' : 'account',
      }

      if (autoReconcile) {
        updateData.is_reconciled = true
        updateData.reconciled_at = new Date().toISOString()
      }

      const { data: transaction, error: tError } = await supabase
        .from('bank_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single()

      if (tError) throw tError

      // Log to history
      const { error: hError } = await supabase
        .from('reconciliation_history')
        .insert({
          company_id: activeCompanyId,
          bank_transaction_id: transactionId,
          matched_to_type: matchToType,
          matched_to_id: matchToId,
          matched_to_invoice_id: matchToType === 'invoice' ? matchToId : null,
          matched_to_supplier_invoice_id: matchToType === 'supplier_invoice' ? matchToId : null,
          matched_to_account_id: matchToType === 'account' ? matchToId : null,
          match_method: 'manual',
          action: autoReconcile ? 'reconciled' : 'matched',
          notes,
          reconciled_by: userId,
        })

      if (hError) throw hError

      return transaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking'] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation-history'] })
    },
  })

  // Auto-match transactions using rules
  const autoMatchTransactions = useMutation({
    mutationFn: async ({ transactionIds = null }) => {
      const { data: rules, error: rulesError } = await supabase
        .from('bank_matching_rules')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_active', true)
        .eq('auto_match', true)
        .order('priority', { ascending: true })

      if (rulesError) throw rulesError
      if (!rules || rules.length === 0) return { matched: 0, errors: [] }

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('is_reconciled', false)

      if (transactionIds) {
        query = query.in('id', transactionIds)
      }

      const { data: transactions, error: tError } = await query
      if (tError) throw tError

      const { data: profile } = await supabase.auth.getUser()
      const userId = profile?.user?.id

      let matched = 0
      const errors = []

      for (const transaction of transactions || []) {
        for (const rule of rules) {
          let matchedItem = null

          // Simple pattern matching (description contains pattern)
          if (rule.rule_type === 'description_pattern' && rule.pattern) {
            const pattern = rule.pattern_case_sensitive ? rule.pattern : rule.pattern.toLowerCase()
            const desc = rule.pattern_case_sensitive ? transaction.description : transaction.description.toLowerCase()
            if (desc.includes(pattern)) {
              if (rule.match_to_type === 'invoice') {
                const { data: invs } = await supabase
                  .from('invoices')
                  .select('id')
                  .eq('company_id', activeCompanyId)
                  .eq('id', rule.match_to_id || '')
                  .single()
                matchedItem = invs ? { type: 'invoice', id: invs.id } : null
              } else if (rule.match_to_type === 'supplier_invoice') {
                const { data: purs } = await supabase
                  .from('supplier_invoices')
                  .select('id')
                  .eq('company_id', activeCompanyId)
                  .eq('id', rule.match_to_id || '')
                  .single()
                matchedItem = purs ? { type: 'supplier_invoice', id: purs.id } : null
              }
            }
          }

          // Amount exact match
          if (rule.rule_type === 'amount_exact' && rule.amount_value) {
            const tolerance = rule.amount_tolerance || 0
            if (Math.abs(Number(transaction.amount) - Number(rule.amount_value)) <= tolerance) {
              if (rule.match_to_type === 'account' && rule.match_to_account_id) {
                matchedItem = { type: 'account', id: rule.match_to_account_id }
              }
            }
          }

          if (matchedItem) {
            try {
              const updateData = {
                invoice_id: matchedItem.type === 'invoice' ? matchedItem.id : null,
                supplier_invoice_id: matchedItem.type === 'supplier_invoice' ? matchedItem.id : null,
                account_id: matchedItem.type === 'account' ? matchedItem.id : null,
                category_type: matchedItem.type === 'invoice' ? 'client' : matchedItem.type === 'supplier_invoice' ? 'supplier' : 'account',
              }

              if (rule.auto_reconcile) {
                updateData.is_reconciled = true
                updateData.reconciled_at = new Date().toISOString()
              }

              await supabase
                .from('bank_transactions')
                .update(updateData)
                .eq('id', transaction.id)

              await supabase
                .from('reconciliation_history')
                .insert({
                  company_id: activeCompanyId,
                  bank_transaction_id: transaction.id,
                  matched_to_type: matchedItem.type,
                  matched_to_id: matchedItem.id,
                  matched_to_invoice_id: matchedItem.type === 'invoice' ? matchedItem.id : null,
                  matched_to_supplier_invoice_id: matchedItem.type === 'supplier_invoice' ? matchedItem.id : null,
                  matched_to_account_id: matchedItem.type === 'account' ? matchedItem.id : null,
                  match_method: 'auto_rule',
                  rule_id: rule.id,
                  action: rule.auto_reconcile ? 'reconciled' : 'matched',
                  reconciled_by: userId,
                })

              matched++
              break // Only match to first rule
            } catch (err) {
              errors.push({ transaction: transaction.id, error: err.message })
            }
          }
        }
      }

      return { matched, errors }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banking'] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation-history'] })
    },
  })

  // Get reconciliation history
  const reconciliationHistoryQuery = useQuery({
    queryKey: ['reconciliation-history', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_history')
        .select(`
          *,
          bank_transaction:bank_transactions(id, description, amount, date),
          reconciled_by_profile:profiles!reconciliation_history_reconciled_by_fkey(id, full_name, email)
        `)
        .eq('company_id', activeCompanyId)
        .order('reconciled_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  // Get matching rules
  const matchingRulesQuery = useQuery({
    queryKey: ['matching-rules', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_matching_rules')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('priority', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  // Create matching rule
  const createMatchingRule = useMutation({
    mutationFn: async (ruleData) => {
      const { data, error } = await supabase
        .from('bank_matching_rules')
        .insert({
          ...ruleData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-rules'] })
    },
  })

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    importTransactions: importTransactions.mutateAsync,
    categorizeTransaction: categorizeTransaction.mutateAsync,
    reconcileTransaction: reconcileTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
    matchTransaction: matchTransaction.mutateAsync,
    autoMatchTransactions: autoMatchTransactions.mutateAsync,
    getMatchingSuggestions,
    reconciliationHistory: reconciliationHistoryQuery.data || [],
    matchingRules: matchingRulesQuery.data || [],
    createMatchingRule: createMatchingRule.mutateAsync,
    isImporting: importTransactions.isPending,
    isCategorizing: categorizeTransaction.isPending,
    isReconciling: reconcileTransaction.isPending,
    isMatching: matchTransaction.isPending,
    isAutoMatching: autoMatchTransactions.isPending,
    isCreatingRule: createMatchingRule.isPending,
  }
}

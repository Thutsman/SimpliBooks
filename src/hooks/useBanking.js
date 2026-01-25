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

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    importTransactions: importTransactions.mutateAsync,
    categorizeTransaction: categorizeTransaction.mutateAsync,
    reconcileTransaction: reconcileTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
    isImporting: importTransactions.isPending,
    isCategorizing: categorizeTransaction.isPending,
    isReconciling: reconcileTransaction.isPending,
  }
}

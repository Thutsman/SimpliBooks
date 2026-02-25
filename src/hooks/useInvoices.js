import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'
import { checkInvoiceLimit, recordInvoiceCreation } from '../lib/subscription'

export const useInvoices = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const invoicesQuery = useQuery({
    queryKey: ['invoices', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:clients(id, name, email)
        `)
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    enabled: !!activeCompanyId,
  })

  const useInvoice = (id) => useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          *,
          account:accounts(id, name, code)
        `)
        .eq('invoice_id', id)
        .order('sort_order')

      if (itemsError) throw itemsError

      return { ...invoice, items }
    },
    enabled: !!id,
  })

  const getNextInvoiceNumber = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', activeCompanyId)

    if (error) throw error

    if (data.length === 0) {
      return 'INV-0001'
    }

    // Extract all numeric values from invoice numbers
    // Handle formats like: INV-0001, Inv-0001, INV0001, 0001, 002, etc.
    let maxNum = 0
    for (const invoice of data) {
      const invoiceNum = invoice.invoice_number || ''
      // Try to match INV-#### or Inv-#### (case-insensitive)
      let match = invoiceNum.match(/inv-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      } else {
        // Try to match just numbers at the end (e.g., "002", "0001")
        match = invoiceNum.match(/(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
    }

    // Increment and format
    const nextNum = maxNum + 1
    return `INV-${String(nextNum).padStart(4, '0')}`
  }

  const createInvoice = useMutation({
    mutationFn: async ({ items, ...invoiceData }) => {
      // Check subscription limit before creating
      if (user?.id && activeCompanyId) {
        const limitCheck = await checkInvoiceLimit(supabase, user.id, activeCompanyId)
        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason)
        }
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items
      if (items && items.length > 0) {
        const itemsWithInvoiceId = items.map((item, index) => ({
          ...item,
          invoice_id: invoice.id,
          sort_order: index,
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsWithInvoiceId)

        if (itemsError) throw itemsError
      }

      return invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      // Record usage for invoice limits
      if (user?.id && activeCompanyId) {
        recordInvoiceCreation(supabase, user.id, activeCompanyId).catch(console.warn)
      }
    },
  })

  const updateInvoice = useMutation({
    mutationFn: async ({ id, items, ...invoiceData }) => {
      // Update invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', id)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Delete existing items and recreate
      if (items) {
        await supabase.from('invoice_items').delete().eq('invoice_id', id)

        if (items.length > 0) {
          const itemsWithInvoiceId = items.map((item, index) => ({
            ...item,
            invoice_id: id,
            sort_order: index,
          }))

          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsWithInvoiceId)

          if (itemsError) throw itemsError
        }
      }

      return invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const deleteInvoice = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      if (status === 'paid') {
        throw new Error('Use Receive Payment to record payments (partial payments supported).')
      }
      const updateData = { status }

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  return {
    invoices: invoicesQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    error: invoicesQuery.error,
    useInvoice,
    getNextInvoiceNumber,
    createInvoice: createInvoice.mutateAsync,
    updateInvoice: updateInvoice.mutateAsync,
    deleteInvoice: deleteInvoice.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
    isCreating: createInvoice.isPending,
    isUpdating: updateInvoice.isPending,
    isDeleting: deleteInvoice.isPending,
  }
}

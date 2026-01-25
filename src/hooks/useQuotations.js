import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

export const useQuotations = (filters = {}) => {
  const { activeCompanyId } = useCompany()
  const queryClient = useQueryClient()

  const quotationsQuery = useQuery({
    queryKey: ['quotations', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
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

  const quotationQuery = (id) => useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('id', id)
        .single()

      if (quotationError) throw quotationError

      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select(`
          *,
          account:accounts(id, name, code)
        `)
        .eq('quotation_id', id)
        .order('sort_order')

      if (itemsError) throw itemsError

      return { ...quotation, items }
    },
    enabled: !!id,
  })

  const getNextQuotationNumber = async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select('quotation_number')
      .eq('company_id', activeCompanyId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    if (data.length === 0) {
      return 'QUO-0001'
    }

    const lastNumber = data[0].quotation_number
    const match = lastNumber.match(/QUO-(\d+)/)
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1
      return `QUO-${String(nextNum).padStart(4, '0')}`
    }

    return `QUO-0001`
  }

  const createQuotation = useMutation({
    mutationFn: async ({ items, ...quotationData }) => {
      // Create quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          ...quotationData,
          company_id: activeCompanyId,
        })
        .select()
        .single()

      if (quotationError) throw quotationError

      // Create quotation items
      if (items && items.length > 0) {
        const itemsWithQuotationId = items.map((item, index) => ({
          ...item,
          quotation_id: quotation.id,
          sort_order: index,
        }))

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsWithQuotationId)

        if (itemsError) throw itemsError
      }

      return quotation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })

  const updateQuotation = useMutation({
    mutationFn: async ({ id, items, ...quotationData }) => {
      // Update quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .update(quotationData)
        .eq('id', id)
        .select()
        .single()

      if (quotationError) throw quotationError

      // Delete existing items and recreate
      if (items) {
        await supabase.from('quotation_items').delete().eq('quotation_id', id)

        if (items.length > 0) {
          const itemsWithQuotationId = items.map((item, index) => ({
            ...item,
            quotation_id: id,
            sort_order: index,
          }))

          const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(itemsWithQuotationId)

          if (itemsError) throw itemsError
        }
      }

      return quotation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotation'] })
    },
  })

  const deleteQuotation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('quotations')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotation'] })
    },
  })

  const convertToInvoice = useMutation({
    mutationFn: async (quotationId) => {
      // Get quotation with items
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()

      if (quotationError) throw quotationError

      const { data: quotationItems, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order')

      if (itemsError) throw itemsError

      // Get next invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(1)

      let invoiceNumber = 'INV-0001'
      if (lastInvoice && lastInvoice.length > 0) {
        const match = lastInvoice[0].invoice_number.match(/INV-(\d+)/)
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1
          invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`
        }
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: quotation.company_id,
          client_id: quotation.client_id,
          invoice_number: invoiceNumber,
          reference: quotation.reference,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          subtotal: quotation.subtotal,
          vat_amount: quotation.vat_amount,
          total: quotation.total,
          notes: quotation.notes,
          terms: quotation.terms,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items
      if (quotationItems.length > 0) {
        const invoiceItems = quotationItems.map((item, index) => ({
          invoice_id: invoice.id,
          account_id: item.account_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          vat_amount: item.vat_amount,
          line_total: item.line_total,
          sort_order: index,
        }))

        const { error: invoiceItemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (invoiceItemsError) throw invoiceItemsError
      }

      // Update quotation status and link to invoice
      await supabase
        .from('quotations')
        .update({
          status: 'converted',
          converted_invoice_id: invoice.id,
        })
        .eq('id', quotationId)

      return invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotation'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  return {
    quotations: quotationsQuery.data || [],
    isLoading: quotationsQuery.isLoading,
    error: quotationsQuery.error,
    useQuotation: quotationQuery,
    getNextQuotationNumber,
    createQuotation: createQuotation.mutateAsync,
    updateQuotation: updateQuotation.mutateAsync,
    deleteQuotation: deleteQuotation.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
    convertToInvoice: convertToInvoice.mutateAsync,
    isCreating: createQuotation.isPending,
    isUpdating: updateQuotation.isPending,
    isDeleting: deleteQuotation.isPending,
    isConverting: convertToInvoice.isPending,
  }
}

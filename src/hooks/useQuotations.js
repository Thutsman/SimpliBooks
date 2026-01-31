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

    if (error) throw error

    if (data.length === 0) {
      return 'QTN-0001'
    }

    // Extract all numeric values from quotation numbers
    // Handle formats like: QTN-0001, Qtn-0001, QUO-0001, QTN0001, 0001, etc.
    let maxNum = 0
    for (const quotation of data) {
      const quotationNum = quotation.quotation_number || ''
      // Try to match QTN-#### or Qtn-#### or QUO-#### (case-insensitive)
      let match = quotationNum.match(/(?:qtn|quo)-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      } else {
        // Try to match just numbers at the end (e.g., "002", "0001")
        match = quotationNum.match(/(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
    }

    // Increment and format
    const nextNum = maxNum + 1
    return `QTN-${String(nextNum).padStart(4, '0')}`
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
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', activeCompanyId)

      let invoiceNumber = 'INV-0001'
      if (allInvoices && allInvoices.length > 0) {
        // Extract all numeric values from invoice numbers
        let maxNum = 0
        for (const invoice of allInvoices) {
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
        const nextNum = maxNum + 1
        invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`
      }

      // Create invoice (include currency/FX from quotation)
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
          currency_code: quotation.currency_code || undefined,
          fx_rate: quotation.fx_rate ?? 1,
          fx_rate_date: quotation.fx_rate_date || undefined,
          subtotal_fx: quotation.subtotal_fx ?? quotation.subtotal,
          vat_amount_fx: quotation.vat_amount_fx ?? quotation.vat_amount,
          total_fx: quotation.total_fx ?? quotation.total,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items (include FX columns from quotation items)
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
          unit_price_fx: item.unit_price_fx ?? item.unit_price,
          vat_amount_fx: item.vat_amount_fx ?? item.vat_amount,
          line_total_fx: item.line_total_fx ?? item.line_total,
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

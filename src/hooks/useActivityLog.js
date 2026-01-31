import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'

const ENTITY_LABELS = {
  companies: 'Company',
  company_members: 'Team member',
  clients: 'Client',
  suppliers: 'Supplier',
  invoices: 'Invoice',
  supplier_invoices: 'Purchase',
  quotations: 'Quotation',
  bank_transactions: 'Bank transaction',
  journal_entries: 'Journal entry',
  products: 'Product',
  stock_adjustments: 'Stock adjustment',
  exchange_rates: 'Exchange rate',
  company_currencies: 'Currency',
}

const ACTION_LABELS = { insert: 'Created', update: 'Updated', delete: 'Deleted' }

export const useActivityLog = (options = {}) => {
  const { activeCompanyId } = useCompany()
  const {
    entityType = null,
    entityId = null,
    action: actionFilter = null,
    limit = 100,
    offset = 0,
  } = options

  const query = useQuery({
    queryKey: ['activity-log', activeCompanyId, entityType, entityId, actionFilter, limit, offset],
    queryFn: async () => {
      let q = supabase
        .from('activity_log')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (entityType) q = q.eq('entity_type', entityType)
      if (entityId) q = q.eq('entity_id', entityId)
      if (actionFilter) q = q.eq('action', actionFilter)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!activeCompanyId,
  })

  return {
    entries: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    entityLabel: (type) => ENTITY_LABELS[type] || type,
    actionLabel: (act) => ACTION_LABELS[act] || act,
  }
}

export { ENTITY_LABELS, ACTION_LABELS }

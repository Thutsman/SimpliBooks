import { useState } from 'react'
import { History } from 'lucide-react'
import { useActivityLog } from '../hooks/useActivityLog'
import { format } from 'date-fns'
import { Select } from '../components/ui/Input'

const ENTITY_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'invoices', label: 'Invoice' },
  { value: 'quotations', label: 'Quotation' },
  { value: 'supplier_invoices', label: 'Purchase' },
  { value: 'clients', label: 'Client' },
  { value: 'suppliers', label: 'Supplier' },
  { value: 'company_members', label: 'Team member' },
  { value: 'bank_transactions', label: 'Bank transaction' },
  { value: 'journal_entries', label: 'Journal entry' },
  { value: 'products', label: 'Product' },
  { value: 'companies', label: 'Company' },
  { value: 'exchange_rates', label: 'Exchange rate' },
  { value: 'company_currencies', label: 'Currency' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'insert', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
]

const ActivityLog = () => {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const { entries, isLoading, error, entityLabel, actionLabel } = useActivityLog({
    entityType: entityType || null,
    action: action || null,
    limit: 100,
  })

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-7 h-7" />
          Activity Log
        </h1>
        <p className="text-gray-600 mt-1">
          Recent changes in this company. Only members can view.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select
          label="Entity type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          options={ENTITY_OPTIONS}
          className="w-48"
        />
        <Select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          options={ACTION_OPTIONS}
          className="w-40"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">When</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                      {format(new Date(entry.created_at), 'PPp')}
                    </td>
                    <td className="px-4 py-2 capitalize">{actionLabel(entry.action)}</td>
                    <td className="px-4 py-2">
                      {entityLabel(entry.entity_type)}
                      {entry.entity_id && (
                        <span className="text-gray-400 ml-1 font-mono text-xs">
                          {String(entry.entity_id).slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{entry.actor_role || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLog

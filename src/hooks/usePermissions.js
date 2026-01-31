import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'

const ROLES = ['owner', 'admin', 'accountant', 'viewer']

export const usePermissions = () => {
  const { activeCompany, activeCompanyId } = useCompany()
  const { user } = useAuth()

  const roleQuery = useQuery({
    queryKey: ['my-role', activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user?.id) return null
      if (activeCompany?.user_id === user.id) return 'owner'
      const { data, error } = await supabase
        .from('company_members')
        .select('role')
        .eq('company_id', activeCompanyId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      if (error) throw error
      return data?.role ?? null
    },
    enabled: !!activeCompanyId && !!user?.id,
  })

  const role = roleQuery.data ?? null

  const canEditTransactions =
    role && ROLES.indexOf(role) <= ROLES.indexOf('accountant')
  const canManageMembers =
    role && (role === 'owner' || role === 'admin')
  const canEditCompany =
    role && (role === 'owner' || role === 'admin')
  const canDeleteCompany = role === 'owner'
  const canManageSettings =
    role && (role === 'owner' || role === 'admin')
  const isViewer = role === 'viewer'

  return {
    role,
    isLoading: roleQuery.isLoading,
    canEditTransactions,
    canManageMembers,
    canEditCompany,
    canDeleteCompany,
    canManageSettings,
    isViewer,
  }
}

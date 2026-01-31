import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'

export const useCompanyMembers = () => {
  const { activeCompanyId } = useCompany()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const membersQuery = useQuery({
    queryKey: ['company-members', activeCompanyId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('company_members')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!members?.length) return []

      const userIds = [...new Set(members.map((m) => m.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})

      return members.map((m) => ({
        ...m,
        profile: profileMap[m.user_id] || { id: m.user_id, full_name: null, email: null },
      }))
    },
    enabled: !!activeCompanyId,
  })

  const addMember = useMutation({
    mutationFn: async ({ email, role }) => {
      // Resolve user_id from email via profiles (profiles.id = auth.users.id)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (profileError || !profile) {
        throw new Error('User not found. They must sign up first.')
      }

      const { data, error } = await supabase
        .from('company_members')
        .insert({
          company_id: activeCompanyId,
          user_id: profile.id,
          role: role || 'accountant',
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', activeCompanyId] })
    },
  })

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }) => {
      const { data, error } = await supabase
        .from('company_members')
        .update({ role })
        .eq('id', memberId)
        .eq('company_id', activeCompanyId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', activeCompanyId] })
    },
  })

  const removeMember = useMutation({
    mutationFn: async (memberId) => {
      const { error } = await supabase
        .from('company_members')
        .update({ status: 'removed' })
        .eq('id', memberId)
        .eq('company_id', activeCompanyId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members', activeCompanyId] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    addMember: addMember.mutateAsync,
    updateMemberRole: updateMemberRole.mutateAsync,
    removeMember: removeMember.mutateAsync,
    isAdding: addMember.isPending,
    isUpdating: updateMemberRole.isPending,
    isRemoving: removeMember.isPending,
  }
}

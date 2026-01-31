import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'

const getFunctionsUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return null
  return `${url.replace(/\/$/, '')}/functions/v1`
}

export const useCompanyInvitations = () => {
  const { activeCompanyId } = useCompany()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const invitationsQuery = useQuery({
    queryKey: ['company-invitations', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!activeCompanyId,
  })

  const createInvitation = useMutation({
    mutationFn: async ({ email, role }) => {
      const { data, error } = await supabase
        .from('company_invitations')
        .insert({
          company_id: activeCompanyId,
          email: email.toLowerCase().trim(),
          role: role || 'accountant',
          status: 'pending',
          invited_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-invitations', activeCompanyId] })
    },
  })

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId) => {
      const { error } = await supabase
        .from('company_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .eq('company_id', activeCompanyId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-invitations', activeCompanyId] })
    },
  })

  const inviteByEmailViaEdge = useMutation({
    mutationFn: async ({ email, role }) => {
      const base = getFunctionsUrl()
      if (!base) throw new Error('Supabase URL not configured')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not signed in')
      const res = await fetch(`${base}/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          company_id: activeCompanyId,
          email: email.toLowerCase().trim(),
          role: role || 'accountant',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || res.statusText || 'Invite failed')
      return body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-invitations', activeCompanyId] })
    },
  })

  return {
    invitations: invitationsQuery.data || [],
    isLoading: invitationsQuery.isLoading,
    error: invitationsQuery.error,
    createInvitation: createInvitation.mutateAsync,
    cancelInvitation: cancelInvitation.mutateAsync,
    inviteByEmailViaEdge: inviteByEmailViaEdge.mutateAsync,
    isCreating: createInvitation.isPending,
    isCancelling: cancelInvitation.isPending,
    isInvitingViaEdge: inviteByEmailViaEdge.isPending,
  }
}

/** Call after login to accept any pending invitations for the current user's email */
export const useAcceptPendingInvitations = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user?.email) return { accepted: 0 }
      const { data: pending } = await supabase
        .from('company_invitations')
        .select('id')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')

      if (!pending?.length) return { accepted: 0 }
      let accepted = 0
      for (const inv of pending) {
        const { data } = await supabase.rpc('accept_invitation', { p_invitation_id: inv.id })
        if (data?.success) accepted++
      }
      if (accepted > 0) {
        queryClient.invalidateQueries({ queryKey: ['companies'] })
        queryClient.invalidateQueries({ queryKey: ['company-members'] })
      }
      return { accepted }
    },
  })
}

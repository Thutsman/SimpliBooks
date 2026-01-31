-- SimpliBooks Migration: Company Invitations
-- Track pending invites; RPC to accept invite and add company_members

-- ================================
-- COMPANY_INVITATIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_company_id ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_status ON company_invitations(status);

-- ================================
-- RLS
-- ================================
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company invitations"
  ON company_invitations FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Owner or admin can insert invitations"
  ON company_invitations FOR INSERT
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owner or admin can update invitations"
  ON company_invitations FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin']));

-- ================================
-- RPC: Accept invitation (called by invited user after sign-in)
-- ================================
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation
  FROM company_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND email = (SELECT email FROM auth.users WHERE id = v_user_id);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or expired');
  END IF;

  INSERT INTO company_members (company_id, user_id, role, status, created_by)
  VALUES (v_invitation.company_id, v_user_id, v_invitation.role, 'active', v_invitation.invited_by)
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, status = 'active', created_by = EXCLUDED.created_by;

  UPDATE company_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'company_id', v_invitation.company_id);
END;
$$;

-- Allow authenticated users to call accept_invitation (RLS on the function is via SECURITY DEFINER; the function checks auth.uid() and invitation email match)
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;

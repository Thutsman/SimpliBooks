-- ============================================
-- 017: Subscriptions & Billing
-- ============================================

-- 1. Subscriptions table (one per user)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'professional',  -- starter, professional, business
  status TEXT NOT NULL DEFAULT 'trialing',     -- trialing, active, past_due, canceled, expired
  trial_ends_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  pending_plan TEXT,                           -- for downgrades (applied on next renewal)
  payfast_token TEXT,
  payfast_m_payment_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payments table (audit trail)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL,
  payfast_payment_id TEXT UNIQUE,
  merchant_payment_id TEXT UNIQUE,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Usage tracking table
CREATE TABLE IF NOT EXISTS usage_monthly (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month_yyyymm TEXT NOT NULL,                 -- e.g. "2026-02"
  invoices_created INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, company_id, month_yyyymm)
);

-- 4. Extend profiles with subscription fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payfast_payment_id ON payments(payfast_payment_id);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_lookup ON usage_monthly(user_id, company_id, month_yyyymm);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users can read/update their own
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role handles inserts/deletes via edge functions (no user INSERT policy needed)

-- Payments: users can read their own
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Usage monthly: users can read, insert, update their own
CREATE POLICY "Users can view own usage"
  ON usage_monthly FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON usage_monthly FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON usage_monthly FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- RPC: Create trial subscription (called on signup)
-- ============================================

CREATE OR REPLACE FUNCTION create_trial_subscription(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, trial_ends_at, started_at)
  VALUES (
    p_user_id,
    'professional',
    'trialing',
    NOW() + INTERVAL '5 days',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Also update profile
  UPDATE profiles
  SET subscription_status = 'trialing',
      subscription_tier = 'professional',
      subscription_start = NOW(),
      subscription_end = NOW() + INTERVAL '5 days'
  WHERE id = p_user_id
    AND (subscription_status IS NULL OR subscription_status = 'none');
END;
$$;

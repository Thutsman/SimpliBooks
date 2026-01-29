-- SimpliBooks Migration: Reconciliation History
-- Simple audit trail for bank transaction reconciliation

-- ================================
-- RECONCILIATION HISTORY TABLE
-- ================================
CREATE TABLE IF NOT EXISTS reconciliation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- What was reconciled
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,

  -- What it was matched to
  matched_to_type TEXT CHECK (matched_to_type IN ('invoice', 'supplier_invoice', 'account', 'manual')),
  matched_to_id UUID, -- ID of invoice, supplier_invoice, or account
  matched_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_to_supplier_invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  matched_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Matching details
  match_method TEXT NOT NULL CHECK (match_method IN ('manual', 'auto_rule', 'auto_suggestion')),
  rule_id UUID REFERENCES bank_matching_rules(id) ON DELETE SET NULL, -- If matched via rule
  match_score DECIMAL(5,2), -- Confidence score (0-100) for auto matches

  -- Reconciliation action
  action TEXT NOT NULL CHECK (action IN ('reconciled', 'unreconciled', 'matched', 'unmatched')),
  
  -- Notes
  notes TEXT,

  -- Audit
  reconciled_by UUID REFERENCES profiles(id),
  reconciled_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_reconciliation_history_company_id ON reconciliation_history(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_history_transaction_id ON reconciliation_history(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_history_matched_to ON reconciliation_history(matched_to_type, matched_to_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_history_date ON reconciliation_history(reconciled_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_history_method ON reconciliation_history(match_method);

-- ================================
-- ROW LEVEL SECURITY
-- ================================
ALTER TABLE reconciliation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company reconciliation history"
  ON reconciliation_history FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company reconciliation history"
  ON reconciliation_history FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Note: History is append-only, no update/delete policies needed

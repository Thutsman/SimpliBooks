-- SimpliBooks Migration: Bank Matching Rules
-- Auto-matching rules for bank transaction reconciliation

-- ================================
-- BANK MATCHING RULES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS bank_matching_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Rule details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule type: 'description_pattern', 'amount_exact', 'amount_range', 'date_range', 'reference_match'
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'description_pattern',
    'amount_exact',
    'amount_range',
    'date_range',
    'reference_match',
    'combined'
  )),

  -- Pattern matching (for description/reference)
  pattern TEXT, -- Regex or simple pattern
  pattern_case_sensitive BOOLEAN DEFAULT FALSE,

  -- Amount matching
  amount_value DECIMAL(15,2),
  amount_tolerance DECIMAL(15,2) DEFAULT 0, -- Allow ±tolerance
  amount_tolerance_percent DECIMAL(5,2) DEFAULT 0, -- Or percentage tolerance

  -- Date matching
  date_tolerance_days INTEGER DEFAULT 7, -- Allow ±N days

  -- Match target
  match_to_type TEXT NOT NULL CHECK (match_to_type IN ('invoice', 'supplier_invoice', 'account', 'client', 'supplier')),
  match_to_id UUID, -- Specific target (optional)
  match_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  match_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  match_to_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Auto-match settings
  auto_match BOOLEAN DEFAULT FALSE, -- Automatically match on import
  auto_reconcile BOOLEAN DEFAULT FALSE, -- Automatically reconcile when matched

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 100,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_bank_matching_rules_company_id ON bank_matching_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_matching_rules_active ON bank_matching_rules(company_id, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_bank_matching_rules_type ON bank_matching_rules(rule_type);

-- ================================
-- UPDATED_AT TRIGGER
-- ================================
CREATE TRIGGER update_bank_matching_rules_updated_at
  BEFORE UPDATE ON bank_matching_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================
-- ROW LEVEL SECURITY
-- ================================
ALTER TABLE bank_matching_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company matching rules"
  ON bank_matching_rules FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company matching rules"
  ON bank_matching_rules FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company matching rules"
  ON bank_matching_rules FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company matching rules"
  ON bank_matching_rules FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

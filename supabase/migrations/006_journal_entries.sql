-- SimpliBooks Migration: Double-Entry Accounting - Journal Entries
-- This creates the foundation for proper double-entry bookkeeping

-- ================================
-- JOURNAL ENTRIES TABLE (Header)
-- ================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Entry details
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference TEXT, -- External reference (invoice number, etc.)

  -- Entry type and source tracking
  entry_type TEXT NOT NULL DEFAULT 'manual' CHECK (entry_type IN (
    'manual',           -- Manual journal entry
    'invoice',          -- From customer invoice
    'invoice_payment',  -- Payment received on invoice
    'purchase',         -- From supplier invoice/purchase
    'purchase_payment', -- Payment made on purchase
    'bank_transfer',    -- Bank transfers
    'adjustment',       -- Adjusting entries
    'opening',          -- Opening balances
    'closing'           -- Closing entries
  )),

  -- Link to source document (for auto-generated entries)
  source_type TEXT, -- 'invoice', 'supplier_invoice', 'bank_transaction', etc.
  source_id UUID,   -- ID of the source document

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,

  -- Totals (denormalized for quick access, must balance)
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, entry_number)
);

-- ================================
-- JOURNAL ENTRY LINES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,

  -- Amounts (one of these should be 0)
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15,2) DEFAULT 0 CHECK (credit >= 0),

  -- Line description (optional, defaults to entry description)
  description TEXT,

  -- For tracking (optional)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Sort order
  line_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one of debit or credit is non-zero
  CONSTRAINT debit_or_credit_required CHECK (debit > 0 OR credit > 0),
  -- Ensure not both debit and credit are non-zero
  CONSTRAINT debit_xor_credit CHECK (NOT (debit > 0 AND credit > 0))
);

-- ================================
-- INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

-- ================================
-- UPDATED_AT TRIGGER
-- ================================
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================
-- ROW LEVEL SECURITY
-- ================================
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Journal Entries Policies
CREATE POLICY "Users can view company journal entries"
  ON journal_entries FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company journal entries"
  ON journal_entries FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company journal entries"
  ON journal_entries FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Journal Entry Lines Policies
CREATE POLICY "Users can view company journal entry lines"
  ON journal_entry_lines FOR SELECT
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert company journal entry lines"
  ON journal_entry_lines FOR INSERT
  WITH CHECK (journal_entry_id IN (
    SELECT id FROM journal_entries WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update company journal entry lines"
  ON journal_entry_lines FOR UPDATE
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (journal_entry_id IN (
    SELECT id FROM journal_entries WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete company journal entry lines"
  ON journal_entry_lines FOR DELETE
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

-- ================================
-- HELPER FUNCTION: Generate Entry Number
-- ================================
CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM journal_entries
  WHERE company_id = p_company_id
    AND entry_number LIKE 'JE-' || v_year || '-%';

  RETURN 'JE-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ================================
-- HELPER FUNCTION: Validate Journal Entry Balance
-- ================================
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit DECIMAL(15,2);
  v_total_credit DECIMAL(15,2);
BEGIN
  -- Only validate when posting
  IF NEW.status = 'posted' AND (OLD IS NULL OR OLD.status != 'posted') THEN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_entry_lines
    WHERE journal_entry_id = NEW.id;

    IF v_total_debit != v_total_credit THEN
      RAISE EXCEPTION 'Journal entry must balance. Debits: %, Credits: %', v_total_debit, v_total_credit;
    END IF;

    IF v_total_debit = 0 THEN
      RAISE EXCEPTION 'Journal entry must have at least one line item';
    END IF;

    -- Update totals and posted timestamp
    NEW.total_debit := v_total_debit;
    NEW.total_credit := v_total_credit;
    NEW.posted_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_journal_entry_before_post
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

-- ================================
-- FUNCTION: Update Entry Totals
-- ================================
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Get the entry ID based on operation
  IF TG_OP = 'DELETE' THEN
    v_entry_id := OLD.journal_entry_id;
  ELSE
    v_entry_id := NEW.journal_entry_id;
  END IF;

  -- Update the totals on the parent entry
  UPDATE journal_entries
  SET
    total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_entry_lines WHERE journal_entry_id = v_entry_id),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_entry_lines WHERE journal_entry_id = v_entry_id)
  WHERE id = v_entry_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entry_totals_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION update_journal_entry_totals();

-- SimpliBooks Migration: Quotations & Onboarding
-- Adds quotation tables (fixing missing tables bug) and onboarding tracking

-- ================================
-- ADD ONBOARDING TO PROFILES
-- ================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ================================
-- QUOTATIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  reference TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE NOT NULL, -- Quote expiry date
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, quotation_number)
);

-- ================================
-- QUOTATION ITEMS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- ================================
-- UPDATED_AT TRIGGER
-- ================================
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================
-- ROW LEVEL SECURITY
-- ================================
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Quotations Policies
CREATE POLICY "Users can view company quotations"
  ON quotations FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company quotations"
  ON quotations FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company quotations"
  ON quotations FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company quotations"
  ON quotations FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Quotation Items Policies
CREATE POLICY "Users can view company quotation items"
  ON quotation_items FOR SELECT
  USING (quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert company quotation items"
  ON quotation_items FOR INSERT
  WITH CHECK (quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update company quotation items"
  ON quotation_items FOR UPDATE
  USING (quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete company quotation items"
  ON quotation_items FOR DELETE
  USING (quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

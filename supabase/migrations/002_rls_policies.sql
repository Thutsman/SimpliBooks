-- SimpliBooks Row Level Security Policies
-- All data access is scoped to the authenticated user's companies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- ================================
-- PROFILES POLICIES
-- ================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ================================
-- COMPANIES POLICIES
-- ================================
CREATE POLICY "Users can view own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- ================================
-- VAT RATES POLICIES
-- ================================
CREATE POLICY "Users can view company vat rates"
  ON vat_rates FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company vat rates"
  ON vat_rates FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company vat rates"
  ON vat_rates FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company vat rates"
  ON vat_rates FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- ACCOUNTS POLICIES
-- ================================
CREATE POLICY "Users can view company accounts"
  ON accounts FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company accounts"
  ON accounts FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company accounts"
  ON accounts FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company accounts"
  ON accounts FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- CLIENTS POLICIES
-- ================================
CREATE POLICY "Users can view company clients"
  ON clients FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company clients"
  ON clients FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company clients"
  ON clients FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company clients"
  ON clients FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- SUPPLIERS POLICIES
-- ================================
CREATE POLICY "Users can view company suppliers"
  ON suppliers FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company suppliers"
  ON suppliers FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company suppliers"
  ON suppliers FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- INVOICES POLICIES
-- ================================
CREATE POLICY "Users can view company invoices"
  ON invoices FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company invoices"
  ON invoices FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company invoices"
  ON invoices FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company invoices"
  ON invoices FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- INVOICE ITEMS POLICIES
-- ================================
CREATE POLICY "Users can view company invoice items"
  ON invoice_items FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert company invoice items"
  ON invoice_items FOR INSERT
  WITH CHECK (invoice_id IN (
    SELECT id FROM invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update company invoice items"
  ON invoice_items FOR UPDATE
  USING (invoice_id IN (
    SELECT id FROM invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete company invoice items"
  ON invoice_items FOR DELETE
  USING (invoice_id IN (
    SELECT id FROM invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

-- ================================
-- SUPPLIER INVOICES POLICIES
-- ================================
CREATE POLICY "Users can view company supplier invoices"
  ON supplier_invoices FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company supplier invoices"
  ON supplier_invoices FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company supplier invoices"
  ON supplier_invoices FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company supplier invoices"
  ON supplier_invoices FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- SUPPLIER INVOICE ITEMS POLICIES
-- ================================
CREATE POLICY "Users can view company supplier invoice items"
  ON supplier_invoice_items FOR SELECT
  USING (supplier_invoice_id IN (
    SELECT id FROM supplier_invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert company supplier invoice items"
  ON supplier_invoice_items FOR INSERT
  WITH CHECK (supplier_invoice_id IN (
    SELECT id FROM supplier_invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update company supplier invoice items"
  ON supplier_invoice_items FOR UPDATE
  USING (supplier_invoice_id IN (
    SELECT id FROM supplier_invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete company supplier invoice items"
  ON supplier_invoice_items FOR DELETE
  USING (supplier_invoice_id IN (
    SELECT id FROM supplier_invoices WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

-- ================================
-- BANK TRANSACTIONS POLICIES
-- ================================
CREATE POLICY "Users can view company bank transactions"
  ON bank_transactions FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company bank transactions"
  ON bank_transactions FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company bank transactions"
  ON bank_transactions FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company bank transactions"
  ON bank_transactions FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

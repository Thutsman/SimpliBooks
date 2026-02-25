-- SimpliBooks Migration: Payments & Allocations (Partial Payments)
-- Adds payment + allocation tables for invoices and supplier invoices.
-- Payments post to the journal; allocations maintain document paid amounts and derived statuses.

-- ================================
-- 1) Extend status enums (via CHECK constraints)
-- ================================
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'part_paid', 'paid', 'overdue', 'cancelled'));

ALTER TABLE supplier_invoices DROP CONSTRAINT IF EXISTS supplier_invoices_status_check;
ALTER TABLE supplier_invoices
  ADD CONSTRAINT supplier_invoices_status_check
  CHECK (status IN ('unpaid', 'part_paid', 'paid', 'overdue', 'cancelled'));

-- ================================
-- 2) Payments tables (headers)
-- ================================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency_code TEXT DEFAULT 'ZAR' REFERENCES currencies(code) ON DELETE SET NULL,
  fx_rate DECIMAL(18,6) DEFAULT 1 CHECK (fx_rate > 0),
  reference TEXT,
  bank_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_company_id ON invoice_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_client_id ON invoice_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency_code TEXT DEFAULT 'ZAR' REFERENCES currencies(code) ON DELETE SET NULL,
  fx_rate DECIMAL(18,6) DEFAULT 1 CHECK (fx_rate > 0),
  reference TEXT,
  bank_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_company_id ON supplier_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_date ON supplier_payments(payment_date);

-- ================================
-- 3) Allocation tables (many-to-many)
-- ================================
CREATE TABLE IF NOT EXISTS invoice_payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_payment_id UUID NOT NULL REFERENCES invoice_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_payment_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_company_id ON invoice_payment_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_invoice_id ON invoice_payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_allocations_payment_id ON invoice_payment_allocations(invoice_payment_id);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_payment_id, supplier_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_company_id ON supplier_payment_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_invoice_id ON supplier_payment_allocations(supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_payment_id ON supplier_payment_allocations(supplier_payment_id);

-- ================================
-- 4) RLS policies
-- ================================
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Invoice payments
CREATE POLICY "Users can view company invoice payments"
  ON invoice_payments FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert company invoice payments"
  ON invoice_payments FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update company invoice payments"
  ON invoice_payments FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete company invoice payments"
  ON invoice_payments FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Invoice allocations
CREATE POLICY "Users can view company invoice payment allocations"
  ON invoice_payment_allocations FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert company invoice payment allocations"
  ON invoice_payment_allocations FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update company invoice payment allocations"
  ON invoice_payment_allocations FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete company invoice payment allocations"
  ON invoice_payment_allocations FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Supplier payments
CREATE POLICY "Users can view company supplier payments"
  ON supplier_payments FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert company supplier payments"
  ON supplier_payments FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update company supplier payments"
  ON supplier_payments FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete company supplier payments"
  ON supplier_payments FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Supplier allocations
CREATE POLICY "Users can view company supplier payment allocations"
  ON supplier_payment_allocations FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert company supplier payment allocations"
  ON supplier_payment_allocations FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update company supplier payment allocations"
  ON supplier_payment_allocations FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete company supplier payment allocations"
  ON supplier_payment_allocations FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ================================
-- 5) Derived amounts + status helpers
-- ================================
CREATE OR REPLACE FUNCTION recompute_invoice_paid(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_paid DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM invoice_payment_allocations
  WHERE invoice_id = p_invoice_id;

  UPDATE invoices
  SET amount_paid = v_paid, updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recompute_supplier_invoice_paid(p_supplier_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_paid DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM supplier_payment_allocations
  WHERE supplier_invoice_id = p_supplier_invoice_id;

  UPDATE supplier_invoices
  SET amount_paid = v_paid, updated_at = NOW()
  WHERE id = p_supplier_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION derive_invoice_status(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_inv RECORD;
  v_outstanding DECIMAL(15,2);
  v_new_status TEXT;
BEGIN
  SELECT id, status, total, amount_paid, due_date
  INTO v_inv
  FROM invoices
  WHERE id = p_invoice_id;

  IF v_inv.id IS NULL THEN
    RETURN;
  END IF;

  IF v_inv.status IN ('draft', 'cancelled') THEN
    RETURN;
  END IF;

  v_outstanding := COALESCE(v_inv.total, 0) - COALESCE(v_inv.amount_paid, 0);

  IF v_outstanding <= 0.005 THEN
    v_new_status := 'paid';
  ELSIF v_inv.due_date IS NOT NULL AND v_inv.due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSIF COALESCE(v_inv.amount_paid, 0) > 0 THEN
    v_new_status := 'part_paid';
  ELSE
    v_new_status := 'sent';
  END IF;

  UPDATE invoices SET status = v_new_status, updated_at = NOW()
  WHERE id = p_invoice_id AND status IS DISTINCT FROM v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION derive_supplier_invoice_status(p_supplier_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_inv RECORD;
  v_outstanding DECIMAL(15,2);
  v_new_status TEXT;
BEGIN
  SELECT id, status, total, amount_paid, due_date
  INTO v_inv
  FROM supplier_invoices
  WHERE id = p_supplier_invoice_id;

  IF v_inv.id IS NULL THEN
    RETURN;
  END IF;

  IF v_inv.status = 'cancelled' THEN
    RETURN;
  END IF;

  v_outstanding := COALESCE(v_inv.total, 0) - COALESCE(v_inv.amount_paid, 0);

  IF v_outstanding <= 0.005 THEN
    v_new_status := 'paid';
  ELSIF v_inv.due_date IS NOT NULL AND v_inv.due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSIF COALESCE(v_inv.amount_paid, 0) > 0 THEN
    v_new_status := 'part_paid';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  UPDATE supplier_invoices SET status = v_new_status, updated_at = NOW()
  WHERE id = p_supplier_invoice_id AND status IS DISTINCT FROM v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- 6) Validation: allocations cannot exceed payment amount or invoice outstanding
-- ================================
CREATE OR REPLACE FUNCTION validate_invoice_allocation()
RETURNS TRIGGER AS $$
DECLARE
  v_payment RECORD;
  v_invoice RECORD;
  v_allocated DECIMAL(15,2);
  v_excluding_id UUID;
  v_outstanding DECIMAL(15,2);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_excluding_id := OLD.id;
  ELSE
    v_excluding_id := NULL;
  END IF;

  SELECT * INTO v_payment FROM invoice_payments WHERE id = NEW.invoice_payment_id;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Invoice payment not found';
  END IF;

  SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_payment.company_id <> NEW.company_id OR v_invoice.company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Company mismatch on allocation';
  END IF;

  IF v_payment.client_id IS NOT NULL AND v_invoice.client_id IS NOT NULL AND v_payment.client_id <> v_invoice.client_id THEN
    RAISE EXCEPTION 'Allocation client mismatch';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_allocated
  FROM invoice_payment_allocations
  WHERE invoice_payment_id = NEW.invoice_payment_id
    AND (v_excluding_id IS NULL OR id <> v_excluding_id);

  IF v_allocated + NEW.amount > v_payment.amount + 0.005 THEN
    RAISE EXCEPTION 'Allocation exceeds payment amount. Allocated: %, payment: %', v_allocated + NEW.amount, v_payment.amount;
  END IF;

  v_outstanding := COALESCE(v_invoice.total, 0) - COALESCE(v_invoice.amount_paid, 0);
  IF NEW.amount > v_outstanding + 0.005 THEN
    RAISE EXCEPTION 'Allocation exceeds invoice outstanding. Allocation: %, outstanding: %', NEW.amount, v_outstanding;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_invoice_allocation_trigger ON invoice_payment_allocations;
CREATE TRIGGER validate_invoice_allocation_trigger
  BEFORE INSERT OR UPDATE ON invoice_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_invoice_allocation();

CREATE OR REPLACE FUNCTION validate_supplier_allocation()
RETURNS TRIGGER AS $$
DECLARE
  v_payment RECORD;
  v_invoice RECORD;
  v_allocated DECIMAL(15,2);
  v_excluding_id UUID;
  v_outstanding DECIMAL(15,2);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_excluding_id := OLD.id;
  ELSE
    v_excluding_id := NULL;
  END IF;

  SELECT * INTO v_payment FROM supplier_payments WHERE id = NEW.supplier_payment_id;
  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Supplier payment not found';
  END IF;

  SELECT * INTO v_invoice FROM supplier_invoices WHERE id = NEW.supplier_invoice_id;
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Supplier invoice not found';
  END IF;

  IF v_payment.company_id <> NEW.company_id OR v_invoice.company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Company mismatch on allocation';
  END IF;

  IF v_payment.supplier_id IS NOT NULL AND v_invoice.supplier_id IS NOT NULL AND v_payment.supplier_id <> v_invoice.supplier_id THEN
    RAISE EXCEPTION 'Allocation supplier mismatch';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_allocated
  FROM supplier_payment_allocations
  WHERE supplier_payment_id = NEW.supplier_payment_id
    AND (v_excluding_id IS NULL OR id <> v_excluding_id);

  IF v_allocated + NEW.amount > v_payment.amount + 0.005 THEN
    RAISE EXCEPTION 'Allocation exceeds payment amount. Allocated: %, payment: %', v_allocated + NEW.amount, v_payment.amount;
  END IF;

  v_outstanding := COALESCE(v_invoice.total, 0) - COALESCE(v_invoice.amount_paid, 0);
  IF NEW.amount > v_outstanding + 0.005 THEN
    RAISE EXCEPTION 'Allocation exceeds invoice outstanding. Allocation: %, outstanding: %', NEW.amount, v_outstanding;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_supplier_allocation_trigger ON supplier_payment_allocations;
CREATE TRIGGER validate_supplier_allocation_trigger
  BEFORE INSERT OR UPDATE ON supplier_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_supplier_allocation();

-- ================================
-- 7) Allocation change triggers: recompute paid + derive status
-- ================================
CREATE OR REPLACE FUNCTION on_invoice_allocation_change()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  PERFORM recompute_invoice_paid(v_invoice_id);
  PERFORM derive_invoice_status(v_invoice_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS invoice_allocation_change_trigger ON invoice_payment_allocations;
CREATE TRIGGER invoice_allocation_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION on_invoice_allocation_change();

CREATE OR REPLACE FUNCTION on_supplier_allocation_change()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.supplier_invoice_id;
  ELSE
    v_invoice_id := NEW.supplier_invoice_id;
  END IF;

  PERFORM recompute_supplier_invoice_paid(v_invoice_id);
  PERFORM derive_supplier_invoice_status(v_invoice_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS supplier_allocation_change_trigger ON supplier_payment_allocations;
CREATE TRIGGER supplier_allocation_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON supplier_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION on_supplier_allocation_change();

-- ================================
-- 8) Payment posting: create journal entries on payment insert
-- ================================
CREATE OR REPLACE FUNCTION post_invoice_payment_to_journal()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_bank_account_id UUID;
  v_ar_account_id UUID;
BEGIN
  v_bank_account_id := get_account_id_by_code(NEW.company_id, '1000');
  v_ar_account_id := get_account_id_by_code(NEW.company_id, '1100');

  IF v_bank_account_id IS NULL OR v_ar_account_id IS NULL THEN
    RAISE EXCEPTION 'Missing system accounts for payment posting (Bank 1000 / AR 1100)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM journal_entries
    WHERE source_type = 'invoice_payment' AND source_id = NEW.id AND entry_type = 'invoice_payment'
  ) THEN
    RETURN NEW;
  END IF;

  v_entry_number := generate_journal_entry_number(NEW.company_id);
  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference,
    entry_type, source_type, source_id, status
  ) VALUES (
    NEW.company_id,
    v_entry_number,
    NEW.payment_date,
    'Customer payment received',
    NEW.reference,
    'invoice_payment',
    'invoice_payment',
    NEW.id,
    'draft'
  ) RETURNING id INTO v_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
  VALUES (v_entry_id, v_bank_account_id, NEW.amount, 0, 'Customer payment', NEW.client_id);

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
  VALUES (v_entry_id, v_ar_account_id, 0, NEW.amount, 'Customer payment', NEW.client_id);

  UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS post_invoice_payment_trigger ON invoice_payments;
CREATE TRIGGER post_invoice_payment_trigger
  AFTER INSERT ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION post_invoice_payment_to_journal();

CREATE OR REPLACE FUNCTION post_supplier_payment_to_journal()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_bank_account_id UUID;
  v_ap_account_id UUID;
BEGIN
  v_bank_account_id := get_account_id_by_code(NEW.company_id, '1000');
  v_ap_account_id := get_account_id_by_code(NEW.company_id, '2000');

  IF v_bank_account_id IS NULL OR v_ap_account_id IS NULL THEN
    RAISE EXCEPTION 'Missing system accounts for payment posting (Bank 1000 / AP 2000)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM journal_entries
    WHERE source_type = 'supplier_payment' AND source_id = NEW.id AND entry_type = 'purchase_payment'
  ) THEN
    RETURN NEW;
  END IF;

  v_entry_number := generate_journal_entry_number(NEW.company_id);
  INSERT INTO journal_entries (
    company_id, entry_number, entry_date, description, reference,
    entry_type, source_type, source_id, status
  ) VALUES (
    NEW.company_id,
    v_entry_number,
    NEW.payment_date,
    'Supplier payment made',
    NEW.reference,
    'purchase_payment',
    'supplier_payment',
    NEW.id,
    'draft'
  ) RETURNING id INTO v_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
  VALUES (v_entry_id, v_ap_account_id, NEW.amount, 0, 'Supplier payment', NEW.supplier_id);

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
  VALUES (v_entry_id, v_bank_account_id, 0, NEW.amount, 'Supplier payment', NEW.supplier_id);

  UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS post_supplier_payment_trigger ON supplier_payments;
CREATE TRIGGER post_supplier_payment_trigger
  AFTER INSERT ON supplier_payments
  FOR EACH ROW EXECUTE FUNCTION post_supplier_payment_to_journal();


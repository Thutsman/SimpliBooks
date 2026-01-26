-- SimpliBooks Migration: Auto-posting for Purchases (Supplier Invoices)
-- Automatically creates journal entries when purchase status changes

-- ================================
-- ADD VAT INPUT ACCOUNT TO DEFAULTS
-- (Run this for existing companies)
-- ================================
INSERT INTO accounts (company_id, code, name, type, sub_type, is_system, is_active)
SELECT c.id, '1150', 'VAT Input (Claimable)', 'asset', 'current_asset', true, true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a WHERE a.company_id = c.id AND a.code = '1150'
);

-- ================================
-- FUNCTION: Create Purchase Journal Entry
-- ================================
CREATE OR REPLACE FUNCTION create_purchase_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_purchases_account_id UUID;
  v_vat_input_account_id UUID;
  v_bank_account_id UUID;
BEGIN
  -- Only process when status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get standard accounts
  v_ap_account_id := get_account_id_by_code(NEW.company_id, '2000');          -- Accounts Payable
  v_purchases_account_id := get_account_id_by_code(NEW.company_id, '5100');   -- Purchases
  v_vat_input_account_id := get_account_id_by_code(NEW.company_id, '1150');   -- VAT Input
  v_bank_account_id := get_account_id_by_code(NEW.company_id, '1000');        -- Bank Account

  -- Fallback: if no VAT Input account, use VAT Payable (net VAT approach)
  IF v_vat_input_account_id IS NULL THEN
    v_vat_input_account_id := get_account_id_by_code(NEW.company_id, '2100');
  END IF;

  -- ================================================
  -- PURCHASE RECORDED (unpaid): Record expense/liability
  -- Debit Purchases + VAT Input, Credit AP
  -- ================================================
  IF NEW.status = 'unpaid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'unpaid') THEN
    -- For new inserts or status change to unpaid
    -- Check if entry already exists
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND entry_type = 'purchase') THEN
      RETURN NEW;
    END IF;

    -- Generate entry number
    v_entry_number := generate_journal_entry_number(NEW.company_id);

    -- Create journal entry header
    INSERT INTO journal_entries (
      company_id, entry_number, entry_date, description, reference,
      entry_type, source_type, source_id, status
    ) VALUES (
      NEW.company_id,
      v_entry_number,
      NEW.issue_date,
      'Purchase ' || NEW.invoice_number || ' recorded',
      NEW.invoice_number,
      'purchase',
      'supplier_invoice',
      NEW.id,
      'posted'
    ) RETURNING id INTO v_entry_id;

    -- Debit: Purchases (subtotal)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_purchases_account_id, NEW.subtotal, 0, 'Purchase - ' || NEW.invoice_number, NEW.supplier_id);

    -- Debit: VAT Input (if VAT > 0)
    IF NEW.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, NEW.vat_amount, 0, 'Input VAT - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;

    -- Credit: Accounts Payable (total)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, 0, NEW.total, 'Purchase - ' || NEW.invoice_number, NEW.supplier_id);

  -- ================================================
  -- PURCHASE PAID: Record payment made
  -- Debit AP, Credit Bank
  -- ================================================
  ELSIF NEW.status = 'paid' AND OLD.status IN ('unpaid', 'overdue') THEN
    -- Check if payment entry already exists
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND entry_type = 'purchase_payment') THEN
      RETURN NEW;
    END IF;

    -- Generate entry number
    v_entry_number := generate_journal_entry_number(NEW.company_id);

    -- Create journal entry for payment
    INSERT INTO journal_entries (
      company_id, entry_number, entry_date, description, reference,
      entry_type, source_type, source_id, status
    ) VALUES (
      NEW.company_id,
      v_entry_number,
      CURRENT_DATE,
      'Payment made for Purchase ' || NEW.invoice_number,
      NEW.invoice_number,
      'purchase_payment',
      'supplier_invoice',
      NEW.id,
      'posted'
    ) RETURNING id INTO v_entry_id;

    -- Debit: Accounts Payable
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, NEW.total, 0, 'Payment - ' || NEW.invoice_number, NEW.supplier_id);

    -- Credit: Bank Account
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_bank_account_id, 0, NEW.total, 'Payment - ' || NEW.invoice_number, NEW.supplier_id);

  -- ================================================
  -- PURCHASE CANCELLED: Reverse the original entry
  -- ================================================
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('unpaid', 'overdue') THEN
    -- Generate entry number
    v_entry_number := generate_journal_entry_number(NEW.company_id);

    -- Create reversal entry
    INSERT INTO journal_entries (
      company_id, entry_number, entry_date, description, reference,
      entry_type, source_type, source_id, status
    ) VALUES (
      NEW.company_id,
      v_entry_number,
      CURRENT_DATE,
      'Reversal - Purchase ' || NEW.invoice_number || ' cancelled',
      NEW.invoice_number,
      'adjustment',
      'supplier_invoice',
      NEW.id,
      'posted'
    ) RETURNING id INTO v_entry_id;

    -- Credit: Purchases (reverse the debit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_purchases_account_id, 0, NEW.subtotal, 'Reversal - ' || NEW.invoice_number, NEW.supplier_id);

    -- Credit: VAT Input (if VAT > 0)
    IF NEW.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, 0, NEW.vat_amount, 'Reversal Input VAT - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;

    -- Debit: Accounts Payable (reverse the credit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, NEW.total, 0, 'Reversal - ' || NEW.invoice_number, NEW.supplier_id);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- TRIGGER: Auto-post on purchase status change
-- ================================
DROP TRIGGER IF EXISTS auto_post_purchase_journal_entry ON supplier_invoices;
CREATE TRIGGER auto_post_purchase_journal_entry
  AFTER INSERT OR UPDATE OF status ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION create_purchase_journal_entry();

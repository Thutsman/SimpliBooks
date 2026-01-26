-- SimpliBooks Migration: Auto-posting for Invoices
-- Automatically creates journal entries when invoice status changes

-- ================================
-- HELPER: Get Account ID by Code
-- ================================
CREATE OR REPLACE FUNCTION get_account_id_by_code(p_company_id UUID, p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id
  FROM accounts
  WHERE company_id = p_company_id AND code = p_code AND is_active = true;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- FUNCTION: Create Invoice Journal Entry
-- ================================
CREATE OR REPLACE FUNCTION create_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ar_account_id UUID;
  v_sales_account_id UUID;
  v_vat_account_id UUID;
  v_bank_account_id UUID;
  v_item RECORD;
  v_line_total DECIMAL(15,2);
  v_line_vat DECIMAL(15,2);
BEGIN
  -- Only process when status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get standard accounts
  v_ar_account_id := get_account_id_by_code(NEW.company_id, '1100');      -- Accounts Receivable
  v_sales_account_id := get_account_id_by_code(NEW.company_id, '4000');   -- Sales Revenue
  v_vat_account_id := get_account_id_by_code(NEW.company_id, '2100');     -- VAT Payable
  v_bank_account_id := get_account_id_by_code(NEW.company_id, '1000');    -- Bank Account

  -- ================================================
  -- INVOICE SENT: Create revenue recognition entry
  -- Debit AR, Credit Sales + VAT
  -- ================================================
  IF NEW.status = 'sent' AND (OLD IS NULL OR OLD.status = 'draft') THEN
    -- Check if entry already exists for this invoice
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'invoice' AND source_id = NEW.id AND entry_type = 'invoice') THEN
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
      'Invoice ' || NEW.invoice_number || ' issued',
      NEW.invoice_number,
      'invoice',
      'invoice',
      NEW.id,
      'posted'
    ) RETURNING id INTO v_entry_id;

    -- Debit: Accounts Receivable (full amount including VAT)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_ar_account_id, NEW.total, 0, 'Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Credit: Sales Revenue (subtotal)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_sales_account_id, 0, NEW.subtotal, 'Sales - Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Credit: VAT Payable (if VAT > 0)
    IF NEW.vat_amount > 0 THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_vat_account_id, 0, NEW.vat_amount, 'Output VAT - Invoice ' || NEW.invoice_number, NEW.client_id);
    END IF;

  -- ================================================
  -- INVOICE PAID: Record payment received
  -- Debit Bank, Credit AR
  -- ================================================
  ELSIF NEW.status = 'paid' AND OLD.status IN ('sent', 'overdue') THEN
    -- Check if payment entry already exists
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'invoice' AND source_id = NEW.id AND entry_type = 'invoice_payment') THEN
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
      'Payment received for Invoice ' || NEW.invoice_number,
      NEW.invoice_number,
      'invoice_payment',
      'invoice',
      NEW.id,
      'posted'
    ) RETURNING id INTO v_entry_id;

    -- Debit: Bank Account
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_bank_account_id, NEW.total, 0, 'Payment - Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Credit: Accounts Receivable
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_ar_account_id, 0, NEW.total, 'Payment - Invoice ' || NEW.invoice_number, NEW.client_id);

  -- ================================================
  -- INVOICE CANCELLED: Reverse the original entry
  -- ================================================
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('sent', 'overdue') THEN
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
      'Reversal - Invoice ' || NEW.invoice_number || ' cancelled',
      NEW.invoice_number,
      'adjustment',
      'invoice',
      NEW.id,
      'posted'
    ) RETURNING id INTO v_entry_id;

    -- Credit: Accounts Receivable (reverse the debit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_ar_account_id, 0, NEW.total, 'Reversal - Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Debit: Sales Revenue (reverse the credit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_sales_account_id, NEW.subtotal, 0, 'Reversal - Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Debit: VAT Payable (if VAT > 0)
    IF NEW.vat_amount > 0 THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_vat_account_id, NEW.vat_amount, 0, 'Reversal Output VAT - Invoice ' || NEW.invoice_number, NEW.client_id);
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- TRIGGER: Auto-post on invoice status change
-- ================================
DROP TRIGGER IF EXISTS auto_post_invoice_journal_entry ON invoices;
CREATE TRIGGER auto_post_invoice_journal_entry
  AFTER INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_invoice_journal_entry();

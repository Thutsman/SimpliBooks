-- SimpliBooks Migration: Posting improvements
-- - Respect line-level account_id for invoices and supplier invoices
-- - Remove status-driven payment journal entries (payments now post via payment tables)
-- - Post via draft->posted update to enforce balance validation trigger

-- ================================
-- 1) Invoices: revenue posting by line account
-- ================================
CREATE OR REPLACE FUNCTION create_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ar_account_id UUID;
  v_default_sales_account_id UUID;
  v_vat_account_id UUID;
  v_line RECORD;
  v_vat_total DECIMAL(15,2) := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_ar_account_id := get_account_id_by_code(NEW.company_id, '1100');      -- Accounts Receivable
  v_default_sales_account_id := get_account_id_by_code(NEW.company_id, '4000'); -- Default Sales Revenue
  v_vat_account_id := get_account_id_by_code(NEW.company_id, '2100');     -- VAT Payable

  -- INVOICE SENT: Debit AR, Credit income (by line account) + VAT
  IF NEW.status = 'sent' AND (OLD IS NULL OR OLD.status = 'draft') THEN
    IF EXISTS (
      SELECT 1 FROM journal_entries
      WHERE source_type = 'invoice' AND source_id = NEW.id AND entry_type = 'invoice'
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(vat_amount), 0) INTO v_vat_total
    FROM invoice_items
    WHERE invoice_id = NEW.id;

    v_entry_number := generate_journal_entry_number(NEW.company_id);
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
      'draft'
    ) RETURNING id INTO v_entry_id;

    -- Debit AR: total (incl VAT)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_ar_account_id, NEW.total, 0, 'Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Credit income by selected line accounts (fallback to 4000)
    FOR v_line IN
      SELECT
        COALESCE(ii.account_id, v_default_sales_account_id) AS income_account_id,
        COALESCE(SUM(COALESCE(ii.line_total, 0) - COALESCE(ii.vat_amount, 0)), 0) AS subtotal_amount
      FROM invoice_items ii
      WHERE ii.invoice_id = NEW.id
      GROUP BY COALESCE(ii.account_id, v_default_sales_account_id)
    LOOP
      IF v_line.subtotal_amount > 0 AND v_line.income_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
        VALUES (v_entry_id, v_line.income_account_id, 0, v_line.subtotal_amount, 'Sales - Invoice ' || NEW.invoice_number, NEW.client_id);
      END IF;
    END LOOP;

    -- Credit VAT Payable
    IF v_vat_total > 0 AND v_vat_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_vat_account_id, 0, v_vat_total, 'Output VAT - Invoice ' || NEW.invoice_number, NEW.client_id);
    END IF;

    UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;

  -- INVOICE CANCELLED: reverse invoice posting (does not handle refunds)
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('sent', 'overdue', 'part_paid') THEN
    v_entry_number := generate_journal_entry_number(NEW.company_id);

    SELECT COALESCE(SUM(vat_amount), 0) INTO v_vat_total
    FROM invoice_items
    WHERE invoice_id = NEW.id;

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
      'draft'
    ) RETURNING id INTO v_entry_id;

    -- Credit AR (reverse the debit)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
    VALUES (v_entry_id, v_ar_account_id, 0, NEW.total, 'Reversal - Invoice ' || NEW.invoice_number, NEW.client_id);

    -- Debit income by line accounts (reverse credits)
    FOR v_line IN
      SELECT
        COALESCE(ii.account_id, v_default_sales_account_id) AS income_account_id,
        COALESCE(SUM(COALESCE(ii.line_total, 0) - COALESCE(ii.vat_amount, 0)), 0) AS subtotal_amount
      FROM invoice_items ii
      WHERE ii.invoice_id = NEW.id
      GROUP BY COALESCE(ii.account_id, v_default_sales_account_id)
    LOOP
      IF v_line.subtotal_amount > 0 AND v_line.income_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
        VALUES (v_entry_id, v_line.income_account_id, v_line.subtotal_amount, 0, 'Reversal Sales - Invoice ' || NEW.invoice_number, NEW.client_id);
      END IF;
    END LOOP;

    -- Debit VAT Payable
    IF v_vat_total > 0 AND v_vat_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_vat_account_id, v_vat_total, 0, 'Reversal Output VAT - Invoice ' || NEW.invoice_number, NEW.client_id);
    END IF;

    UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_post_invoice_journal_entry ON invoices;
CREATE TRIGGER auto_post_invoice_journal_entry
  AFTER INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_invoice_journal_entry();

-- ================================
-- 2) Purchases: expense posting by line account (non-inventory)
-- ================================
CREATE OR REPLACE FUNCTION create_purchase_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_default_expense_account_id UUID;
  v_inventory_account_id UUID;
  v_vat_input_account_id UUID;
  v_item RECORD;
  v_inventory_total DECIMAL(15,2) := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_ap_account_id := get_account_id_by_code(NEW.company_id, '2000');          -- Accounts Payable
  v_default_expense_account_id := get_account_id_by_code(NEW.company_id, '5100'); -- Purchases (default)
  v_inventory_account_id := get_account_id_by_code(NEW.company_id, '1200');  -- Inventory
  v_vat_input_account_id := get_account_id_by_code(NEW.company_id, '1150');  -- VAT Input
  IF v_vat_input_account_id IS NULL THEN
    v_vat_input_account_id := get_account_id_by_code(NEW.company_id, '2100');
  END IF;

  -- PURCHASE RECORDED (unpaid)
  IF NEW.status = 'unpaid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'unpaid') THEN
    IF EXISTS (
      SELECT 1 FROM journal_entries
      WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND entry_type = 'purchase'
    ) THEN
      RETURN NEW;
    END IF;
    IF (SELECT COUNT(*) FROM supplier_invoice_items WHERE supplier_invoice_id = NEW.id) = 0 THEN
      RETURN NEW;
    END IF;

    -- Inventory movements + inventory total
    FOR v_item IN
      SELECT sii.product_id, sii.quantity, sii.unit_price, p.track_inventory
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = NEW.company_id
      WHERE sii.supplier_invoice_id = NEW.id
        AND sii.product_id IS NOT NULL
        AND p.track_inventory = true
    LOOP
      INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
      VALUES (NEW.company_id, v_item.product_id, NEW.issue_date, v_item.quantity, v_item.unit_price, 'supplier_invoice', NEW.id, 'Purchase ' || NEW.invoice_number);
      v_inventory_total := v_inventory_total + (v_item.quantity * v_item.unit_price);
    END LOOP;

    v_entry_number := generate_journal_entry_number(NEW.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (NEW.company_id, v_entry_number, NEW.issue_date, 'Purchase ' || NEW.invoice_number || ' recorded', NEW.invoice_number, 'purchase', 'supplier_invoice', NEW.id, 'draft')
    RETURNING id INTO v_entry_id;

    -- Debit Inventory for tracked items
    IF v_inventory_total > 0 AND v_inventory_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_inventory_account_id, v_inventory_total, 0, 'Inventory - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;

    -- Debit expenses by selected line accounts for non-inventory lines (fallback to 5100)
    FOR v_item IN
      SELECT
        COALESCE(sii.account_id, v_default_expense_account_id) AS expense_account_id,
        COALESCE(SUM(sii.quantity * sii.unit_price), 0) AS amount
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = NEW.company_id
      WHERE sii.supplier_invoice_id = NEW.id
        AND NOT (sii.product_id IS NOT NULL AND p.track_inventory = true)
      GROUP BY COALESCE(sii.account_id, v_default_expense_account_id)
    LOOP
      IF v_item.amount > 0 AND v_item.expense_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
        VALUES (v_entry_id, v_item.expense_account_id, v_item.amount, 0, 'Expense - ' || NEW.invoice_number, NEW.supplier_id);
      END IF;
    END LOOP;

    -- Debit VAT input
    IF NEW.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, NEW.vat_amount, 0, 'Input VAT - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;

    -- Credit AP (total)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, 0, NEW.total, 'Purchase - ' || NEW.invoice_number, NEW.supplier_id);

    UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;

  -- PURCHASE CANCELLED: reverse movements + JE (does not handle refunds)
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('unpaid', 'overdue', 'part_paid') THEN
    -- Reverse inventory movements
    INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
    SELECT NEW.company_id, product_id, CURRENT_DATE, -qty_delta, unit_cost, 'supplier_invoice', NEW.id, 'Reversal - Purchase ' || NEW.invoice_number
    FROM inventory_movements
    WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND qty_delta > 0;

    -- Inventory total from items
    SELECT COALESCE(SUM(sii.quantity * sii.unit_price), 0) INTO v_inventory_total
    FROM supplier_invoice_items sii
    JOIN products p ON p.id = sii.product_id AND p.company_id = NEW.company_id
    WHERE sii.supplier_invoice_id = NEW.id AND p.track_inventory = true;

    v_entry_number := generate_journal_entry_number(NEW.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (NEW.company_id, v_entry_number, CURRENT_DATE, 'Reversal - Purchase ' || NEW.invoice_number || ' cancelled', NEW.invoice_number, 'adjustment', 'supplier_invoice', NEW.id, 'draft')
    RETURNING id INTO v_entry_id;

    -- Credit Inventory reversal
    IF v_inventory_total > 0 AND v_inventory_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_inventory_account_id, 0, v_inventory_total, 'Reversal Inventory - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;

    -- Credit expenses reversal by selected accounts (fallback to 5100)
    FOR v_item IN
      SELECT
        COALESCE(sii.account_id, v_default_expense_account_id) AS expense_account_id,
        COALESCE(SUM(sii.quantity * sii.unit_price), 0) AS amount
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = NEW.company_id
      WHERE sii.supplier_invoice_id = NEW.id
        AND NOT (sii.product_id IS NOT NULL AND p.track_inventory = true)
      GROUP BY COALESCE(sii.account_id, v_default_expense_account_id)
    LOOP
      IF v_item.amount > 0 AND v_item.expense_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
        VALUES (v_entry_id, v_item.expense_account_id, 0, v_item.amount, 'Reversal Expense - ' || NEW.invoice_number, NEW.supplier_id);
      END IF;
    END LOOP;

    -- Credit VAT input reversal
    IF NEW.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, 0, NEW.vat_amount, 'Reversal Input VAT - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;

    -- Debit AP reversal
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, NEW.total, 0, 'Reversal - ' || NEW.invoice_number, NEW.supplier_id);

    UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Statement-level trigger is defined in existing migration; keep name stable
DROP TRIGGER IF EXISTS auto_post_purchase_journal_entry ON supplier_invoices;
CREATE TRIGGER auto_post_purchase_journal_entry
  AFTER INSERT OR UPDATE OF status ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION create_purchase_journal_entry();

-- ================================
-- 3) Purchases: items-insert trigger (same line-account logic)
-- ================================
CREATE OR REPLACE FUNCTION create_purchase_journal_entry_on_items_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_default_expense_account_id UUID;
  v_inventory_account_id UUID;
  v_vat_input_account_id UUID;
  v_item RECORD;
  v_inventory_total DECIMAL(15,2);
  v_invoice_id UUID;
BEGIN
  FOR v_invoice_id IN SELECT DISTINCT supplier_invoice_id FROM new_rows
  LOOP
    SELECT si.id, si.company_id, si.status, si.issue_date, si.invoice_number, si.vat_amount, si.total, si.supplier_id
    INTO v_invoice FROM supplier_invoices si WHERE si.id = v_invoice_id;

    IF v_invoice.id IS NULL OR v_invoice.status <> 'unpaid' THEN
      CONTINUE;
    END IF;

    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'supplier_invoice' AND source_id = v_invoice_id AND entry_type = 'purchase') THEN
      CONTINUE;
    END IF;

    v_ap_account_id := get_account_id_by_code(v_invoice.company_id, '2000');
    v_default_expense_account_id := get_account_id_by_code(v_invoice.company_id, '5100');
    v_inventory_account_id := get_account_id_by_code(v_invoice.company_id, '1200');
    v_vat_input_account_id := get_account_id_by_code(v_invoice.company_id, '1150');
    IF v_vat_input_account_id IS NULL THEN
      v_vat_input_account_id := get_account_id_by_code(v_invoice.company_id, '2100');
    END IF;

    -- Create inventory movements for tracked items and sum inventory
    v_inventory_total := 0;
    FOR v_item IN
      SELECT sii.product_id, sii.quantity, sii.unit_price, p.track_inventory
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = v_invoice.company_id
      WHERE sii.supplier_invoice_id = v_invoice_id
        AND sii.product_id IS NOT NULL
        AND p.track_inventory = true
    LOOP
      INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
      VALUES (v_invoice.company_id, v_item.product_id, v_invoice.issue_date, v_item.quantity, v_item.unit_price, 'supplier_invoice', v_invoice_id, 'Purchase ' || v_invoice.invoice_number);
      v_inventory_total := v_inventory_total + (v_item.quantity * v_item.unit_price);
    END LOOP;

    v_entry_number := generate_journal_entry_number(v_invoice.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (v_invoice.company_id, v_entry_number, v_invoice.issue_date, 'Purchase ' || v_invoice.invoice_number || ' recorded', v_invoice.invoice_number, 'purchase', 'supplier_invoice', v_invoice_id, 'draft')
    RETURNING id INTO v_entry_id;

    IF v_inventory_total > 0 AND v_inventory_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_inventory_account_id, v_inventory_total, 0, 'Inventory - ' || v_invoice.invoice_number, v_invoice.supplier_id);
    END IF;

    FOR v_item IN
      SELECT
        COALESCE(sii.account_id, v_default_expense_account_id) AS expense_account_id,
        COALESCE(SUM(sii.quantity * sii.unit_price), 0) AS amount
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = v_invoice.company_id
      WHERE sii.supplier_invoice_id = v_invoice_id
        AND NOT (sii.product_id IS NOT NULL AND p.track_inventory = true)
      GROUP BY COALESCE(sii.account_id, v_default_expense_account_id)
    LOOP
      IF v_item.amount > 0 AND v_item.expense_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
        VALUES (v_entry_id, v_item.expense_account_id, v_item.amount, 0, 'Expense - ' || v_invoice.invoice_number, v_invoice.supplier_id);
      END IF;
    END LOOP;

    IF v_invoice.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, v_invoice.vat_amount, 0, 'Input VAT - ' || v_invoice.invoice_number, v_invoice.supplier_id);
    END IF;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, 0, v_invoice.total, 'Purchase - ' || v_invoice.invoice_number, v_invoice.supplier_id);

    UPDATE journal_entries SET status = 'posted' WHERE id = v_entry_id;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_purchase_je_on_items_insert ON supplier_invoice_items;
CREATE TRIGGER create_purchase_je_on_items_insert
  AFTER INSERT ON supplier_invoice_items
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION create_purchase_journal_entry_on_items_insert();


-- SimpliBooks Migration: Inventory Posting & Avg-Cost (Phase 5)
-- Avg-cost maintenance, purchase/invoice inventory posting, stock adjustment posting

-- ================================
-- ADD INVENTORY ADJUSTMENTS ACCOUNT
-- ================================
INSERT INTO accounts (company_id, code, name, type, sub_type, is_system, is_active)
SELECT c.id, '5110', 'Inventory Adjustments', 'expense', 'cost_of_sales', true, true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a WHERE a.company_id = c.id AND a.code = '5110'
);

-- ================================
-- TRIGGER: Maintain products.qty_on_hand and products.avg_cost
-- ================================
CREATE OR REPLACE FUNCTION maintain_product_stock_from_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_product RECORD;
  v_new_qty DECIMAL(15,4);
  v_new_avg DECIMAL(15,4);
BEGIN
  SELECT qty_on_hand, avg_cost INTO v_product
  FROM products WHERE id = NEW.product_id FOR UPDATE;

  v_new_qty := COALESCE(v_product.qty_on_hand, 0) + NEW.qty_delta;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product % (product_id). On hand: %, requested issue: %',
      NEW.product_id, v_product.qty_on_hand, ABS(NEW.qty_delta);
  END IF;

  IF NEW.qty_delta > 0 THEN
    -- Receipt: weighted average
    IF COALESCE(v_product.qty_on_hand, 0) <= 0 THEN
      v_new_avg := NEW.unit_cost;
    ELSE
      v_new_avg := (
        (v_product.qty_on_hand * v_product.avg_cost) + (NEW.qty_delta * NEW.unit_cost)
      ) / (v_product.qty_on_hand + NEW.qty_delta);
    END IF;
  ELSE
    -- Issue: avg unchanged
    v_new_avg := COALESCE(v_product.avg_cost, 0);
  END IF;

  UPDATE products
  SET qty_on_hand = v_new_qty, avg_cost = v_new_avg, updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS maintain_product_stock_on_movement ON inventory_movements;
CREATE TRIGGER maintain_product_stock_on_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION maintain_product_stock_from_movement();

-- ================================
-- REPLACE: Create Purchase Journal Entry (with inventory split)
-- ================================
CREATE OR REPLACE FUNCTION create_purchase_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_purchases_account_id UUID;
  v_inventory_account_id UUID;
  v_vat_input_account_id UUID;
  v_bank_account_id UUID;
  v_item RECORD;
  v_inventory_total DECIMAL(15,2) := 0;
  v_purchases_total DECIMAL(15,2) := 0;
  v_line_cost DECIMAL(15,2);
  v_expense_account_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_ap_account_id := get_account_id_by_code(NEW.company_id, '2000');
  v_purchases_account_id := get_account_id_by_code(NEW.company_id, '5100');
  v_inventory_account_id := get_account_id_by_code(NEW.company_id, '1200');
  v_vat_input_account_id := get_account_id_by_code(NEW.company_id, '1150');
  v_bank_account_id := get_account_id_by_code(NEW.company_id, '1000');
  IF v_vat_input_account_id IS NULL THEN
    v_vat_input_account_id := get_account_id_by_code(NEW.company_id, '2100');
  END IF;

  -- ================================================
  -- PURCHASE RECORDED (unpaid) - only when invoice already has items (e.g. on UPDATE)
  -- For INSERT of invoice with items, see trigger on supplier_invoice_items
  -- ================================================
  IF NEW.status = 'unpaid' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'unpaid') THEN
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND entry_type = 'purchase') THEN
      RETURN NEW;
    END IF;
    IF (SELECT COUNT(*) FROM supplier_invoice_items WHERE supplier_invoice_id = NEW.id) = 0 THEN
      RETURN NEW;
    END IF;

    -- Create inventory movements for tracked items and sum inventory vs purchases
    FOR v_item IN
      SELECT sii.id, sii.product_id, sii.quantity, sii.unit_price, sii.line_total, sii.account_id,
             p.track_inventory
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = NEW.company_id
      WHERE sii.supplier_invoice_id = NEW.id
    LOOP
      v_line_cost := (v_item.quantity * v_item.unit_price);
      IF v_item.product_id IS NOT NULL AND v_item.track_inventory = true THEN
        INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
        VALUES (NEW.company_id, v_item.product_id, NEW.issue_date, v_item.quantity, v_item.unit_price, 'supplier_invoice', NEW.id, 'Purchase ' || NEW.invoice_number);
        v_inventory_total := v_inventory_total + (v_item.quantity * v_item.unit_price);
      ELSE
        v_purchases_total := v_purchases_total + (v_item.quantity * v_item.unit_price);
      END IF;
    END LOOP;

    v_entry_number := generate_journal_entry_number(NEW.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (NEW.company_id, v_entry_number, NEW.issue_date, 'Purchase ' || NEW.invoice_number || ' recorded', NEW.invoice_number, 'purchase', 'supplier_invoice', NEW.id, 'posted')
    RETURNING id INTO v_entry_id;

    IF v_inventory_total > 0 AND v_inventory_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_inventory_account_id, v_inventory_total, 0, 'Inventory - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;
    IF v_purchases_total > 0 THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_purchases_account_id, v_purchases_total, 0, 'Purchases - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;
    IF NEW.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, NEW.vat_amount, 0, 'Input VAT - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, 0, NEW.total, 'Purchase - ' || NEW.invoice_number, NEW.supplier_id);

  -- ================================================
  -- PURCHASE PAID
  -- ================================================
  ELSIF NEW.status = 'paid' AND OLD.status IN ('unpaid', 'overdue') THEN
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND entry_type = 'purchase_payment') THEN
      RETURN NEW;
    END IF;
    v_entry_number := generate_journal_entry_number(NEW.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (NEW.company_id, v_entry_number, CURRENT_DATE, 'Payment made for Purchase ' || NEW.invoice_number, NEW.invoice_number, 'purchase_payment', 'supplier_invoice', NEW.id, 'posted')
    RETURNING id INTO v_entry_id;
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, NEW.total, 0, 'Payment - ' || NEW.invoice_number, NEW.supplier_id);
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_bank_account_id, 0, NEW.total, 'Payment - ' || NEW.invoice_number, NEW.supplier_id);

  -- ================================================
  -- PURCHASE CANCELLED: Reverse movements + JE
  -- ================================================
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('unpaid', 'overdue') THEN
    -- Reverse inventory movements (insert negative of original)
    INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
    SELECT NEW.company_id, product_id, CURRENT_DATE, -qty_delta, unit_cost, 'supplier_invoice', NEW.id, 'Reversal - Purchase ' || NEW.invoice_number
    FROM inventory_movements
    WHERE source_type = 'supplier_invoice' AND source_id = NEW.id AND qty_delta > 0;

    v_inventory_total := 0;
    v_purchases_total := 0;
    FOR v_item IN
      SELECT sii.product_id, sii.quantity, sii.unit_price, p.track_inventory
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = NEW.company_id
      WHERE sii.supplier_invoice_id = NEW.id
    LOOP
      IF v_item.product_id IS NOT NULL AND v_item.track_inventory = true THEN
        v_inventory_total := v_inventory_total + (v_item.quantity * v_item.unit_price);
      ELSE
        v_purchases_total := v_purchases_total + (v_item.quantity * v_item.unit_price);
      END IF;
    END LOOP;

    v_entry_number := generate_journal_entry_number(NEW.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (NEW.company_id, v_entry_number, CURRENT_DATE, 'Reversal - Purchase ' || NEW.invoice_number || ' cancelled', NEW.invoice_number, 'adjustment', 'supplier_invoice', NEW.id, 'posted')
    RETURNING id INTO v_entry_id;
    IF v_inventory_total > 0 AND v_inventory_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_inventory_account_id, 0, v_inventory_total, 'Reversal Inventory - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;
    IF v_purchases_total > 0 THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_purchases_account_id, 0, v_purchases_total, 'Reversal - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;
    IF NEW.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, 0, NEW.vat_amount, 'Reversal Input VAT - ' || NEW.invoice_number, NEW.supplier_id);
    END IF;
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, NEW.total, 0, 'Reversal - ' || NEW.invoice_number, NEW.supplier_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- FUNCTION: Create Invoice COGS Entry + Inventory Movements
-- ================================
CREATE OR REPLACE FUNCTION create_invoice_cogs_and_movements()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_inventory_account_id UUID;
  v_cogs_account_id UUID;
  v_item RECORD;
  v_total_cogs DECIMAL(15,2) := 0;
  v_line_cogs DECIMAL(15,2);
  v_avg_cost DECIMAL(15,4);
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_inventory_account_id := get_account_id_by_code(NEW.company_id, '1200');
  v_cogs_account_id := get_account_id_by_code(NEW.company_id, '5000');

  -- INVOICE SENT: Create inventory movements (-qty) and COGS JE
  IF NEW.status = 'sent' AND (OLD IS NULL OR OLD.status = 'draft') THEN
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'invoice' AND source_id = NEW.id AND entry_type = 'adjustment' AND description LIKE 'COGS - Invoice %') THEN
      RETURN NEW;
    END IF;

    FOR v_item IN
      SELECT ii.id, ii.product_id, ii.quantity, p.track_inventory, p.avg_cost, p.qty_on_hand
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id AND p.company_id = NEW.company_id
      WHERE ii.invoice_id = NEW.id AND p.track_inventory = true
    LOOP
      IF v_item.qty_on_hand < v_item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product (id %). On hand: %, requested: %', v_item.product_id, v_item.qty_on_hand, v_item.quantity;
      END IF;
      v_avg_cost := COALESCE(v_item.avg_cost, 0);
      INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
      VALUES (NEW.company_id, v_item.product_id, NEW.issue_date, -v_item.quantity, v_avg_cost, 'invoice', NEW.id, 'Invoice ' || NEW.invoice_number);
      v_line_cogs := v_item.quantity * v_avg_cost;
      v_total_cogs := v_total_cogs + v_line_cogs;
    END LOOP;

    IF v_total_cogs > 0 AND v_cogs_account_id IS NOT NULL AND v_inventory_account_id IS NOT NULL THEN
      v_entry_number := generate_journal_entry_number(NEW.company_id);
      INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
      VALUES (NEW.company_id, v_entry_number, NEW.issue_date, 'COGS - Invoice ' || NEW.invoice_number, NEW.invoice_number, 'adjustment', 'invoice', NEW.id, 'posted')
      RETURNING id INTO v_entry_id;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_cogs_account_id, v_total_cogs, 0, 'COGS - Invoice ' || NEW.invoice_number, NEW.client_id);
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_inventory_account_id, 0, v_total_cogs, 'Inventory - Invoice ' || NEW.invoice_number, NEW.client_id);
    END IF;

  -- INVOICE CANCELLED: Reverse COGS movements + reversal JE
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('sent', 'overdue') THEN
    FOR v_item IN
      SELECT im.product_id, im.qty_delta, im.unit_cost
      FROM inventory_movements im
      WHERE im.source_type = 'invoice' AND im.source_id = NEW.id AND im.qty_delta < 0
    LOOP
      INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
      VALUES (NEW.company_id, v_item.product_id, CURRENT_DATE, -v_item.qty_delta, v_item.unit_cost, 'invoice', NEW.id, 'Reversal - Invoice ' || NEW.invoice_number);
      v_total_cogs := v_total_cogs + (ABS(v_item.qty_delta) * v_item.unit_cost);
    END LOOP;

    IF v_total_cogs > 0 AND v_cogs_account_id IS NOT NULL AND v_inventory_account_id IS NOT NULL THEN
      v_entry_number := generate_journal_entry_number(NEW.company_id);
      INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
      VALUES (NEW.company_id, v_entry_number, CURRENT_DATE, 'Reversal COGS - Invoice ' || NEW.invoice_number || ' cancelled', NEW.invoice_number, 'adjustment', 'invoice', NEW.id, 'posted')
      RETURNING id INTO v_entry_id;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_inventory_account_id, v_total_cogs, 0, 'Reversal Inventory - Invoice ' || NEW.invoice_number, NEW.client_id);
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, client_id)
      VALUES (v_entry_id, v_cogs_account_id, 0, v_total_cogs, 'Reversal COGS - Invoice ' || NEW.invoice_number, NEW.client_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_post_invoice_cogs ON invoices;
CREATE TRIGGER auto_post_invoice_cogs
  AFTER INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_invoice_cogs_and_movements();

-- ================================
-- STOCK ADJUSTMENT: Post (create movements + JE)
-- ================================
CREATE OR REPLACE FUNCTION post_stock_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_inventory_account_id UUID;
  v_adjustment_account_id UUID;
  v_line RECORD;
  v_net_value DECIMAL(15,2) := 0;
  v_value_delta DECIMAL(15,2);
BEGIN
  IF NEW.status <> 'posted' OR (OLD.status = 'posted') THEN
    RETURN NEW;
  END IF;

  v_inventory_account_id := get_account_id_by_code(NEW.company_id, '1200');
  v_adjustment_account_id := get_account_id_by_code(NEW.company_id, '5110');
  IF v_adjustment_account_id IS NULL THEN
    v_adjustment_account_id := get_account_id_by_code(NEW.company_id, '5100');
  END IF;

  FOR v_line IN
    SELECT sal.product_id, sal.qty_before, sal.qty_after, sal.qty_delta, sal.unit_cost
    FROM stock_adjustment_lines sal
    WHERE sal.stock_adjustment_id = NEW.id
  LOOP
    INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
    VALUES (NEW.company_id, v_line.product_id, NEW.adjustment_date, v_line.qty_delta, v_line.unit_cost, 'stock_adjustment', NEW.id, 'Stock adjustment ' || NEW.adjustment_number);
    v_value_delta := v_line.qty_delta * v_line.unit_cost;
    v_net_value := v_net_value + v_value_delta;
  END LOOP;

  IF v_net_value <> 0 AND v_inventory_account_id IS NOT NULL AND v_adjustment_account_id IS NOT NULL THEN
    v_entry_number := generate_journal_entry_number(NEW.company_id);
    IF v_net_value > 0 THEN
      INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
      VALUES (NEW.company_id, v_entry_number, NEW.adjustment_date, 'Stock adjustment ' || NEW.adjustment_number, NEW.adjustment_number, 'adjustment', 'stock_adjustment', NEW.id, 'posted')
      RETURNING id INTO v_entry_id;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (v_entry_id, v_inventory_account_id, v_net_value, 0, 'Stock adjustment ' || NEW.adjustment_number);
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (v_entry_id, v_adjustment_account_id, 0, v_net_value, 'Stock adjustment ' || NEW.adjustment_number);
    ELSE
      INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
      VALUES (NEW.company_id, v_entry_number, NEW.adjustment_date, 'Stock adjustment ' || NEW.adjustment_number, NEW.adjustment_number, 'adjustment', 'stock_adjustment', NEW.id, 'posted')
      RETURNING id INTO v_entry_id;
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (v_entry_id, v_adjustment_account_id, ABS(v_net_value), 0, 'Stock adjustment ' || NEW.adjustment_number);
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (v_entry_id, v_inventory_account_id, 0, ABS(v_net_value), 'Stock adjustment ' || NEW.adjustment_number);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_post_stock_adjustment ON stock_adjustments;
CREATE TRIGGER auto_post_stock_adjustment
  AFTER INSERT OR UPDATE OF status ON stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION post_stock_adjustment();

-- ================================
-- TRIGGER: Create purchase JE when items are inserted (app inserts invoice then items)
-- ================================
CREATE OR REPLACE FUNCTION create_purchase_journal_entry_on_items_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_ap_account_id UUID;
  v_purchases_account_id UUID;
  v_inventory_account_id UUID;
  v_vat_input_account_id UUID;
  v_item RECORD;
  v_inventory_total DECIMAL(15,2);
  v_purchases_total DECIMAL(15,2);
  v_invoice_id UUID;
BEGIN
  FOR v_invoice_id IN SELECT DISTINCT supplier_invoice_id FROM new_rows
  LOOP
    SELECT si.id, si.company_id, si.status, si.issue_date, si.invoice_number, si.subtotal, si.vat_amount, si.total, si.supplier_id
    INTO v_invoice FROM supplier_invoices si WHERE si.id = v_invoice_id;
    IF v_invoice.id IS NULL OR v_invoice.status <> 'unpaid' THEN
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM journal_entries WHERE source_type = 'supplier_invoice' AND source_id = v_invoice_id AND entry_type = 'purchase') THEN
      CONTINUE;
    END IF;

    v_ap_account_id := get_account_id_by_code(v_invoice.company_id, '2000');
    v_purchases_account_id := get_account_id_by_code(v_invoice.company_id, '5100');
    v_inventory_account_id := get_account_id_by_code(v_invoice.company_id, '1200');
    v_vat_input_account_id := get_account_id_by_code(v_invoice.company_id, '1150');
    IF v_vat_input_account_id IS NULL THEN
      v_vat_input_account_id := get_account_id_by_code(v_invoice.company_id, '2100');
    END IF;
    v_inventory_total := 0;
    v_purchases_total := 0;

    FOR v_item IN
      SELECT sii.product_id, sii.quantity, sii.unit_price, p.track_inventory
      FROM supplier_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id AND p.company_id = v_invoice.company_id
      WHERE sii.supplier_invoice_id = v_invoice_id
    LOOP
      IF v_item.product_id IS NOT NULL AND v_item.track_inventory = true THEN
        INSERT INTO inventory_movements (company_id, product_id, movement_date, qty_delta, unit_cost, source_type, source_id, notes)
        VALUES (v_invoice.company_id, v_item.product_id, v_invoice.issue_date, v_item.quantity, v_item.unit_price, 'supplier_invoice', v_invoice_id, 'Purchase ' || v_invoice.invoice_number);
        v_inventory_total := v_inventory_total + (v_item.quantity * v_item.unit_price);
      ELSE
        v_purchases_total := v_purchases_total + (v_item.quantity * v_item.unit_price);
      END IF;
    END LOOP;

    v_entry_number := generate_journal_entry_number(v_invoice.company_id);
    INSERT INTO journal_entries (company_id, entry_number, entry_date, description, reference, entry_type, source_type, source_id, status)
    VALUES (v_invoice.company_id, v_entry_number, v_invoice.issue_date, 'Purchase ' || v_invoice.invoice_number || ' recorded', v_invoice.invoice_number, 'purchase', 'supplier_invoice', v_invoice_id, 'posted')
    RETURNING id INTO v_entry_id;

    IF v_inventory_total > 0 AND v_inventory_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_inventory_account_id, v_inventory_total, 0, 'Inventory - ' || v_invoice.invoice_number, v_invoice.supplier_id);
    END IF;
    IF v_purchases_total > 0 THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_purchases_account_id, v_purchases_total, 0, 'Purchases - ' || v_invoice.invoice_number, v_invoice.supplier_id);
    END IF;
    IF v_invoice.vat_amount > 0 AND v_vat_input_account_id IS NOT NULL THEN
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
      VALUES (v_entry_id, v_vat_input_account_id, v_invoice.vat_amount, 0, 'Input VAT - ' || v_invoice.invoice_number, v_invoice.supplier_id);
    END IF;
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, supplier_id)
    VALUES (v_entry_id, v_ap_account_id, 0, v_invoice.total, 'Purchase - ' || v_invoice.invoice_number, v_invoice.supplier_id);
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

-- SimpliBooks Migration: Invoice COGS on Sent or Paid
-- Deduct inventory when invoice is marked Sent OR Paid (whichever happens first),
-- so users who mark as Paid without clicking Sent still get stock updated.

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

  -- POST COGS: when invoice is marked SENT or PAID (whichever first), if not already posted
  IF NEW.status IN ('sent', 'paid') THEN
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

  -- INVOICE CANCELLED: Reverse COGS movements + reversal JE (from sent, overdue, or paid)
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('sent', 'overdue', 'paid') THEN
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

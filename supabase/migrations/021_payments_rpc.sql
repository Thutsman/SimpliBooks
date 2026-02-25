-- SimpliBooks Migration: Payment creation RPCs (atomic)
-- Create payments and allocations in one transaction to avoid orphaned journal entries.

CREATE OR REPLACE FUNCTION create_invoice_payment_with_allocations(
  p_company_id UUID,
  p_client_id UUID,
  p_payment_date DATE,
  p_amount DECIMAL(15,2),
  p_reference TEXT,
  p_currency_code TEXT DEFAULT 'ZAR',
  p_fx_rate DECIMAL(18,6) DEFAULT 1,
  p_allocations JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_alloc JSONB;
  v_total_alloc DECIMAL(15,2) := 0;
  v_invoice_id UUID;
  v_amount DECIMAL(15,2);
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payment amount must be > 0';
  END IF;

  INSERT INTO invoice_payments (company_id, client_id, payment_date, amount, currency_code, fx_rate, reference, created_by)
  VALUES (p_company_id, p_client_id, COALESCE(p_payment_date, CURRENT_DATE), p_amount, COALESCE(p_currency_code, 'ZAR'), COALESCE(p_fx_rate, 1), p_reference, auth.uid())
  RETURNING id INTO v_payment_id;

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::jsonb))
  LOOP
    v_invoice_id := (v_alloc->>'invoice_id')::uuid;
    v_amount := COALESCE((v_alloc->>'amount')::numeric, 0);
    IF v_invoice_id IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Invalid allocation payload';
    END IF;
    v_total_alloc := v_total_alloc + v_amount;
    INSERT INTO invoice_payment_allocations (company_id, invoice_payment_id, invoice_id, amount)
    VALUES (p_company_id, v_payment_id, v_invoice_id, v_amount);
  END LOOP;

  IF ABS(v_total_alloc - p_amount) > 0.005 THEN
    RAISE EXCEPTION 'Allocations must equal payment amount. Allocations: %, payment: %', v_total_alloc, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_supplier_payment_with_allocations(
  p_company_id UUID,
  p_supplier_id UUID,
  p_payment_date DATE,
  p_amount DECIMAL(15,2),
  p_reference TEXT,
  p_currency_code TEXT DEFAULT 'ZAR',
  p_fx_rate DECIMAL(18,6) DEFAULT 1,
  p_allocations JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_alloc JSONB;
  v_total_alloc DECIMAL(15,2) := 0;
  v_invoice_id UUID;
  v_amount DECIMAL(15,2);
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payment amount must be > 0';
  END IF;

  INSERT INTO supplier_payments (company_id, supplier_id, payment_date, amount, currency_code, fx_rate, reference, created_by)
  VALUES (p_company_id, p_supplier_id, COALESCE(p_payment_date, CURRENT_DATE), p_amount, COALESCE(p_currency_code, 'ZAR'), COALESCE(p_fx_rate, 1), p_reference, auth.uid())
  RETURNING id INTO v_payment_id;

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(COALESCE(p_allocations, '[]'::jsonb))
  LOOP
    v_invoice_id := (v_alloc->>'supplier_invoice_id')::uuid;
    v_amount := COALESCE((v_alloc->>'amount')::numeric, 0);
    IF v_invoice_id IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Invalid allocation payload';
    END IF;
    v_total_alloc := v_total_alloc + v_amount;
    INSERT INTO supplier_payment_allocations (company_id, supplier_payment_id, supplier_invoice_id, amount)
    VALUES (p_company_id, v_payment_id, v_invoice_id, v_amount);
  END LOOP;

  IF ABS(v_total_alloc - p_amount) > 0.005 THEN
    RAISE EXCEPTION 'Allocations must equal payment amount. Allocations: %, payment: %', v_total_alloc, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


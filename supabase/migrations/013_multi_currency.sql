-- SimpliBooks Migration: Phase 6 Multi-Currency Support
-- Currencies reference, company-enabled currencies, exchange rates, and FX columns on documents

-- ================================
-- 1) CURRENCIES REFERENCE TABLE (global/static)
-- ================================
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT,
  default_locale TEXT
);

-- Seed common currencies (Southern Africa + common trade)
INSERT INTO currencies (code, name, symbol, default_locale) VALUES
  ('ZAR', 'South African Rand', 'R', 'en-ZA'),
  ('USD', 'US Dollar', '$', 'en-US'),
  ('BWP', 'Botswana Pula', 'P', 'en-BW'),
  ('EUR', 'Euro', '€', 'en-GB'),
  ('GBP', 'British Pound', '£', 'en-GB'),
  ('ZWL', 'Zimbabwe Dollar', 'Z$', 'en-ZW'),
  ('NAD', 'Namibian Dollar', 'N$', 'en-NA'),
  ('SZL', 'Swazi Lilangeni', 'L', 'en-SZ'),
  ('LSL', 'Lesotho Loti', 'L', 'en-LS'),
  ('MZN', 'Mozambican Metical', 'MT', 'en-MZ'),
  ('AUD', 'Australian Dollar', 'A$', 'en-AU'),
  ('CHF', 'Swiss Franc', 'CHF', 'de-CH')
ON CONFLICT (code) DO NOTHING;

-- ================================
-- 2) COMPANY-ENABLED CURRENCIES
-- ================================
CREATE TABLE IF NOT EXISTS company_currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_company_currencies_company_id ON company_currencies(company_id);

-- ================================
-- 3) EXCHANGE RATES
-- ================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  base_currency_code TEXT NOT NULL REFERENCES currencies(code) ON DELETE CASCADE,
  quote_currency_code TEXT NOT NULL REFERENCES currencies(code) ON DELETE CASCADE,
  rate DECIMAL(18,6) NOT NULL CHECK (rate > 0),
  effective_date DATE NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, base_currency_code, quote_currency_code, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_company_date ON exchange_rates(company_id, effective_date);

-- ================================
-- 4) INVOICES - FX columns
-- ================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'ZAR' REFERENCES currencies(code) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fx_rate DECIMAL(18,6) DEFAULT 1 CHECK (fx_rate > 0);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal_fx DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount_fx DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_fx DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fx_rate_date DATE;

-- ================================
-- 5) INVOICE_ITEMS - FX columns
-- ================================
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_price_fx DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS vat_amount_fx DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS line_total_fx DECIMAL(15,2);

-- ================================
-- 6) SUPPLIER_INVOICES - FX columns
-- ================================
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'ZAR' REFERENCES currencies(code) ON DELETE SET NULL;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS fx_rate DECIMAL(18,6) DEFAULT 1 CHECK (fx_rate > 0);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS subtotal_fx DECIMAL(15,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS vat_amount_fx DECIMAL(15,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS total_fx DECIMAL(15,2);
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS fx_rate_date DATE;

-- ================================
-- 7) SUPPLIER_INVOICE_ITEMS - FX columns
-- ================================
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS unit_price_fx DECIMAL(15,2);
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS vat_amount_fx DECIMAL(15,2);
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS line_total_fx DECIMAL(15,2);

-- ================================
-- 8) QUOTATIONS - FX columns
-- ================================
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'ZAR' REFERENCES currencies(code) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS fx_rate DECIMAL(18,6) DEFAULT 1 CHECK (fx_rate > 0);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal_fx DECIMAL(15,2);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_amount_fx DECIMAL(15,2);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_fx DECIMAL(15,2);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS fx_rate_date DATE;

-- ================================
-- 9) QUOTATION_ITEMS - FX columns
-- ================================
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit_price_fx DECIMAL(15,2);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS vat_amount_fx DECIMAL(15,2);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS line_total_fx DECIMAL(15,2);

-- ================================
-- 10) BACKFILL: existing rows
-- ================================
-- Invoices: set currency_code from company, fx_rate=1, *_fx = base amounts
UPDATE invoices i
SET
  currency_code = COALESCE(c.currency, 'ZAR'),
  fx_rate = 1,
  fx_rate_date = i.issue_date,
  subtotal_fx = i.subtotal,
  vat_amount_fx = i.vat_amount,
  total_fx = i.total
FROM companies c
WHERE i.company_id = c.id
  AND (i.currency_code IS NULL OR i.fx_rate IS NULL OR i.subtotal_fx IS NULL);

-- Invoice items
UPDATE invoice_items ii
SET
  unit_price_fx = ii.unit_price,
  vat_amount_fx = ii.vat_amount,
  line_total_fx = ii.line_total
FROM invoices i
WHERE ii.invoice_id = i.id
  AND ii.unit_price_fx IS NULL;

-- Supplier invoices
UPDATE supplier_invoices si
SET
  currency_code = COALESCE(c.currency, 'ZAR'),
  fx_rate = 1,
  fx_rate_date = si.issue_date,
  subtotal_fx = si.subtotal,
  vat_amount_fx = si.vat_amount,
  total_fx = si.total
FROM companies c
WHERE si.company_id = c.id
  AND (si.currency_code IS NULL OR si.fx_rate IS NULL OR si.subtotal_fx IS NULL);

-- Supplier invoice items
UPDATE supplier_invoice_items sii
SET
  unit_price_fx = sii.unit_price,
  vat_amount_fx = sii.vat_amount,
  line_total_fx = sii.line_total
FROM supplier_invoices si
WHERE sii.supplier_invoice_id = si.id
  AND sii.unit_price_fx IS NULL;

-- Quotations (validity_date used as fx_rate_date for backfill)
UPDATE quotations q
SET
  currency_code = COALESCE(c.currency, 'ZAR'),
  fx_rate = 1,
  fx_rate_date = q.issue_date,
  subtotal_fx = q.subtotal,
  vat_amount_fx = q.vat_amount,
  total_fx = q.total
FROM companies c
WHERE q.company_id = c.id
  AND (q.currency_code IS NULL OR q.fx_rate IS NULL OR q.subtotal_fx IS NULL);

-- Quotation items
UPDATE quotation_items qi
SET
  unit_price_fx = qi.unit_price,
  vat_amount_fx = qi.vat_amount,
  line_total_fx = qi.line_total
FROM quotations q
WHERE qi.quotation_id = q.id
  AND qi.unit_price_fx IS NULL;

-- ================================
-- 11) SEED company_currencies from existing companies
-- ================================
INSERT INTO company_currencies (company_id, currency_code, is_enabled)
SELECT id, COALESCE(currency, 'ZAR'), true
FROM companies
ON CONFLICT (company_id, currency_code) DO NOTHING;

-- ================================
-- 12) ROW LEVEL SECURITY
-- ================================
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
-- Allow all authenticated users to read currencies (reference data)
CREATE POLICY "Anyone can read currencies"
  ON currencies FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE company_currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view company currencies"
  ON company_currencies FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert company currencies"
  ON company_currencies FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update company currencies"
  ON company_currencies FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete company currencies"
  ON company_currencies FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view company exchange rates"
  ON exchange_rates FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert company exchange rates"
  ON exchange_rates FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can update company exchange rates"
  ON exchange_rates FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete company exchange rates"
  ON exchange_rates FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- SimpliBooks Migration: Products & Inventory (Phase 5)
-- Products/Services catalog, inventory movements, stock adjustments

-- ================================
-- PRODUCTS TABLE (company-scoped)
-- ================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Core
  type TEXT NOT NULL DEFAULT 'product' CHECK (type IN ('product', 'service')),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  -- Pricing
  sales_price DECIMAL(15,2) DEFAULT 0,
  purchase_cost DECIMAL(15,2) DEFAULT 0,
  vat_rate_default DECIMAL(5,2) DEFAULT 15,

  -- Accounting (optional; fallback to company defaults)
  income_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  expense_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  inventory_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  cogs_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Inventory config
  track_inventory BOOLEAN DEFAULT FALSE,
  reorder_level DECIMAL(15,4) DEFAULT 0,
  reorder_quantity DECIMAL(15,4) DEFAULT 0,

  -- Avg-cost support (denormalized; maintained by triggers)
  avg_cost DECIMAL(15,4) DEFAULT 0,
  qty_on_hand DECIMAL(15,4) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, sku)
);

-- ================================
-- INVENTORY MOVEMENTS (immutable ledger)
-- ================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qty_delta DECIMAL(15,4) NOT NULL,  -- positive = in, negative = out
  unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0,

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('supplier_invoice', 'invoice', 'stock_adjustment')),
  source_id UUID,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- STOCK ADJUSTMENTS (header)
-- ================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  adjustment_number TEXT NOT NULL,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, adjustment_number)
);

-- ================================
-- STOCK ADJUSTMENT LINES
-- ================================
CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  qty_before DECIMAL(15,4) NOT NULL DEFAULT 0,
  qty_after DECIMAL(15,4) NOT NULL,
  qty_delta DECIMAL(15,4) NOT NULL,  -- qty_after - qty_before
  unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- EXTEND LINE ITEM TABLES
-- ================================
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE supplier_invoice_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- ================================
-- INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_track_inventory ON products(track_inventory);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_source ON inventory_movements(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_company_id ON stock_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_lines_adjustment_id ON stock_adjustment_lines(stock_adjustment_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_product_id ON supplier_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

-- ================================
-- UPDATED_AT TRIGGERS
-- ================================
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_adjustments_updated_at
  BEFORE UPDATE ON stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================
-- ROW LEVEL SECURITY
-- ================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_lines ENABLE ROW LEVEL SECURITY;

-- Products
CREATE POLICY "Users can view company products"
  ON products FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company products"
  ON products FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company products"
  ON products FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company products"
  ON products FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Inventory movements
CREATE POLICY "Users can view company inventory movements"
  ON inventory_movements FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company inventory movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- No UPDATE/DELETE on movements (immutable ledger; reversals create new rows)

-- Stock adjustments
CREATE POLICY "Users can view company stock adjustments"
  ON stock_adjustments FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert company stock adjustments"
  ON stock_adjustments FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update company stock adjustments"
  ON stock_adjustments FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete company stock adjustments"
  ON stock_adjustments FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Stock adjustment lines
CREATE POLICY "Users can view company stock adjustment lines"
  ON stock_adjustment_lines FOR SELECT
  USING (stock_adjustment_id IN (
    SELECT id FROM stock_adjustments WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert company stock adjustment lines"
  ON stock_adjustment_lines FOR INSERT
  WITH CHECK (stock_adjustment_id IN (
    SELECT id FROM stock_adjustments WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update company stock adjustment lines"
  ON stock_adjustment_lines FOR UPDATE
  USING (stock_adjustment_id IN (
    SELECT id FROM stock_adjustments WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete company stock adjustment lines"
  ON stock_adjustment_lines FOR DELETE
  USING (stock_adjustment_id IN (
    SELECT id FROM stock_adjustments WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

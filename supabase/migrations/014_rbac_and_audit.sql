-- SimpliBooks Migration: Phase 7 RBAC + Audit Trail
-- company_members, role-based RLS, activity_log table

-- ================================
-- 1) COMPANY_MEMBERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_status ON company_members(company_id, status);

-- ================================
-- 2) BACKFILL OWNER MEMBERSHIP
-- ================================
INSERT INTO company_members (company_id, user_id, role, status)
SELECT id, user_id, 'owner', 'active'
FROM companies
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ================================
-- 3) HELPER FUNCTIONS (SECURITY DEFINER for RLS use)
-- ================================

-- True if current user is active member or is company owner (companies.user_id)
CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = p_company_id AND user_id = auth.uid() AND status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND user_id = auth.uid()
  );
$$;

-- Role of current user for company (owner from companies or from company_members)
CREATE OR REPLACE FUNCTION public.company_role(p_company_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 'owner' FROM companies WHERE id = p_company_id AND user_id = auth.uid() LIMIT 1),
    (SELECT role FROM company_members
     WHERE company_id = p_company_id AND user_id = auth.uid() AND status = 'active'
     LIMIT 1),
    NULL
  );
$$;

-- True if current user has one of the allowed roles for the company
CREATE OR REPLACE FUNCTION public.has_company_role(p_company_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.company_role(p_company_id) = ANY(allowed_roles);
$$;

-- ================================
-- 4) DROP EXISTING POLICIES (company-scoped and companies)
-- ================================

-- Companies
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;

-- VAT rates
DROP POLICY IF EXISTS "Users can view company vat rates" ON vat_rates;
DROP POLICY IF EXISTS "Users can insert company vat rates" ON vat_rates;
DROP POLICY IF EXISTS "Users can update company vat rates" ON vat_rates;
DROP POLICY IF EXISTS "Users can delete company vat rates" ON vat_rates;

-- Accounts
DROP POLICY IF EXISTS "Users can view company accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert company accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update company accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete company accounts" ON accounts;

-- Clients
DROP POLICY IF EXISTS "Users can view company clients" ON clients;
DROP POLICY IF EXISTS "Users can insert company clients" ON clients;
DROP POLICY IF EXISTS "Users can update company clients" ON clients;
DROP POLICY IF EXISTS "Users can delete company clients" ON clients;

-- Suppliers
DROP POLICY IF EXISTS "Users can view company suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can insert company suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update company suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete company suppliers" ON suppliers;

-- Invoices
DROP POLICY IF EXISTS "Users can view company invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert company invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update company invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete company invoices" ON invoices;

-- Invoice items
DROP POLICY IF EXISTS "Users can view company invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert company invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update company invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete company invoice items" ON invoice_items;

-- Supplier invoices
DROP POLICY IF EXISTS "Users can view company supplier invoices" ON supplier_invoices;
DROP POLICY IF EXISTS "Users can insert company supplier invoices" ON supplier_invoices;
DROP POLICY IF EXISTS "Users can update company supplier invoices" ON supplier_invoices;
DROP POLICY IF EXISTS "Users can delete company supplier invoices" ON supplier_invoices;

-- Supplier invoice items
DROP POLICY IF EXISTS "Users can view company supplier invoice items" ON supplier_invoice_items;
DROP POLICY IF EXISTS "Users can insert company supplier invoice items" ON supplier_invoice_items;
DROP POLICY IF EXISTS "Users can update company supplier invoice items" ON supplier_invoice_items;
DROP POLICY IF EXISTS "Users can delete company supplier invoice items" ON supplier_invoice_items;

-- Bank transactions
DROP POLICY IF EXISTS "Users can view company bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can insert company bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can update company bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can delete company bank transactions" ON bank_transactions;

-- Quotations (005)
DROP POLICY IF EXISTS "Users can view company quotations" ON quotations;
DROP POLICY IF EXISTS "Users can insert company quotations" ON quotations;
DROP POLICY IF EXISTS "Users can update company quotations" ON quotations;
DROP POLICY IF EXISTS "Users can delete company quotations" ON quotations;

DROP POLICY IF EXISTS "Users can view company quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Users can insert company quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Users can update company quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Users can delete company quotation items" ON quotation_items;

-- Journal entries (006)
DROP POLICY IF EXISTS "Users can view company journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert company journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update company journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete company journal entries" ON journal_entries;

DROP POLICY IF EXISTS "Users can view company journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Users can insert company journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Users can update company journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Users can delete company journal entry lines" ON journal_entry_lines;

-- Bank matching rules (009)
DROP POLICY IF EXISTS "Users can view company matching rules" ON bank_matching_rules;
DROP POLICY IF EXISTS "Users can insert company matching rules" ON bank_matching_rules;
DROP POLICY IF EXISTS "Users can update company matching rules" ON bank_matching_rules;
DROP POLICY IF EXISTS "Users can delete company matching rules" ON bank_matching_rules;

-- Reconciliation history (010)
DROP POLICY IF EXISTS "Users can view company reconciliation history" ON reconciliation_history;
DROP POLICY IF EXISTS "Users can insert company reconciliation history" ON reconciliation_history;

-- Products, inventory, stock adjustments (011)
DROP POLICY IF EXISTS "Users can view company products" ON products;
DROP POLICY IF EXISTS "Users can insert company products" ON products;
DROP POLICY IF EXISTS "Users can update company products" ON products;
DROP POLICY IF EXISTS "Users can delete company products" ON products;

DROP POLICY IF EXISTS "Users can view company inventory movements" ON inventory_movements;
DROP POLICY IF EXISTS "Users can insert company inventory movements" ON inventory_movements;

DROP POLICY IF EXISTS "Users can view company stock adjustments" ON stock_adjustments;
DROP POLICY IF EXISTS "Users can insert company stock adjustments" ON stock_adjustments;
DROP POLICY IF EXISTS "Users can update company stock adjustments" ON stock_adjustments;
DROP POLICY IF EXISTS "Users can delete company stock adjustments" ON stock_adjustments;

DROP POLICY IF EXISTS "Users can view company stock adjustment lines" ON stock_adjustment_lines;
DROP POLICY IF EXISTS "Users can insert company stock adjustment lines" ON stock_adjustment_lines;
DROP POLICY IF EXISTS "Users can update company stock adjustment lines" ON stock_adjustment_lines;
DROP POLICY IF EXISTS "Users can delete company stock adjustment lines" ON stock_adjustment_lines;

-- Multi-currency (013)
DROP POLICY IF EXISTS "Users can view company currencies" ON company_currencies;
DROP POLICY IF EXISTS "Users can insert company currencies" ON company_currencies;
DROP POLICY IF EXISTS "Users can update company currencies" ON company_currencies;
DROP POLICY IF EXISTS "Users can delete company currencies" ON company_currencies;

DROP POLICY IF EXISTS "Users can view company exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can insert company exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can update company exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can delete company exchange rates" ON exchange_rates;

-- ================================
-- 5) COMPANY_MEMBERS RLS
-- ================================
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company members"
  ON company_members FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Owner or admin can insert company members"
  ON company_members FOR INSERT
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owner or admin can update company members"
  ON company_members FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owner or admin can delete company members"
  ON company_members FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin']));

-- ================================
-- 6) COMPANIES POLICIES (member-based; owner-only delete)
-- ================================
CREATE POLICY "Members can view companies"
  ON companies FOR SELECT
  USING (public.is_company_member(id));

CREATE POLICY "Authenticated can create company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or admin can update company"
  ON companies FOR UPDATE
  USING (public.has_company_role(id, ARRAY['owner', 'admin']));

CREATE POLICY "Owner can delete company"
  ON companies FOR DELETE
  USING (public.has_company_role(id, ARRAY['owner']));

-- ================================
-- 7) SHARED: SELECT = member; MUTATE = owner, admin, accountant
-- ================================

-- VAT rates
CREATE POLICY "Members can view vat_rates" ON vat_rates FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate vat_rates" ON vat_rates FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Accounts
CREATE POLICY "Members can view accounts" ON accounts FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate accounts" ON accounts FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Clients
CREATE POLICY "Members can view clients" ON clients FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate clients" ON clients FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Suppliers
CREATE POLICY "Members can view suppliers" ON suppliers FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate suppliers" ON suppliers FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Invoices
CREATE POLICY "Members can view invoices" ON invoices FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate invoices" ON invoices FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Invoice items (via parent company)
CREATE POLICY "Members can view invoice_items" ON invoice_items FOR SELECT
  USING (public.is_company_member((SELECT company_id FROM invoices WHERE id = invoice_id)));
CREATE POLICY "Role can mutate invoice_items" ON invoice_items FOR ALL
  USING (public.has_company_role((SELECT company_id FROM invoices WHERE id = invoice_id), ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role((SELECT company_id FROM invoices WHERE id = invoice_id), ARRAY['owner', 'admin', 'accountant']));

-- Supplier invoices
CREATE POLICY "Members can view supplier_invoices" ON supplier_invoices FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate supplier_invoices" ON supplier_invoices FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Supplier invoice items
CREATE POLICY "Members can view supplier_invoice_items" ON supplier_invoice_items FOR SELECT
  USING (public.is_company_member((SELECT company_id FROM supplier_invoices WHERE id = supplier_invoice_id)));
CREATE POLICY "Role can mutate supplier_invoice_items" ON supplier_invoice_items FOR ALL
  USING (public.has_company_role((SELECT company_id FROM supplier_invoices WHERE id = supplier_invoice_id), ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role((SELECT company_id FROM supplier_invoices WHERE id = supplier_invoice_id), ARRAY['owner', 'admin', 'accountant']));

-- Bank transactions
CREATE POLICY "Members can view bank_transactions" ON bank_transactions FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate bank_transactions" ON bank_transactions FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Quotations
CREATE POLICY "Members can view quotations" ON quotations FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate quotations" ON quotations FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Quotation items
CREATE POLICY "Members can view quotation_items" ON quotation_items FOR SELECT
  USING (public.is_company_member((SELECT company_id FROM quotations WHERE id = quotation_id)));
CREATE POLICY "Role can mutate quotation_items" ON quotation_items FOR ALL
  USING (public.has_company_role((SELECT company_id FROM quotations WHERE id = quotation_id), ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role((SELECT company_id FROM quotations WHERE id = quotation_id), ARRAY['owner', 'admin', 'accountant']));

-- Journal entries
CREATE POLICY "Members can view journal_entries" ON journal_entries FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate journal_entries" ON journal_entries FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Journal entry lines
CREATE POLICY "Members can view journal_entry_lines" ON journal_entry_lines FOR SELECT
  USING (public.is_company_member((SELECT company_id FROM journal_entries WHERE id = journal_entry_id)));
CREATE POLICY "Role can mutate journal_entry_lines" ON journal_entry_lines FOR ALL
  USING (public.has_company_role((SELECT company_id FROM journal_entries WHERE id = journal_entry_id), ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role((SELECT company_id FROM journal_entries WHERE id = journal_entry_id), ARRAY['owner', 'admin', 'accountant']));

-- Bank matching rules
CREATE POLICY "Members can view bank_matching_rules" ON bank_matching_rules FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate bank_matching_rules" ON bank_matching_rules FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Reconciliation history
CREATE POLICY "Members can view reconciliation_history" ON reconciliation_history FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can insert reconciliation_history" ON reconciliation_history FOR INSERT
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Products
CREATE POLICY "Members can view products" ON products FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate products" ON products FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Inventory movements (insert only; immutable)
CREATE POLICY "Members can view inventory_movements" ON inventory_movements FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can insert inventory_movements" ON inventory_movements FOR INSERT
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Stock adjustments
CREATE POLICY "Members can view stock_adjustments" ON stock_adjustments FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate stock_adjustments" ON stock_adjustments FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Stock adjustment lines
CREATE POLICY "Members can view stock_adjustment_lines" ON stock_adjustment_lines FOR SELECT
  USING (public.is_company_member((SELECT company_id FROM stock_adjustments WHERE id = stock_adjustment_id)));
CREATE POLICY "Role can mutate stock_adjustment_lines" ON stock_adjustment_lines FOR ALL
  USING (public.has_company_role((SELECT company_id FROM stock_adjustments WHERE id = stock_adjustment_id), ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role((SELECT company_id FROM stock_adjustments WHERE id = stock_adjustment_id), ARRAY['owner', 'admin', 'accountant']));

-- Company currencies
CREATE POLICY "Members can view company_currencies" ON company_currencies FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate company_currencies" ON company_currencies FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- Exchange rates
CREATE POLICY "Members can view exchange_rates" ON exchange_rates FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Role can mutate exchange_rates" ON exchange_rates FOR ALL USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accountant']));

-- ================================
-- 8) VIEWER: SELECT only (handled above; viewer is member so SELECT works; no separate mutate policy for viewer)
-- ================================
-- Viewer has is_company_member = true but has_company_role(..., ['owner','admin','accountant']) = false, so they get SELECT only. Good.

-- ================================
-- 9) STORAGE POLICIES (company logos: member read; owner/admin write)
-- ================================
DROP POLICY IF EXISTS "Users can upload logos to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos in their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos from their company folder" ON storage.objects;

CREATE POLICY "Members can upload company logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND public.is_company_member(((storage.foldername(name))[1])::uuid)
    AND public.has_company_role(((storage.foldername(name))[1])::uuid, ARRAY['owner', 'admin'])
  );

CREATE POLICY "Members can update company logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND public.has_company_role(((storage.foldername(name))[1])::uuid, ARRAY['owner', 'admin'])
  );

CREATE POLICY "Members can delete company logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND public.has_company_role(((storage.foldername(name))[1])::uuid, ARRAY['owner', 'admin'])
  );

-- ================================
-- 10) ACTIVITY_LOG TABLE
-- ================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_company_id ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity_log"
  ON activity_log FOR SELECT
  USING (public.is_company_member(company_id));

-- Inserts only from triggers (service/backend); no INSERT policy for anon/authenticated from app.
-- We use a SECURITY DEFINER trigger function to insert into activity_log so RLS doesn't block it.
-- So we do not create an INSERT policy for activity_log for users; the trigger runs as definer.

-- ================================
-- 11) ACTIVITY LOG TRIGGER FUNCTION
-- ================================
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_entity_id UUID;
  v_entity_type TEXT;
  v_action TEXT;
  v_metadata JSONB;
BEGIN
  v_action := LOWER(TG_OP);
  v_entity_type := TG_TABLE_NAME;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_metadata := to_jsonb(OLD);
    CASE TG_TABLE_NAME
      WHEN 'companies' THEN v_company_id := OLD.id;
      WHEN 'company_members' THEN v_company_id := OLD.company_id;
      WHEN 'clients' THEN v_company_id := OLD.company_id;
      WHEN 'suppliers' THEN v_company_id := OLD.company_id;
      WHEN 'invoices' THEN v_company_id := OLD.company_id;
      WHEN 'supplier_invoices' THEN v_company_id := OLD.company_id;
      WHEN 'quotations' THEN v_company_id := OLD.company_id;
      WHEN 'bank_transactions' THEN v_company_id := OLD.company_id;
      WHEN 'journal_entries' THEN v_company_id := OLD.company_id;
      WHEN 'products' THEN v_company_id := OLD.company_id;
      WHEN 'stock_adjustments' THEN v_company_id := OLD.company_id;
      WHEN 'exchange_rates' THEN v_company_id := OLD.company_id;
      WHEN 'company_currencies' THEN v_company_id := OLD.company_id;
      ELSE RETURN OLD;
    END CASE;
  ELSE
    v_entity_id := NEW.id;
    v_metadata := to_jsonb(NEW);
    CASE TG_TABLE_NAME
      WHEN 'companies' THEN v_company_id := NEW.id;
      WHEN 'company_members' THEN v_company_id := NEW.company_id;
      WHEN 'clients' THEN v_company_id := NEW.company_id;
      WHEN 'suppliers' THEN v_company_id := NEW.company_id;
      WHEN 'invoices' THEN v_company_id := NEW.company_id;
      WHEN 'supplier_invoices' THEN v_company_id := NEW.company_id;
      WHEN 'quotations' THEN v_company_id := NEW.company_id;
      WHEN 'bank_transactions' THEN v_company_id := NEW.company_id;
      WHEN 'journal_entries' THEN v_company_id := NEW.company_id;
      WHEN 'products' THEN v_company_id := NEW.company_id;
      WHEN 'stock_adjustments' THEN v_company_id := NEW.company_id;
      WHEN 'exchange_rates' THEN v_company_id := NEW.company_id;
      WHEN 'company_currencies' THEN v_company_id := NEW.company_id;
      ELSE RETURN NEW;
    END CASE;
  END IF;

  INSERT INTO activity_log (company_id, actor_user_id, actor_role, action, entity_type, entity_id, metadata)
  VALUES (
    v_company_id,
    auth.uid(),
    public.company_role(v_company_id),
    v_action,
    v_entity_type,
    v_entity_id,
    jsonb_build_object('op', TG_OP)
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach trigger to key tables
CREATE TRIGGER activity_log_companies AFTER INSERT OR UPDATE OR DELETE ON companies FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_company_members AFTER INSERT OR UPDATE OR DELETE ON company_members FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_clients AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_supplier_invoices AFTER INSERT OR UPDATE OR DELETE ON supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_quotations AFTER INSERT OR UPDATE OR DELETE ON quotations FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_bank_transactions AFTER INSERT OR UPDATE OR DELETE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_journal_entries AFTER INSERT OR UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_stock_adjustments AFTER INSERT OR UPDATE OR DELETE ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_exchange_rates AFTER INSERT OR UPDATE OR DELETE ON exchange_rates FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER activity_log_company_currencies AFTER INSERT OR UPDATE OR DELETE ON company_currencies FOR EACH ROW EXECUTE FUNCTION public.log_activity();

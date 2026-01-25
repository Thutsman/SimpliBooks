-- SimpliBooks Database Schema
-- Initial Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- PROFILES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- COMPANIES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  registration_number TEXT,
  vat_number TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'South Africa',
  currency TEXT DEFAULT 'ZAR',
  logo_url TEXT,
  financial_year_start INTEGER DEFAULT 3, -- March
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- VAT RATES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS vat_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- ACCOUNTS (CHART OF ACCOUNTS)
-- ================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  sub_type TEXT,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- ================================
-- CLIENTS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  vat_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- SUPPLIERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  vat_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- INVOICES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  reference TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- ================================
-- INVOICE ITEMS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- SUPPLIER INVOICES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  reference TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- SUPPLIER INVOICE ITEMS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 15,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- BANK TRANSACTIONS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  reference TEXT,
  bank_account TEXT,

  -- Categorization
  category_type TEXT CHECK (category_type IN ('client', 'supplier', 'account')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  supplier_invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL,

  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,

  import_hash TEXT, -- To prevent duplicate imports
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_company_id ON supplier_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice_id ON supplier_invoice_items(supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_id ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_import_hash ON bank_transactions(import_hash);

-- ================================
-- UPDATED_AT TRIGGER FUNCTION
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_supplier_invoices_updated_at
  BEFORE UPDATE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

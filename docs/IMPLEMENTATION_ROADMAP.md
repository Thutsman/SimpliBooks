# SimpliBooks Implementation Roadmap
## Competing with SAGE Pastel Accounting

This document tracks the implementation progress of accounting features needed for SimpliBooks to compete with SAGE Pastel and similar accounting software in the Southern African market.

---

## Phase 1: Accounting Foundation (Double-Entry Engine) ✅ COMPLETED

### Objectives
Build a proper double-entry accounting engine that automatically creates journal entries when business transactions occur.

### Implemented Features

| Feature | Status | Migration/File |
|---------|--------|----------------|
| Journal Entries Table | ✅ Done | `006_journal_entries.sql` |
| Journal Entry Lines Table | ✅ Done | `006_journal_entries.sql` |
| Auto-numbering (JE-0001) | ✅ Done | `006_journal_entries.sql` |
| Invoice Auto-Posting | ✅ Done | `007_invoice_auto_posting.sql` |
| Purchase Auto-Posting | ✅ Done | `008_purchase_auto_posting.sql` |
| VAT Input Account | ✅ Done | `008_purchase_auto_posting.sql` |
| General Ledger Report | ✅ Done | `src/hooks/useReports.js` |
| Income Statement Report | ✅ Done | `src/hooks/useReports.js` |
| Balance Sheet Report | ✅ Done | `src/hooks/useReports.js` |

### Auto-Posting Logic

**Sales Invoices:**
- `draft → sent`: Debit Accounts Receivable, Credit Sales Revenue + VAT Payable
- `sent → paid`: Debit Bank, Credit Accounts Receivable
- `sent → cancelled`: Reversal entry

**Purchase Invoices:**
- `created (unpaid)`: Debit Purchases + VAT Input, Credit Accounts Payable
- `unpaid → paid`: Debit Accounts Payable, Credit Bank
- `unpaid → cancelled`: Reversal entry

---

## Phase 2: User Experience & Onboarding ✅ COMPLETED

### Implemented Features

| Feature | Status | File |
|---------|--------|------|
| 6-Step Onboarding Wizard | ✅ Done | `src/pages/Onboarding.jsx` |
| Auto-create Default Accounts | ✅ Done | Chart of 30+ accounts |
| Country-specific VAT Rates | ✅ Done | SA (15%), BW (14%), ZW (15%) |
| Quick Add Client (from Invoice) | ✅ Done | `src/pages/InvoiceDetail.jsx` |
| Quick Add Supplier (from Purchase) | ✅ Done | `src/pages/PurchaseDetail.jsx` |
| Quotations Module | ✅ Done | `005_quotations_and_onboarding.sql` |

### Onboarding Steps
1. Welcome screen
2. Business Details (name, registration, VAT number)
3. Address Information
4. Financial Settings (financial year, currency)
5. Banking Details
6. Setup Complete

---

## Phase 3: Advanced Reporting ✅ COMPLETED

### Implemented Features

| Feature | Status | File |
|---------|--------|------|
| Trial Balance Report | ✅ Done (journal-entry based) | `src/hooks/useReports.js` |
| AR Aging Report (30/60/90 days) | ✅ Done | `src/hooks/useReports.js` |
| AP Aging Report (30/60/90 days) | ✅ Done | `src/hooks/useReports.js` |
| Cash Flow Statement | ✅ Done | `src/hooks/useReports.js` |
| VAT 201 Report (South Africa) | ✅ Done | `src/hooks/useReports.js` |
| Profit & Loss by Period | ✅ Done | `src/hooks/useReports.js` |
| Customer Statement | ✅ Done | `src/hooks/useReports.js` |
| Supplier Statement | ✅ Done | `src/hooks/useReports.js` |

---

## Phase 4: Bank Reconciliation ✅ COMPLETED

### Implemented Features

| Feature | Status | File |
|---------|--------|------|
| Import Bank Statements (CSV) | ✅ Done | `src/pages/Banking.jsx`, `src/hooks/useBanking.js` |
| Manual Transaction Matching | ✅ Done | `src/pages/Banking.jsx`, `src/hooks/useBanking.js` |
| Auto-matching Rules | ✅ Done | `src/hooks/useBanking.js`, `009_bank_matching_rules.sql` |
| Reconciliation History | ✅ Done | `src/pages/Banking.jsx`, `010_reconciliation_history.sql` |
| Unreconciled Items Report | ✅ Done | `src/hooks/useReports.js`, `src/pages/Reports.jsx` |

---

## Phase 5: Inventory Management ✅ COMPLETED

### Implemented Features

| Feature | Status | File |
|---------|--------|------|
| Products/Services Catalog | ✅ Done | `011_products_inventory.sql`, `src/pages/Products.jsx`, `src/hooks/useProducts.js` |
| Stock Levels Tracking | ✅ Done | `products.qty_on_hand`, `inventory_movements`, `012_inventory_posting.sql` |
| Cost of Goods Sold Auto-calc | ✅ Done | `012_inventory_posting.sql` (COGS on invoice sent) |
| Stock Valuation (Avg) | ✅ Done | `products.avg_cost`, weighted avg trigger on `inventory_movements` |
| Low Stock Alerts | ✅ Done | `src/hooks/useProducts.js` (lowStockProducts), Products & Inventory pages |
| Stock Take/Adjustment | ✅ Done | `stock_adjustments`, `stock_adjustment_lines`, `src/pages/Inventory.jsx`, `src/hooks/useInventory.js` |

---

## Phase 6: Multi-Currency Support ✅ COMPLETED

### Implemented Features

| Feature | Status | File / Migration |
|---------|--------|------------------|
| Multiple Currency Setup | ✅ Done | `013_multi_currency.sql` (currencies, company_currencies), Settings > Currencies |
| Exchange Rate Management | ✅ Done | `013_multi_currency.sql` (exchange_rates), `useExchangeRates.js`, Settings > Exchange Rates |
| Foreign Currency Invoices | ✅ Done | InvoiceDetail, PurchaseDetail, QuotationDetail + hooks; base ledger, FX columns on documents |
| Forex Gain/Loss Calculation | 🔲 Not Started | Low |
| Currency Revaluation | 🔲 Not Started | Low |

### Manual test checklist (Phase 6)

1. **Settings > Currencies**: Enable an extra currency (e.g. USD); remove it; confirm base currency cannot be removed.
2. **Settings > Exchange Rates**: Add a rate (e.g. 1 USD = 0.055 ZAR), effective date; delete a rate.
3. **Settings > Financial**: With no invoices/purchases/quotations, change base currency; after creating one document, confirm base currency is locked.
4. **Invoice (base currency)**: Create invoice in base currency; confirm totals and line totals display and save; confirm journal/reports use base amounts.
5. **Invoice (foreign currency)**: Select USD, enter FX rate; add line items in USD; save; confirm totals show in USD and “≈ X ZAR”; confirm report amounts in base.
6. **Purchase / Quotation**: Same as invoice for base and foreign currency.
7. **Quotation > Convert to Invoice**: Convert a foreign-currency quotation; confirm new invoice has same currency and FX and amounts.

---

## Phase 7: Advanced Features ✅ PARTIALLY COMPLETED

### Implemented Features

| Feature | Status | Migration/File |
|---------|--------|----------------|
| User Roles & Permissions (RBAC) | ✅ Done | `014_rbac_and_audit.sql`, `usePermissions.js`, `useCompanyMembers.js` |
| Company Members (Owner/Admin/Accountant/Viewer) | ✅ Done | `014_rbac_and_audit.sql`, RLS on all company-scoped tables |
| Team Invitations (Email Invite) | ✅ Done | `015_company_invitations.sql`, `supabase/functions/invite-user`, `useCompanyInvitations.js`, Settings > Team Members |
| Audit Trail / Activity Log | ✅ Done | `014_rbac_and_audit.sql` (activity_log + triggers), `useActivityLog.js`, `src/pages/ActivityLog.jsx` |
| Data Export (PDF/Excel for Documents) | ✅ Done | `DocumentPrintView.jsx`, `exportToPDF`/`exportToExcel` on Invoice, Quotation, Purchase detail pages |
| Reports Excel/PDF Export | ✅ Done (existing) | `src/pages/Reports.jsx`, `src/lib/utils.js` |

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| Data Import (Migration) | ❌ Not Started | Medium |
| Recurring Invoices | ❌ Not Started | Medium |
| Payment Reminders | ❌ Not Started | Medium |
| Credit Notes | ❌ Not Started | High |
| Debit Notes | ❌ Not Started | Medium |
| Purchase Orders | ❌ Not Started | Medium |

---

## Phase 8: Payroll (Future) 🔲 NOT STARTED

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| Employee Management | ❌ Not Started | Low |
| Salary Processing | ❌ Not Started | Low |
| PAYE Calculations | ❌ Not Started | Low |
| UIF Calculations | ❌ Not Started | Low |
| Payslip Generation | ❌ Not Started | Low |
| IRP5 Generation | ❌ Not Started | Low |

---

## Current Database Schema

### Core Tables
- `companies` - Business entities
- `profiles` - User profiles with onboarding status
- `company_members` - RBAC: user–company link with role (owner/admin/accountant/viewer)
- `company_invitations` - Pending email invites; accept_invitation RPC
- `activity_log` - Audit trail (triggers on key tables)
- `clients` - Customer records
- `suppliers` - Vendor records
- `accounts` - Chart of accounts
- `vat_rates` - VAT/Tax rates by country
- `currencies` - Reference (ISO 4217 codes, locale)
- `company_currencies` - Enabled currencies per company
- `exchange_rates` - Manual rates (company, base/quote, rate, effective_date)

### Transaction Tables
- `invoices` - Sales invoices
- `invoice_items` - Invoice line items (product_id)
- `supplier_invoices` - Purchase invoices
- `supplier_invoice_items` - Purchase line items (product_id)
- `quotations` - Sales quotations
- `quotation_items` - Quotation line items (product_id)
- `products` - Products/Services catalog
- `inventory_movements` - Stock in/out ledger
- `stock_adjustments` / `stock_adjustment_lines` - Stock take

### Accounting Tables
- `journal_entries` - Journal entry headers
- `journal_entry_lines` - Debit/credit lines
- `bank_transactions` - Bank transaction records

---

## Technology Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State Management:** TanStack Query (React Query)
- **Hosting:** Vercel

---

## Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Accounting Foundation | ✅ Complete | 100% |
| Phase 2: UX & Onboarding | ✅ Complete | 100% |
| Phase 3: Advanced Reporting | ✅ Complete | 100% |
| Phase 4: Bank Reconciliation | ✅ Complete | 100% |
| Phase 5: Inventory Management | ✅ Complete | 100% |
| Phase 6: Multi-Currency | ✅ Complete | 100% (Forex gain/loss & revaluation deferred) |
| Phase 7: Advanced Features | ✅ Partial | RBAC, Invitations, Audit Log, Document Export done |
| Phase 8: Payroll | 🔲 Not Started | 0% |

**Overall Progress: ~75%**

---

## Next Recommended Steps

1. **Credit Notes** - Common business requirement
2. **Debit Notes** - Supplier credit adjustments
3. **Recurring Invoices** - Automation for repeat billing
4. **Deploy Edge Function** - Run `supabase link` then `supabase functions deploy invite-user` for email invites

---

## Files Modified (Phases 1–7)

### Migrations
- `014_rbac_and_audit.sql` - company_members, RBAC helper functions, RLS replacement, activity_log table + triggers
- `015_company_invitations.sql` - company_invitations table, accept_invitation RPC
- `013_multi_currency.sql` - Currencies, company_currencies, exchange_rates; FX columns + backfill
- `005_quotations_and_onboarding.sql` - Quotations + onboarding fields
- `006_journal_entries.sql` - Journal entries schema
- `007_invoice_auto_posting.sql` - Invoice triggers
- `008_purchase_auto_posting.sql` - Purchase triggers
- `009_bank_matching_rules.sql` - Bank matching rules schema
- `010_reconciliation_history.sql` - Reconciliation history

### Edge Functions
- `supabase/functions/invite-user/index.ts` - Email invite via Auth Admin; validates Owner/Admin, creates invitation, sends invite
- `supabase/functions/_shared/cors.ts` - CORS headers for Edge Functions

### Frontend
- `src/context/CompanyContext.jsx` - Fetch companies by membership; create company inserts owner into company_members
- `src/hooks/usePermissions.js` - Role-based capability flags (canEditTransactions, canManageMembers, etc.)
- `src/hooks/useCompanyMembers.js` - List, add, update role, remove members
- `src/hooks/useCompanyInvitations.js` - List invitations, inviteByEmailViaEdge, cancel, useAcceptPendingInvitations
- `src/hooks/useActivityLog.js` - Query/filter activity_log
- `src/pages/Settings.jsx` - Team Members (invite by email, pending list, add existing user), permission-gated fields
- `src/pages/ActivityLog.jsx` - Activity log page with entity/action filters
- `src/pages/InvoiceDetail.jsx`, `QuotationDetail.jsx`, `PurchaseDetail.jsx` - PDF/Excel export, DocumentPrintView
- `src/components/documents/DocumentPrintView.jsx` - Reusable print/PDF layout for invoice, quotation, purchase
- `src/components/dashboard/DashboardLayout.jsx` - Accept pending invitations on load
- `src/components/dashboard/Sidebar.jsx` - Activity Log nav link
- `src/pages/Onboarding.jsx` - Onboarding wizard
- `src/hooks/useOnboarding.js` - Onboarding state hook
- `src/hooks/useReports.js` - Financial reports (Trial Balance, GL, Income Statement, Balance Sheet, VAT, AR/AP Aging, Cash Flow, etc.)
- `src/hooks/useBanking.js` - Banking hooks (import, match, reconciliation history)
- `src/hooks/useClients.js`, `src/hooks/useSuppliers.js` - CRUD with validation
- `src/pages/Reports.jsx` - Reports UI and Excel/PDF export
- `src/pages/Banking.jsx` - Banking UI
- `src/components/auth/ProtectedRoute.jsx` - Onboarding redirect
- `src/lib/constants.js` - VAT rates, account codes

---

*Last Updated: January 31, 2026*

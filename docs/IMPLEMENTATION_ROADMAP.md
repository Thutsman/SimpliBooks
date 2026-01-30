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

## Phase 6: Multi-Currency Support 🔲 NOT STARTED

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| Multiple Currency Setup | ❌ Not Started | Medium |
| Exchange Rate Management | ❌ Not Started | Medium |
| Foreign Currency Invoices | ❌ Not Started | Medium |
| Forex Gain/Loss Calculation | ❌ Not Started | Low |
| Currency Revaluation | ❌ Not Started | Low |

---

## Phase 7: Advanced Features 🔲 NOT STARTED

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| User Roles & Permissions | ❌ Not Started | High |
| Audit Trail/Activity Log | ❌ Not Started | High |
| Data Export (Excel/PDF) | ❌ Not Started | High |
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
- `clients` - Customer records
- `suppliers` - Vendor records
- `accounts` - Chart of accounts
- `vat_rates` - VAT/Tax rates by country

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
| Phase 6: Multi-Currency | 🔲 Not Started | 0% |
| Phase 7: Advanced Features | 🔲 Not Started | 0% |
| Phase 8: Payroll | 🔲 Not Started | 0% |

**Overall Progress: ~55%**

---

## Next Recommended Steps

1. **Credit Notes** - Common business requirement
3. **Data Export** - PDF export for all reports (Excel export implemented for all Phase 3 & 4 reports)

---

## Files Modified in Phase 1 & 2

### Migrations
- `005_quotations_and_onboarding.sql` - Quotations + onboarding fields
- `006_journal_entries.sql` - Journal entries schema
- `007_invoice_auto_posting.sql` - Invoice triggers
- `008_purchase_auto_posting.sql` - Purchase triggers
- `009_bank_matching_rules.sql` - Bank matching rules schema
- `010_reconciliation_history.sql` - Reconciliation history/audit trail

### Frontend
- `src/pages/Onboarding.jsx` - Onboarding wizard
- `src/hooks/useOnboarding.js` - Onboarding state hook
- `src/hooks/useReports.js` - Financial reports hooks (Trial Balance, GL, Income Statement, Balance Sheet, VAT, VAT 201, AR/AP Aging, Cash Flow, P&L by Period, Customer/Supplier Statement, Unreconciled Items)
- `src/hooks/useBanking.js` - Banking hooks (import, categorize, match, auto-match, reconciliation history)
- `src/hooks/useClients.js` - Client CRUD with validation
- `src/hooks/useSuppliers.js` - Supplier CRUD with validation
- `src/pages/Reports.jsx` - Reports UI (all Phase 3 & 4 report tabs and Excel export)
- `src/pages/Banking.jsx` - Banking UI (CSV import, manual matching, auto-match, reconciliation history)
- `src/pages/InvoiceDetail.jsx` - Quick Add Client feature
- `src/pages/PurchaseDetail.jsx` - Quick Add Supplier feature
- `src/components/auth/ProtectedRoute.jsx` - Onboarding redirect
- `src/lib/constants.js` - VAT rates, account codes

---

*Last Updated: January 29, 2026*

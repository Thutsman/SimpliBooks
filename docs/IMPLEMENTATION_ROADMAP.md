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

## Phase 3: Advanced Reporting 🔄 IN PROGRESS

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| Trial Balance Report | ❌ Not Started | High |
| AR Aging Report (30/60/90 days) | ❌ Not Started | High |
| AP Aging Report (30/60/90 days) | ❌ Not Started | High |
| Cash Flow Statement | ❌ Not Started | Medium |
| VAT 201 Report (South Africa) | ❌ Not Started | High |
| Profit & Loss by Period | ❌ Not Started | Medium |
| Customer Statement | ❌ Not Started | Medium |
| Supplier Statement | ❌ Not Started | Medium |

---

## Phase 4: Bank Reconciliation 🔲 NOT STARTED

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| Import Bank Statements (CSV/OFX) | ❌ Not Started | High |
| Manual Transaction Matching | ❌ Not Started | High |
| Auto-matching Rules | ❌ Not Started | Medium |
| Reconciliation History | ❌ Not Started | Medium |
| Unreconciled Items Report | ❌ Not Started | Medium |

---

## Phase 5: Inventory Management 🔲 NOT STARTED

### To Be Implemented

| Feature | Status | Priority |
|---------|--------|----------|
| Products/Services Catalog | ❌ Not Started | High |
| Stock Levels Tracking | ❌ Not Started | Medium |
| Cost of Goods Sold Auto-calc | ❌ Not Started | Medium |
| Stock Valuation (FIFO/Avg) | ❌ Not Started | Low |
| Low Stock Alerts | ❌ Not Started | Low |
| Stock Take/Adjustment | ❌ Not Started | Medium |

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
- `invoice_items` - Invoice line items
- `supplier_invoices` - Purchase invoices
- `supplier_invoice_items` - Purchase line items
- `quotations` - Sales quotations
- `quotation_items` - Quotation line items

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
| Phase 3: Advanced Reporting | 🔄 In Progress | 30% |
| Phase 4: Bank Reconciliation | 🔲 Not Started | 0% |
| Phase 5: Inventory Management | 🔲 Not Started | 0% |
| Phase 6: Multi-Currency | 🔲 Not Started | 0% |
| Phase 7: Advanced Features | 🔲 Not Started | 0% |
| Phase 8: Payroll | 🔲 Not Started | 0% |

**Overall Progress: ~25%**

---

## Next Recommended Steps

1. **Trial Balance Report** - Essential for accountants to verify books
2. **AR/AP Aging Reports** - Critical for cash flow management
3. **VAT 201 Report** - Required for SARS compliance in South Africa
4. **Credit Notes** - Common business requirement
5. **Data Export** - Users need to export data to Excel/PDF

---

## Files Modified in Phase 1 & 2

### Migrations
- `005_quotations_and_onboarding.sql` - Quotations + onboarding fields
- `006_journal_entries.sql` - Journal entries schema
- `007_invoice_auto_posting.sql` - Invoice triggers
- `008_purchase_auto_posting.sql` - Purchase triggers

### Frontend
- `src/pages/Onboarding.jsx` - Onboarding wizard
- `src/hooks/useOnboarding.js` - Onboarding state hook
- `src/hooks/useReports.js` - Financial reports hooks
- `src/hooks/useClients.js` - Client CRUD with validation
- `src/hooks/useSuppliers.js` - Supplier CRUD with validation
- `src/pages/Reports.jsx` - Reports UI
- `src/pages/InvoiceDetail.jsx` - Quick Add Client feature
- `src/pages/PurchaseDetail.jsx` - Quick Add Supplier feature
- `src/components/auth/ProtectedRoute.jsx` - Onboarding redirect
- `src/lib/constants.js` - VAT rates, account codes

---

*Last Updated: January 27, 2026*

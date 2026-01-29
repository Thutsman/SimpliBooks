# POS Integration Framework - Implementation Plan

## Executive Summary

This document outlines the implementation plan for a generic POS (Point of Sale) integration framework for SimpliBooks. The framework enables real-time data synchronization from POS systems to SimpliBooks via webhooks, starting with GAAP Unity support and designed for easy extension to other POS providers.

---

## 1. Overview

### 1.1 Goals
- Enable automatic sync of sales data from POS systems to SimpliBooks
- Support multiple POS providers through a pluggable architecture
- Provide real-time data flow via webhooks
- Maintain full audit trail of all synced data

### 1.2 Data Flow Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   POS System    │         │  Supabase Edge       │         │   SimpliBooks   │
│  (GAAP Unity)   │ ──────► │     Function         │ ──────► │    Database     │
│                 │ Webhook │  (pos-webhook)       │ Insert  │                 │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
        │                            │                               │
        ▼                            ▼                               ▼
   Sales Events              Validate Signature              ┌─────────────┐
   Payment Events            Transform Data                  │  invoices   │
   Customer Events           Check Duplicates                │  clients    │
                             Log Sync Status                 │  bank_txns  │
                                                             └─────────────┘
```

### 1.3 Supported Data Types

| POS Event | SimpliBooks Record | Description |
|-----------|-------------------|-------------|
| Sale | Invoice | Each POS sale creates a paid invoice with line items |
| Payment | Bank Transaction | Payment records sync for reconciliation |
| Customer | Client | POS customers sync to client list |
| Refund | Credit Note / Negative Transaction | Refunds logged for manual processing |

---

## 2. Database Schema

### 2.1 New Tables

#### `pos_integrations`
Stores configuration for each POS integration per company.

```sql
CREATE TABLE pos_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,           -- 'gaap_unity', 'square', etc.
  name TEXT NOT NULL,               -- User-friendly name

  -- Credentials
  api_key TEXT,
  api_secret TEXT,
  webhook_secret TEXT NOT NULL,     -- For validating incoming webhooks

  -- Configuration
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,

  -- Auto-create settings
  auto_create_clients BOOLEAN DEFAULT TRUE,
  auto_create_invoices BOOLEAN DEFAULT TRUE,
  auto_create_bank_transactions BOOLEAN DEFAULT TRUE,
  default_income_account_id UUID REFERENCES accounts(id),
  default_payment_account_id UUID REFERENCES accounts(id),

  -- Status
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, provider, name)
);
```

#### `pos_sync_logs`
Tracks all webhook events and sync operations for audit trail.

```sql
CREATE TABLE pos_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES pos_integrations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,         -- 'sale', 'payment', 'customer', 'refund'
  event_id TEXT NOT NULL,           -- POS system's unique event ID

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped')),

  -- Data
  raw_payload JSONB NOT NULL,
  processed_data JSONB,

  -- Created records (for reference/rollback)
  created_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Deduplication
  idempotency_key TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  UNIQUE(integration_id, idempotency_key)
);
```

#### `pos_field_mappings`
Maps POS categories/products to SimpliBooks accounts.

```sql
CREATE TABLE pos_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES pos_integrations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Mapping type
  mapping_type TEXT NOT NULL
    CHECK (mapping_type IN ('category', 'product', 'payment_method', 'tax_rate')),

  -- Source (POS side)
  pos_field_id TEXT NOT NULL,
  pos_field_name TEXT,

  -- Target (SimpliBooks side)
  simplibooks_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  simplibooks_vat_rate_id UUID REFERENCES vat_rates(id) ON DELETE SET NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(integration_id, mapping_type, pos_field_id)
);
```

### 2.2 RLS Policies
All tables will have Row Level Security policies ensuring users can only access integrations belonging to their companies.

---

## 3. Webhook Handler (Edge Function)

### 3.1 File Structure

```
supabase/functions/
└── pos-webhook/
    ├── index.ts              # Main entry point
    ├── providers/
    │   ├── index.ts          # Provider registry
    │   ├── base.ts           # Provider interface
    │   └── gaap-unity.ts     # GAAP Unity implementation
    ├── transformers/
    │   ├── sales.ts          # Sale → Invoice transformation
    │   ├── payments.ts       # Payment → Bank Transaction
    │   └── customers.ts      # Customer → Client
    └── utils/
        ├── crypto.ts         # Signature validation
        └── supabase.ts       # Supabase client
```

### 3.2 Webhook Processing Flow

```
1. Receive POST request
         │
         ▼
2. Extract integration_id from URL/headers
         │
         ▼
3. Fetch integration config from database
         │
         ▼
4. Validate webhook signature (HMAC-SHA256)
         │
         ├─── Invalid ──► Return 401 Unauthorized
         │
         ▼
5. Check idempotency (has this event been processed?)
         │
         ├─── Duplicate ──► Return 200 (already processed)
         │
         ▼
6. Create sync log entry (status: processing)
         │
         ▼
7. Get provider handler and process event
         │
         ├─── Sale ──► Create Invoice + Items
         ├─── Payment ──► Create Bank Transaction
         ├─── Customer ──► Find/Create Client
         │
         ▼
8. Update sync log (success/failed + created record IDs)
         │
         ▼
9. Return response
```

### 3.3 Provider Interface

```typescript
interface POSProvider {
  name: string;

  // Extract event metadata
  getEventType(payload: any): string;
  getEventId(payload: any): string;
  getIdempotencyKey(payload: any): string;

  // Process events
  processEvent(supabase, integration, payload, eventType): Promise<ProcessResult>;

  // Transform functions
  transformSaleToInvoice(payload, integration): InvoiceData;
  transformPaymentToTransaction(payload, integration): TransactionData;
  transformCustomerToClient(payload, integration): ClientData;
}
```

---

## 4. Frontend Components

### 4.1 New Files to Create

| File | Description |
|------|-------------|
| `src/hooks/usePOSIntegrations.js` | Data hook for CRUD operations on integrations |
| `src/components/settings/IntegrationsSection.jsx` | Main integrations UI in Settings |
| `src/components/settings/AddIntegrationModal.jsx` | Modal to add/edit integration |
| `src/components/settings/SyncLogsModal.jsx` | View sync history and errors |
| `src/components/settings/FieldMappingsModal.jsx` | Configure POS → Account mappings |

### 4.2 Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.jsx` | Add IntegrationsSection component |
| `src/lib/constants.js` | Add POS_PROVIDERS, SYNC_LOG_STATUSES, etc. |

### 4.3 UI Features

**Integration List:**
- Display all configured POS integrations
- Show status (active/inactive, last sync time, errors)
- Quick actions (edit, delete, toggle active)

**Add/Edit Integration Modal:**
- Select POS provider (GAAP Unity, future: Square, etc.)
- Enter API credentials
- Display webhook URL to configure in POS
- Set default accounts for income/payments
- Toggle auto-create options

**Sync Logs Viewer:**
- List recent sync events
- Filter by status (success, failed, pending)
- Filter by event type (sale, payment, customer)
- View raw payload and processed data
- Retry failed syncs

**Field Mappings:**
- Map POS categories → SimpliBooks income accounts
- Map POS payment methods → SimpliBooks bank accounts
- Map POS tax rates → SimpliBooks VAT rates

---

## 5. Implementation Phases

### Phase 1: Database Foundation (Estimated: 1-2 days)
- [ ] Create migration `005_pos_integrations.sql`
- [ ] Create migration `006_pos_rls_policies.sql`
- [ ] Apply migrations to Supabase
- [ ] Test with manual SQL queries

### Phase 2: Edge Function Core (Estimated: 3-4 days)
- [ ] Create Edge Function folder structure
- [ ] Implement base provider interface
- [ ] Implement GAAP Unity provider
- [ ] Implement webhook signature validation
- [ ] Deploy Edge Function
- [ ] Test with Postman/curl

### Phase 3: Frontend - Basic Integration Management (Estimated: 2-3 days)
- [ ] Create `usePOSIntegrations` hook
- [ ] Add IntegrationsSection to Settings
- [ ] Create AddIntegrationModal
- [ ] Implement webhook URL display
- [ ] Add test connection functionality

### Phase 4: Frontend - Sync Logs & Mappings (Estimated: 2-3 days)
- [ ] Create SyncLogsModal component
- [ ] Create FieldMappingsModal component
- [ ] Add filtering and search
- [ ] Implement retry functionality

### Phase 5: Testing & Documentation (Estimated: 2-3 days)
- [ ] End-to-end testing with GAAP Unity
- [ ] Error handling improvements
- [ ] User documentation
- [ ] Performance testing

**Total Estimated Time: 10-15 days**

---

## 6. Security Considerations

### 6.1 Webhook Security
- **Signature Validation**: All webhooks validated using HMAC-SHA256
- **Timing-Safe Comparison**: Prevents timing attacks on signature comparison
- **Secret Rotation**: Support for rotating webhook secrets

### 6.2 Data Security
- **RLS Policies**: All tables protected by row-level security
- **Encrypted Storage**: API keys encrypted at rest by Supabase
- **Service Role Isolation**: Edge Function uses service role but validates ownership

### 6.3 Operational Security
- **Idempotency**: Duplicate events safely ignored
- **Audit Trail**: Full logging of all sync operations
- **Rate Limiting**: Consider adding rate limits for high-volume webhooks

---

## 7. Extending to New POS Providers

To add support for a new POS provider:

1. **Create Provider File**
   ```
   supabase/functions/pos-webhook/providers/[provider-name].ts
   ```

2. **Implement POSProvider Interface**
   ```typescript
   export class NewProvider implements POSProvider {
     name = "new_provider";
     // Implement all interface methods
   }
   ```

3. **Register Provider**
   ```typescript
   // providers/index.ts
   import { NewProvider } from "./new-provider.ts";
   providers.set("new_provider", new NewProvider());
   ```

4. **Add to Frontend**
   ```javascript
   // constants.js
   export const POS_PROVIDERS = [
     { value: 'gaap_unity', label: 'GAAP Unity' },
     { value: 'new_provider', label: 'New Provider' },
   ]
   ```

---

## 8. API Reference

### 8.1 Webhook Endpoint

**URL:** `https://[project-ref].supabase.co/functions/v1/pos-webhook?integration_id=[uuid]`

**Method:** POST

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: sha256=[signature]
```

**Response Codes:**
| Code | Description |
|------|-------------|
| 200 | Success (or duplicate skipped) |
| 400 | Bad request (missing integration_id) |
| 401 | Invalid signature |
| 404 | Integration not found |
| 422 | Processing failed |
| 500 | Server error |

---

## 9. Appendix

### 9.1 GAAP Unity Webhook Payload Examples

**Sale Event:**
```json
{
  "event_type": "sale.completed",
  "event_id": "evt_123456",
  "timestamp": "2026-01-25T10:30:00Z",
  "data": {
    "id": "sale_789",
    "receipt_number": "R001234",
    "subtotal": 1000.00,
    "tax_total": 150.00,
    "total": 1150.00,
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+27123456789"
    },
    "line_items": [
      {
        "product_id": "prod_001",
        "category_id": "cat_food",
        "name": "Product Name",
        "quantity": 2,
        "unit_price": 500.00,
        "tax_rate": 15,
        "tax_amount": 75.00,
        "total": 575.00
      }
    ]
  }
}
```

**Payment Event:**
```json
{
  "event_type": "payment.received",
  "event_id": "evt_789012",
  "timestamp": "2026-01-25T10:31:00Z",
  "data": {
    "id": "pay_456",
    "sale_id": "sale_789",
    "amount": 1150.00,
    "payment_method": "card",
    "reference": "TXN123456",
    "transaction_id": "stripe_pi_xxx"
  }
}
```

### 9.2 SimpliBooks Data Mappings

| POS Field | SimpliBooks Field | Notes |
|-----------|------------------|-------|
| sale.id | invoice.reference | Prefixed with "POS-" |
| sale.receipt_number | invoice.notes | Included in notes |
| sale.total | invoice.total | Direct mapping |
| customer.email | client.email | Used for matching |
| payment.amount | bank_transaction.amount | Direct mapping |
| payment.payment_method | bank_transaction.description | "POS Payment - {method}" |

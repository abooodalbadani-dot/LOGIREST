# Data Model: LogiRest Frontend UI

**Feature Branch**: `001-logirest-frontend-ui`
**Date**: 2026-04-19
**Note**: This is the **frontend data model** — TypeScript interfaces and Zod schemas that mirror the API contract. All types live in `src/types/`.

---

## 1. Core Entities

### 1.1 User & Authentication

```typescript
// src/types/auth.ts

export type UserRole =
  | 'ADMIN'
  | 'INV_MGR'
  | 'WH_KEEPER'
  | 'PROC_OFFICER'
  | 'AUDITOR';

export interface UserScope {
  branch_id: string | null;     // null = all branches (ADMIN)
  warehouse_id: string | null;  // null = all warehouses
  department_id: string | null; // null = all departments
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  scopes: UserScope[];
  locale: 'ar' | 'en';
}

// Zod schema (runtime validation at API boundary)
export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'INV_MGR', 'WH_KEEPER', 'PROC_OFFICER', 'AUDITOR']),
  scopes: z.array(z.object({
    branch_id: z.string().nullable(),
    warehouse_id: z.string().nullable(),
    department_id: z.string().nullable(),
  })),
  locale: z.enum(['ar', 'en']),
});
```

### 1.2 RBAC Types

```typescript
// src/types/rbac.ts

export type ResourceType =
  | 'grn' | 'pr' | 'po'
  | 'issue' | 'transfer' | 'adjustment'
  | 'stocktake' | 'inventory'
  | 'master_data' | 'admin' | 'reports';

export type ActionType =
  | 'view' | 'create' | 'edit' | 'delete' | 'post' | 'approve';

// Permission matrix (derived from role; no API call)
export type PermissionMatrix = Record<UserRole, Partial<Record<ResourceType, ActionType[]>>>;
```

---

## 2. Master Data Entities

### 2.1 Branch

```typescript
// src/types/master-data.ts

export interface Branch {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at: string; // ISO 8601
}
```

### 2.2 Warehouse

```typescript
export interface Warehouse {
  id: string;
  branch_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: 'MAIN' | 'DRY' | 'COLD' | 'VIRTUAL';
  is_active: boolean;
}
```

### 2.3 Item (Inventory Item / SKU)

```typescript
export interface Item {
  id: string;
  code: string;
  barcode: string;
  name_ar: string;
  name_en: string;
  category_id: string;
  primary_uom: UoM;
  uom_conversions: UoMConversion[];
  track_lots: boolean;      // if false, no lot/expiry required
  min_stock_level: number;
  reorder_point: number;
  is_active: boolean;
}

export interface UoM {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
}

export interface UoMConversion {
  from_uom_id: string;
  to_uom_id: string;
  factor: number; // multiply from_uom qty to get to_uom qty
}
```

### 2.4 Lot / Batch

```typescript
export interface Lot {
  id: string;
  item_id: string;
  warehouse_id: string;
  lot_number: string;
  expiry_date: string | null; // ISO date string; null if item doesn't track expiry
  qty_available: number;
  is_expired: boolean;
  is_near_expiry: boolean; // expiry ≤ 30 days from today
}
```

### 2.5 Supplier

```typescript
export interface Supplier {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  currency_id: string;
  payment_terms: string;
  is_active: boolean;
}
```

### 2.6 Currency & FX Rate

```typescript
export interface Currency {
  id: string;
  code: string;          // e.g. 'USD', 'EUR'
  name_ar: string;
  name_en: string;
  symbol: string;
  is_base: boolean;      // true for system base currency (e.g. SAR)
}

export interface FXRate {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
  effective_date: string; // ISO date
}
```

### 2.7 Department

```typescript
export interface Department {
  id: string;
  branch_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}
```

---

## 3. Inventory Document Entities

### 3.1 Document Status

All inventory documents share a common status lifecycle:

```
DRAFT → SUBMITTED → APPROVED → POSTED
                  ↘ REJECTED
POSTED → [read-only; corrections via Adjustment]
```

```typescript
export type DocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'POSTED'
  | 'CANCELLED';

export type DocumentType =
  | 'GRN'        // Goods Received Note
  | 'ISSUE'      // Stock Issue (Transfer Out to dept)
  | 'TRANSFER'   // Warehouse-to-Warehouse Transfer
  | 'ADJUSTMENT' // Corrective Adjustment
  | 'PR'         // Purchase Request
  | 'PO';        // Purchase Order
```

### 3.2 Base Inventory Document

```typescript
export interface BaseDocument {
  id: string;
  document_number: string;  // System-generated, e.g. "GRN-2026-00042"
  type: DocumentType;
  status: DocumentStatus;
  warehouse_id: string;
  branch_id: string;
  notes: string | null;
  created_by: string;       // user id
  created_at: string;       // ISO 8601
  posted_at: string | null;
  posted_by: string | null;
}

export interface DocumentLineItem {
  id: string;
  document_id: string;
  item_id: string;
  item: Pick<Item, 'id' | 'code' | 'name_ar' | 'name_en' | 'primary_uom'>;
  lot_id: string | null;    // null when item does not track lots
  lot: Pick<Lot, 'id' | 'lot_number' | 'expiry_date' | 'is_expired'> | null;
  qty: number;
  uom_id: string;
  unit_cost: number | null;
}
```

### 3.3 Goods Received Note (GRN)

```typescript
export interface GRN extends BaseDocument {
  type: 'GRN';
  po_id: string | null;        // linked PO (if any)
  supplier_id: string;
  currency_id: string;
  fx_rate: number | null;      // captured at POST time; null while DRAFT
  fx_rate_captured_at: string | null;
  lines: GRNLineItem[];
}

export interface GRNLineItem extends DocumentLineItem {
  po_qty: number | null;       // quantity on the linked PO line
  received_qty: number;
  unit_cost_foreign: number;   // cost in supplier currency
  unit_cost_base: number;      // cost in base currency = unit_cost_foreign * fx_rate
}
```

### 3.4 Purchase Request (PR)

```typescript
export interface PurchaseRequest extends BaseDocument {
  type: 'PR';
  requested_by_dept: string;
  required_by_date: string;
  lines: PRLineItem[];
}

export interface PRLineItem extends DocumentLineItem {
  requested_qty: number;
  approved_qty: number | null;
}
```

### 3.5 Purchase Order (PO)

```typescript
export interface PurchaseOrder extends BaseDocument {
  type: 'PO';
  pr_id: string | null;
  supplier_id: string;
  currency_id: string;
  expected_delivery_date: string;
  lines: POLineItem[];
}

export interface POLineItem extends DocumentLineItem {
  ordered_qty: number;
  unit_price: number;         // in supplier currency
  total_price: number;        // ordered_qty * unit_price (supplier currency)
}
```

### 3.6 Stock Issue

```typescript
export interface StockIssue extends BaseDocument {
  type: 'ISSUE';
  destination_dept_id: string;
  requested_by: string;
  lines: IssueLineItem[];
}

export interface IssueLineItem extends DocumentLineItem {
  requested_qty: number;
  issued_qty: number;
  lot_allocations: LotAllocation[];
}

export interface LotAllocation {
  lot_id: string;
  lot_number: string;
  expiry_date: string | null;
  allocated_qty: number;
  override_reason: string | null; // required if lot is_expired
}
```

### 3.7 Warehouse Transfer

```typescript
export interface Transfer extends BaseDocument {
  type: 'TRANSFER';
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_status: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'POSTED';
  shipped_at: string | null;
  received_at: string | null;
  lines: TransferLineItem[];
}

export interface TransferLineItem extends DocumentLineItem {
  shipped_qty: number;
  received_qty: number | null;  // null until receiving side confirms
}
```

### 3.8 Adjustment

```typescript
export interface Adjustment extends BaseDocument {
  type: 'ADJUSTMENT';
  reason: AdjustmentReason;
  approved_by: string | null;
  lines: AdjustmentLineItem[];
}

export type AdjustmentReason =
  | 'DAMAGE' | 'EXPIRY' | 'THEFT' | 'COUNTING_ERROR' | 'OTHER';

export interface AdjustmentLineItem extends DocumentLineItem {
  direction: 'INCREASE' | 'DECREASE';
  qty_before: number;
  qty_adjusted: number;
  reason_notes: string;
}
```

---

## 4. Stocktake Entities

```typescript
export type StocktakeStatus =
  | 'OPEN'      // initiated; snapshot captured; warehouse locked
  | 'COUNTING'  // physical count in progress
  | 'REVIEW'    // variances being reviewed
  | 'POSTED'    // finalized; lock released; adjustments applied
  | 'CANCELLED';

export interface StocktakeSession {
  id: string;
  session_number: string;     // e.g. "ST-2026-003"
  warehouse_id: string;
  status: StocktakeStatus;
  snapshot_at: string;        // when stock snapshot was taken
  started_by: string;
  posted_at: string | null;
  posted_by: string | null;
  counts: StocktakeCount[];
}

export interface StocktakeCount {
  id: string;
  session_id: string;
  item_id: string;
  item: Pick<Item, 'id' | 'code' | 'name_ar' | 'name_en'>;
  lot_id: string | null;
  snapshot_qty: number;       // qty at time of snapshot (system)
  counted_qty: number | null; // null until counted
  variance: number | null;    // counted_qty - snapshot_qty
  variance_reason: string | null; // required when variance !== 0
}

// Lock state (for useWarehouseLock hook)
export interface WarehouseLockState {
  is_locked: boolean;
  session_id: string | null;
  session_number: string | null;
  lock_started_at: string | null;
}
```

---

## 5. Notification & Audit Entities

```typescript
export interface NotificationTemplate {
  id: string;
  code: string;
  subject_ar: string;
  subject_en: string;
  body_ar: string;
  body_en: string;
  trigger_event: string;
  is_active: boolean;
}

export interface EmailOutboxEntry {
  id: string;
  template_id: string;
  recipient_email: string;
  subject: string;
  sent_at: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_message: string | null;
}

export interface AuditLogEntry {
  id: string;
  entity_type: string;     // e.g. 'GRN', 'User'
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'APPROVE';
  user_id: string;
  user_name: string;
  changes: AuditDiff[];
  created_at: string;
}

export interface AuditDiff {
  field: string;
  old_value: unknown;
  new_value: unknown;
}
```

---

## 6. State Transitions (UI Flow Logic)

### 6.1 GRN State Machine (UI Perspective)

```
[Create Form] → POST /grn → DRAFT
DRAFT → [Submit] → SUBMITTED
SUBMITTED → [Approve] → APPROVED (INV_MGR+)
APPROVED → [Post GRN] → must capture FX rate → POSTED (read-only)
POSTED → correction via ADJUSTMENT only
```

### 6.2 Stocktake lifecycle lock impact

```
OPEN:     POST blocked for warehouse across ALL documents
COUNTING: POST blocked; count entry open
REVIEW:   POST blocked; variance reason required
POSTED:   Lock released; warehouse moves resume
```

### 6.3 FEFO Lot Allocation UI Logic

```
User enters requested_qty
↓
System fetches lots sorted by expiry_date ASC (FEFO)
↓
Auto-allocate: fill from top until requested_qty met
↓
User may manually adjust per-lot qty (sum must = requested_qty)
↓
Expired lot: disabled for WH_KEEPER; override textarea shown for ADMIN/INV_MGR
↓
OnSubmit: lines include lot_allocations[] with optional override_reason
```

---

## 7. API Response Wrappers

```typescript
// src/types/api.ts

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  code: string;         // machine-readable e.g. 'VALIDATION_ERROR'
  message: string;      // i18n key e.g. 'errors.validation_failed'
  field_errors: Record<string, string[]> | null;
}
```

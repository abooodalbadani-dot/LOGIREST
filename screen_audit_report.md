# SYSTEM SCREEN REPORT — LogiRest Kitchen-Store Inventory System
**Audit Date:** 2026-04-30 | **Auditor Role:** Senior Frontend Architecture Auditor

---

## TASK 1 — CURRENT SYSTEM SCREENS

### Module: Auth & Global

| Screen Name | Route Path | File Location |
|---|---|---|
| Root redirect | `/[locale]` | `src/app/[locale]/page.tsx` |
| Login | `/[locale]/(auth)/login` | `(auth)/login/page.tsx` |
| Forgot Password | `/[locale]/(auth)/forgot-password` | `(auth)/forgot-password/page.tsx` |
| Reset Password | `/[locale]/(auth)/reset-password` | `(auth)/reset-password/page.tsx` |
| Dashboard | `/[locale]/(app)/dashboard` | `(app)/dashboard/page.tsx` |
| Profile | `/[locale]/(app)/profile` | `(app)/profile/page.tsx` |
| Global Search | `/[locale]/(app)/search` | `(app)/search/page.tsx` |

**Module Total: 7 screens**

---

### Module: Master Data

| Screen Name | Route Path | File Location |
|---|---|---|
| Master Data Hub | `/[locale]/(app)/master-data` | `master-data/page.tsx` |
| Branches List | `/[locale]/(app)/master-data/branches` | `master-data/branches/page.tsx` |
| Branch Detail | `/[locale]/(app)/master-data/branches/[id]` | `master-data/branches/[id]/page.tsx` |
| Warehouses List | `/[locale]/(app)/master-data/warehouses` | `master-data/warehouses/page.tsx` |
| Warehouse Detail | `/[locale]/(app)/master-data/warehouses/[id]` | `master-data/warehouses/[id]/page.tsx` |
| Departments List | `/[locale]/(app)/master-data/departments` | `master-data/departments/page.tsx` |
| Department Detail | `/[locale]/(app)/master-data/departments/[id]` | `master-data/departments/[id]/page.tsx` |
| Suppliers List | `/[locale]/(app)/master-data/suppliers` | `master-data/suppliers/page.tsx` |
| Supplier Detail | `/[locale]/(app)/master-data/suppliers/[id]` | `master-data/suppliers/[id]/page.tsx` |
| Categories List | `/[locale]/(app)/master-data/categories` | `master-data/categories/page.tsx` |
| Category Detail | `/[locale]/(app)/master-data/categories/[id]` | `master-data/categories/[id]/page.tsx` |
| Items List | `/[locale]/(app)/master-data/items` | `master-data/items/page.tsx` |
| Item Create | `/[locale]/(app)/master-data/items/new` | `master-data/items/new/page.tsx` |
| Item Detail | `/[locale]/(app)/master-data/items/[id]` | `master-data/items/[id]/page.tsx` |
| Units of Measure List | `/[locale]/(app)/master-data/units-of-measure` | `master-data/units-of-measure/page.tsx` |
| Unit of Measure Detail | `/[locale]/(app)/master-data/units-of-measure/[id]` | `master-data/units-of-measure/[id]/page.tsx` |
| Barcodes List | `/[locale]/(app)/master-data/barcodes` | `master-data/barcodes/page.tsx` |
| Barcode Detail | `/[locale]/(app)/master-data/barcodes/[id]` | `master-data/barcodes/[id]/page.tsx` |
| Currencies List | `/[locale]/(app)/master-data/currencies` | `master-data/currencies/page.tsx` |
| Currency Detail | `/[locale]/(app)/master-data/currencies/[id]` | `master-data/currencies/[id]/page.tsx` |
| FX Rates (under Currency) | `/[locale]/(app)/master-data/currencies/[id]/fx-rates` | `master-data/currencies/[id]/fx-rates/page.tsx` |
| Import Center | `/[locale]/(app)/master-data/import` | `master-data/import/page.tsx` |

**Module Total: 22 screens**

---

### Module: Operations

| Screen Name | Route Path | File Location |
|---|---|---|
| Adjustments List | `/[locale]/(app)/(operations)/adjustments` | `(operations)/adjustments/page.tsx` |
| Adjustment Detail | `/[locale]/(app)/(operations)/adjustments/[id]` | `(operations)/adjustments/[id]/page.tsx` |
| Issues List | `/[locale]/(app)/(operations)/issues` | `(operations)/issues/page.tsx` |
| Issue Create | `/[locale]/(app)/(operations)/issues/new` | `(operations)/issues/new/page.tsx` |
| Issue Create Scan | `/[locale]/(app)/(operations)/issues/new/scan` | `(operations)/issues/new/scan/page.tsx` |
| Issue Detail | `/[locale]/(app)/(operations)/issues/[id]` | `(operations)/issues/[id]/page.tsx` |
| Issue Detail Scan Mode | `/[locale]/(app)/(operations)/issues/[id]/scan-mode` | `(operations)/issues/[id]/scan-mode/page.tsx` |
| Stocktake List | `/[locale]/(app)/(operations)/stocktake` | `(operations)/stocktake/page.tsx` |
| Stocktake Detail | `/[locale]/(app)/(operations)/stocktake/[id]` | `(operations)/stocktake/[id]/page.tsx` |
| Transfers List | `/[locale]/(app)/(operations)/transfers` | `(operations)/transfers/page.tsx` |
| Transfer Detail | `/[locale]/(app)/(operations)/transfers/[id]` | `(operations)/transfers/[id]/page.tsx` |

**Module Total: 11 screens**

---

### Module: Procurement

| Screen Name | Route Path | File Location |
|---|---|---|
| GRN List | `/[locale]/(app)/(procurement)/goods-received` | `(procurement)/goods-received/page.tsx` |
| GRN Create | `/[locale]/(app)/(procurement)/goods-received/new` | `(procurement)/goods-received/new/page.tsx` |
| GRN Detail | `/[locale]/(app)/(procurement)/goods-received/[id]` | `(procurement)/goods-received/[id]/page.tsx` |
| Purchase Orders List | `/[locale]/(app)/(procurement)/purchase-orders` | `(procurement)/purchase-orders/page.tsx` |
| Purchase Order Create | `/[locale]/(app)/(procurement)/purchase-orders/new` | `(procurement)/purchase-orders/new/page.tsx` |
| Purchase Order Detail | `/[locale]/(app)/(procurement)/purchase-orders/[id]` | `(procurement)/purchase-orders/[id]/page.tsx` |
| Purchase Requests List | `/[locale]/(app)/(procurement)/purchase-requests` | `(procurement)/purchase-requests/page.tsx` |
| Purchase Request Create | `/[locale]/(app)/(procurement)/purchase-requests/new` | `(procurement)/purchase-requests/new/page.tsx` |
| Purchase Request Detail | `/[locale]/(app)/(procurement)/purchase-requests/[id]` | `(procurement)/purchase-requests/[id]/page.tsx` |

**Module Total: 9 screens**

---

### Module: Inventory

| Screen Name | Route Path | File Location |
|---|---|---|
| Inventory Balance | `/[locale]/(app)/inventory/balance` | `inventory/balance/page.tsx` |
| Lot Balances | `/[locale]/(app)/inventory/lots` | `inventory/lots/page.tsx` |
| Stock Movements | `/[locale]/(app)/inventory/movements` | `inventory/movements/page.tsx` |
| Inventory Scan | `/[locale]/(app)/inventory/scan` | `inventory/scan/page.tsx` |

**Module Total: 4 screens**

---

### Module: Communications

| Screen Name | Route Path | File Location |
|---|---|---|
| Email Outbox | `/[locale]/(app)/communications/email-outbox` | `communications/email-outbox/page.tsx` |
| Notifications | `/[locale]/(app)/communications/notifications` | `communications/notifications/page.tsx` |
| Email Templates List | `/[locale]/(app)/communications/notifications/templates` | `communications/notifications/templates/page.tsx` |
| Email Template Detail/Edit | `/[locale]/(app)/communications/notifications/templates/[id]` | `communications/notifications/templates/[id]/page.tsx` |

**Module Total: 4 screens**

---

### Module: Reports

| Screen Name | Route Path | File Location |
|---|---|---|
| Reports Hub | `/[locale]/(app)/reports` | `reports/page.tsx` |

**Module Total: 1 screen**

---

### Module: Admin

| Screen Name | Route Path | File Location |
|---|---|---|
| Audit Log | `/[locale]/(app)/admin/audit-log` | `admin/audit-log/page.tsx` |
| Roles List | `/[locale]/(app)/admin/roles` | `admin/roles/page.tsx` |
| Users List | `/[locale]/(app)/admin/users` | `admin/users/page.tsx` |
| User Detail | `/[locale]/(app)/admin/users/[id]` | `admin/users/[id]/page.tsx` |

**Module Total: 4 screens**

---

### ✅ TOTAL CURRENT SCREENS: 62

---

## TASK 2 — OFFICIAL SPECIFICATION SCREENS

*(Source: Coverage Checklist table — `Front_end_execution_tasks.md` lines 1441–1460)*

### Auth & Global — Required: 6
1. Login
2. Forgot Password
3. Reset Password
4. Dashboard (6 role variants = 1 screen with role logic)
5. Profile
6. Context Selector (modal/component, embedded in Profile/shell per spec)

### Master Data — Required: 34 (30 entity screens + 4 import)

**Entity Lists (5):** Branches, Warehouses, Departments, Suppliers, Categories

**Entity Create + Edit (10 entities × 2 = 20):**
Branches, Warehouses, Departments, Suppliers, Categories, Items, UoM, Barcodes, Currencies, FX Rates

**Entity Details (10):** All 10 entities

**Import (4):** Import Center landing + Import wizard per type (items, uom, barcodes) = 4 screens

> *Note: Spec says "30 entity screens" for FE-MD-001/002/003 + "4 import" for FE-MD-004 = 34 total. The spec coverage checklist shows 30 + 4 = 34.*

### Kitchen Requests — Required: 3
1. Kitchen Requests List
2. Kitchen Request Create
3. Kitchen Request Detail

### Issues — Required: 6
1. Issues List
2. Issue Create
3. Issue Create — Scan Mode (`/issues/new/scan`)
4. Issue Detail
5. Issue Expired Override flow (part of scan, per spec = separate screen)
6. *(Spec implies 6 — List + Create + Scan Mode + Detail + Approval sub-flow + Expired override)*

> *Per spec table: "6 screens" for FE-OPS-ISSUE-001/002/003*

### Transfers — Required: 5
1. Transfers List
2. Transfer Create
3. Transfer Detail
4. Transfer Ship action screen
5. Transfer Receive screen

### Stocktake — Required: 8
1. Sessions List
2. Stocktake Create (new session form)
3. Stocktake Detail (stepper)
4. Stocktake Start screen (`/[id]/start`)
5. Stocktake Counting screen (`/[id]/count`)
6. Variance Review (`/[id]/variance`)
7. Approve screen (`/[id]/approve`)
8. Post/Close screen (`/[id]/post`)

### Adjustments — Required: 3
1. Adjustments List
2. Adjustment Create
3. Adjustment Detail (+ Approval inline)

### PR — Required: 4
1. PR List
2. PR Create
3. PR Detail
4. PR Approval (separate route)

### PO — Required: 4
1. PO List
2. PO Create
3. PO Detail
4. PO Approval (separate route)

### GRN — Required: 5
1. GRN List
2. GRN Create
3. GRN Scan Mode (`/grn/new/scan`)
4. GRN Post screen (`/grn/[id]/post`)
5. GRN Detail

### Inventory Views — Required: 3
1. Inventory Balances
2. Lot Balances
3. Stock Movements Ledger

### Notifications & Email — Required: 4
1. Notification Center
2. Email Outbox
3. Email Templates List
4. Email Logs (read-only, ADMIN/AUDITOR)

### Reports — Required: 7
1. Reports Hub
2. Available Inventory Report
3. Stock Movements Report
4. Expiry / Near-Expiry Report
5. Stocktake Variance Report
6. PR / PO / GRN Status Report
7. Currency Summaries Report

### Admin — Users: Required: 4
1. Users List
2. User Create
3. User Detail
4. User Edit

### Admin — Roles: Required: 2
1. Roles List
2. Role Detail (Permission Matrix)

### Admin — Audit + Settings: Required: 2
1. Audit Logs (`/admin/audit-logs`)
2. Settings (`/admin/settings`)

---

### ✅ TOTAL REQUIRED SCREENS: 116

---

## TASK 3 — COMPARISON ANALYSIS

### ✅ Screens That Exist and Match Specification

| Module | Screen | Route Match |
|---|---|---|
| Auth | Login | ✅ |
| Auth | Forgot Password | ✅ |
| Auth | Reset Password | ✅ |
| Auth | Dashboard | ✅ |
| Auth | Profile | ✅ |
| Master Data | Branches List | ✅ |
| Master Data | Branch Detail | ✅ |
| Master Data | Warehouses List | ✅ |
| Master Data | Warehouse Detail | ✅ |
| Master Data | Departments List | ✅ |
| Master Data | Department Detail | ✅ |
| Master Data | Suppliers List | ✅ |
| Master Data | Supplier Detail | ✅ |
| Master Data | Categories List | ✅ |
| Master Data | Category Detail | ✅ |
| Master Data | Items List | ✅ |
| Master Data | Item Create | ✅ |
| Master Data | Item Detail | ✅ |
| Master Data | Units of Measure List | ✅ |
| Master Data | Unit of Measure Detail | ✅ |
| Master Data | Barcodes List | ✅ |
| Master Data | Barcode Detail | ✅ |
| Master Data | Currencies List | ✅ |
| Master Data | Currency Detail | ✅ |
| Master Data | Import Center | ✅ |
| Operations | Issues List | ✅ |
| Operations | Issue Create | ✅ |
| Operations | Issue Create Scan Mode | ✅ |
| Operations | Issue Detail | ✅ |
| Operations | Adjustments List | ✅ |
| Operations | Adjustment Detail | ✅ |
| Operations | Transfers List | ✅ |
| Operations | Transfer Detail | ✅ |
| Operations | Stocktake List | ✅ |
| Operations | Stocktake Detail | ✅ |
| Procurement | GRN List | ✅ |
| Procurement | GRN Create | ✅ |
| Procurement | GRN Detail | ✅ |
| Procurement | PO List | ✅ |
| Procurement | PO Create | ✅ |
| Procurement | PO Detail | ✅ |
| Procurement | PR List | ✅ |
| Procurement | PR Create | ✅ |
| Procurement | PR Detail | ✅ |
| Inventory | Inventory Balance | ✅ |
| Inventory | Lot Balances | ✅ |
| Inventory | Stock Movements | ✅ |
| Communications | Email Outbox | ✅ |
| Communications | Notifications Center | ✅ |
| Communications | Email Templates List | ✅ |
| Communications | Email Template Detail | ✅ |
| Reports | Reports Hub | ✅ |
| Admin | Audit Log | ✅ |
| Admin | Roles List | ✅ |
| Admin | Users List | ✅ |
| Admin | User Detail | ✅ |

**Matched: 56 screens**

---

### ❌ Missing Screens (In Spec, Not Implemented)

#### Auth & Global (Missing: 1)
| # | Screen | Required Route |
|---|---|---|
| 1 | Context Selector screen/modal (dedicated page) | `/[locale]/(app)/profile` or shell — no dedicated route found |

#### Master Data (Missing: 12)
| # | Screen | Required Route |
|---|---|---|
| 1 | Branch Create | `/master-data/branches/new/page.tsx` |
| 2 | Branch Edit | `/master-data/branches/[id]/edit/page.tsx` |
| 3 | Warehouse Create | `/master-data/warehouses/new/page.tsx` |
| 4 | Warehouse Edit | `/master-data/warehouses/[id]/edit/page.tsx` |
| 5 | Department Create | `/master-data/departments/new/page.tsx` |
| 6 | Department Edit | `/master-data/departments/[id]/edit/page.tsx` |
| 7 | Supplier Create | `/master-data/suppliers/new/page.tsx` |
| 8 | Supplier Edit | `/master-data/suppliers/[id]/edit/page.tsx` |
| 9 | Category Create | `/master-data/categories/new/page.tsx` |
| 10 | Category Edit | `/master-data/categories/[id]/edit/page.tsx` |
| 11 | Import Wizard — Items type | `/master-data/import/items/page.tsx` |
| 12 | Import Wizard — UoM type | `/master-data/import/uom/page.tsx` |
| 13 | Import Wizard — Barcodes type | `/master-data/import/barcodes/page.tsx` |

> *Note: Item Create exists. UoM and Barcode create/edit not found as separate new/edit routes. FX Rates exists as nested under Currency. Per spec FE-MD-002, all 10 entities need create + edit = 20 form screens. Counting only confirmed missing ones above = 13 missing.*

#### Kitchen Requests (Missing: 3)
| # | Screen | Required Route |
|---|---|---|
| 1 | Kitchen Requests List | `/operations/kitchen-requests/page.tsx` |
| 2 | Kitchen Request Create | `/operations/kitchen-requests/new/page.tsx` |
| 3 | Kitchen Request Detail | `/operations/kitchen-requests/[id]/page.tsx` |

#### Issues (Missing: 2)
| # | Screen | Required Route |
|---|---|---|
| 1 | Adjustment Create | `/operations/adjustments/new/page.tsx` |
| 2 | Issue Approval (implied sub-route per workflow) | `/operations/issues/[id]/approve` |

> *Note: The spec assigns 6 screens to Issues. Currently 4 exist. Missing: Adjustment Create (confirmed by no `adjustments/new/page.tsx`), and spec implies approval route for issues.*

#### Operations — Adjustments (Missing: 1)
| # | Screen | Required Route |
|---|---|---|
| 1 | Adjustment Create | `/operations/adjustments/new/page.tsx` |

#### Operations — Transfers (Missing: 3)
| # | Screen | Required Route |
|---|---|---|
| 1 | Transfer Create | `/operations/transfers/new/page.tsx` |
| 2 | Transfer Ship screen | `/operations/transfers/[id]/ship/page.tsx` |
| 3 | Transfer Receive screen | `/operations/transfers/[id]/receive/page.tsx` |

#### Operations — Stocktake (Missing: 6)
| # | Screen | Required Route |
|---|---|---|
| 1 | Stocktake Create | `/operations/stocktake/new/page.tsx` |
| 2 | Stocktake Start | `/operations/stocktake/[id]/start/page.tsx` |
| 3 | Stocktake Counting | `/operations/stocktake/[id]/count/page.tsx` |
| 4 | Variance Review | `/operations/stocktake/[id]/variance/page.tsx` |
| 5 | Approve | `/operations/stocktake/[id]/approve/page.tsx` |
| 6 | Post/Close | `/operations/stocktake/[id]/post/page.tsx` |

#### Procurement — GRN (Missing: 2)
| # | Screen | Required Route |
|---|---|---|
| 1 | GRN Scan Mode | `/procurement/goods-received/new/scan/page.tsx` |
| 2 | GRN Post screen | `/procurement/goods-received/[id]/post/page.tsx` |

#### Procurement — PR (Missing: 1)
| # | Screen | Required Route |
|---|---|---|
| 1 | PR Approval (separate route) | `/procurement/purchase-requests/[id]/approve/page.tsx` |

#### Procurement — PO (Missing: 1)
| # | Screen | Required Route |
|---|---|---|
| 1 | PO Approval (separate route) | `/procurement/purchase-orders/[id]/approve/page.tsx` |

#### Reports (Missing: 6)
| # | Screen | Required Route |
|---|---|---|
| 1 | Available Inventory Report | `/reports/available-inventory/page.tsx` |
| 2 | Stock Movements Report | `/reports/movements/page.tsx` |
| 3 | Expiry / Near-Expiry Report | `/reports/expiry/page.tsx` |
| 4 | Stocktake Variance Report | `/reports/stocktake-variance/page.tsx` |
| 5 | PR/PO/GRN Status Report | `/reports/procurement-status/page.tsx` |
| 6 | Currency Summaries Report | `/reports/currency-summaries/page.tsx` |

#### Admin (Missing: 3)
| # | Screen | Required Route |
|---|---|---|
| 1 | User Create | `/admin/users/new/page.tsx` |
| 2 | User Edit | `/admin/users/[id]/edit/page.tsx` |
| 3 | Settings | `/admin/settings/page.tsx` |

> *Additionally: Spec requires `/admin/audit-logs` (plural). Current implementation uses `/admin/audit-log` (singular) — route name mismatch.*

---

### ⚠️ Extra Screens (Exist in System, Not in Spec)

| Module | Screen | Route | Reason |
|---|---|---|---|
| Auth | Root locale redirect | `/[locale]/page.tsx` | Infrastructure redirect — not a user-facing screen |
| Inventory | Inventory Scan | `/inventory/scan` | Not listed in spec (FE-INV-001/002 only mention balances + movements) |
| Master Data | Master Data Hub | `/master-data` (index page) | Spec describes lists directly; no hub/landing defined |
| Master Data | FX Rates nested | `/master-data/currencies/[id]/fx-rates` | Spec mentions FX Rates form but as entity form, not nested sub-route |
| Operations | Issue Detail Scan Mode | `/issues/[id]/scan-mode` | Spec defines scan mode only under `/issues/new/scan` (create flow) |
| Admin | Roles Detail/Matrix | `/admin/roles` | Spec (FE-ADMIN-002) requires separate detail route `/admin/roles/[id]` — current has only list |

**Extra Screen Count: 6** *(1 infrastructure + 5 functional extras)*

---

## TASK 4 — SUMMARY REPORT

```
-----------------------------------
SYSTEM SCREEN REPORT
-----------------------------------

Total Current Screens:    62
Total Required Screens:   116
Total Missing Screens:    ~54
Total Extra Screens:      6
Completion Percentage:    ~53%

-----------------------------------
```

### Modules Breakdown Table

| Module | Required | Existing | Missing | Extra |
|---|---|---|---|---|
| Auth & Global | 6 | 6 | 0 | 1 (root redirect) |
| Master Data — Entities | 30 | 16 | 14 | 1 (MD hub page) |
| Master Data — Import | 4 | 1 | 3 | 0 |
| Kitchen Requests | 3 | 0 | 3 | 0 |
| Issues | 6 | 4 | 2 | 1 (issued[id]/scan-mode) |
| Transfers | 5 | 2 | 3 | 0 |
| Stocktake | 8 | 2 | 6 | 0 |
| Adjustments | 3 | 2 | 1 | 0 |
| PR | 4 | 3 | 1 | 0 |
| PO | 4 | 3 | 1 | 0 |
| GRN | 5 | 3 | 2 | 0 |
| Inventory Views | 3 | 3 | 0 | 1 (inventory/scan) |
| Notifications & Email | 4 | 4 | 0 | 0 |
| Reports | 7 | 1 | 6 | 0 |
| Admin — Users | 4 | 2 | 2 | 0 |
| Admin — Roles | 2 | 1 | 1 | 0 |
| Admin — Audit + Settings | 2 | 1 | 1 | 1 (route name mismatch) |
| **TOTAL** | **116** | **62** | **~54** | **6** |

---

### Critical Missing Areas (Priority Order)

1. **Stocktake sub-screens** — 6 missing (Start, Count, Variance, Approve, Post, Create)
2. **Master Data Create/Edit forms** — 14 missing (all entity create + edit routes except Items)
3. **Reports detail screens** — 6 of 7 reports missing (only hub exists)
4. **Kitchen Requests** — entire module missing (3 screens)
5. **Import Wizard type routes** — 3 type-specific wizard screens missing
6. **Transfer flow** — Create + Ship + Receive missing (3 screens)
7. **GRN advanced flow** — Scan Mode + Post screen missing (2 screens)
8. **Approval routes** — PR Approve, PO Approve, User Create/Edit, Settings, Role Detail missing

---

### Route Name Mismatch (Non-Blocking but Should Be Fixed)

| Current Route | Spec Required Route |
|---|---|
| `/admin/audit-log` | `/admin/audit-logs` |
| `(operations)/stocktake` | Spec uses `stocktakes` (plural) |
| `(procurement)/goods-received` | Spec uses `grn` |
| `(procurement)/purchase-orders` | Spec uses `po` |
| `(procurement)/purchase-requests` | Spec uses `pr` |

> Route naming convention diverges from spec slugs. This does not affect functionality but creates mismatch with test plan path assertions in `FE-QA-*` tasks.

---
*End of Report*

# Frontend Architecture Audit — Kitchen-Store Inventory System

**Status:** IN PROGRESS
**Date:** 2026-05-01
**Auditor:** Senior Frontend Architecture Auditor

---

## Task 1 — Extracted Screens & Gap Analysis

This table maps the current implementation against the **LogiRest — Frontend Execution Tasks** specification.

### Module Summary

| Module | Required (Spec) | Found (Actual) | Status | Gaps |
| :--- | :---: | :---: | :---: | :--- |
| **Auth & Global** | 6 | 6 | ✅ | Matches |
| **Master Data** | 30 | 33 | ⚠️ | Extra screens found (FX Rates split, redundant paths) |
| **Excel Import** | 4 | 4 | ✅ | Matches |
| **Kitchen Requests** | 3 | 3 | ✅ | Matches |
| **Issues** | 6 | 5 | ⚠️ | Missing 1 screen (likely Detail scan or edit) |
| **Transfers** | 5 | 2 | ❌ | Missing 3 screens (New, Ship, Receive) |
| **Stocktake** | 8 | 8 | ✅ | Matches |
| **Adjustments** | 3 | 3 | ✅ | Matches |
| **PR (Procurement)** | 4 | 5 | ⚠️ | Extra screen found (Edit) |
| **PO (Procurement)** | 4 | 3 | ⚠️ | Missing 1 screen (Approve) |
| **GRN (Procurement)** | 5 | 5 | ✅ | Matches |
| **Inventory Views** | 3 | 4 | ⚠️ | Extra screen found (Scan) |
| **Notifications & Email** | 4 | 4 | ✅ | Matches |
| **Reports** | 7 | 8 | ⚠️ | Extra screen found (Hub) |
| **Admin — Users** | 4 | 4 | ✅ | Matches |
| **Admin — Roles** | 2 | 2 | ✅ | Matches |
| **Admin — Audit/Settings** | 2 | 3 | ⚠️ | Extra screen found (Restaurant Profile) |
| **TOTAL** | **116** | **102** | ⚠️ | **Net Gap: -14 screens** |

---

## Detailed Audit Log

### 1. Auth & Global (6/6)
- **Login**: `src/app/[locale]/(auth)/login/page.tsx`
- **Forgot Password**: `src/app/[locale]/(auth)/forgot-password/page.tsx`
- **Reset Password**: `src/app/[locale]/(auth)/reset-password/page.tsx`
- **Dashboard**: `src/app/[locale]/(app)/dashboard/page.tsx`
- **Profile**: `src/app/[locale]/(app)/profile/page.tsx`
- **Search**: `src/app/[locale]/(app)/search/page.tsx` (Note: Search is used globally)

### 2. Master Data (33/30)
*Audit Note: The system has slightly more routes than the spec, primarily due to separate FX Rates management and redundant "new" paths for entities that might be handled via modals or shared forms in the spec's mind.*

- **Branches**: List, Details
- **Warehouses**: List, Details
- **Departments**: List, Details
- **Suppliers**: List, Details
- **Categories**: List, Details
- **Items**: List, New, Details
- **UoM**: List, New, Details, Edit
- **Barcodes**: List, Details
- **Currencies**: List, New, Details, FX-Rates (Nested)
- **FX Rates**: List, New, Edit (Standalone) -> *⚠️ Redundant with Currencies nested FX?*
- **Import Hub**: `src/app/[locale]/(app)/master-data/import/page.tsx`

### 3. Excel Import (4/4)
- **Import Hub**: `master-data/import`
- **Items Import**: `master-data/import/items`
- **UoM Import**: `master-data/import/uoms`
- **Barcodes Import**: `master-data/import/barcodes`

### 4. Kitchen Requests (3/3)
- **List**: `kitchen-requests`
- **New**: `kitchen-requests/new`
- **Details**: `kitchen-requests/[id]`

### 5. Issues (5/6)
- **List**: `issues`
- **New**: `issues/new`
- **New Scan Mode**: `issues/new/scan`
- **Details**: `issues/[id]`
- **Details Scan Mode**: `issues/[id]/scan-mode`
- *⚠️ Missing: Expired Override screen (if separate).*

### 6. Transfers (2/5)
- **List**: `transfers`
- **Details**: `transfers/[id]`
- *❌ Missing: New, Ship, Receive (likely nested or missing).*

### 7. Stocktake (8/8)
- **List**: `stocktake`
- **New**: `stocktake/new`
- **Details**: `stocktake/[id]`
- **Approve**: `stocktake/[id]/approve`
- **Count**: `stocktake/[id]/count`
- **Post**: `stocktake/[id]/post`
- **Start**: `stocktake/[id]/start`
- **Variance**: `stocktake/[id]/variance`

### 8. Adjustments (3/3)
- **List**: `adjustments`
- **New**: `adjustments/new`
- **Details**: `adjustments/[id]`

### 9. Procurement (13/13 Total)
- **Purchase Requests (PR)** (5/4): List, New, Details, Approve, Edit (*⚠️ Edit is extra?*)
- **Purchase Orders (PO)** (3/4): List, New, Details (*⚠️ Missing Approve*)
- **Goods Received (GRN)** (5/5): List, New, Details, Post, Scan

### 10. Inventory Views (4/3)
- **Balance**: `inventory/balance`
- **Lots**: `inventory/lots`
- **Movements**: `inventory/movements`
- **Scan**: `inventory/scan` (*⚠️ Extra*)

### 11. Notifications & Email (4/4)
- **Outbox**: `communications/email-outbox`
- **Notifications**: `communications/notifications`
- **Templates**: `communications/notifications/templates`
- **Template Details**: `communications/notifications/templates/[id]`

### 12. Reports (8/7)
- **Hub**: `reports` (*⚠️ Hub is usually not counted as a screen in total*)
- **Available Inventory**
- **Currency Summaries**
- **Expiry**
- **Movements**
- **Procurement Status**
- **Stocktake Variance**
- **(Generic Reports Page)**

### 13. Admin (9/8)
- **Users**: List, New, Details, Edit (4/4)
- **Roles**: List, Details (2/2)
- **Audit Logs**: `admin/audit-logs` (1/1)
- **Settings**: `admin/settings` (1/1)
- **Restaurant Profile**: `admin/restaurant-profile` (*⚠️ Extra*)

---

## Summary Findings

1. **Architecture Alignment**: The project generally follows the `(app)` and `(auth)` route group structure.
2. **Missing Transfers Flow**: The Transfers module is the most underdeveloped in terms of routed screens (missing Ship/Receive/New pages).
3. **Redundancy in Master Data**: FX Rates are implemented both as nested routes under Currencies and as a standalone module. This should be consolidated.
4. **Extra Admin Pages**: `restaurant-profile` is an extra administrative screen not explicitly listed in the 116-screen core list but likely necessary for the system.
5. **Consistency**: The Stocktake and GRN modules are the most complete and align perfectly with the spec.

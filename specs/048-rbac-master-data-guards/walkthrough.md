# Walkthrough: RBAC Master-Data Controller Guards

This document summarizes the changes made to secure the master-data layer and restrict financial information in valuation reports.

## Changes Made

### 1. API Security Guards & Logging
* **[roles.guard.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/auth/guards/roles.guard.ts)**: Configured a structured logger to emit a `WARN` message on every 403 authorization failure containing user role, HTTP method, and requested endpoint path. No PII is included in the logged warnings.

### 2. Master-Data API Controllers
Applied declarative `@Roles(...)` and `RolesGuard` settings, and removed manual ad-hoc checks from method bodies:
* **[items.controller.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/modules/master-data/items/items.controller.ts)**: Added `@Roles(Role.ADMIN, Role.GM)` to mutating handlers.
* **[departments.controller.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/modules/master-data/departments/departments.controller.ts)**: Added `@Roles(Role.ADMIN, Role.GM)` to mutating handlers.
* **[barcodes.controller.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/modules/master-data/barcodes/barcodes.controller.ts)**: Added `@Roles(Role.ADMIN, Role.GM)` to mutating handlers.
* **[uom.controller.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/modules/master-data/units-of-measure/uom.controller.ts)**: Added `@Roles(Role.ADMIN, Role.GM)` to mutating handlers.
* **[fx-rates.controller.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/modules/master-data/fx-rates/fx-rates.controller.ts)**: Restricted write endpoint to `ADMIN`, `GM`, and `PROC_MGR`. Restricted read endpoint to financial-access roles (`ADMIN`, `GM`, `INV_MGR`, `STORE_MGR`, `BRANCH_MGR`, `PROC_MGR`, `PROC_OFFICER`, `AUDITOR`, `APPROVER`).
* **[variance-reasons.controller.ts](file:///c:/kitchen-store-inventory-system/apps/api/src/modules/master-data/variance-reasons/variance-reasons.controller.ts)**: Added `RolesGuard` to the controller decorators list.

### 3. Frontend Valuation Table Masking
* **[valuation-table.tsx](file:///c:/kitchen-store-inventory-system/apps/web/src/features/reports/components/valuation-table.tsx)**: Imported `useColumnVisibility` and conditionally masked `unitCost` and `totalValue` columns based on the current user role permissions.

---

## Verification Results

### 1. Type-Checking
TypeScript type-checks passed cleanly on both applications with absolutely zero errors:
* Backend: `npm run typecheck --workspace=apps/api` (✓ PASS)
* Frontend: `npm run typecheck --workspace=apps/web` (✓ PASS)

### 2. Linting
Code linting tools ran and passed successfully on all modified files:
* Backend: `npx eslint` in `apps/api` workspace (✓ PASS)
* Frontend: `npx eslint` in `apps/web` workspace (✓ PASS)

### 3. Unit Tests
* Ran all 443 backend unit tests successfully (✓ 100% PASS).

---

## Phase 2 — 🔴 Critical: Workflow Engine Desynchronization

### Changes Made
* **[document-engine.ts](file:///c:/kitchen-store-inventory-system/packages/shared-types/src/workflow/document-engine.ts)**:
  * Added `BRANCH_MGR` to allowed roles for `adjustment` transitions:
    * `DRAFT` → `SUBMIT` & `CANCEL`
    * `SUBMITTED` → `APPROVE` & `REJECT`
  * Added `BRANCH_MGR` to allowed roles for `stocktake` transitions:
    * `DRAFT` → `START` & `CANCEL`
    * `REVIEW` → `APPROVE` & `CANCEL`

### Verification Results
* Typechecked `@logirest/shared-types` workspace successfully (✓ PASS).
* Re-verified full type-checks on `apps/api` and `apps/web` successfully (✓ PASS).

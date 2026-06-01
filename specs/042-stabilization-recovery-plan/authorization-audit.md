# Authorization Audit Report

**Date**: 2026-05-31  
**Scope**: All NestJS controller endpoints in `apps/api`  
**Method**: Static analysis of decorators, guards, and inline role/scope checks

---

## Infrastructure Summary

**Global guards** (registered as `APP_GUARD` in `app.module.ts`):

| Order | Guard | Effect |
|---|---|---|
| 1 | `ThrottlerGuard` | Rate limiting |
| 2 | `CsrfGuard` | CSRF protection |
| 3 | `JwtAuthGuard` | JWT verification — **skipped if `@Public()`** |
| 4 | `IdempotencyGuard` | Idempotency key check |
| 5 | `WarehouseLockGuard` | Blocks mutations if warehouse is locked |

**`ScopeInterceptor`** populates `request.activeScope` (`{warehouseId, branchId}`) from the JWT. The `@ActiveScope()` decorator reads from this. This is the only warehouse/branch restriction mechanism.

**`WorkflowStateGuard`** — validates document status transitions and calls `verifyRolePermission()` from the workflow service. Only active when `@WorkflowAction()` is present.

---

## Endpoint Authorization Matrix

### Legend

- **Auth**: JWT required | **Public**: no auth
- **Role Check**: inline `if (role !== ...)` | **Workflow**: via WorkflowStateGuard | **None**
- **Scope**: `@ActiveScope` filters by user's assigned warehouse | **None**
- **WH Lock**: blocked by `WarehouseLockGuard` for mutating methods | **Bypassed**: `@BypassWarehouseLock`
- **Branch**: enforced via scope or DB join | **None**

---

### `auth.controller.ts` — `/auth`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | Notes |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | **Public** | None | None | N/A | Throttled 5/min |
| POST | `/auth/refresh` | **Public** | None | None | N/A | Throttled 10/min |
| POST | `/auth/logout` | **Public** | None | None | N/A | |
| GET | `/auth/me` | JWT | None | None | N/A | Any authenticated user |
| PUT | `/auth/profile` | JWT | None | None | N/A | Any authenticated user |
| POST | `/auth/profile/avatar` | JWT | None | None | N/A | Any authenticated user |
| POST | `/auth/forgot-password` | **Public** | None | None | N/A | |
| POST | `/auth/reset-password` | **Public** | None | None | N/A | |

---

### `app.controller.ts` — `/`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/` | **Public** | None | None | N/A |
| POST | `/test-validation` | **Public** | None | None | N/A |
| GET | `/test-scope` | JWT | None | None | N/A |

---

### `health.controller.ts` — `/health`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/health` | **Public** | None | None | N/A |
| GET | `/health/backup` | **Public** | None | None | N/A |

---

### `metrics.controller.ts` — `/metrics`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/metrics` | **Public** | None | None | N/A |

---

### `admin.controller.ts` — `/admin`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/admin/roles` | JWT | **ADMIN only** | None | N/A |
| GET | `/admin/system/email-status` | JWT | **ADMIN only** | None | N/A |
| GET | `/admin/reconciliation-runs` | JWT | **ADMIN only** | None | N/A |
| GET | `/admin/settings` | JWT | **ADMIN only** | None | N/A |
| PUT | `/admin/settings` | JWT | **ADMIN only** | None | Safe (GET bypass) |
| POST | `/admin/settings/test-email` | JWT | **ADMIN only** | None | Yes |
| GET | `/admin/outbox/failed` | JWT | **ADMIN only** | None | N/A |
| POST | `/admin/outbox/:id/retry` | JWT | **ADMIN only** | None | Yes |
| GET | `/admin/inventory/frozen` | JWT | **ADMIN only** | None | N/A |
| POST | `/admin/inventory/:id/unfreeze` | JWT | **ADMIN only** | None | Yes |
| GET | `/admin/users` | JWT | **ADMIN only** | None | N/A |
| GET | `/admin/users/:id` | JWT | **ADMIN only** | None | N/A |
| POST | `/admin/users/:id/unlock` | JWT | **ADMIN only** | None | Yes |

---

### `audit-logs.controller.ts` — `/admin/audit-logs`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/admin/audit-logs` | JWT | **ADMIN, INV_MGR, AUDITOR** | None | N/A |

---

### `backup.controller.ts` — `/backup`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/backup/run` | JWT | **ADMIN only** | None | Yes (no bypass) |

---

### `dashboard.controller.ts` (admin module) — `/dashboard`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | **CRITICAL** |
|---|---|---|---|---|---|---|
| GET | `/dashboard/stats` | **None** | **None** | None | N/A | **UNAUTHENTICATED** |

> `DashboardController` in `modules/admin/dashboard.controller.ts` has no `@UseGuards` and no `@Public()`. The global `JwtAuthGuard` **is** applied globally, so requests without tokens will be rejected — **however**, this controller accepts a `?role` query parameter from the client and passes it directly to the service, which is a logic flaw (see escalation paths below).

---

### `dashboard.controller.ts` (reports module) — `/dashboard`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/dashboard/stats` | JWT | None | `@ActiveScope` | N/A |

> There are **two controllers** mapped to `GET /dashboard/stats`. NestJS resolves this by last-registered module. This routing conflict is itself a vulnerability.

---

### `reports.controller.ts` — `/reports`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/reports/kpis` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/dashboard` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/adjustments/summary` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/transfers/overdue` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/available-inventory` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/movements` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/expiry` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/stocktake-variance` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/procurement-status` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/currency-summaries` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/wac-history` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/lot-trace` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/count` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/movements/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/expiry/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/available-inventory/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/stocktake-variance/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/procurement-status/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/wac-history/export` | JWT | None | `@ActiveScope` | N/A |
| GET | `/reports/lot-trace/export` | JWT | None | `@ActiveScope` | N/A |

---

### `inventory.controller.ts` — `/inventory` and `/items`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/inventory/balance` | JWT | None | `@ActiveScope` | N/A |
| GET | `/inventory/lots` | JWT | None | `@ActiveScope` | N/A |
| GET | `/inventory/movements` | JWT | None | `@ActiveScope` | N/A |
| GET | `/inventory/warehouses/:id/lock` | JWT | None | None | N/A |
| PATCH | `/inventory/:id/unfreeze` | JWT | **ADMIN only** | `@ActiveScope` | Yes |
| GET | `/items/scan` | JWT | None | `@ActiveScope` | N/A |

---

### `lots.controller.ts` — `/lots`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| PATCH | `/lots/:id/quarantine` | JWT | **ADMIN or INV_MGR** | None | Yes |
| PATCH | `/lots/:id/release-quarantine` | JWT | **ADMIN or INV_MGR** | None | Yes |

> No scope check: any ADMIN/INV_MGR can quarantine any lot across all warehouses regardless of their assigned scope.

---

### `warehouses-direct.controller.ts` — `/warehouses`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/warehouses` | JWT | None (filtered by scope for non-ADMIN) | DB scope filter | N/A |
| GET | `/warehouses/:id` | JWT | Scope check (non-ADMIN) | DB scope check | N/A |
| POST | `/warehouses` | JWT | **ADMIN or GM** | None | Yes |
| PUT | `/warehouses/:id` | JWT | **ADMIN or GM** | None | Yes |
| DELETE | `/warehouses/:id` | JWT | **ADMIN or GM** | None | Yes |
| POST | `/warehouses/:id/archive` | JWT | **ADMIN or GM** | None | Yes |

---

### `branches.controller.ts` — `/branches`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/branches` | JWT | None (filtered for non-ADMIN) | DB scope filter | N/A |
| GET | `/branches/:id` | JWT | Scope check (non-ADMIN) | DB scope check | N/A |
| POST | `/branches` | JWT | **ADMIN or GM** | None | Yes |
| PUT | `/branches/:id` | JWT | **ADMIN or GM** | None | Yes |
| DELETE | `/branches/:id` | JWT | **ADMIN or GM** | None | Yes |

---

### `items.controller.ts` — `/items` and `/master-data/items`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/items` | JWT | None | None | N/A |
| GET | `/items/:id` | JWT | None | None | N/A |
| POST | `/items` | JWT | **ADMIN or GM** | None | Yes |
| PUT | `/items/:id` | JWT | **ADMIN or GM** | None | Yes |
| DELETE | `/items/:id` | JWT | **ADMIN or GM** | None | Yes |

---

### `suppliers.controller.ts` — `/suppliers` and `/master-data/suppliers`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | **CRITICAL** |
|---|---|---|---|---|---|---|
| GET | `/suppliers` | JWT | **None** | None | N/A | |
| GET | `/suppliers/:id` | JWT | **None** | None | N/A | |
| POST | `/suppliers` | JWT | **None** | None | Yes | **Any role can create** |
| PUT | `/suppliers/:id` | JWT | **None** | None | Yes | **Any role can update** |
| DELETE | `/suppliers/:id` | JWT | **None** | None | Yes | **Any role can delete** |

---

### `currencies.controller.ts` — `/currencies` and `/master-data/currencies`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | **CRITICAL** |
|---|---|---|---|---|---|---|
| GET | `/currencies` | JWT | **None** | None | N/A | |
| GET | `/currencies/:id` | JWT | **None** | None | N/A | |
| POST | `/currencies` | JWT | **None** | None | Yes | **Any role can create** |
| PUT | `/currencies/:id` | JWT | **None** | None | Yes | **Any role can modify** |
| DELETE | `/currencies/:id` | JWT | **None** | None | Yes | **Any role can delete** |

---

### `categories.controller.ts` — `/categories` and `/master-data/categories`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | **CRITICAL** |
|---|---|---|---|---|---|---|
| GET | `/categories` | JWT | **None** | None | N/A | |
| GET | `/categories/:id` | JWT | **None** | None | N/A | |
| POST | `/categories` | JWT | **None** | None | Yes | **Any role can create** |
| PUT | `/categories/:id` | JWT | **None** | None | Yes | **Any role can modify** |
| DELETE | `/categories/:id` | JWT | **None** | None | Yes | **Any role can delete** |

---

### `purchase-requests.controller.ts` — `/procurement/purchase-requests`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/procurement/purchase-requests` | JWT | None | None | Yes |
| GET | `/procurement/purchase-requests` | JWT | None | `@ActiveScope` | N/A |
| GET | `/procurement/purchase-requests/:id` | JWT | None | None | N/A |
| PUT | `/procurement/purchase-requests/:id` | JWT | None | None | Yes |
| DELETE | `/procurement/purchase-requests/:id` | JWT | None | None | Yes |
| POST | `/procurement/purchase-requests/:id/submit` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-requests/:id/approve` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-requests/:id/reject` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-requests/:id/cancel` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-requests/:id/convert-to-po` | JWT | **Workflow** | None | Yes |

> PR create/update/delete have **no role restriction** — any authenticated user can create or delete a purchase request.

---

### `po.controller.ts` — `/procurement/purchase-orders`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/procurement/purchase-orders` | JWT | None | None | Yes |
| GET | `/procurement/purchase-orders` | JWT | None | `@ActiveScope` | N/A |
| GET | `/procurement/purchase-orders/:id` | JWT | None | None | N/A |
| PUT | `/procurement/purchase-orders/:id` | JWT | None | None | Yes |
| DELETE | `/procurement/purchase-orders/:id` | JWT | None | None | Yes |
| POST | `/procurement/purchase-orders/:id/submit` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-orders/:id/approve` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-orders/:id/reject` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-orders/:id/cancel` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-orders/:id/post` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/purchase-orders/:id/email` | JWT | None | None | Yes |

> PO create/update/delete/email have **no role restriction**.

---

### `grn.controller.ts` — `/procurement/grns`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/procurement/grns` | JWT | None | None | Yes |
| GET | `/procurement/grns` | JWT | None | `@ActiveScope` | N/A |
| GET | `/procurement/grns/:id` | JWT | None | None | N/A |
| PUT | `/procurement/grns/:id` | JWT | None | None | Yes |
| DELETE | `/procurement/grns/:id` | JWT | None | None | Yes |
| POST | `/procurement/grns/:id/post` | JWT | **Workflow** | None | Yes |
| POST | `/procurement/grns/:id/cancel` | JWT | **Workflow** | None | Yes |

---

### `issues.controller.ts` — `/operations/issues`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/operations/issues` | JWT | None | `@ActiveScope` (mandatory) | Yes |
| GET | `/operations/issues` | JWT | None | `@ActiveScope` | N/A |
| GET | `/operations/issues/:id` | JWT | None | None | N/A |
| POST | `/operations/issues/:id/submit` | JWT | **Workflow** | None | Yes |
| POST | `/operations/issues/:id/cancel` | JWT | **Workflow** | None | Yes |
| POST | `/operations/issues/:id/post` | JWT | **Workflow** | None | Yes |

---

### `transfers.controller.ts` — `/operations/transfers`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/operations/transfers` | JWT | None | None | Yes |
| GET | `/operations/transfers` | JWT | None | `@ActiveScope` | N/A |
| GET | `/operations/transfers/summary` | JWT | None | `@ActiveScope` | N/A |
| GET | `/operations/transfers/:id` | JWT | None | None | N/A |
| POST | `/operations/transfers/:id/ship` | JWT | **Workflow** | None | Yes |
| POST | `/operations/transfers/:id/receive` | JWT | **Workflow** | None | Yes |
| POST | `/operations/transfers/:id/cancel` | JWT | **Workflow** | None | Yes |
| POST | `/operations/transfers/:id/post` | JWT | **Workflow** | None | Yes |

> Transfer create has **no role restriction and no scope enforcement** — any authenticated user can initiate a transfer between any two warehouses.

---

### `adjustments.controller.ts` — `/operations/adjustments`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/operations/adjustments` | JWT | None | None | Yes |
| GET | `/operations/adjustments` | JWT | None | `@ActiveScope` | N/A |
| GET | `/operations/adjustments/summary` | JWT | None | `@ActiveScope` | N/A |
| GET | `/operations/adjustments/:id` | JWT | None | None | N/A |
| PUT | `/operations/adjustments/:id` | JWT | None | None | Yes |
| POST | `/operations/adjustments/:id/edit` | JWT | None | None | Yes |
| POST | `/operations/adjustments/:id/submit` | JWT | **Workflow** | None | Yes |
| POST | `/operations/adjustments/:id/approve` | JWT | **Workflow** | None | Yes |
| POST | `/operations/adjustments/:id/reject` | JWT | **Workflow** | None | Yes |
| POST | `/operations/adjustments/:id/cancel` | JWT | **Workflow** | None | Yes |
| POST | `/operations/adjustments/:id/post` | JWT | **Workflow** | None | Yes |

---

### `stocktake.controller.ts` — `/stocktake/sessions`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/stocktake/sessions` | JWT | None | None | Yes (wh in body) |
| GET | `/stocktake/sessions` | JWT | None | `@ActiveScope` | N/A |
| GET | `/stocktake/sessions/summary` | JWT | None | `@ActiveScope` | N/A |
| GET | `/stocktake/sessions/:id` | JWT | None | None | N/A |
| PUT | `/stocktake/sessions/:id/items/:lineId` | JWT | None | None | Yes |
| PUT | `/stocktake/sessions/:id/counts/:countId` | JWT | None | None | Yes |
| POST | `/stocktake/sessions/:id/start` | JWT | **Workflow** | None | Yes |
| POST | `/stocktake/sessions/:id/count` | JWT | None | None | Yes |
| POST | `/stocktake/sessions/:id/submit` | JWT | **Workflow** | None | Yes |
| POST | `/stocktake/sessions/:id/approve` | JWT | **Workflow** | None | Yes |
| POST | `/stocktake/sessions/:id/reject` | JWT | **Workflow** | None | Yes |
| POST | `/stocktake/sessions/:id/recount` | JWT | None | None | Yes |
| POST | `/stocktake/sessions/:id/review_variance` | JWT | None | None | Yes |
| POST | `/stocktake/sessions/:id/cancel` | JWT | **Workflow** | None | Yes |
| POST | `/stocktake/sessions/:id/post` | JWT | **Workflow** | None | Yes |

---

### `kitchen-requests.controller.ts` — `/operations/kitchen-requests`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/operations/kitchen-requests` | JWT | None | None | Yes |
| GET | `/operations/kitchen-requests` | JWT | None | `@ActiveScope` | N/A |
| GET | `/operations/kitchen-requests/:id` | JWT | None | None | N/A |
| POST | `/operations/kitchen-requests/:id/submit` | JWT | **Workflow** | None | Yes |
| POST | `/operations/kitchen-requests/:id/fulfill` | JWT | **Workflow** | None | Yes |
| POST | `/operations/kitchen-requests/:id/cancel` | JWT | **Workflow** | None | Yes |

---

### `operations.controller.ts` — `/operations`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/operations/lots-available` | JWT | None | None | N/A |
| POST | `/operations/:docType/:id/void` | JWT | **ADMIN or INV_MGR** | None | Yes |

---

### `warehouse-lock.controller.ts` — `/warehouse-locks`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| POST | `/warehouse-locks/:id/force-unlock` | JWT | **ADMIN only** | None | Yes |
| POST | `/warehouse-locks/:id/unlock` | JWT | **ADMIN or INV_MGR** | None | Yes |

---

### `notifications.controller.ts` — `/notifications`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | **CRITICAL** |
|---|---|---|---|---|---|---|
| GET | `/notifications` | JWT | None | `@ActiveScope` | N/A | |
| PATCH | `/notifications/:id/read` | JWT | None | **None** | Yes | **Any user can mark any notification as read** |
| POST | `/notifications/read-all` | JWT | None | `@ActiveScope` | Yes | |
| GET | `/notifications/outbox` | JWT | None | None | N/A | **All outbox events to any authenticated user** |
| GET | `/notifications/parameter-registry` | JWT | None | None | N/A | |
| GET | `/notifications/trigger-events` | JWT | None | None | N/A | |
| GET | `/notifications/templates` | JWT | None | None | N/A | |
| GET | `/notifications/templates/:id` | JWT | None | None | N/A | |
| POST | `/notifications/templates` | JWT | **None** | None | Yes | **Any role can create templates** |
| PUT | `/notifications/templates/:id` | JWT | **None** | None | Yes | **Any role can modify templates** |
| DELETE | `/notifications/templates/:id` | JWT | **None** | None | Yes | **Any role can delete templates** |

---

### `search.controller.ts` — `/search`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock |
|---|---|---|---|---|---|
| GET | `/search` | JWT | None | None | N/A |

> Search returns items, suppliers, lots, GRNs, POs, transfers, and issues from **all branches and warehouses** — no scope filtering.

---

### `yield.controller.ts` — `/operations/yield`

| Method | Endpoint | Auth | Role Check | Scope | WH Lock | **CRITICAL** |
|---|---|---|---|---|---|---|
| GET | `/operations/yield` | JWT | None | None | N/A | |
| GET | `/operations/yield/:id` | JWT | None | None | N/A | |
| POST | `/operations/yield` | JWT | **None** | None | Yes | **Any role can create yield records** |

---

## Privilege Escalation Paths

### CRITICAL — Unauthenticated / Public Data Exposure

| # | Path | Severity | Details |
|---|---|---|---|
| **C-1** | `GET /metrics` | **CRITICAL** | Prometheus metrics exposed publicly — reveals internal timing, queue depths, error rates, HTTP patterns |
| **C-2** | `GET /health`, `GET /health/backup` | **Medium** | Backup timing, DB status exposed without auth — operational intelligence |

---

### CRITICAL — Any Authenticated User Can Perform Privileged Operations

| # | Path | Severity | Details |
|---|---|---|---|
| **E-1** | `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id` | **HIGH** | No role check. A `VIEWER` or `STAFF` role can create, modify, or delete suppliers — master data manipulation |
| **E-2** | `POST /currencies`, `PUT /currencies/:id`, `DELETE /currencies/:id` | **HIGH** | No role check. Any authenticated user can tamper with currency data, affecting all WAC calculations and PO values system-wide |
| **E-3** | `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` | **HIGH** | No role check. Any user can modify item classification |
| **E-4** | `POST /operations/yield` | **HIGH** | No role check. Any user can create yield records — these affect inventory calculations |
| **E-5** | `POST /notifications/templates`, `PUT`, `DELETE` | **Medium** | Any authenticated user can create/modify/delete notification templates — potential for phishing-style template injection |
| **E-6** | `PATCH /notifications/:id/read` | **Low** | No ownership check — any authenticated user can mark *any* notification as read by ID, even another user's |

---

### HIGH — Cross-Warehouse / Cross-Branch Scope Bypass

| # | Path | Severity | Details |
|---|---|---|---|
| **E-7** | `POST /operations/transfers` (create) | **HIGH** | No scope restriction on `fromWarehouseId` or `toWarehouseId`. A scoped user can initiate transfers from warehouses they have no assigned access to. The `WarehouseLockGuard` will block if the warehouse is locked, but does **not** validate user scope |
| **E-8** | `POST /procurement/purchase-requests` (create) | **High** | A user can supply any `warehouseId`/`branchId` in the body. No validation that the caller's scope includes that warehouse |
| **E-9** | `POST /procurement/purchase-orders` (create) | **High** | No scope check on `prId` or warehouse derivation |
| **E-10** | `POST /procurement/grns` (create) | **High** | No scope check on `warehouseId` in body |
| **E-11** | `POST /operations/adjustments` (create) | **High** | No scope check on `warehouseId` in body — user can post adjustments to any warehouse |
| **E-12** | `POST /stocktake/sessions` (create) | **High** | No scope check on `warehouseId` in body |
| **E-13** | `GET /search` | **Medium** | Returns documents from all warehouses/branches — a scoped user can discover PO numbers, GRN numbers, transfer refs from warehouses they're not assigned to |
| **E-14** | `GET /notifications/outbox` | **Medium** | Returns all outbox events system-wide — no scoping |
| **E-15** | `PATCH /lots/:id/quarantine` | **Medium** | ADMIN/INV_MGR can quarantine any lot — no warehouse scope validation |

---

### HIGH — Role Parameter Injection

| # | Path | Severity | Details |
|---|---|---|---|
| **E-16** | `GET /dashboard/stats?role=ADMIN` | **HIGH** | The admin `DashboardController` at `modules/admin/dashboard.controller.ts:11` takes `@Query('role') role?: string` and passes it to the service. An authenticated non-admin can pass `?role=ADMIN` to receive admin-level dashboard data (total inventory value, all pending PRs, all user counts, all stock across all warehouses) — **the role is supplied by the client, not from the JWT** |
| **E-17** | `GET /dashboard/stats?role=ADMIN` (reports module) | **High** | Same pattern in `modules/reports/dashboard.controller.ts:16` — `@Query('role') role: string` passed to `getDashboardStats(role, warehouseId)` |

---

### MEDIUM — Missing Read Isolation on Individual Document Fetches

| # | Path | Severity | Details |
|---|---|---|---|
| **E-18** | `GET /procurement/purchase-requests/:id` | **Medium** | No scope check. Any authenticated user can fetch any PR by ID |
| **E-19** | `GET /procurement/purchase-orders/:id` | **Medium** | No scope check. Any authenticated user can fetch any PO |
| **E-20** | `GET /procurement/grns/:id` | **Medium** | No scope check |
| **E-21** | `GET /operations/issues/:id` | **Medium** | No scope check |
| **E-22** | `GET /operations/transfers/:id` | **Medium** | No scope check |
| **E-23** | `GET /operations/adjustments/:id` | **Medium** | No scope check |
| **E-24** | `GET /stocktake/sessions/:id` | **Medium** | No scope check |
| **E-25** | `GET /operations/kitchen-requests/:id` | **Medium** | No scope check |

---

### LOW — Duplicate Route Registration

| # | Path | Severity | Details |
|---|---|---|---|
| **E-26** | `GET /dashboard/stats` (two controllers) | **Medium** | `modules/admin/dashboard.controller.ts` and `modules/reports/dashboard.controller.ts` both register `GET /dashboard/stats`. NestJS will silently use whichever module is loaded last. The admin version has no scope filter; the reports version does. Actual behavior is non-deterministic from audit perspective |

---

## Summary of Vulnerabilities by Severity

| Severity | Count | Key Findings |
|---|---|---|
| **CRITICAL** | 2 | `/metrics` and `/health` public with sensitive operational data |
| **HIGH** | 14 | Role parameter injection (`?role=ADMIN`); suppliers/currencies/categories write with no RBAC; cross-warehouse mutation bypass on transfers, PRs, POs, GRNs, adjustments, stocktake |
| **MEDIUM** | 8 | No read isolation on individual document fetches; global search exposes cross-branch data; notification outbox unscoped |
| **LOW** | 1 | Notification read with no ownership check |

---

## Top Immediate Remediation Priorities

1. **E-16 / E-17** — Remove `?role` query parameter from both dashboard controllers. Role must always come from `@CurrentUser('role')` (JWT), never from client input.

2. **E-1 / E-2 / E-3 / E-4** — Add role guards to `suppliers`, `currencies`, `categories` (write operations), and `yield` (create). These should require at minimum `ADMIN` or `INV_MGR`.

3. **E-7 through E-12** — Validate that `warehouseId` (and `fromWarehouseId`) in mutation request bodies belongs to the caller's `warehouseScopes` before proceeding. This is the primary scope bypass vector.

4. **C-1** — Protect `GET /metrics` behind at minimum a shared secret header or network-level restriction (not `@Public()`).

5. **E-13 / E-14** — Apply warehouse-scope filtering to the global search and notifications outbox.

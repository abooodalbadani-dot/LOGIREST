# Authorization Remediation Tasks

**Source**: [`authorization-audit.md`](./authorization-audit.md)
**Created**: 2026-06-01

> These tasks address **26 authorization vulnerabilities** identified by the endpoint authorization audit.
> All findings are scoped to `apps/api` (NestJS) except where noted.

---

## Priority Legend

- 🔴 **BLOCKER** — Must fix before production deployment
- 🟠 **HIGH** — Must fix before first user-facing test session
- 🟡 **MEDIUM** — Fix in the immediate follow-up sprint

---

## Phase AUTH-1 — Role Parameter Injection & Public Data Exposure (Blockers)

**Purpose**: Close the two highest-severity attack vectors — client-supplied role elevation and unprotected sensitive endpoints.

- [ ] AUTH-001 🔴 [P] Remove `@Query('role')` from admin `DashboardController` — read role from `@CurrentUser('role')` instead in `apps/api/src/modules/admin/dashboard.controller.ts`
- [ ] AUTH-002 🔴 [P] Remove `@Query('role')` from reports `DashboardController` — read role from `@CurrentUser('role')` instead in `apps/api/src/modules/reports/dashboard.controller.ts`
- [ ] AUTH-003 🔴 [P] Protect `GET /metrics` behind shared-secret header guard or remove `@Public()` in `apps/api/src/modules/metrics/metrics.controller.ts`
- [ ] AUTH-004 🔴 [P] Protect `GET /health` and `GET /health/backup` behind `@Public()` removal or deploy-time network restriction in `apps/api/src/health/health.controller.ts`

**Checkpoint AUTH-1**: Call `GET /dashboard/stats?role=ADMIN` with a non-ADMIN JWT → returns scoped data, not ADMIN-level data. `GET /metrics` → 401 without secret header.

---

## Phase AUTH-2 — Missing Role Checks on Master-Data Write Endpoints (Blockers)

**Purpose**: Add role guards to supplier, currency, category, yield, and notification template write operations that currently allow any authenticated user to mutate system data.

- [ ] AUTH-005 🔴 [P] Add `ADMIN`/`GM` role guard to `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id` in `apps/api/src/modules/master-data/suppliers/suppliers.controller.ts`
- [ ] AUTH-006 🔴 [P] Add `ADMIN`/`GM` role guard to `POST /currencies`, `PUT /currencies/:id`, `DELETE /currencies/:id` in `apps/api/src/modules/master-data/currencies/currencies.controller.ts`
- [ ] AUTH-007 🔴 [P] Add `ADMIN`/`GM` role guard to `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` in `apps/api/src/modules/master-data/categories/categories.controller.ts`
- [ ] AUTH-008 🔴 [P] Add `ADMIN`/`INV_MGR` role guard to `POST /operations/yield` in `apps/api/src/modules/operations/yield/yield.controller.ts`
- [ ] AUTH-009 🟠 [P] Add `ADMIN` role guard to `POST /notifications/templates`, `PUT /notifications/templates/:id`, `DELETE /notifications/templates/:id` in `apps/api/src/modules/notifications/notifications.controller.ts`
- [ ] AUTH-010 🟡 [P] Add ownership check to `PATCH /notifications/:id/read` — verify `notification.userId === currentUserId` in `apps/api/src/modules/notifications/notifications.controller.ts`

**Checkpoint AUTH-2**: `POST /suppliers` with `VIEWER` JWT → `403`. `POST /categories` with `VIEWER` JWT → `403`. `POST /operations/yield` with `VIEWER` JWT → `403`.

---

## Phase AUTH-3 — Cross-Warehouse Scope Enforcement on Mutations (HIGH)

**Purpose**: Validate that `warehouseId` in mutation request bodies belongs to the caller's `warehouseScopes`. This is the primary cross-warehouse data access bypass vector.

- [ ] AUTH-011 🟠 Add warehouse scope validation on `POST /operations/transfers` — check `fromWarehouseId` and `toWarehouseId` against user's `warehouseScopes` in `apps/api/src/modules/operations/transfers/transfers.controller.ts`
- [ ] AUTH-012 🟠 Add warehouse scope validation on `POST /procurement/purchase-requests` — check `warehouseId` against user's `warehouseScopes` in `apps/api/src/modules/procurement/purchase-requests/purchase-requests.controller.ts`
- [ ] AUTH-013 🟠 Add warehouse scope validation on `POST /procurement/purchase-orders` — derive warehouse from `prId` and validate against user's `warehouseScopes` in `apps/api/src/modules/procurement/purchase-orders/po.controller.ts`
- [ ] AUTH-014 🟠 Add warehouse scope validation on `POST /procurement/grns` — check `warehouseId` against user's `warehouseScopes` in `apps/api/src/modules/procurement/grns/grn.controller.ts`
- [ ] AUTH-015 🟠 Add warehouse scope validation on `POST /operations/adjustments` — check `warehouseId` against user's `warehouseScopes` in `apps/api/src/modules/operations/adjustments/adjustments.controller.ts`
- [ ] AUTH-016 🟠 Add warehouse scope validation on `POST /stocktake/sessions` — check `warehouseId` (from body) against user's `warehouseScopes` in `apps/api/src/modules/stocktake/stocktake.controller.ts`

**Checkpoint AUTH-3**: `POST /transfers` with `fromWarehouseId` outside user's scope → `403`. `POST /purchase-requests` with `warehouseId` outside user's scope → `403`.

---

## Phase AUTH-4 — Warehouse Scope on Quarantine, Search, Notifications, and Document Reads (MEDIUM)

**Purpose**: Apply warehouse-scope filtering to bulk data exposure vectors and add read isolation for individual document fetches.

- [ ] AUTH-017 🟡 [P] Add `@ActiveScope()` warehouse filter to `PATCH /lots/:id/quarantine` and `PATCH /lots/:id/release-quarantine` in `apps/api/src/modules/inventory/lots.controller.ts` — restrict scope for non-ADMIN users
- [ ] AUTH-018 🟡 [P] Apply warehouse-scope filtering to `GET /search` results — filter items/suppliers/documents by user's `warehouseScopes` in `apps/api/src/modules/search/search.controller.ts` or service layer
- [ ] AUTH-019 🟡 [P] Apply warehouse-scope filtering to `GET /notifications/outbox` — scope to user's warehouses in `apps/api/src/modules/notifications/notifications.controller.ts`
- [ ] AUTH-020 🟡 [P] Add scope check to `GET /procurement/purchase-requests/:id` in `apps/api/src/modules/procurement/purchase-requests/purchase-requests.controller.ts`
- [ ] AUTH-021 🟡 [P] Add scope check to `GET /procurement/purchase-orders/:id` in `apps/api/src/modules/procurement/purchase-orders/po.controller.ts`
- [ ] AUTH-022 🟡 [P] Add scope check to `GET /procurement/grns/:id` in `apps/api/src/modules/procurement/grns/grn.controller.ts`
- [ ] AUTH-023 🟡 [P] Add scope check to `GET /operations/issues/:id` in `apps/api/src/modules/operations/issues/issues.controller.ts`
- [ ] AUTH-024 🟡 [P] Add scope check to `GET /operations/transfers/:id` in `apps/api/src/modules/operations/transfers/transfers.controller.ts`
- [ ] AUTH-025 🟡 [P] Add scope check to `GET /operations/adjustments/:id` in `apps/api/src/modules/operations/adjustments/adjustments.controller.ts`
- [ ] AUTH-026 🟡 [P] Add scope check to `GET /stocktake/sessions/:id` in `apps/api/src/modules/stocktake/stocktake.controller.ts`
- [ ] AUTH-027 🟡 [P] Add scope check to `GET /operations/kitchen-requests/:id` in `apps/api/src/modules/kitchen-requests/kitchen-requests.controller.ts`

**Checkpoint AUTH-4**: Scoped user calls `GET /purchase-requests/:id` for a PR in another warehouse → `403`. Scoped user calls `GET /search` → only docs from assigned warehouses appear.

---

## Phase AUTH-5 — Duplicate Route Resolution (MEDIUM)

**Purpose**: Resolve the non-deterministic routing of `GET /dashboard/stats` caused by two controllers registering the same path.

- [ ] AUTH-028 🟡 Resolve duplicate `GET /dashboard/stats` route — either merge the admin and reports versions into a single controller, or disambiguate their paths in `apps/api/src/app.module.ts`. Preferred approach: merge into a unified dashboard controller under a single module with proper role-scope separation.

**Checkpoint AUTH-5**: `GET /dashboard/stats` resolves to exactly one controller deterministically. Module reorder does not change behavior.

---

## Execution Order & Parallelism

```
Phase AUTH-1 (role injection + exposure) → AUTH-2 (master-data RBAC) → AUTH-3 (scope enforcement) → AUTH-4 (read isolation) → AUTH-5 (route dedup)
```

### Within Phase AUTH-1 (blockers — all parallel):
- **AUTH-001** — admin dashboard controller, single file
- **AUTH-002** — reports dashboard controller, single file
- **AUTH-003** — metrics controller, single file
- **AUTH-004** — health controller, single file

### Within Phase AUTH-2 (blockers — all parallel):
- **AUTH-005 through AUTH-010** — all independent controllers

### Within Phase AUTH-3 (high — all parallel):
- **AUTH-011 through AUTH-016** — all independent controllers, same validation pattern

### Within Phase AUTH-4 (medium — all parallel):
- **AUTH-017 through AUTH-027** — all independent files

### Phase AUTH-5 (medium — sequential):
- **AUTH-028** — single task, requires design decision on merge vs. disambiguation

All phases are independent of `remediation-tasks.md` (R001–R015), `edge-case-remediation-tasks.md` (EC-001–EC-008), and `crud-action-remediation-tasks.md` (CA-001–CA-009).

---

## Final Verification

After all tasks are complete:

1. `npm run typecheck --filter=api` — zero errors
2. `npm run lint` — zero errors
3. `npm run build` — full monorepo production build succeeds
4. Manual: `GET /dashboard/stats?role=ADMIN` with non-ADMIN JWT → role from JWT, not query param
5. Manual: `POST /suppliers` with `VIEWER` JWT → `403 Forbidden`
6. Manual: `POST /transfers` with `fromWarehouseId` outside user's scope → `403 Forbidden`
7. Manual: `GET /purchase-requests/:id` for PR in different warehouse → `403 Forbidden`
8. Manual: `GET /search` — verify results are scoped to user's warehouses
9. Manual: `GET /metrics` — verify it returns 401 without auth header

---

## Reference: Audit Finding Mapping

| Audit ID | Severity | Task(s) | Description |
|---|---|---|---|
| C-1 | CRITICAL | AUTH-003 | Public `/metrics` endpoint |
| C-2 | Medium | AUTH-004 | Public `/health` endpoints |
| E-1 | HIGH | AUTH-005 | Suppliers CRUD no role check |
| E-2 | HIGH | AUTH-006 | Currencies CRUD no role check |
| E-3 | HIGH | AUTH-007 | Categories CRUD no role check |
| E-4 | HIGH | AUTH-008 | Yield create no role check |
| E-5 | Medium | AUTH-009 | Notification templates CRUD no role check |
| E-6 | Low | AUTH-010 | Notification read no ownership check |
| E-7 | HIGH | AUTH-011 | Transfer create no scope check |
| E-8 | HIGH | AUTH-012 | PR create no scope check |
| E-9 | HIGH | AUTH-013 | PO create no scope check |
| E-10 | HIGH | AUTH-014 | GRN create no scope check |
| E-11 | HIGH | AUTH-015 | Adjustment create no scope check |
| E-12 | HIGH | AUTH-016 | Stocktake create no scope check |
| E-13 | Medium | AUTH-018 | Search exposes cross-branch data |
| E-14 | Medium | AUTH-019 | Notifications outbox unscoped |
| E-15 | Medium | AUTH-017 | Lot quarantine no warehouse scope |
| E-16 | HIGH | AUTH-001 | Role param injection (admin dashboard) |
| E-17 | HIGH | AUTH-002 | Role param injection (reports dashboard) |
| E-18 | Medium | AUTH-020 | PR detail no scope check |
| E-19 | Medium | AUTH-021 | PO detail no scope check |
| E-20 | Medium | AUTH-022 | GRN detail no scope check |
| E-21 | Medium | AUTH-023 | Issue detail no scope check |
| E-22 | Medium | AUTH-024 | Transfer detail no scope check |
| E-23 | Medium | AUTH-025 | Adjustment detail no scope check |
| E-24 | Medium | AUTH-026 | Stocktake detail no scope check |
| E-25 | Medium | AUTH-027 | Kitchen request detail no scope check |
| E-26 | Medium | AUTH-028 | Duplicate `/dashboard/stats` route |

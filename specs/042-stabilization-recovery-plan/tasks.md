# Tasks: LogiRest Engineering Recovery & Stabilization

**Input**: Design documents from `/specs/042-stabilization-recovery-plan/`
**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [quickstart.md](./quickstart.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US7)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify monorepo is in a clean buildable state and dev environment is ready before any story work begins.

- [x] T001 Verify monorepo builds cleanly: run `npm run build` and confirm zero errors
- [x] T002 Verify typecheck passes on both apps: `npm run typecheck --filter=api` and `npm run typecheck --filter=web`
- [x] T003 Confirm active git branch is `042-stabilization-recovery-plan` via `git status`
- [x] T004 Add required backup environment variables to `.env` per `quickstart.md` (`BACKUP_S3_BUCKET`, `BACKUP_S3_REGION`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_ENCRYPTION_KEY`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure shared across multiple user stories. **Must complete before any story phases begin.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Install `@nestjs/schedule` and `@aws-sdk/client-s3` dependencies in `apps/api/package.json` via `npm install @nestjs/schedule @aws-sdk/client-s3 --workspace=apps/api`
- [x] T006 [P] Confirm `paginatedSchema()` factory exists and is exported from `packages/shared-types/src/pagination.ts`; create it if missing per `data-model.md` contract
- [x] T007 [P] Create the Prisma migration for the negative-stock `CHECK` constraint — add file `apps/api/prisma/migrations/[timestamp]_add_qty_on_hand_check/migration.sql` with `ALTER TABLE "InventoryLot" ADD CONSTRAINT "chk_qty_non_negative" CHECK ("qtyOnHand" >= 0);`
- [x] T008 Apply the migration to the development database: `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Consistent Data Loading (Priority: P1) 🎯 MVP

**Goal**: 100% of listing endpoints return `{ data: T[], meta: { total, page, page_size, total_pages } }` — zero Zod errors in the browser during navigation.

**Independent Test**: Navigate all listing pages (inventory balance, stock movements, lot tracking, purchase requests, purchase orders, GRNs, stock transfers, inventory issues, adjustments, stocktakes, kitchen requests, branches, warehouses, departments, categories, suppliers, units of measure, barcodes, currencies, audit logs, notification templates). Every page must load data without a Zod parsing error or blank screen.

### Implementation for User Story 1

- [x] T009 [P] [US1] Wrap the `InventoryBalance` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/inventory-balance/inventory-balance.service.ts`
- [x] T010 [P] [US1] Wrap the `StockMovements` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/stock-movements/stock-movements.service.ts`
- [x] T011 [P] [US1] Wrap the `LotTracking` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/lot-tracking/lot-tracking.service.ts`
- [x] T012 [P] [US1] Wrap the `PurchaseRequests` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/procurement/purchase-requests/purchase-requests.service.ts`
- [x] T013 [P] [US1] Wrap the `PurchaseOrders` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/procurement/purchase-orders/purchase-orders.service.ts`
- [x] T014 [P] [US1] Wrap the `GoodsReceiptNotes` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/procurement/goods-receipt-notes/goods-receipt-notes.service.ts`
- [x] T015 [P] [US1] Wrap the `StockTransfers` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/stock-transfers/stock-transfers.service.ts`
- [x] T016 [P] [US1] Wrap the `InventoryIssues` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/inventory-issues/inventory-issues.service.ts`
- [x] T017 [P] [US1] Wrap the `Adjustments` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/adjustments/adjustments.service.ts`
- [x] T018 [P] [US1] Wrap the `Stocktakes` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/inventory/stocktakes/stocktakes.service.ts`
- [x] T019 [P] [US1] Wrap the `KitchenRequests` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/kitchen/kitchen-requests/kitchen-requests.service.ts`
- [x] T020 [P] [US1] Wrap the `Barcodes` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/master-data/barcodes/barcodes.service.ts`
- [x] T021 [P] [US1] Wrap the `Currencies` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/master-data/currencies/currencies.service.ts`
- [x] T022 [P] [US1] Wrap the `AuditLogs` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/audit/audit-logs/audit-logs.service.ts`
- [x] T023 [P] [US1] Wrap the `NotificationTemplates` list endpoint response in `{ data, meta }` envelope in `apps/api/src/modules/notifications/notification-templates/notification-templates.service.ts`
- [x] T024 [US1] Rename all `limit` metadata fields to `page_size` and `totalPages`/`last_page` to `total_pages` across all services modified in T009–T023 (batch rename pass)
- [x] T025 [P] [US1] Remove inline `paginatedSchema` definitions from `apps/web/src/features/*/hooks/use*.ts` files not yet consolidated in spec 041; replace with `paginatedSchema()` from `packages/shared-types`
- [x] T026 [US1] Run `npm run typecheck --filter=api` and `npm run typecheck --filter=web` — fix any type errors introduced by envelope changes

**Checkpoint**: Navigate all listing pages — zero Zod errors in browser console. SC-001 and SC-002 verified.

---

## Phase 4: User Story 2 — Deterministic Warehouse Operations (Priority: P1)

**Goal**: All warehouse API requests resolve deterministically through a single consolidated controller path.

**Independent Test**: Perform CRUD and scoping operations on warehouses multiple times across fresh server boots. Verify all calls route to a single endpoint and return correct `{ data, meta }` structure.

### Implementation for User Story 2

- [x] T027 [US2] Verify `warehouses.controller.ts` (legacy) has been deleted and `warehouses-direct.controller.ts` is the sole controller registered in `apps/api/src/modules/master-data/master-data.module.ts` (completed in spec 041 — validate only)
- [x] T028 [US2] Confirm `warehouses-direct.controller.ts` returns `{ data, meta }` paginated shape for all list endpoints (consistency check against T006 envelope standard)
- [x] T029 [US2] Run integration smoke test: `curl` the `/warehouses` endpoint 5 times consecutively and confirm identical deterministic responses

**Checkpoint**: All warehouse operations route deterministically. SC-001 applies to warehouse endpoints.

---

## Phase 5: User Story 3 — Secure Session Initialization (Priority: P1)

**Goal**: Backend server refuses to start if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` are missing from the environment.

**Independent Test**: Start the API with empty JWT env vars — process must exit immediately with a fatal error log.

### Implementation for User Story 3

- [x] T030 [US3] Verify `auth.module.ts` uses `JwtModule.registerAsync` with `ConfigService` and throws a fatal error on missing secrets (completed in spec 041 — validate only)
- [x] T031 [US3] Perform fail-fast boot test: `JWT_ACCESS_SECRET= JWT_REFRESH_SECRET= npm run dev --filter=api` — confirm server exits with code 1 and logs a fatal error message

**Checkpoint**: Server refuses to start without JWT secrets. SC-003 verified.

---

## Phase 6: User Story 4 — Scope Persistence & Reload Race Condition (Priority: P1)

**Goal**: Profile updates preserve active warehouse/branch scope; page reload does not fire lock requests with `null` identifiers.

**Independent Test**: Update user profile → verify scope unchanged. Reload dashboard → verify zero requests to `/inventory/warehouses/null/lock`.

### Implementation for User Story 4

- [x] T032 [US4] Verify `auth.service.ts` `updateProfile` method returns real `warehouseScopes` mapped from the DB (completed in spec 041 — validate only)
- [x] T033 [US4] Verify `useWarehouseLock.ts` hook has `enabled: !!warehouseId` guard (completed in spec 041 — validate only)
- [x] T034 [US4] Verify `WarehouseScopeProvider.tsx` renders a global loading spinner until scope is fully restored (completed in spec 041 — validate only)
- [x] T035 [US4] Manual browser test: log in, change profile, confirm active warehouse scope is preserved in UI and no 400/403 errors appear
- [x] T036 [US4] Manual browser test: reload the dashboard and confirm zero requests to `/inventory/warehouses/null/lock` in the browser DevTools Network tab (SC-004)

**Checkpoint**: Profile updates are scope-safe; reload race condition is eliminated. SC-004 and SC-005 verified.

---

## Phase 7: User Story 5 — Automatic Kitchen Requisition Setup (Priority: P1)

**Goal**: Running the seed script on a fresh database automatically provisions a default "Main Kitchen" department.

**Independent Test**: Reset DB and run seed → verify department exists and is selectable in inventory issue creation flow.

### Implementation for User Story 5

- [x] T037 [US5] Verify `apps/api/prisma/seed.prod.ts` contains the `Main Kitchen` / `MAIN-KIT` department seed linked to the primary HQ branch (completed in spec 041 — validate only)
- [x] T038 [US5] Reset development DB and re-run seed: `npx prisma migrate reset --force` then `npx ts-node apps/api/prisma/seed.prod.ts` — confirm department row exists in the `Department` table

**Checkpoint**: Fresh install includes a default kitchen department. FR-006 verified.

---

## Phase 8: User Story 6 — High-Integrity Stock Deductions (Priority: P2)

**Goal**: All stock deduction transactions abort with a `400 Bad Request` if the requested quantity exceeds the quantity on hand; no negative stock is ever written.

**Independent Test**: Attempt to issue more items than in stock — receive `400` with "Insufficient stock" message. Verify `qtyOnHand` is unchanged after the rejected call.

### Implementation for User Story 6

- [x] T039 [P] [US6] Add pre-deduction stock sufficiency check in `apps/api/src/modules/inventory/inventory-issues/inventory-issues.service.ts`: inside the `SELECT FOR UPDATE` transaction, check `qtyOnHand - requestedQty >= 0`; if not, throw `BadRequestException('Insufficient stock: requested quantity exceeds available on hand.')`
- [x] T040 [P] [US6] Add the same pre-deduction stock sufficiency check in `apps/api/src/modules/kitchen/kitchen-requests/kitchen-requests.service.ts` for kitchen fulfillment deductions
- [x] T041 [P] [US6] Add the same pre-deduction stock sufficiency check in `apps/api/src/modules/inventory/stock-transfers/stock-transfers.service.ts` for transfer deductions
- [x] T042 [P] [US6] Add the same pre-deduction stock sufficiency check in `apps/api/src/modules/inventory/adjustments/adjustments.service.ts` for negative variance adjustments
- [x] T043 [US6] Confirm the Prisma migration from T007/T008 (`chk_qty_non_negative` CHECK constraint) is active in the database as a safety net
- [x] T044 [US6] Manual test: attempt to issue 999,999 units of a low-stock item via API — confirm `400 Bad Request` response and unchanged `qtyOnHand` in DB

**Checkpoint**: No stock deduction can drive `qtyOnHand` below zero. FR-010 and FR-012 verified.

---

## Phase 9: User Story 7 — Automated Backup & Recovery (Priority: P2)

**Goal**: Daily encrypted PostgreSQL backup uploads to S3; `/health` reports `degraded` if backup age exceeds 26 hours; restore drill validates the 4-hour RTO.

**Independent Test**: Trigger manual backup → confirm S3 upload → check `/health` returns `ok` with correct `ageHours`. Then run restore drill script and confirm completion in < 240 minutes.

### Implementation for User Story 7

- [x] T045 [US7] Create `apps/api/src/backup/backup.module.ts` — NestJS module that imports `ScheduleModule.forRoot()` and provides `BackupService`
- [x] T046 [US7] Create `apps/api/src/backup/backup.service.ts` — service implementing:
  - `runBackup()`: executes `pg_dump`, gzip compresses, AES-256 encrypts using `BACKUP_ENCRYPTION_KEY`, uploads to S3 via `PutObjectCommand`, then writes `last_backup_at` ISO8601 timestamp to `SystemMeta` table
  - `getBackupStatus()`: reads `last_backup_at` from `SystemMeta`, computes `ageHours`, returns `{ status: 'ok' | 'degraded', lastBackupAt, ageHours }` (degraded if `ageHours > 26`)
- [x] T047 [US7] Create `apps/api/src/backup/backup.cron.ts` — `@Cron('0 2 * * *')` job that calls `BackupService.runBackup()` and logs success/failure
- [x] T048 [US7] Register `BackupModule` in `apps/api/src/app.module.ts`
- [x] T049 [US7] Create `apps/api/src/health/health.module.ts` and `apps/api/src/health/health.controller.ts` — `GET /health` route (decorated `@Public()` to bypass JWT guard) that calls `BackupService.getBackupStatus()` and returns the full structured health response per `data-model.md` contract
- [x] T050 [US7] Register `HealthModule` in `apps/api/src/app.module.ts`
- [x] T051 [US7] Add `POST /backup/run` admin endpoint in a `BackupController` for manually triggering backups during testing (protected by admin role guard)
- [x] T052 [US7] Create `scripts/backup-restore-drill.sh` — shell script that: downloads latest S3 backup, decrypts, decompresses, restores to a sandboxed Postgres instance, runs a row-count spot check, reports elapsed time and pass/fail vs 4-hour threshold
- [x] T053 [US7] Manual test: `curl http://localhost:3001/health` — confirm response matches schema with `status`, `checks.database`, `checks.backup` fields
- [x] T054 [US7] Manual test: trigger `POST /backup/run` → confirm S3 object created, then `GET /health` returns `ageHours < 1` and `status: 'ok'`

**Checkpoint**: Backup pipeline operational. SC-006 and SC-007 verified.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and build sign-off.

- [x] T055 [P] Run `npm run lint` across the full monorepo — fix any lint errors introduced by this feature
- [x] T056 [P] Run `npm run typecheck --filter=api` and `npm run typecheck --filter=web` — confirm zero type errors
- [x] T057 Run `npm run build` — confirm full monorepo production build succeeds with zero errors
- [x] T058 [P] Update `specs/042-stabilization-recovery-plan/spec.md` status from `Draft` to `Implemented`
- [x] T059 Follow the verification checklist in `specs/042-stabilization-recovery-plan/quickstart.md` end-to-end and confirm all items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phases 3–7 (P1 User Stories)**: All depend on Phase 2 completion; can run in parallel across developers
- **Phases 8–9 (P2 User Stories)**: Depend on Phase 2; can begin in parallel with Phase 3–7 if capacity allows
- **Phase 10 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 (Phase 3) | Phase 2 | Core envelope work — foundation for all listing pages |
| US2 (Phase 4) | Phase 2 | Validates spec 041 work; largely a verification phase |
| US3 (Phase 5) | Phase 2 | Validates spec 041 work; largely a verification phase |
| US4 (Phase 6) | Phase 2 | Validates spec 041 work + manual browser test |
| US5 (Phase 7) | Phase 2 | Validates spec 041 seed; includes DB reset validation |
| US6 (Phase 8) | Phase 2, T007/T008 | Requires CHECK constraint migration to be applied first |
| US7 (Phase 9) | Phase 2, T004 | Requires backup env vars and `@nestjs/schedule` installed |

### Within Each Story

- [P] tasks within a story phase can be executed simultaneously by parallel agents
- Service changes precede endpoint changes
- Manual verification tasks always last

### Parallel Opportunities

```bash
# Phase 2 — run T006 and T007 simultaneously:
Task: "Confirm paginatedSchema() in packages/shared-types"    # T006
Task: "Create CHECK constraint migration SQL file"             # T007

# Phase 3 — run all T009–T023 simultaneously (independent service files):
Task: "Wrap InventoryBalance list endpoint"                    # T009
Task: "Wrap StockMovements list endpoint"                      # T010
Task: "Wrap LotTracking list endpoint"                         # T011
# ... (all T012–T023 in parallel)

# Phase 8 — run T039–T042 simultaneously (independent service files):
Task: "Add stock sufficiency check in inventory-issues.service.ts"   # T039
Task: "Add stock sufficiency check in kitchen-requests.service.ts"   # T040
Task: "Add stock sufficiency check in stock-transfers.service.ts"    # T041
Task: "Add stock sufficiency check in adjustments.service.ts"        # T042
```

---

## Implementation Strategy

### MVP First (Phase 3 — User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (T009–T026)
4. **STOP & VALIDATE**: Navigate all listing pages — zero Zod errors
5. All P1 success criteria (SC-001, SC-002) confirmed

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 (Phase 3) → enumerate listing pages → test → **MVP delivered**
3. US2–US5 (Phases 4–7) → verification of spec 041 items
4. US6 (Phase 8) → negative stock protection activated
5. US7 (Phase 9) → backup pipeline live
6. Polish (Phase 10) → production build sign-off

### Parallel Team Strategy

With multiple agents/developers after Phase 2 completes:

- **Agent A**: Phase 3 (US1) — 15 parallel service wraps
- **Agent B**: Phases 4–7 (US2–US5) — validation tasks
- **Agent C**: Phase 8 (US6) — 4 parallel deduction guards
- **Agent D**: Phase 9 (US7) — backup module implementation

---

## Notes

- [P] tasks involve different files with no shared dependencies — safe for simultaneous execution
- Phases 4–7 are primarily **verification** of items completed in spec 041; they involve no new code — only confirmation that prior work is in place
- All tasks in Phases 3 and 8 marked [P] are ideal candidates for sub-agent parallelization
- Commit after each checkpoint to maintain a recoverable state
- Stop at any phase checkpoint to validate independently before proceeding

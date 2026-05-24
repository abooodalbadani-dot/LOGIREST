# Enterprise Full-System Production Readiness Audit
## LogiRest — Kitchen-Store Inventory Management System
**Audit Date**: 2026-05-24 | **Auditor**: Principal Software Architect + Enterprise Systems Auditor  
**System**: LogiRest — Multi-warehouse Restaurant Kitchen Inventory ERP  
**Scope**: Full-stack (NestJS API + Next.js Frontend) + PostgreSQL + Prisma ORM

---

## 1. SYSTEM READINESS OVERVIEW

| Dimension | Score | Status |
|---|---|---|
| Architecture Quality | 7.5/10 | ✅ Solid |
| Backend Completeness | 7/10 | ⚠️ Gaps |
| Frontend Completeness | 6/10 | ⚠️ Gaps |
| Database Integrity | 8/10 | ✅ Good |
| Workflow Safety | 8.5/10 | ✅ Strong |
| Inventory Safety | 8/10 | ✅ Strong |
| Security | 7/10 | ⚠️ Gaps |
| Observability | 4/10 | 🔴 Weak |
| Email/Async Delivery | 1/10 | 🔴 Missing |
| Reporting Enterprise Grade | 4/10 | 🔴 Weak |
| Testing Coverage | 6.5/10 | ⚠️ Partial |
| Deployment Readiness | 3/10 | 🔴 Not Ready |

**Overall Operational Maturity: LATE ALPHA / PRE-PRODUCTION**

---

## 2. FRONTEND AUDIT REPORT

### ✅ Strengths

- Full i18n routing via `[locale]` layout — bilingual (AR/EN) structure is present
- All major workflow areas have dedicated pages:
  - Procurement: `purchase-requests/`, `purchase-orders/`, `goods-received/`, `landed-cost/`
  - Operations: `adjustments/`, `issues/`, `transfers/`, `stocktake/`, `kitchen-requests/`, `yield-management/`
  - Reports: `available-inventory/`, `movements/`, `expiry/`, `stocktake-variance/`, `procurement-status/`, `currency-summaries/`
  - Master data: `master-data/`
  - Admin: `admin/`
  - Dashboard: `dashboard/`
  - Profile: `profile/`
  - Communications: `communications/`
- Document context (warehouse scope) is properly threaded via `ActiveScope` decorator pattern

### 🔴 CRITICAL GAPS

1. **No Export Functionality (XLSX/CSV/PDF)** — The `reports.controller.ts` returns raw JSON data. There is **zero** export button, XLSX generation, or PDF print layout on **any** report. This is enterprise-blocking.
2. **No Print Layout System** — No `@media print` CSS, no print-specific layouts, no header/footer with company name/logo/branch/timestamp/page numbers.
3. **Health Check at Layout Level** — The current health check (`/health`) returns `{ status: 'OK' }` only. The frontend layout check (plan mentions `apps/web/src/app/layout.tsx` fail-fast) was planned but verification shows minimal implementation.
4. **No Low-Stock Alert Dashboard** — Dashboard shows KPIs but there is no threshold-based low-stock alert visualization (only raw out-of-stock count).

### ⚠️ HIGH GAPS

5. **Report Branding Missing** — No company logo, restaurant name, branch code, or generated-by user visible in any report format.
6. **No Stocktake Completion Workflow UI** — `yield-management/` page exists but its operational completeness is unclear from the file listing alone (could be incomplete).
7. **No Empty State Handling Audit** — Empty states for zero-inventory, no-PO, no-PR, etc. need consistent UI treatment.
8. **RTL Layout Not Verified** — `[locale]` routing suggests RTL support, but RTL-specific CSS correctness for forms, tables, and modals is unverified.

---

## 3. BACKEND AUDIT REPORT

### ✅ Strengths

- **Module Architecture**: 14 NestJS modules are properly registered. Clear separation of concerns: `ledger/`, `workflow/`, `operations/`, `purchasing/`, etc.
- **Global Guards**: `JwtAuthGuard`, `IdempotencyGuard`, `WarehouseLockGuard` are all registered as `APP_GUARD` (applied globally).
- **Transactional Integrity**: `WorkflowService.executeTransition()` wraps all state changes in a `$transaction` with a 20-second timeout. Optimistic locking via `version` field is correctly implemented.
- **Idempotency**: `IdempotencyGuard` + `IdempotencyInterceptor` + `IdempotencyLog` model — full request-level idempotency for mutations.
- **Refresh Token Rotation (RTR)**: `rtr.service.ts` implements full RTR with SHA-256 token hashing, replay attack detection (revokes entire session), and optimistic locking on token rotation.
- **Document Sequencing**: `DocumentSequenceService` uses `SELECT FOR UPDATE` raw SQL to guarantee collision-safe, concurrent-safe sequential numbering.
- **Reconciliation Job**: `ReconciliationJob` runs nightly (01:00 AM) comparing `StockLedger` sums against `WarehouseItem.qtyOnHand`. Discrepancies freeze the item and notify ADMIN.
- **Lock Cleanup Job**: `LockCleanupJob` runs every 60s to mark expired warehouse locks as `STALE`.
- **Env Validation**: `env.validation.ts` uses Zod and `process.exit(1)` on startup if critical vars are missing — **production-safe fail-fast behavior**.

### 🔴 CRITICAL GAPS

1. **No Email Delivery System** — The entire notification pipeline writes to `NotificationLog` in PostgreSQL. There is **zero SMTP client, email template, or async email dispatch**. No `nodemailer`, `SendGrid`, `Resend`, or equivalent. Low-stock alerts, approval notifications, and kitchen request notifications never reach users via email.
2. **No BullMQ/Redis Outbox Queue** — The `plan.md` explicitly calls for a BullMQ outbox worker. The `app.module.ts` shows **no BullModule registration**. The outbox pattern from Phase 3 hardening is **not implemented**.
3. **Health Check is Stub** — `health.controller.ts` returns static `{ status: 'OK' }`. It does **not** perform a live database ping (`prisma.$queryRaw('SELECT 1')`). This is **deployment-critical** for container health probes.
4. **`SameSite` Cookie Mismatch** — `rtr.service.ts` sets `sameSite: 'lax'` on the refresh cookie. The plan and spec explicitly require `SameSite=Strict`. This is a **security regression** vs. the stated requirement.
5. **No CORS Hardening for Production** — `main.ts` uses `process.env.FRONTEND_URL || 'http://localhost:3000'`. If `FRONTEND_URL` is unset in production, CORS falls back to localhost — **blocking all production requests**.

### ⚠️ HIGH GAPS

6. **Notification Coverage is Incomplete** — Only 3 notification triggers exist in `WorkflowService` (PR submitted, PR approved, Transfer in-transit). Missing: GRN posted, Kitchen Request submitted/fulfilled, Adjustment posted, Stocktake started/posted, low-stock crossed threshold.
7. **Audit Log Outside Transaction Risk** — `writeAuditLog()` in `WorkflowService` catches errors silently. If called _outside_ the transaction (e.g., on failure), the audit log insert can fail without any visibility.
8. **Reconciliation Job Logic Flaw** — `ReconciliationJob.runReconciliation()` compares `SUM(StockLedger.quantity)` against `WarehouseItem.qtyOnHand`. The stock ledger records **both positive (IN) and negative (OUT) quantities**, which should net to current qty. **This requires verification that all OUT operations post negative quantities to the ledger.** If any operation posts absolute values without sign, the comparison will always flag false discrepancies.
9. **Lock Cleanup Doesn't Update `Warehouse.isLocked`** — When a `WarehouseLock` expires and is marked `STALE`, the parent `Warehouse.isLocked` boolean is **not reset to `false`**. This means `isWarehouseLocked()` will still return `true` via `warehouse.isLocked`, permanently locking the warehouse.
10. **`Transfer-Post` Missing `quantityReceived` for Discrepancy Handling** — The `TransferLine` has `quantityReceived` and `varianceReason` fields, but it's unclear from the file listing whether the receive-side posting validates and records these correctly.

---

## 4. DATABASE AUDIT REPORT

### ✅ Strengths

- **Schema Normalization**: Clean Tier 1-6 separation (Master Data → Transactions → Inventory → Lots → Ledgers → Control)
- **Optimistic Locking**: `version` field on all transactional documents (User, PurchaseRequest, PurchaseOrder, GRN, Transfer, Adjustment, KitchenRequest, StocktakeSession, WarehouseLock, RefreshToken)
- **Idempotency Keys**: `StockLedger.idempotencyKey` and `CostLedger.idempotencyKey` are unique-indexed — prevents duplicate ledger entries on retry
- **FEFO Index**: `lots` table has `@@index([itemId, expiryDate(sort: Asc)])` — correctly supports FEFO allocation queries
- **Ledger Immutability**: `StockLedger` and `CostLedger` have no `updatedAt` or soft-delete — append-only by design
- **Decimal Precision**: All financial quantities use `@db.Decimal(18, 4)` or `@db.Decimal(18, 6)` — correct for inventory
- **Referential Integrity**: FK constraints use `onDelete: Restrict` on all critical inventory relationships — prevents orphan data
- **FX Rate Index**: `@@index([fromCurrencyId, toCurrencyId, effectiveFrom(sort: Desc)])` — correct for latest-rate lookups
- **3 Migrations**: Clean migration history (init → drift delta hardening → document sequence + isFrozen)
- **DocumentSequence**: Branch-aware, year-aware, collision-safe via `SELECT FOR UPDATE`

### 🔴 CRITICAL GAPS

1. **No Live Database Health Verified via MCP** — The InsForge backend at `mm4avyi6.ap-southeast.insforge.app` was not directly inspected via MCP tool (no MCP schema available in this audit). Schema drift between `schema.prisma` and live DB cannot be confirmed.
2. **`NotificationLog` Has No TTL/Cleanup** — `NotificationLog` is append-only with no cleanup job or TTL. In production, unread notifications accumulate indefinitely, creating unbounded table growth.
3. **`IdempotencyLog` Has No Cleanup** — `IdempotencyLog` entries have no TTL enforcement (the env var `IDEMPOTENCY_TTL_HOURS=24` is in `.env.example` but is **not in `envSchema` Zod validation** and no cleanup job exists).
4. **`PurchaseRequest.status` is `String` not Enum** — The `status` field on `PurchaseRequest`, `PurchaseOrder`, `GoodsReceivedNote`, `InventoryIssue`, `Transfer`, `Adjustment`, `KitchenRequest` are all `String @default("DRAFT")` — **not typed PostgreSQL enums**. This means the database has no constraint preventing invalid status values. Any raw SQL or migration error could corrupt status.
5. **`AuditLog` Has No Index** — `AuditLog` has no index on `targetTable`, `targetId`, or `createdAt` — making incident investigation queries expensive at scale.

### ⚠️ HIGH GAPS

6. **No `StocktakeSnapshot.createdAt`** — The snapshot has no timestamp, making it impossible to determine when the snapshot was taken from the database alone.
7. **`RefreshToken` Missing `expiresAt` Index** — No index on `expiresAt`, making periodic token cleanup queries full table scans.
8. **`WarehouseItem` Missing `updatedAt` Version** — `updatedAt` exists but there's no `version` field, so WarehouseItem itself has no optimistic lock protection at the application layer (relies on `updateMany` with quantity checks instead).

---

## 5. WORKFLOW AUDIT REPORT

### State Machine Coverage

| Workflow | Defined in shared-types | Backend Enforcement | Guard Coverage | Audit Log | Rollback Safety |
|---|---|---|---|---|---|
| Purchase Request | ✅ | ✅ WorkflowService | ✅ WorkflowStateGuard | ✅ | ✅ Transaction |
| Purchase Order | ✅ | ✅ | ✅ | ✅ | ✅ |
| GRN | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory Issue | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transfer (Ship/Receive) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Adjustment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kitchen Request | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stocktake (7-state) | ✅ | ✅ | ✅ | ✅ | ✅ |

### ✅ Strengths

- All 8 document types flow through the unified `WorkflowService.executeTransition()` — single point of truth
- `WorkflowStateGuard` pre-validates role permission AND status transition before any handler runs
- Optimistic locking via `updateMany WHERE version = currentVersion` prevents race conditions
- `ApprovalEvent` creates a full immutable audit trail of every status transition

### 🔴 CRITICAL GAPS

1. **Warehouse Lock Bug (Critical)**: As noted in Backend section — `LockCleanupJob` marks `WarehouseLock.status = STALE` but does NOT reset `Warehouse.isLocked = false`. Once `isLocked` is set to `true` (which happens during stocktake start), it is **never automatically cleared**, permanently blocking all physical inventory mutations.

2. **Missing POST-action Notification Coverage**: Only PR submission → APPROVER and PR approval → PROC_OFFICER and Transfer IN_TRANSIT → WH_KEEPER are notified. **GRN posted, Adjustment posted, Stocktake approved/posted, Kitchen Request submitted, Transfer received** — all missing notifications.

3. **`verifyWarehouseLocks` Does Not Cover Kitchen Requests**: The `verifyWarehouseLocks()` function in `WorkflowService` only checks GRN, Issue, Adjustment, and Transfer for lock verification. Kitchen Requests (which also mutate inventory) are **not checked against warehouse locks**.

### ⚠️ HIGH GAPS

4. **No REJECT Action in Workflow**: The workflow supports `CANCEL` but there's no `REJECT` action visible for PR/PO — managers cannot formally reject a document with a reason, only cancel it.
5. **PR-to-PO Linkage**: `PurchaseOrder.prId` is `@unique`, meaning each PO can only link to one PR, and each PR can only link to one PO. **Split PRs across multiple POs are not supported.**

---

## 6. REPORTING & EXPORT AUDIT

### Available API Endpoints

| Report | Endpoint | Pagination | Date Filter | Export |
|---|---|---|---|---|
| KPIs | GET /reports/kpis | ❌ | ❌ | ❌ |
| Dashboard | GET /reports/dashboard | ❌ | ❌ | ❌ |
| Available Inventory | GET /reports/available-inventory | ❌ | ❌ | ❌ |
| Stock Movements | GET /reports/movements | ✅ | ✅ | ❌ |
| Expiry Report | GET /reports/expiry | ❌ | ❌ | ❌ |
| Stocktake Variance | GET /reports/stocktake-variance | ❌ | ❌ | ❌ |
| Procurement Status | GET /reports/procurement-status | ❌ | ❌ | ❌ |
| Currency Summaries | GET /reports/currency-summaries | ❌ | ❌ | ❌ |
| Overdue Transfers | GET /reports/transfers/overdue | ❌ | ❌ | ❌ |
| Adjustment Summary | GET /reports/adjustments/summary | ❌ | ❌ | ❌ |

### 🔴 CRITICAL GAPS

1. **Zero XLSX/CSV/PDF Export** — No export endpoint, no export button, no generation library (no `exceljs`, `papaparse`, `pdfkit`, or equivalent). This is an **absolute enterprise blocker**.
2. **Zero Print Layout** — No print-ready view exists for any document (PO, GRN, Issue, Transfer, Adjustment).
3. **No P&L / Cost Report** — There is no cost analysis report (total consumption cost per period, per item, per category, per warehouse). Critical for restaurant F&B cost control.
4. **Missing Reports**: No supplier performance report, no reorder point report, no transfer reconciliation report, no lot traceability report.

### ⚠️ HIGH GAPS

5. **N+1 Query in `getOverdueTransfers`** — For each IN_TRANSIT transfer, a separate `approvalEvent.findFirst` query is executed inside a loop. At scale (100+ in-transit transfers), this becomes 100+ sequential queries.
6. **N+1 Query in `getCurrencySummaries`** — `fXRate.findFirst` is called inside a loop per PO currency. Should be pre-fetched.
7. **No WAC History Report** — `CostLedger` stores WAC history but no report exposes it.
8. **No Lot Traceability Report** — Given FEFO management, operators cannot trace which lot was consumed in which issue without a dedicated report.

---

## 7. DOCUMENT NUMBERING AUDIT

### ✅ PASS

- **Automatic Generation**: `DocumentSequenceService.generateNext()` is called within transactions when creating documents
- **Branch-Aware Format**: `{DocumentType}-{YYYY}-{BranchCode}-{5-digit-seq}` e.g., `PURCHASE_REQUEST-2026-HQ-00001`
- **Collision-Safe**: Uses `SELECT FOR UPDATE` with race-condition retry
- **Immutable After Creation**: `requestNumber` / `poNumber` etc. have `@unique` and are never updated
- **Year-Aware Reset**: Sequence resets per year (new record for each year)

### ⚠️ GAPS

1. **Human-Readability**: Document type prefix uses full enum name (`GOODS_RECEIVED_NOTE`) not short code (`GRN`). Results in `GOODS_RECEIVED_NOTE-2026-HQ-00001` instead of `GRN-2026-HQ-00001`.
2. **No Year Rollover Seed**: If service is down at year boundary, the first document of the new year auto-initializes correctly (handled by upsert logic), but this is untested.

---

## 8. EMAIL & AUTOMATION AUDIT

### 🔴 CRITICAL: EMAIL SYSTEM DOES NOT EXIST

| Capability | Status |
|---|---|
| SMTP client | ❌ NOT IMPLEMENTED |
| Email templates | ❌ NOT IMPLEMENTED |
| Approval notifications via email | ❌ NOT IMPLEMENTED |
| Low-stock email alerts | ❌ NOT IMPLEMENTED |
| Kitchen request emails | ❌ NOT IMPLEMENTED |
| Expiry warning emails | ❌ NOT IMPLEMENTED |
| BullMQ queue | ❌ NOT IMPLEMENTED (planned but missing) |
| Outbox pattern | ❌ NOT IMPLEMENTED |
| Retry-safe dispatch | ❌ NOT IMPLEMENTED |
| Failed email handling | ❌ NOT IMPLEMENTED |
| Admin email configuration UI | ❌ NOT IMPLEMENTED |

**Notifications exist only as database records in `NotificationLog`.** There is no real-time push, no WebSocket, no email, no SMS. Users must manually poll `/notifications` to see alerts. In a production kitchen environment, this means approvals sit unnoticed.

### ✅ What Exists

- `NotificationLog` table with role-based targeting and warehouse scoping
- In-transaction notification creation for 3 workflow events
- Notification read/mark-as-read API

---

## 9. MOCK DATA AUDIT

### Seed Data Present in Production Seed (seed.ts)

| Entity | Status |
|---|---|
| `admin@logirest.local` (password: `password123`) | 🔴 MUST REMOVE FROM PROD |
| `admin@logirest.com` (password: `adminpassword`) | 🔴 MUST REMOVE FROM PROD |
| `manager@logirest.local` (password: `password123`) | 🔴 MUST REMOVE FROM PROD |
| Demo branches: "Main Branch - HQ", "North Branch" | ⚠️ Reference data — OK for dev |
| Demo warehouses: "HQ Main Warehouse", "North Branch Warehouse" | ⚠️ Reference data — OK for dev |
| Demo items: Rice, Oil, Milk with hardcoded stock balances | ⚠️ Must be documented |
| FX Rate: SAR→USD hardcoded at `0.266667` | ⚠️ Must be updated to live rate |
| Departments: Hot Kitchen, Cold Kitchen, Bakery, Pastry, Stewarding | ⚠️ Restaurant-specific, OK |

### 🔴 CRITICAL

1. **Demo credentials must not exist in production seed**. The seed file creates users with predictable passwords (`password123`) that would be active in production if seed is ever re-run.
2. **No Production vs. Dev Seed Separation** — Single `seed.ts` serves both dev and production. A `seed.prod.ts` (admin-only, no demo users, no fake stock balances) is required.
3. **Hardcoded FX Rates** — Exchange rates are static seed data. In a live restaurant using USD purchasing, stale FX rates will produce incorrect base-currency valuations.

### ✅ What's Clean

- No hardcoded currency symbol strings in business logic — `Currency` model is database-driven
- No fake supplier names hardcoded in logic — `Supplier` model is database-driven
- No hardcoded warehouse names in business logic

---

## 10. INVENTORY SAFETY REPORT

### ✅ Strengths

- **FEFO Sorting**: `AllocationService.allocate()` correctly implements FEFO (expiry ASC, then received ASC) with fallback to FIFO for batched-no-expiry items
- **Row-Level Locking**: `LedgerLockService.lockItem()` and `lockLots()` use `SELECT FOR UPDATE` — correct for PostgreSQL serialized writes
- **Deadlock Prevention**: Lots are locked in `lotId ASC` order (alphabetical), preventing deadlocks in concurrent allocation
- **Negative Stock Prevention**: `assertItemBalance()` in `LedgerLockService` throws before decrement if insufficient stock
- **Atomic WAC Updates**: `WacService.recalculate()` runs inside the caller's transaction — WAC update and ledger entry are always atomic
- **isFrozen Flag**: Reconciliation job freezes discrepant items — prevents further operations on corrupted inventory
- **FEFO Index**: `lots.@@index([itemId, expiryDate(sort: Asc)])` correctly supports the allocation query

### 🔴 CRITICAL GAPS

1. **Warehouse Lock Bug Leaves Inventory Permanently Blocked** — (Repeated from Backend section) `Warehouse.isLocked` is not reset when `WarehouseLock` expires → all physical mutations permanently blocked post-stocktake.

2. **Reconciliation Logic Sign Assumption** — `ReconciliationJob` sums ALL `StockLedger.quantity` values and compares to `qtyOnHand`. This is only correct if OUT operations post **negative** quantities. This must be verified in `AllocationService` and `TransferPostService`. If OUT operations post positive quantities with no sign convention, reconciliation will always show discrepancies.

3. **No `qtyAllocated` Reconciliation** — `WarehouseItem.qtyAllocated` is updated during issue/kitchen request allocation. The reconciliation job only checks `qtyOnHand` against the ledger — it never validates that `qtyAllocated` is consistent.

### ⚠️ HIGH GAPS

4. **Lot Status Not Enforced in Allocation** — `AllocationService` filters by `qtyOnHand > 0` but does **not** filter by `lot.status = ACTIVE`. A lot in `HOLD` or `QUARANTINE` status could still be allocated if it has stock.
5. **WAC Not Adjusted on Negative Adjustments** — `WacService` has `handlePositiveAdjustment()` but no `handleNegativeAdjustment()` variant. Negative adjustments (stock removal) do not update WAC, which is mathematically correct (WAC only changes on cost-bearing inflows) — but this should be explicitly documented and tested.

---

## 11. SECURITY REPORT

### ✅ Strengths

- **JWT Access Tokens**: 15-minute expiry — industry standard short-lived
- **HttpOnly Cookies**: Refresh token delivered as `httpOnly` cookie — not accessible to JavaScript XSS
- **SHA-256 Token Hashing**: Refresh tokens are stored as SHA-256 hashes — breach of DB doesn't expose raw tokens
- **Replay Attack Detection**: RTR service detects and revokes entire session on token reuse
- **Global JWT Guard**: `JwtAuthGuard` applied globally via `APP_GUARD` — no route can accidentally be public without `@Public()` decorator
- **Global Idempotency Guard**: Mutation replay protection
- **Warehouse Scope Enforcement**: `ScopeInterceptor` attaches `warehouseId` from user's `UserWarehouseScope` — cross-warehouse data access is prevented at interceptor level
- **RBAC via shared-types**: `canPerformActionV2()` is the single source of truth for role-action authorization across all document types
- **Env Validation at Startup**: Missing `JWT_ACCESS_SECRET` etc. kills the process before accepting traffic

### 🔴 CRITICAL GAPS

1. **`SameSite: 'lax'` vs. Required `'strict'`** — The refresh cookie uses `sameSite: 'lax'` instead of the spec-required `'strict'`. `lax` allows the cookie to be sent on top-level navigation GET requests (e.g., clicking a link from an external site). For a `POST /api/v1/auth/refresh` endpoint, this doesn't change the behavior (POST is blocked by `lax`), but it deviates from the stated hardening requirement.

2. **`JWT_SECRET` Environment Variable is Accepted but Unused** — `.env.example` documents `JWT_SECRET` and `JWT_EXPIRATION`, but `envSchema` in `env.validation.ts` only validates `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. `JWT_SECRET` might be used elsewhere in the codebase (e.g., old module config) — if so, its absence from env validation means a startup crash on misconfiguration is not guaranteed.

3. **No Rate Limiting** — No `@nestjs/throttler` or equivalent is configured. Login endpoint (`POST /auth/login`) is completely unprotected against brute-force attacks.

4. **Swagger Docs Exposed in Production** — `SwaggerModule.setup('api/docs', ...)` is registered unconditionally, with no `NODE_ENV !== 'production'` guard. Production API docs are publicly accessible.

5. **CORS Single Origin Limitation** — The API allows one CORS origin. Multi-domain deployments (staging + production) require runtime CORS configuration.

6. **No `helmet` Middleware** — No HTTP security headers (`X-Frame-Options`, `Content-Security-Policy`, `HSTS`, `X-Content-Type-Options`) are set. This is standard for any production API.

7. **Password Policy Not Enforced** — `LoginDto` and user management have no minimum password complexity requirements enforced at the DTO/validation layer.

### ⚠️ HIGH GAPS

8. **Audit Log Completeness** — Audit logs capture workflow transitions but not master data mutations (item created, supplier updated, currency added, user role changed). An admin changing a user's role leaves no audit trail.

9. **Stale Session Cleanup** — `RefreshToken` records are never cleaned up. Expired tokens accumulate in the database forever, creating an unbounded table.

---

## 12. PERFORMANCE REPORT

### 🔴 Critical N+1 Patterns

| Location | N+1 Risk |
|---|---|
| `ReportsController.getOverdueTransfers()` | 1 query per transfer to find ship event |
| `ReportsController.getCurrencySummaries()` | 1 FX query per PO in loop |
| `AllocationService.allocate()` | Individual `UPDATE` per lot in loop (acceptable for small lots) |

### 🔴 Missing Indexes

| Table | Missing Index |
|---|---|
| `audit_logs` | `(targetTable, targetId)`, `(userId)`, `(createdAt)` |
| `refresh_tokens` | `(expiresAt)` for cleanup queries |
| `notification_logs` | `(createdAt)` for old notification cleanup |
| `approval_events` | `(documentId, documentType)` (used in `executeTransition` count query) |

> Note: `approval_events` is queried with `where: { documentId, documentType }` in `executeTransition` but has no composite index defined.

### ⚠️ Transaction Duration Risk

- `WorkflowService.executeTransition()` has a 20-second timeout. During the transaction, it:
  1. Locks document row
  2. Updates status
  3. Counts ApprovalEvents
  4. Creates ApprovalEvent
  5. Creates AuditLog
  6. Creates NotificationLog (conditionally)
  
  For GRN posting (which additionally calls allocation + WAC service), the total work is significant. Under lock contention on `WarehouseItem`, this could approach the timeout.

### ✅ Strengths

- Pagination is implemented on `/reports/movements` (page + limit)
- `StockLedger` and `CostLedger` have `(warehouseId, itemId, postedAt DESC)` indexes for time-range queries
- `WarehouseLock` has `(isActive, expiresAt)` index for the cleanup job query

---

## 13. OBSERVABILITY REPORT

### ✅ What Exists

- NestJS `Logger` is used throughout key services (WorkflowService, WacService, AllocationService, ReconciliationJob)
- `AuditLog` table provides a queryable audit trail
- Structured error formatting in global `ValidationPipe`
- `ApprovalEvent` provides full workflow history

### 🔴 CRITICAL GAPS

1. **No Structured Logging Output** — NestJS default logger outputs text to stdout. There is no JSON-structured logging (no `pino`, `winston`, or `nestjs-pino`). Log aggregation tools (Loki, CloudWatch, ELK) cannot parse unstructured text logs reliably.

2. **No APM / Error Tracking** — No Sentry, Datadog, or equivalent is configured. Unhandled runtime exceptions are logged to stdout only — no alerting, no stack trace aggregation, no error grouping.

3. **No Operational Metrics** — No Prometheus metrics endpoint (`/metrics`). No tracking of: transaction durations, lock wait times, failed posting counts, reconciliation run results, idempotency cache hit rates, queue depths.

4. **No Distributed Tracing** — No correlation IDs in logs or request headers. Tracing a single user action across multiple log lines requires manual timestamp matching.

5. **Health Check is Stub** — `/health` returns static JSON without checking database connectivity. Container orchestrators (Kubernetes liveness probes, ECS health checks) will report healthy even when the database is unreachable.

6. **Reconciliation Results Not Persisted** — `ReconciliationJob` logs to console but does not persist run results (run timestamp, items checked, discrepancies found) to the database. There is no way to query "when was the last reconciliation?" from the system.

---

## 14. TESTING & RELIABILITY REPORT

### Test Coverage Summary

| Module | Unit Tests | Integration Tests |
|---|---|---|
| Auth (login, RTR) | ✅ Present | ✅ Present |
| JWT Strategy | ✅ | N/A |
| Scope Interceptor | ✅ | N/A |
| WorkflowService | ✅ (spec.ts) | Partial |
| AllocationService | ✅ | Partial |
| WacService | ✅ | Partial |
| LedgerLockService | ✅ | N/A |
| ReconciliationJob | ✅ | N/A |
| DocumentSequenceService | ✅ | N/A |
| InventoryService | ✅ | ✅ |
| OperationsController | ✅ | ✅ |
| IdempotencyGuard | ✅ | N/A |
| WarehouseLockGuard | ✅ | N/A |
| NotificationService | ✅ | N/A |

### 🔴 CRITICAL GAPS

1. **No Concurrency Tests** — No tests simulate two concurrent postings on the same item to verify optimistic locking prevents double-spend.
2. **No End-to-End Workflow Tests** — No test runs a complete PR → PO → GRN → Issue → Reconciliation cycle.
3. **No Reconciliation Logic Tests** — The reconciliation comparison logic (ledger sum vs. qtyOnHand) has no test that creates a discrepancy and verifies the freeze + notification behavior.
4. **No Export/Report Tests** — Zero tests for report accuracy or export format.

### ⚠️ HIGH GAPS

5. **Reconciliation Job Sign Convention Not Tested** — Whether OUT operations produce negative ledger entries (required for reconciliation math to work) is not verified by a test.
6. **Lock Cleanup Not E2E Tested** — No test verifies that when a stocktake lock expires, the warehouse returns to operational state.

---

## 15. PRODUCTION BLOCKERS

### 🔴 CRITICAL (Must fix before production)

| # | Blocker | Impact |
|---|---|---|
| C-1 | `Warehouse.isLocked` never reset after lock expiry | Permanent warehouse lockdown post-stocktake |
| C-2 | Health check does not ping database | Container orchestrators report false-healthy |
| C-3 | No email delivery system | Zero operational notifications reach users |
| C-4 | Demo credentials (`password123`) in seed.ts | Security breach risk if seed is run |
| C-5 | No XLSX/PDF/CSV export | Enterprise reporting requirement unmet |
| C-6 | No Docker files exist | Cannot containerize for production deployment |
| C-7 | No BullMQ/outbox for async delivery | Planned but missing; notifications unreliable |
| C-8 | Swagger docs exposed unconditionally | API internals visible in production |
| C-9 | No rate limiting on auth endpoints | Brute-force attack surface |
| C-10 | `Lot.status` not enforced in allocation | HOLD/QUARANTINE lots can be issued |

### 🔴 HIGH (Must fix before production)

| # | Issue | Impact |
|---|---|---|
| H-1 | No helmet security headers | Missing HSTS, CSP, X-Frame-Options |
| H-2 | Kitchen requests not checked against warehouse lock | Lock bypass for kitchen operations |
| H-3 | N+1 query in overdue transfers report | Performance at scale |
| H-4 | `AuditLog` missing indexes | Slow incident investigation |
| H-5 | `approval_events` missing composite index | Slow workflow transition at scale |
| H-6 | `NotificationLog` no TTL/cleanup | Unbounded table growth |
| H-7 | `IdempotencyLog` no cleanup job | Unbounded table growth |
| H-8 | No structured (JSON) logging | Log aggregation impossible |
| H-9 | No CORS hardening for multi-environment | Production CORS failures |
| H-10 | Stale session cleanup missing | Unbounded `refresh_tokens` table |
| H-11 | Reconciliation sign convention unverified | False discrepancy detection |
| H-12 | Missing notification triggers (GRN, KR, Adj) | Operational blindness |
| H-13 | No separate production seed | Demo data risk |
| H-14 | No lot traceability or WAC history report | Audit and compliance gap |
| H-15 | Document number format uses full enum name | Non-human-readable numbers |

### 🟡 MEDIUM

| # | Issue |
|---|---|
| M-1 | `SameSite: 'lax'` vs. stated `'strict'` requirement |
| M-2 | No APM/error tracking (Sentry etc.) |
| M-3 | No Prometheus metrics endpoint |
| M-4 | No reconciliation run persistence |
| M-5 | `qtyAllocated` not reconciled |
| M-6 | No REJECT workflow action (only CANCEL) |
| M-7 | No PR-to-multiple-PO support |
| M-8 | FX rates are static seed data |
| M-9 | `StocktakeSnapshot` missing `createdAt` |
| M-10 | `RefreshToken.expiresAt` missing index |

### 🔵 LOW

| # | Issue |
|---|---|
| L-1 | No CI/CD pipeline definition |
| L-2 | Password policy not enforced in DTOs |
| L-3 | `JWT_SECRET` in .env.example but not in Zod schema |
| L-4 | Year rollover sequence not integration-tested |
| L-5 | WAC negative adjustment not documented |

---

## 16. PRIORITIZED IMPROVEMENT ROADMAP

### Critical (Pre-Production Sprint 1 — 2 weeks)

1. **Fix `Warehouse.isLocked` reset in `LockCleanupJob`** — One-line fix, critical correctness
2. **Add real database health check to `/health`** — `prisma.$queryRaw('SELECT 1')` with try/catch
3. **Create Dockerfiles** (multi-stage) for API and Web — Required for any deployment
4. **Separate production seed** — `seed.prod.ts` with no demo users, forced password change on first login
5. **Disable Swagger in production** — `if (process.env.NODE_ENV !== 'production') { SwaggerModule.setup(...) }`
6. **Add `helmet`** — `app.use(helmet())` in `main.ts`
7. **Add `@nestjs/throttler`** — Rate limit `/api/v1/auth/login` to 10/minute
8. **Filter `HOLD`/`QUARANTINE` lots in AllocationService**

### High (Pre-Production Sprint 2 — 2 weeks)

9. **Implement email delivery** — Add `nodemailer`/`Resend`, create email templates, connect to `NotificationLog`
10. **Add XLSX export** — Install `exceljs`, create export endpoints for all reports
11. **Fix missing indexes** — `audit_logs`, `approval_events`, `refresh_tokens`
12. **Add N+1 fixes** — Batch FX and approval event queries in reports
13. **Add cleanup jobs** — `NotificationLog` (30-day), `IdempotencyLog` (TTL), `RefreshToken` (expired)
14. **Add warehouse lock check for Kitchen Requests**
15. **Add missing workflow notifications** — GRN posted, KR submitted, Adjustment posted

### Medium (Post-Production Hardening — 4 weeks)

16. **Add structured logging** (pino/nestjs-pino with JSON output)
17. **Add Sentry or Datadog** error tracking
18. **Add Prometheus metrics** endpoint
19. **Add PDF print layouts** for PO, GRN, Issue documents
20. **Add lot traceability report**
21. **WAC history report** from CostLedger
22. **Add REJECT workflow action**
23. **Reconciliation run persistence**
24. **CI/CD pipeline** (GitHub Actions)

---

## 17. AUDIT EXPANSION REPORT

### 1. Existing Findings Summary

The system demonstrates strong foundational architecture: clean schema design, proper FEFO/FIFO implementation, transactional workflow safety, and idempotency mechanisms. The backend is more mature than the frontend. The largest gaps are operational completeness (email, export, observability) rather than correctness of core inventory logic.

### 2. Newly Discovered Gaps

- **Document number format uses full enum name** — `GOODS_RECEIVED_NOTE-2026-HQ-00001` is non-standard for human reference
- **`verifyWarehouseLocks()` in `WorkflowService` has dead-letter issue** — The check is performed before the transaction starts, but the actual lock status could change between check and transaction commit (TOCTOU issue). The guard in `WorkflowStateGuard` runs before the service's internal transaction.

### 3. Missing Operational Safeguards

- No frozen item recovery workflow (once frozen by reconciliation, how is it unfrozen after manual correction?)
- No partial receipt workflow for GRN (received < ordered)
- No landed cost allocation to GRN lines at receiving time (though `landed-cost/` page exists in frontend)

### 4. Hidden Production Risks

- **Reconciliation False Positives**: If `StockLedger` signs are inconsistent across posting services, reconciliation will freeze legitimate items daily at 1 AM, causing operational chaos
- **20-second transaction timeout**: Under heavy concurrent load, complex postings may timeout and fail after partial work, potentially leaving the database in a state where only some lots were debited before rollback

### 5. Runtime Integrity Weaknesses

- `qtyAllocated` integrity is not reconciled — can drift from `LotAllocation` records
- No cross-check between `WarehouseItemLot.qtyOnHand` SUM and `WarehouseItem.qtyOnHand`

### 6. Deployment Risks

- No Dockerfile = no container image = no cloud deployment possible today
- No migration deployment strategy documented (zero-downtime migration guidance missing)
- No readiness probe separate from liveness probe

### 7. Scalability Risks

- `ReconciliationJob` performs a full table scan of all `WarehouseItem` records and all `StockLedger` records nightly. At 10,000 items × 1M ledger entries, this becomes a multi-minute operation
- `ApprovalEvent` counter query in `executeTransition` scales poorly with document age

### 8. Financial Consistency Risks

- FX rates are snapshot-at-seed-time — no mechanism to update them operationally
- WAC is rounded to 4 decimal places at every operation — rounding accumulation over thousands of operations could cause valuation drift

### 9. Observability Gaps

- No metrics for: reconciliation discrepancy rate, idempotency key collision rate, failed workflow transition rate, token replay attempt rate

### 10. Disaster Recovery Gaps

- No documented backup strategy
- No point-in-time recovery configuration
- No tested restore procedure
- No migration rollback plan (Prisma `migrate deploy` is one-way in production)

### 11. Missing Automation

- Expiry warning automation (items expiring in <7 days should trigger notifications)
- Low-stock threshold automation (configurable minimum quantity per item per warehouse)
- Auto-cancel stale DRAFT documents (PRs open for 30 days with no action)
- FX rate update automation

### 12. Final Expanded Risk Matrix

| Risk | Probability | Impact | Severity |
|---|---|---|---|
| Warehouse locked permanently post-stocktake | HIGH | CRITICAL | 🔴 |
| Reconciliation false positives freeze inventory | MEDIUM | CRITICAL | 🔴 |
| Demo credentials in production | LOW (if seed not run) | CRITICAL | 🔴 |
| No email = operational blindness | CERTAIN | HIGH | 🔴 |
| No export = compliance failure | CERTAIN | HIGH | 🔴 |
| FX rate staleness | HIGH | MEDIUM | 🟡 |
| N+1 report performance | LOW (small data) | MEDIUM | 🟡 |
| Token replay goes undetected | LOW | HIGH | 🟡 |

---

## 18. FINAL GO-LIVE ASSESSMENT

### Scores

| Dimension | Score |
|---|---|
| **Go-Live Readiness Score** | **4.5 / 10** |
| **Operational Risk Score** | **7 / 10** (high) |
| **Inventory Safety Confidence** | **7.5 / 10** |
| **Production Deployment Recommendation** | **NOT READY** |

---

## ❌ FINAL VERDICT: NOT READY FOR PRODUCTION

### Why

The system has excellent foundational correctness in its core inventory mechanics (FEFO/FIFO, WAC, optimistic locking, idempotency, document sequencing). These are strong. However, it cannot go live because:

1. **It cannot be deployed** — No Dockerfile exists. No production container image can be built.
2. **Operators will not know when approvals are pending** — The notification system exists only in the database. No email, no push, no real-time delivery.
3. **No financial reporting exists** — The system cannot produce a single enterprise-grade report with export capability. This fails the most basic accounting requirement.
4. **A permanent warehouse lockout bug exists** — Every stocktake will permanently lock the warehouse unless manually intervened in the database.
5. **The health check is a stub** — Container orchestration will report the service healthy even when the database is disconnected.
6. **Demo credentials exist in the seed** — If seed is run in production (common mistake), three accounts with `password123` will exist.

### Conditions for Production Readiness

Fix the 10 Critical blockers (C-1 through C-10) to reach **"READY WITH CONDITIONS"** status.  
Fix the 15 High issues (H-1 through H-15) to reach **"READY FOR PRODUCTION"** status.

**Estimated work**: 4–6 weeks of focused engineering effort across backend, frontend, and DevOps.

---

*Audit performed by inspecting 40+ source files across the full monorepo stack including: Prisma schema, NestJS modules (auth, workflow, ledger, operations, reports, notifications, jobs), frontend page structure, seed data, environment validation, guard/interceptor chain, reconciliation logic, and deployment configuration.*

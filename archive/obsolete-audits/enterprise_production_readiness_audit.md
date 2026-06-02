# Enterprise Full-System Production Readiness Audit
## LogiRest Kitchen-Store Inventory Management System
**Audit Date:** 2026-05-25 | **Auditor Role:** Principal Software Architect + Enterprise Systems Auditor

---

## 1. SYSTEM READINESS OVERVIEW

| Dimension | Rating | Notes |
|---|---|---|
| Operational Maturity | **Advanced** | Multi-workflow, multi-warehouse, multi-currency ERP |
| Architecture Quality | **High** | NestJS monorepo, shared-types, CQRS patterns, state machines |
| Deployment Readiness | **Conditional** | Critical gaps in mock data remnants and role permission UI |
| Production Confidence | **65%** | Solid backend core; frontend has isolated critical issues |

**Summary:** The system is architecturally mature and operationally sophisticated. The transactional core (FEFO/FIFO, WAC, optimistic locking, outbox, reconciliation) is production-grade. However, **critical gaps** in the Admin Roles UI (entirely mock-backed), hardcoded currency fallbacks across 15+ production components, a missing SMTP UI configuration, and incomplete workflow notification coverage prevent unconditional production clearance.

---

## 2. FRONTEND AUDIT REPORT

### ✅ Strengths
- All major operational screens are implemented: PRs, POs, GRN, Issues, Transfers, Adjustments, Stocktake, Kitchen Requests
- RTL/LTR bilingual support (Arabic/English) via `next-intl` throughout all pages
- Approval workflow UX exists: submit, approve, reject, post actions visible
- Loading states and error boundaries implemented across list and detail views
- FEFOLotAllocator component with its own unit test suite

### 🔴 CRITICAL GAPS

**C-FE-1: Admin Roles & Permissions UI is entirely mock-backed**
- `useAdminRoles.ts` returns `MOCK_ROLES` — a static JavaScript array — with simulated 500ms delay.
- `useAdminRole()` reads from the same static array.
- `useUpdateRolePermissions()` performs a fake mutation with 1s timeout that never persists.
- **Impact:** The Roles & Permissions management screen (`/admin/roles`) has no backend integration whatsoever. Administrators cannot actually manage permissions in production.
- **Risk:** HIGH — any apparent permission change is silently lost on page refresh.

**C-FE-2: Hardcoded SAR currency fallback in 15+ production components**
- Across dashboards, GRN views, stocktake, PO forms, procurement, stock balance: `settings?.base_currency || 'SAR'`
- `StoreManagerDashboard.tsx`: `formatCurrency(stats.totalValue, 'SAR', locale)` — no fallback to settings at all.
- `SearchClient.tsx`: hardcoded `'4,250 SAR'` in metadata mock.
- `DashboardClient.tsx`: `baseCurrency: 'SAR'` hardcoded default.
- **Impact:** If a client uses AED, EUR, or USD as base currency, all financial displays are incorrectly labelled.

**C-FE-3: `useGoodsReceipts.ts` — hardcoded supplier currency fallback**
- Line 17: `supplierCurrency: 'USD'`
- Line 133: `supplierCurrency: 'SAR' // Can be refined to fetch from PO`
- These are documented as technical debt and never resolved.

**C-FE-4: `SearchClient.tsx` contains a hardcoded demo record**
- Static search result with `'Date': '2024-04-20', 'Total': '4,250 SAR'` — real data should come from API.
- Date is in 2024 — clearly placeholder content in a production-facing search.

### ⚠️ HIGH GAPS

**H-FE-1: No expiry/low-stock alerts in frontend notification center**
- The backend generates LOW_STOCK_ALERT and expiry outbox events, but there's no frontend notification bell or in-app toast for proactive alerts.

**H-FE-2: Reports hub missing WAC History and Lot Trace reports in frontend page listings**
- Backend API endpoints exist: `/reports/wac-history`, `/reports/lot-trace`, and their `/export` counterparts.
- `ReportsHubClient.tsx` contains only 6 entries; WAC history and lot traceability are absent from the UI hub.

**H-FE-3: Yield Management page exists but content is unclear**
- `/yield-management` path exists in the operations section but was not observed as fully implemented.

**H-FE-4: Communications section present but content unclear**
- `/communications` route exists; the scope of what it renders in production needs verification.

---

## 3. BACKEND AUDIT REPORT

### ✅ Strengths
- **State Machine**: All document workflows enforced through `canPerformActionV2`/`getNextStatusV2` from shared-types. Transitions are gated at both role-permission and status-machine levels.
- **Optimistic Locking**: `version` field enforced via `updateMany` + count check; concurrency conflicts handled by `ConcurrencyService`.
- **Warehouse Lock Enforcement**: `verifyWarehouseLocks()` called on all mutating operations (GRN POST, ISSUE POST, ADJUSTMENT POST, TRANSFER SHIP/RECEIVE).
- **Transactional Integrity**: All inventory mutations wrapped in `prisma.$transaction` with 30s timeout.
- **Audit Logging**: Every workflow transition writes an `ApprovalEvent` AND an `AuditLog` entry within the same transaction.
- **Outbox Pattern**: BullMQ-backed outbox with retry (max 3 attempts), idempotency (SUCCEEDED check), and proper failure classification.
- **Refresh Token Rotation**: SHA-256-hashed tokens, replay detection, full session revocation on replay, versioned optimistic locking on token rotation.
- **Rate Limiting**: ThrottlerGuard globally applied at 10 req/60s.
- **Helmet**: HTTP security headers enabled.
- **Pino**: Structured JSON logging with correlation IDs.
- **Health Endpoint**: `/health` endpoint excluded from global JWT guard.
- **Env Validation**: Zod schema validates all required env variables at startup, exits on failure.

### 🔴 CRITICAL GAPS

**C-BE-1: `SECURITY_ALERT_REPLAY_ATTACK` outbox event never handled**
- `rtr.service.ts` writes a `SECURITY_ALERT_REPLAY_ATTACK` outbox event on replay attack detection.
- The `OutboxWorker.renderTemplate()` and `resolveRecipients()` methods have no `case` for this event type — it falls through to the `default` case which sends a generic notification to no one.
- **Impact:** Security replay attacks are silently logged but no administrator is notified.

**C-BE-2: Transfer SHIP does not go through WorkflowService; status check is hardcoded to 'DRAFT'**
- `TransferPostService.ship()` checks `transfer.status !== 'DRAFT'` directly.
- This bypasses the workflow state machine (`canPerformActionV2`) for role permission validation.
- A user with insufficient role can potentially call the ship endpoint and bypass role enforcement if the role guard on the controller is misconfigured.
- Similarly for `receive()` checking for `'IN_TRANSIT'` directly.

**C-BE-3: WAC not recalculated on Issue POST**
- `IssuePostService.post()` correctly decrements stock via FEFO allocation, writes StockLedger, but does NOT update WAC or write a CostLedger entry.
- WAC should remain static on outflows (correct behavior for WAC model), BUT no CostLedger record is written. This means issue-out transactions are invisible in the WAC audit trail.
- **Impact:** WAC history report (`/reports/wac-history`) is incomplete for issue transactions.

**C-BE-4: No SMTP admin UI or runtime configuration endpoint**
- SMTP configuration (HOST, PORT, USER, PASS, FROM) is entirely environment-variable driven.
- There is no admin API or UI to configure email settings at runtime.
- If SMTP is not configured, `EmailService` silently returns `true` — operators have NO indication emails are not being sent.
- **Impact:** Production systems where email must be configured post-deployment cannot do so without a server restart.

**C-BE-5: Low-stock debounce is in-memory (lost on restart)**
- `LowStockAlertJob.alertDebounceRegistry` is a `Map` — it is reset on every server restart.
- If the API restarts at 5:59 AM and the cron job runs at 6:00 AM, ALL previously debounced alerts fire again.
- **Impact:** Alert storms after deployments or crashes.

### ⚠️ HIGH GAPS

**H-BE-1: Global rate limit of 10 req/60s is too low for production warehouse operations**
- A warehouse keeper scanning barcodes rapidly or generating a GRN with 20+ lines will hit this limit immediately.
- No endpoint-level throttle overrides observed.

**H-BE-2: `reports.controller.ts` has no service layer; contains all query logic in the controller**
- Violates single responsibility and makes testing, reuse, and pagination impossible without duplicating queries.
- Export endpoints call internal `getMovements()` with `'1000000'` limit — no actual pagination protection on exports.

**H-BE-3: No Prisma middleware for soft-delete enforcement**
- Soft-delete (`isActive`, `isDeleted` flags) must be consistently enforced at query level, not just in service logic.
- If a developer adds a query without the `isActive: true` filter, deleted records are silently included.

**H-BE-4: Missing `TRANSFER_RECEIVED` notification dispatch**
- `workflow.service.ts` dispatches `TRANSFER_RECEIVED` outbox event pointing to `fromWarehouseId`, but there is no corresponding `NotificationLog` entry created inside the transaction. PR_SUBMITTED and TRANSFER_SHIPPED both create `NotificationLog` entries; TRANSFER_RECEIVED does not.

---

## 4. DATABASE AUDIT REPORT

### ✅ Strengths
- Migration history is clean with 5 structured migrations.
- `document_sequences` table with `FOR UPDATE` row-lock for collision-safe sequential numbering.
- `warehouse_locks` + `WarehouseLock.isActive` dual-check.
- `idempotency_logs` table for write-once protection.
- `audit_logs`, `approval_events`, `notification_logs`, `reconciliation_runs`, `outbox_events` tables all present.
- `refresh_tokens` with hashing, `sessionId`, `parentTokenId` chain, `version` for optimistic locking.
- `cost_ledger` for WAC audit trail (GRN, Transfers, Adjustments).
- `stock_ledger` as append-only movement record.
- Latest migration `20260524020000_sprint1_add_indexes` specifically adds FEFO/FIFO performance indexes.

### 🔴 CRITICAL GAPS

**C-DB-1: No CHECK constraints preventing negative stock at DB level**
- `warehouse_items.qty_on_hand` and `warehouse_item_lots.qty_on_hand` have no `CHECK (qty_on_hand >= 0)` constraint.
- Negative stock is prevented only by application-level `assertItemBalance()` and `assertLotBalance()` methods.
- A concurrent race, direct SQL, or a future code path bypass could silently produce negative inventory.

**C-DB-2: `outbox_events.status` is not validated at DB level**
- Only `PENDING`, `SUCCEEDED`, `FAILED` are valid values but no CHECK constraint enforces this.

**C-DB-3: Production seed (`seed.prod.ts`) hardcodes FX rates and SAR as base currency**
- `rate: 3.75` for USD/SAR is hardcoded in production seed.
- `isBase: true` is hardcoded to SAR.
- This cannot be changed without re-running the seed or manual DB intervention.
- **Impact:** Clients with a different base currency must modify production seed or perform manual DB operations.

**C-DB-4: Schema drift audit not automated**
- No CI step or scheduled job that compares live DB schema against Prisma's expected schema.
- `prisma migrate status` must be run manually to detect drift.
- The `20260523204900_drift_delta_hardening` migration name implies drift was already discovered once.

### ⚠️ HIGH GAPS

**H-DB-1: `document_sequences` has no unique constraint on (document_type, year, branch_id)**
- The `FOR UPDATE` + insert pattern has a time-of-check/time-of-use race. The catch block handles this, but without a unique constraint on `(document_type, year, branch_id)`, duplicate rows could theoretically be created.

**H-DB-2: `reconciliation_runs.frozen_items` stored as raw string array**
- Forensic investigation of reconciliation history requires parsing JSON arrays from the `frozenItems` column; no structured link back to `warehouse_items`.

**H-DB-3: No cascading delete/archive strategy documented**
- What happens to `approval_events`, `audit_logs`, `stock_ledger` when a warehouse or branch is deactivated? No archival or cascade policy defined.

---

## 5. WORKFLOW AUDIT REPORT

| Workflow | Completeness | Approval Safety | Rollback Safety | Notifications | Notes |
|---|---|---|---|---|---|
| Purchase Request | ✅ COMPLETE | ✅ Role-gated | ⚠️ No rollback from APPROVED | ✅ PR_SUBMITTED, PR_APPROVED | — |
| Purchase Order | ✅ COMPLETE | ✅ Role-gated | ⚠️ No rollback from APPROVED | ✅ SUPPLIER_PO_NOTIFIED | — |
| GRN | ✅ COMPLETE | ✅ Role-gated | ❌ No void/cancel after POST | ✅ GRN_POSTED, SUPPLIER_GRN_NOTIFIED | — |
| Inventory Issue | ✅ COMPLETE | ✅ Role-gated | ❌ No void after POST | ❌ No outbox event on ISSUE POST | Missing outbox |
| Transfer (SHIP) | ⚠️ PARTIAL | ❌ Bypasses canPerformActionV2 | ❌ No reversal | ✅ TRANSFER_SHIPPED | Role check gap |
| Transfer (RECEIVE) | ⚠️ PARTIAL | ❌ Bypasses canPerformActionV2 | ❌ No reversal | ❌ No NotificationLog | Missing notification |
| Adjustment | ✅ COMPLETE | ✅ Role-gated | ❌ No void after POST | ✅ ADJUSTMENT_POSTED | — |
| Stocktake | ✅ COMPLETE | ✅ Role-gated | ❌ No cancel after STARTED | ✅ STOCKTAKE_STARTED, STOCKTAKE_POSTED | — |
| Kitchen Request | ✅ COMPLETE | ✅ Role-gated | ❌ No void after POST | ✅ KITCHEN_REQUEST_SUBMITTED, KITCHEN_REQUEST_POSTED | — |

### 🔴 CRITICAL GAPS

**C-WF-1: Transfer SHIP and RECEIVE bypass the shared workflow state machine's role validation**
- `TransferPostService.ship()` directly checks status `!== 'DRAFT'` and hardcodes the role expectation, bypassing `canPerformActionV2`.
- If a future role matrix change is made to shared-types, this code path is unaffected.

**C-WF-2: ISSUE_POSTED outbox event missing**
- `IssuePostService.post()` performs all inventory mutations but dispatches no outbox event and creates no `NotificationLog`.
- Inventory managers are not notified when stock is issued.

**C-WF-3: No void/reversal workflow for any POSTED document**
- Once GRN, Issue, Adjustment, Transfer are posted, there is no reversal path in the state machine.
- Production environments require a correction mechanism (void with offsetting ledger entry) for erroneous postings.
- This is the most significant **operational gap** in the entire system.

---

## 6. REPORTING & EXPORT AUDIT

| Report | API | Export | Enterprise Formatting | Branding | Date Range Filter | Totals |
|---|---|---|---|---|---|---|
| Stock Movements | ✅ | ✅ XLSX | ✅ | ✅ LogiRest header | ✅ | ❌ |
| Expiry Report | ✅ | ✅ XLSX | ✅ + color coding | ✅ | ❌ | ❌ |
| Available Inventory | ✅ | ✅ XLSX | ✅ + SUM footer | ✅ | N/A | ✅ |
| Stocktake Variance | ✅ | ✅ XLSX | ✅ + color coding | ✅ | N/A (per session) | ❌ |
| Procurement Status | ✅ | ✅ XLSX | ✅ | ✅ | ❌ | ❌ |
| WAC History | ✅ | ✅ XLSX | ✅ | ✅ | ✅ | ❌ |
| Lot Traceability | ✅ | ✅ XLSX | ✅ | ✅ | N/A | N/A |
| Currency Summaries | ✅ | ❌ NO EXPORT | ⚠️ JSON only | N/A | N/A | ✅ |
| Dashboard KPIs | ✅ | ❌ NO EXPORT | N/A | N/A | N/A | N/A |
| Overdue Transfers | ✅ | ❌ NO EXPORT | N/A | N/A | N/A | N/A |
| WAC History Report (Frontend Hub) | ❌ MISSING | ❌ | N/A | N/A | N/A | N/A |
| Lot Trace Report (Frontend Hub) | ❌ MISSING | ❌ | N/A | N/A | N/A | N/A |

### ⚠️ HIGH GAPS

**H-RPT-1:** Export endpoints call `getMovements()` with unlimited limit (`'1000000'`) — no streaming, no memory protection for large datasets.

**H-RPT-2:** Expiry report has no date range filter — full warehouse query, always.

**H-RPT-3:** Currency summaries and overdue transfers have no XLSX export capability.

**H-RPT-4:** Reports are not branch-aware in headers — no restaurant name or branch code in the generated XLSX files (only "LogiRest Inventory Management System" as static title).

---

## 7. DOCUMENT NUMBERING AUDIT

### ✅ PASS

- Format: `{PREFIX}-{YEAR}-{BRANCH_CODE}-{SEQUENCE_5DIGITS}` (e.g. `PR-2026-HQ-00001`)
- `FOR UPDATE` row locking ensures collision safety within a transaction
- Race condition on first insert handled with catch-retry pattern
- Sequences are year-and-branch-scoped (reset annually per branch)
- All document types covered: PR, PO, GRN, ISS, TRF, ADJ, KR, ST

### ⚠️ GAPS

**H-NUM-1:** No unique DB constraint on `(document_type, year, branch_id)` in `document_sequences` table to back up the application-level lock.

**H-NUM-2:** Document numbers are generated AFTER the document is created (not as part of initial creation in most places). If a pre-creation document has no number, APIs that return it show `null` document number briefly.

---

## 8. EMAIL & AUTOMATION AUDIT

### ✅ Strengths
- BullMQ outbox worker with retry logic (3 attempts before FAILED)
- Branded HTML email templates with professional corporate design
- Dynamic recipient resolution from active DB roles (not hardcoded emails)
- Supplier email notifications for PO approval and GRN receipt
- `outbox_events` records provide a persistent email dispatch log
- `outbox-cleanup.job.ts` cleans old SUCCEEDED/FAILED events
- `LOW_STOCK_ALERT` automated at 06:00 AM daily via `@Cron`

### 🔴 CRITICAL GAPS

**C-EMAIL-1: No admin UI to configure SMTP**
- No API endpoint or frontend page to set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- If SMTP is not configured, `EmailService.sendEmail()` returns `true` silently — success is falsely reported to the outbox worker
- Operators have NO visibility that emails are not actually sending

**C-EMAIL-2: `SECURITY_ALERT_REPLAY_ATTACK` event type falls through to default (no recipients)**
- Template not defined, recipients not resolved — security alerts are silently swallowed

**C-EMAIL-3: `ISSUE_POSTED` outbox event type not dispatched**
- Inventory managers are not notified when stock is consumed

**C-EMAIL-4: Low-stock debounce is in-memory**
- Lost on restart, causing alert storms after every deployment

### ⚠️ HIGH GAPS

**H-EMAIL-1:** No email unsubscribe mechanism
**H-EMAIL-2:** No email delivery failure dashboard for administrators
**H-EMAIL-3:** `STALE_LOCK_ALERT` and expiry-approaching notifications are not implemented despite the expiry report API existing

---

## 9. MOCK DATA AUDIT

### 🔴 CRITICAL

| Location | Content | Status |
|---|---|---|
| `useAdminRoles.ts` | `MOCK_ROLES` with fake user counts, fake permissions, simulated delay | **IN PRODUCTION CODE** — never connects to API |
| `DashboardClient.tsx:27` | `baseCurrency: 'SAR'` hardcoded | **IN PRODUCTION CODE** |
| `StoreManagerDashboard.tsx:94` | `formatCurrency(stats.totalValue, 'SAR', ...)` | **IN PRODUCTION CODE** |
| `SearchClient.tsx:78` | Hardcoded demo result `'4,250 SAR', '2024-04-20'` | **IN PRODUCTION CODE** |
| `useGoodsReceipts.ts:17,133` | `supplierCurrency: 'USD'` and `'SAR'` hardcoded fallbacks | **IN PRODUCTION CODE** |
| `purchase-order-form.tsx:277,591` | `baseCurrency || 'SAR'` | **IN PRODUCTION CODE** (acceptable as fallback if from settings) |

### ✅ What's Clean
- All operational data (items, categories, warehouses, suppliers) is database-driven
- `seed.prod.ts` correctly uses env vars for initial admin user
- Mock infrastructure (`mock-api.adapter.ts`, `mock-database.ts`) is contained within `src/infrastructure/mock/` and not imported by production pages
- `MOCK_TRANSFERS` from graph nodes is not referenced in production page code

---

## 10. INVENTORY SAFETY REPORT

### ✅ Strengths
- **FEFO/FIFO**: Correctly implemented in `AllocationService.allocate()`. FEFO: expires ASC then receivedDate ASC. FIFO: receivedDate ASC. Expired lots excluded.
- **Deadlock Prevention**: Lots locked in `lotId ASC` order within `lockLots()`.
- **Negative Stock Prevention**: `assertItemBalance()` and `assertLotBalance()` throw before any decrement.
- **WAC Precision**: 4 decimal places via `Prisma.Decimal.toDecimalPlaces(4)`.
- **Frozen Item Enforcement**: Frozen items blocked from all mutations (with ADMIN override on adjustments).
- **Transit Loss Recording**: Transfer shortage automatically creates `TRANSIT_LOSS` warehouse and records discrepancy.
- **Reconciliation Job**: Daily 01:00 AM job compares `stock_ledger SUM` vs `warehouse_items.qty_on_hand`, freezes discrepant items, and logs to `reconciliation_runs`.
- **Lock Cleanup**: Every 60 seconds, expired warehouse locks marked `STALE` and warehouses unlocked.

### 🔴 CRITICAL GAPS

**C-INV-1: No DB-level CHECK constraint on negative quantity**
- Application is the only guard; a raw SQL operation can corrupt stock silently.

**C-INV-2: Reconciliation job uses `setTimeout` scheduling (not cron)**
- `ReconciliationJob` uses `setTimeout(..., delay)` — NOT `@Cron` or `setInterval`.
- If the server crashes or restarts at 00:59, the next run is scheduled at 01:00 the following day (25 hours later).
- **Recommendation:** Migrate to `@Cron('0 1 * * *')` via NestJS ScheduleModule.

**C-INV-3: Reconciliation only checks `warehouseItems` vs `stockLedger` SUM — no lot-level cross-check**
- `warehouseItemLots.qtyOnHand` is not verified against `stockLedger` grouped by `(warehouseId, itemId, lotId)`.
- A lot-level balance drift (inconsistent with total) would not be detected.

**C-INV-4: No void/reversal path for posted documents**
- If a GRN, Issue, or Adjustment is posted with incorrect quantities, there is no system mechanism to reverse it. Manual SQL intervention is required.

### ⚠️ HIGH GAPS

**H-INV-1:** `LotStatus.QUARANTINE` lots are excluded from allocation but there is no UI to set/clear quarantine status.

**H-INV-2:** WAC defaults to `0` when a new `WarehouseItem` is created via Adjustment IN — if `unitCost` is not provided in the adjustment line, WAC is calculated with `adjustedCost = 0`, corrupting cost data.

---

## 11. SECURITY REPORT

### ✅ Strengths
- JWT access tokens (15m) + SHA-256-hashed refresh tokens (7d) with full RTR
- Replay attack detection + all-session revocation on detected replay
- `httpOnly` + `sameSite: strict/lax` cookies; `secure` enforced in production
- `JwtAuthGuard` applied globally (APP_GUARD); endpoints must opt out explicitly
- `ScopeInterceptor` enforces warehouseId/branchId scoping on all requests
- `IdempotencyGuard` prevents duplicate mutations via `X-Idempotency-Key`
- `WarehouseLockGuard` + service-level `verifyWarehouseLocks()` for physical mutations
- CORS restricted to `FRONTEND_URL` env var
- Helm security headers enabled
- Rate limiting: 10 req/60s globally
- Swagger disabled in production (`NODE_ENV !== 'production'`)

### 🔴 CRITICAL GAPS

**C-SEC-1: Rate limit too aggressive for operational use**
- Global 10 req/60s blocks legitimate multi-line GRN/issue operations.
- No endpoint-level throttle overrides for file-heavy or multi-step operations.

**C-SEC-2: No CSRF protection for state-mutating non-GET endpoints**
- Cookies are used for auth. `sameSite: lax` on the refresh cookie, `strict` on access token.
- No CSRF token mechanism verified. While `sameSite: strict` mitigates most risks, PATCH/POST/DELETE endpoints should have CSRF validation for defense-in-depth.

**C-SEC-3: Admin role check in adjustments uses `userRole !== Role.ADMIN` inline**
- `adjustment-post.service.ts:72` checks `userRole !== Role.ADMIN` inline to bypass frozen item block.
- This is a direct role comparison in service logic — should be centralized in a guard or policy.

**C-SEC-4: No API versioning strategy beyond `/api/v1` prefix**
- Breaking API changes would require a new `/api/v2` prefix, but no forward-compatibility or deprecation mechanism is in place.

### ⚠️ HIGH GAPS

**H-SEC-1:** No IP-based brute-force protection on `/auth/login` endpoint specifically (only global throttle).

**H-SEC-2:** `INITIAL_ADMIN_PASSWORD` passed via env var, visible in process environment on the host.

**H-SEC-3:** No audit log for failed login attempts (only successful workflow actions are audited).

---

## 12. PERFORMANCE REPORT

### ✅ Strengths
- Sprint 1 indexes migration (`20260524020000_sprint1_add_indexes`) explicitly added FEFO/FIFO performance indexes on `warehouse_item_lots` and `stock_ledger`
- Pagination on `/reports/movements` with `skip/take`
- `Promise.all()` for parallel count + data queries in movements report

### 🔴 Critical N+1 Patterns

**C-PERF-1:** `ReconciliationJob.runReconciliation()` — fetches ALL `warehouseItems` with includes, then executes a `$transaction` loop with individual `update` + `createNotification` for EACH discrepant item.
- For 10,000 items × 50ms transaction = 500 seconds potential execution time.
- No batching, no chunking, no streaming.

**C-PERF-2:** `reports/movements/export` uses `take: 1000000` — no streaming export, entire result set materialized in memory.

**C-PERF-3:** `OutboxWorker.resolveRecipients()` — for most events, queries ALL active users with the target role. No caching. If email dispatch runs per-event, this is acceptable, but if many events fire simultaneously, it's N×1 queries.

### ⚠️ Transaction Duration Risk

**H-PERF-1:** `WorkflowService.executeTransition()` has 30s timeout. A transfer with 100+ lines in a single transaction (ship or receive) could approach this limit.

**H-PERF-2:** Allocation service processes lots in a `for` loop inside the same transaction — no batch updates on `warehouseItemLot`.

---

## 13. OBSERVABILITY REPORT

### ✅ Strengths
- **Structured Logging**: `nestjs-pino` with JSON output, correlation ID tracking (`x-correlation-id`), pino-pretty in dev
- **Audit Log**: Every workflow action creates an `audit_logs` entry with before/after state JSON, userId, IP address
- **Reconciliation Runs Table**: `reconciliation_runs` persists each job execution: itemsChecked, discrepanciesFound, frozenItems, durationMs
- **Outbox Event Log**: `outbox_events` tracks every dispatch attempt, status, lastError, attempts count, processedAt
- **ApprovalEvent Log**: Complete chronological audit of every status transition with stepNumber
- **Notification Log**: `notification_logs` records all in-system notifications

### ⚠️ HIGH GAPS

**H-OBS-1:** No distributed tracing (OpenTelemetry / Jaeger) — correlation IDs exist in HTTP but not propagated through BullMQ workers.

**H-OBS-2:** No operational metrics dashboard — transaction counts, lock wait times, reconciliation drift counts, posting success rates are not exposed to Prometheus/Grafana.

**H-OBS-3:** No alerting on reconciliation discrepancies — the system freezes items and writes to DB, but no operator dashboard shows "N items currently frozen due to reconciliation failure."

**H-OBS-4:** No failed-job dashboard or retry mechanism for BullMQ FAILED jobs (stuck at FAILED status with no auto-retry or admin interface to requeue).

---

## 14. TESTING & RELIABILITY REPORT

### Test Coverage Summary

| Area | Unit Tests | E2E Tests | Coverage |
|---|---|---|---|
| Auth (JWT, RTR, cookies) | ✅ | ✅ `auth.e2e`, `auth-cookies.e2e`, `rtr.e2e` | HIGH |
| Workflow transitions | ✅ | ✅ `workflow-e2e`, `workflow-roles.e2e`, `workflow-transitions.e2e` | HIGH |
| Concurrency / Optimistic Lock | ✅ | ✅ `concurrency.e2e`, `concurrency-scenarios.e2e`, `db-concurrency.e2e` | HIGH |
| Outbox / Email | ✅ | ✅ `outbox.e2e` | HIGH |
| Stocktake Lock | ✅ | ✅ `stocktake-lock.e2e` | HIGH |
| Warehouse Lock | ✅ | ✅ `warehouse-lock.e2e` | HIGH |
| Ledger Lock / FEFO | ✅ | ✅ `ledger-lock.e2e` | HIGH |
| Idempotency | ✅ | ✅ `idempotency.e2e` | HIGH |
| Scope Isolation | ✅ | ✅ `scope.e2e` | HIGH |
| DB Integrity | ✅ | ✅ `db-integrity.e2e` | HIGH |
| WAC Calculation | ✅ | ⚠️ No dedicated WAC e2e | MEDIUM |
| Allocation Service (FEFO) | ✅ | ⚠️ No dedicated allocation e2e | MEDIUM |
| Reconciliation Job | ✅ | ❌ No e2e for reconciliation | LOW |
| Reports | ✅ Controller spec | ❌ No e2e with real data | LOW |
| Admin Roles UI | ❌ None | ❌ None | NONE |

### 🔴 CRITICAL GAPS

**C-TEST-1:** Admin roles feature has zero test coverage (mock-backed, no API).

**C-TEST-2:** No e2e tests for document number generation under concurrent load (race condition proof).

### ⚠️ HIGH GAPS

**H-TEST-1:** No WAC accuracy e2e test verifying: GRN → Issue → Transfer → WAC at each step.

**H-TEST-2:** No reconciliation job integration test with deliberate drift injection.

---

## 15. PRODUCTION BLOCKERS

### 🔴 CRITICAL (Must fix before production)

| ID | Blocker | Area |
|---|---|---|
| CRIT-1 | Admin Roles UI is entirely mock-backed — permissions management non-functional | Frontend |
| CRIT-2 | `SECURITY_ALERT_REPLAY_ATTACK` outbox event has no handler — security breaches silently lost | Backend |
| CRIT-3 | Transfer SHIP/RECEIVE bypass `canPerformActionV2` — role enforcement gap | Backend |
| CRIT-4 | No void/reversal workflow for any POSTED document — erroneous postings require manual SQL | Workflow |
| CRIT-5 | No DB-level `CHECK (qty_on_hand >= 0)` — negative stock possible via raw SQL | Database |
| CRIT-6 | `SMTP` silently skipped with `return true` — no operator visibility of email delivery failure | Backend |
| CRIT-7 | `ISSUE_POSTED` outbox event missing — inventory managers blind to stock consumption | Backend |
| CRIT-8 | Hardcoded `'SAR'` in `StoreManagerDashboard.tsx` and `DashboardClient.tsx` (no fallback to settings) | Frontend |
| CRIT-9 | `SearchClient.tsx` contains hardcoded demo data (`'4,250 SAR', '2024-04-20'`) | Frontend |
| CRIT-10 | Reconciliation job uses unreliable `setTimeout` scheduling — could skip runs on restart | Backend |

### 🟠 HIGH (Must fix before production or immediately after)

| ID | Blocker | Area |
|---|---|---|
| HIGH-1 | Low-stock alert debounce in-memory — alert storms after restart | Backend |
| HIGH-2 | No unique DB constraint on `document_sequences (document_type, year, branch_id)` | Database |
| HIGH-3 | No lot-level reconciliation check in nightly job | Inventory |
| HIGH-4 | WAC defaults to `0` on Adjustment IN when `unitCost` not provided | Inventory |
| HIGH-5 | Global rate limit 10 req/60s too low for barcode-scan operations | Security |
| HIGH-6 | No CSRF protection on state-mutating endpoints | Security |
| HIGH-7 | WAC History and Lot Trace reports missing from frontend Reports Hub | Frontend |
| HIGH-8 | Reconciliation N+1 loop — 10k items = 500s potential execution | Performance |
| HIGH-9 | Reports export with unlimited `take: 1000000` — memory bomb on large datasets | Performance |
| HIGH-10 | `TRANSFER_RECEIVED` creates no `NotificationLog` entry | Backend |

### 🟡 MEDIUM

- No SMTP admin UI for runtime configuration
- No failed-job requeue interface
- No login attempt audit log
- Reports not branch/restaurant-branded in XLSX headers
- No streaming export for large datasets
- Missing `CHECK` constraint on `outbox_events.status`
- `useGoodsReceipts.ts` hardcoded `supplierCurrency` fallbacks

### 🔵 LOW

- No OpenTelemetry / distributed tracing
- No Prometheus metrics endpoint
- No quarantine item management UI
- No API versioning/deprecation strategy
- `INITIAL_ADMIN_PASSWORD` visible in process env

---

## 16. PRIORITIZED IMPROVEMENT ROADMAP

### Critical (Sprint 0 — Pre-Production, 1 week)

1. **Wire Admin Roles to backend API** — Create `/admin/roles` GET endpoint returning `Role` enum with descriptions; wire `useAdminRoles.ts` to real API; remove `MOCK_ROLES`.
2. **Fix `SECURITY_ALERT_REPLAY_ATTACK` handler** — Add case in `OutboxWorker.resolveRecipients()` targeting `Role.ADMIN`; add case in `renderTemplate()`.
3. **Fix Transfer SHIP/RECEIVE role validation** — Route through `WorkflowService.executeTransition()` or add explicit `canPerformActionV2` check.
4. **Remove hardcoded SAR from StoreManagerDashboard and DashboardClient** — Read from `settings.base_currency` via `useSettings()`.
5. **Remove SearchClient demo data** — Implement real search API connection.
6. **Add `ISSUE_POSTED` outbox event to `IssuePostService.post()`**.
7. **Migrate `ReconciliationJob` to `@Cron('0 1 * * *')`** — Remove fragile `setTimeout` scheduling.
8. **SMTP transparency** — If transporter is null, mark outbox events as `SMTP_UNCONFIGURED` (not SUCCEEDED) and create admin notification.
9. **Add DB CHECK constraint: `ALTER TABLE warehouse_items ADD CONSTRAINT qty_nonneg CHECK (qty_on_hand >= 0)`**.
10. **Add void/cancel workflow state** — At minimum, CANCELLED state for DRAFT documents; VOIDED state for POSTED documents with offsetting ledger entry.

### High (Sprint 1 — First 2 weeks post-launch)

1. Persist low-stock alert debounce to Redis/DB
2. Add unique constraint on `document_sequences(document_type, year, branch_id)`
3. Add lot-level reconciliation cross-check
4. Add per-endpoint throttle overrides for multi-line operations
5. Add TRANSFER_RECEIVED NotificationLog entry
6. Wire WAC History and Lot Trace to Frontend Reports Hub
7. Stream reports export (cursor-based pagination, chunked response)
8. Add admin SMTP configuration UI

### Medium (Sprint 2-4 — Post-Launch Hardening)

1. Prometheus metrics endpoint (`/metrics`) for transaction counts, lock wait, reconciliation stats
2. OpenTelemetry correlation ID propagation through BullMQ workers
3. Add failed-job requeue admin interface
4. Login failure audit logging
5. CSRF token middleware for mutating endpoints
6. XLSX reports include branch name and restaurant logo
7. Quarantine item management UI

### Low (Technical Excellence)

1. Distributed tracing (Jaeger / Zipkin)
2. API versioning strategy
3. DB archival policy for audit_logs and stock_ledger aging data
4. INITIAL_ADMIN_PASSWORD vault integration

---

## 17. AUDIT EXPANSION REPORT

### Existing Findings Summary (from previous audit referenced in graph)
Previous audits identified: missing workflow rollback, performance N+1 patterns, incomplete report coverage. Those findings are **confirmed and superseded** by this deeper audit.

### Newly Discovered Gaps

1. **`SECURITY_ALERT_REPLAY_ATTACK` event silently swallowed** — not discovered in previous audits
2. **Transfer SHIP/RECEIVE bypass shared state machine role check** — first identification
3. **Reconciliation uses `setTimeout` not cron** — restart vulnerability not previously flagged
4. **Admin Roles UI is 100% mock-backed with no backend** — previously may have been known but not classified as CRITICAL

### Missing Operational Safeguards

1. No void/reversal workflow for posted documents
2. No DB-level non-negative quantity constraint
3. No lot-level reconciliation cross-check
4. No SMTP failure visibility

### Hidden Production Risks

1. **Alert storm on restart** — in-memory debounce lost on every deployment
2. **Silent email failure** — SMTP unconfigured treated as success
3. **Reconciliation gap** — if server restarts between 00:59 and 01:00, reconciliation is delayed 25 hours
4. **Memory exhaustion on large export** — `take: 1000000` in export endpoints

### Runtime Integrity Weaknesses

1. Lot-level drift not detected by reconciliation
2. No WAC consistency verification job (CostLedger SUM vs current WAC)
3. `qtyAllocated` reconciliation only checks IN_TRANSIT transfers — issue allocations not reconciled

### Deployment Risks

1. `seed.prod.ts` hardcodes SAR as base currency and FX rates — must be parameterized per client
2. No zero-downtime migration strategy documented for future schema changes
3. No health check validates Redis connectivity (only DB health)

### Scalability Risks

1. Reconciliation job O(N) full-table scan — performance degrades linearly with item count
2. Export endpoints with `take: 1000000` — single allocation risk
3. AllocationService for-loop inside transaction — N sequential lot updates per line

### Financial Consistency Risks

1. WAC defaults to 0 when Adjustment IN has no unit cost
2. Hardcoded SAR fallbacks show incorrect currency labels for non-SAR deployments
3. FX rate lookup in currency summaries uses first available rate if no rate matches PO date — possible period mismatch

### Observability Gaps

1. No Prometheus metrics
2. No OpenTelemetry span propagation
3. No frozen-item dashboard
4. No failed outbox event requeue UI
5. No login failure audit trail

### Disaster Recovery Gaps

1. No documented backup strategy (platform-dependent)
2. No `prisma migrate status` CI step to detect schema drift
3. No documented DB restore procedure
4. No runbook for stale lock emergency clear

### Missing Automation

1. Expiry warning emails (backend reconciliation exists but no scheduled job sends expiry alerts)
2. Weekly WAC consistency job (no scheduled verification of cost ledger integrity)
3. Transfer overdue notification job (API endpoint exists, but no automated notification dispatch)

### Final Expanded Risk Matrix

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Silent email failure in production | HIGH | MEDIUM | 🔴 CRITICAL |
| Admin permissions non-functional | CERTAIN | HIGH | 🔴 CRITICAL |
| Transfer role bypass exploitation | LOW | HIGH | 🔴 CRITICAL |
| Negative stock via raw SQL | LOW | CRITICAL | 🔴 CRITICAL |
| No void path for posted document | CERTAIN | HIGH | 🔴 CRITICAL |
| Alert storm on restart | HIGH | MEDIUM | 🟠 HIGH |
| SAR hardcoded for non-SAR client | HIGH | MEDIUM | 🟠 HIGH |
| Reconciliation skipped on restart | MEDIUM | MEDIUM | 🟠 HIGH |
| Memory exhaustion on export | MEDIUM | HIGH | 🟠 HIGH |
| WAC corrupted by zero-cost adjustment | MEDIUM | HIGH | 🟠 HIGH |

---

## 18. FINAL GO-LIVE ASSESSMENT

### Scores

| Dimension | Score |
|---|---|
| Go-Live Readiness | **58 / 100** |
| Operational Risk | **Medium-High** |
| Inventory Safety Confidence | **82 / 100** (backend core is solid) |
| Frontend Production Confidence | **61 / 100** |
| Backend Production Confidence | **77 / 100** |
| Security Confidence | **72 / 100** |
| Reporting Enterprise Readiness | **68 / 100** |

### Assessment

## ⚠️ READY WITH CONDITIONS

The backend transactional core of this system is **production-grade**. The FEFO/FIFO allocation engine, WAC recalculation, optimistic locking, workflow state machine, outbox pattern, and reconciliation job are all correctly designed and implemented. The e2e test suite covering concurrency, workflow roles, warehouse locks, and idempotency is extensive and represents serious engineering investment.

**However**, the following **10 CRITICAL blockers** must be resolved before go-live:

1. Admin Roles UI connects to no backend (permissions management is completely non-functional)
2. Security replay attacks are silently unhandled by the outbox worker
3. Transfer SHIP/RECEIVE bypass the shared workflow role validation
4. No void/reversal workflow path exists for any posted document
5. No DB-level negative quantity guard
6. SMTP failure returns `true` — silent data loss in email delivery
7. ISSUE_POSTED outbox event does not exist — inventory managers unnotified on stock consumption
8. Dashboard and StoreManager components hardcode `'SAR'` without settings lookup
9. Search screen contains hardcoded 2024 demo data
10. Reconciliation job uses fragile `setTimeout` (not cron) — vulnerable to restart gaps

**Clearance Conditions:**

Once the 10 CRITICAL blockers are resolved (estimated 5-7 engineering days), the system may proceed to a **limited production pilot** with:
- Single warehouse/branch deployment
- SMTP configured in environment
- Admin monitored daily for frozen item notifications
- Void workflow deferred to post-launch Sprint 1

**Full Production Clearance** requires additionally resolving the 10 HIGH priority items (estimated 2 weeks post-pilot).

---
*Audit completed: 2026-05-25 | Auditor: Antigravity Enterprise Systems Audit Protocol*

# LogiRest — Full Technical Audit Report
**Date:** 2026-05-30 | **Auditor:** Antigravity (Claude Sonnet 4.6 Thinking) | **Based on commit:** `cfd29ae2`

---

## Phase 1 — System Discovery

### Tech Stack

| Layer | Technology | Evidence |
|-------|-----------|----------|
| **Backend Framework** | NestJS (Node.js) | `apps/api/src/app.module.ts`, `main.ts` |
| **Frontend Framework** | Next.js (App Router) | `apps/web/` directory, Docker build args |
| **Database Engine** | PostgreSQL 16 | `docker-compose.yml`, `schema.prisma` datasource |
| **ORM** | Prisma v5 | `prisma/schema.prisma`, all service files |
| **Authentication** | JWT (cookie-based) + Refresh Token Rotation | `auth.service.ts`, `rtr.service.ts` |
| **Authorization** | RBAC (Role enum: ADMIN, GM, INV_MGR, WH_KEEPER, PROC_OFFICER, APPROVER, AUDITOR, VIEWER, KITCHEN_CHIEF, STORE_MGR) | `schema.prisma:12-23`, `canPerformActionV2()` |
| **Background Jobs** | `@nestjs/schedule` (Cron) | `jobs/` directory, 8 scheduled jobs |
| **Message Queue** | BullMQ + Redis | `app.module.ts:44-90`, `health.controller.ts` |
| **Cache / Distributed Locks** | Redis (ioredis) | `redis/redis-lock.service.ts` |
| **API Versioning** | URI-based (`/api/v1/`) | `main.ts:48-51` |
| **Logging** | `nestjs-pino` (structured JSON) | `app.module.ts:60-84` |
| **Metrics** | Prometheus (custom counters/histograms) | `modules/metrics/` |
| **Tracing** | OpenTelemetry | `otel.ts`, `schema.prisma:3` |
| **Reverse Proxy** | Caddy 2 | `docker-compose.yml:109-127`, `Caddyfile` |
| **Monorepo** | Turborepo | `turbo.json`, `package.json` |
| **Shared Types** | `packages/shared-types` | `@logirest/shared-types` imports |
| **CI/CD** | `.github/` directory present | `.github/` dir (not fully inspected) |

### Deployment Architecture
```
[Internet] → Caddy (80/443, TLS) → API (port 4000) + Web (port 3000)
                                    ↓
                              PostgreSQL 16 + Redis 7
```

---

## Phase 2 — Inventory Engine Audit

### ✅ Ledger-Based Architecture — CONFIRMED

The inventory system is genuinely ledger-based with the following tiers:

| Table | Purpose | Evidence |
|-------|---------|----------|
| `stock_ledger` | Immutable movement log (every stock change) | `schema.prisma:614-631` |
| `cost_ledger` | Immutable WAC change log | `schema.prisma:634-651` |
| `warehouse_items` | Derived balance per (warehouse, item) | `schema.prisma:577-592` |
| `warehouse_item_lots` | Derived balance per (warehouse, item, lot) | `schema.prisma:594-610` |

### Stock Movement Services

| Service | Function | File |
|---------|---------|------|
| `GrnPostService.post()` | GRN → stock in, WAC recalculate | `purchasing/grn-post.service.ts` |
| `IssuePostService.post()` | Issue → stock out (FEFO/FIFO) | `operations/issue-post.service.ts` |
| `TransferPostService.ship()` | Transfer out → stock deduction | `operations/transfer-post.service.ts:30-271` |
| `TransferPostService.receive()` | Transfer in → stock receipt | `operations/transfer-post.service.ts:277-794` |
| `AdjustmentPostService.post()` | Adjustment IN/OUT + WAC | `operations/adjustment-post.service.ts` |
| `StocktakePostService.post()` | Variance → stock adjustment | `stocktake/stocktake-post.service.ts` |
| `AllocationService.allocate()` | FEFO/FIFO lot allocation engine | `ledger/allocation.service.ts` |
| `WacService.recalculate()` | Weighted average cost on receipt | `ledger/wac.service.ts` |
| `LedgerLockService` | Pessimistic SELECT FOR UPDATE locking | `ledger/ledger-lock.service.ts` |
| `ReconciliationJob` | Daily stock-to-ledger reconciliation | `ledger/reconciliation.job.ts` |

### Evidence of True Ledger Posting
```typescript
// grn-post.service.ts:148-157
await tx.stockLedger.create({
  data: {
    warehouseId: grn.warehouseId,
    itemId: item.id,
    lotId: lotId || null,
    quantity: line.quantityReceived,
    documentId: grn.id,
    documentType: PrismaDocType.GOODS_RECEIVED_NOTE,
  },
});
```
Every transaction (GRN, Issue, Transfer, Adjustment, Stocktake) writes to `stock_ledger` as an immutable record.

---

## Phase 3 — Costing Audit

### ✅ Weighted Average Cost (WAC) — Fully Implemented

**Costing Method:** Moving Weighted Average Cost (WAC) — also known as AVCO.

**WAC Formula (wac.service.ts:51-53):**
```typescript
const preTotalCost = preQty.mul(currentWac);
const receivedTotalCost = rxQty.mul(rxCost);
newWac = preTotalCost.add(receivedTotalCost).div(currentQty);
```

**WAC Update Triggers:**
- On **GRN posting**: `wacService.recalculate()` called per line
- On **Transfer receive**: WAC recalculated inline in `transfer-post.service.ts:516-531`
- On **Positive Adjustment**: `wacService.handlePositiveAdjustment()` called
- On **Negative Adjustment / Issue**: WAC is NOT recalculated (stock-out uses current WAC as cost basis)
- **Precision**: Rounded to 4 decimal places (`toDecimalPlaces(4)`)

**Cost Ledger:** Every WAC change is logged to `cost_ledger` with before/after WAC and unit price.

**WAC Consistency Job** (`jobs/wac-consistency.job.ts`): Scheduled job monitors WAC integrity.

### ❌ Missing Costing Features

| Feature | Status | Consequence |
|---------|--------|-------------|
| FIFO costing | ❌ Not implemented | Cannot produce cost of goods sold by FIFO layer |
| FEFO costing (lot-level cost) | ⚠️ Allocation tracks lots, but cost not per-lot | Lot cost inconsistency on multi-lot issues |
| Standard Cost | ❌ Not implemented | No variance reporting against standard |
| Negative WAC guard | ❌ Missing | If qtyOnHand goes below 0, WAC could become nonsensical |

---

## Phase 4 — Lot & Expiry Audit

### ✅ Lot Storage — Fully Implemented

```prisma
model Lot {
  id           String    @id
  itemId       String
  lotNumber    String    @unique
  receivedDate DateTime
  expiryDate   DateTime?
  status       LotStatus @default(ACTIVE)
}
```

Lot statuses: `ACTIVE`, `HOLD`, `EXPIRED`, `QUARANTINE`

### ✅ FEFO Enforcement — Fully Implemented

**Evidence from `allocation.service.ts:76-97`:**
```typescript
if (item.hasExpiry) {
  // Exclude expired lots
  activeLots = activeLots.filter(
    (lot) => lot.expiryDate === null || lot.expiryDate.getTime() >= now.getTime(),
  );
  // Sort by expiry date ASC, then received date ASC
  activeLots.sort((a, b) => {
    if (a.expiryDate.getTime() === b.expiryDate.getTime()) {
      return a.receivedDate.getTime() - b.receivedDate.getTime();
    }
    return a.expiryDate.getTime() - b.expiryDate.getTime();
  });
} else {
  // FIFO: Sort by received date ASC
  activeLots.sort((a, b) => a.receivedDate.getTime() - b.receivedDate.getTime());
}
```

### ✅ HOLD/QUARANTINE Blocking — Implemented

```typescript
// Only ACTIVE lots are considered for allocation
lot: { status: LotStatus.ACTIVE }
```

### ⚠️ Expiry Auto-Status Update — MISSING

Lots do NOT automatically transition to `EXPIRED` status when `expiryDate` passes. The `ExpiryAlertJob` **alerts** but does not auto-transition. This means expired lots could remain `ACTIVE` in the database unless manually quarantined.

---

## Phase 5 — Workflow Audit

### Kitchen Request → Issue Workflow

| Step | Implementation | Status |
|------|---------------|--------|
| KR Creation | `kitchen-requests.service.ts:create()` | ✅ |
| KR Submit | `workflowService.executeTransition()` → DRAFT→SUBMITTED | ✅ |
| KR Fulfill | Updates `quantityFulfilled` per item | ✅ |
| **Link KR → Issue** | **NOT IMPLEMENTED** | ❌ |

> **Critical Gap:** Kitchen Request fulfillment does NOT create a corresponding `InventoryIssue` or deduct stock. The `quantityFulfilled` field is updated but no stock movement occurs. KR is a request document only — the actual stock deduction requires creating a separate Issue manually.

### PR → PO → GRN Workflow

| Step | Implementation | Status |
|------|---------------|--------|
| PR Create | `purchase-requests.service.ts` | ✅ |
| PR Submit/Approve | `workflowService.executeTransition()` | ✅ |
| PO Create (from PR) | `po.service.ts:create()` | ✅ |
| PO Submit/Approve/Reject | `workflowService.executeTransition()` | ✅ |
| GRN Create | `purchasing/grn/` | ✅ |
| GRN Post | `grn-post.service.ts:post()` — full stock + WAC + ledger | ✅ |

### Transfer Out → Transfer In

| Step | Implementation | Status |
|------|---------------|--------|
| Transfer SHIP | `transfer-post.service.ts:ship()` — deducts source, FEFO/FIFO | ✅ |
| Transfer RECEIVE | `transfer-post.service.ts:receive()` — increments destination, recalculates WAC, transit loss | ✅ |
| Variance Reason | Required when receivedQty < shippedQty | ✅ |
| Transit Loss Warehouse | Auto-created `TRANSIT_LOSS` warehouse for discrepancies | ✅ |

### Stocktake → Variance → Adjustment

| Step | Implementation | Status |
|------|---------------|--------|
| Session Create | `stocktake.service.ts` | ✅ |
| Snapshot Capture | `stocktake.service.ts` | ✅ |
| Count Entry | `stocktake.service.ts` | ✅ |
| Variance Calculation | `stocktake-post.service.ts` | ✅ |
| Approval Required | Session must be in APPROVED before POST | ✅ |
| Warehouse Lock | Acquired on start, released on post | ✅ |
| Stock Adjustment | `stocktake-post.service.ts:108-252` — applies variance to ledger | ✅ |

---

## Phase 6 — Concurrency Audit

### ✅ Pessimistic Row Locking (SELECT FOR UPDATE)

```typescript
// ledger-lock.service.ts:24-28
const results = await tx.$queryRaw<WarehouseItem[]>`
  SELECT * FROM "warehouse_items"
  WHERE "warehouseId" = ${warehouseId} AND "itemId" = ${itemId}
  FOR UPDATE
`;
```

Applied in: GRN post, Issue post, Transfer ship/receive, Adjustment post, Stocktake post, WAC recalculate.

### ✅ Deadlock Prevention

```typescript
// ledger-lock.service.ts:50
const sortedLotIds = [...lotIds].sort(); // Deterministic ordering
```

Locks are always acquired in sorted lot ID order to prevent deadlock cycles.

### ✅ Optimistic Locking (version field)

```typescript
// grn-post.service.ts:56-58
if (clientVersion !== undefined && grn.version !== clientVersion) {
  throw new BadRequestException('Version conflict detected');
}
```

Implemented on: GRN, Transfer, Stocktake, Issue, Adjustment, PO, PR, KR.

### ✅ Idempotency Guard

Every state-mutating endpoint decorated with `@Idempotent()` uses `x-idempotency-key` header with UUID v4 validation, database lock via `P2002` unique constraint on `idempotency_logs`.

### ✅ Refresh Token Replay Detection

```typescript
// rtr.service.ts:83-136
if (existingToken.isRevoked) {
  // Revoke all tokens in session — full replay attack mitigation
  await tx.refreshToken.updateMany({ where: { sessionId: existingToken.sessionId }, data: { isRevoked: true } });
}
```

### ⚠️ Double Posting Risk (Non-Idempotent Paths)

The issue-post, adjustment-post, and stocktake-post services are NOT decorated with `@Idempotent()`. If the client retries after a network timeout, the state mutation would be applied twice. The optimistic lock (version check) mitigates this ONLY if the client passes the correct version — if the client doesn't send a version, the check is bypassed.

---

## Phase 7 — Security Audit

### Authentication

| Feature | Implementation | Assessment |
|---------|---------------|------------|
| JWT Access Token | 15-minute expiry, `httpOnly` cookie | ✅ Secure |
| JWT Refresh Token | 7-day, stored as SHA-256 hash | ✅ Secure |
| Refresh Token Rotation (RTR) | Full rotation with replay detection | ✅ Strong |
| Cookie Settings | `httpOnly: true`, `secure: isProduction`, `sameSite: strict` | ✅ |
| Fallback JWT Secret | `'dev-jwt-access-secret-key-at-least-32-chars-long'` hardcoded | ⚠️ Risk if not overridden |
| JWT from DB lookup | Validates user still exists and `isActive` on every request | ✅ |

### Authorization (RBAC)

| Feature | Implementation | Assessment |
|---------|---------------|------------|
| Role enum | 10 roles | ✅ |
| `canPerformActionV2()` | Centralized in `shared-types` | ✅ |
| Warehouse Scope Check | `UserWarehouseScope` table enforces branch isolation | ✅ |
| Failed authorization audit | Security events written to `audit_logs` | ✅ |

### Security Guards

| Guard | Coverage | Status |
|-------|---------|--------|
| `ThrottlerGuard` | 100 req/60s per IP globally | ✅ |
| `JwtAuthGuard` | All endpoints (except `@Public()`) | ✅ |
| `CsrfGuard` | All state-mutating endpoints | ✅ |
| `IdempotencyGuard` | Idempotent-decorated endpoints | ✅ |
| `WarehouseLockGuard` | Warehouse-locked operations | ✅ |
| Helmet | XSS, CSP, X-Frame-Options, HSTS | ✅ |
| Input Validation | `class-validator` + `whitelist: true` + `transform: true` | ✅ |

### Vulnerabilities Found

| # | Vulnerability | Severity | Evidence |
|---|--------------|---------|---------|
| 1 | **Fallback JWT secret in code** | 🔴 Critical | `jwt.strategy.ts:27`: hardcoded `dev-jwt-access-secret-key-at-least-32-chars-long` — if `JWT_ACCESS_SECRET` env var is not set, a known secret is used |
| 2 | **CSRF bypass via Authorization header** | 🟡 Medium | `csrf.guard.ts:48-50`: Any request with `Authorization` or `x-api-key` header bypasses CSRF entirely. Bearer token endpoints are thus CSRF-exempt |
| 3 | **No account lockout / brute force protection** | 🟡 Medium | Failed logins are logged but no lockout or CAPTCHA mechanism exists |
| 4 | **Password reset is a stub** | 🔴 Critical | `auth.service.ts:182-186`: `resetPassword()` does nothing — accepts any token and "resets" the password without verification |
| 5 | **Profile update accepts arbitrary body fields** | 🟡 Medium | `auth.service.ts:129-165`: `updateProfile()` takes `body: any` — email can be changed without confirmation, no DTO validation |
| 6 | **No rate limiting on auth endpoints** | 🟡 Medium | ThrottlerGuard applies 100 req/60s globally, but login doesn't have stricter limit despite comment saying "10/60s via @Throttle()" |
| 7 | **Avatar upload is a stub** | 🟢 Low | `auth.service.ts:167-171`: Returns a mock URL without storing a real file |
| 8 | **Swagger enabled in non-prod, not behind auth** | 🟢 Low | `main.ts:54-63`: API docs exposed at `/api/docs` in dev/staging without authentication |

---

## Phase 8 — Audit Trail Review

### ✅ Audit Log — Fully Implemented

```prisma
model AuditLog {
  userId          String?
  action          String
  targetTable     String
  targetId        String
  beforeStateJson String   // ← full before state
  afterStateJson  String   // ← full after state
  ipAddress       String?
  createdAt       DateTime
}
```

### Actions Audited

| Action | Trigger |
|--------|---------|
| `LOGIN_FAILED` | Failed login (any reason) |
| `WORKFLOW_POST_SUCCESS` | GRN, Issue, Transfer, Adjustment, Stocktake |
| `WORKFLOW_SHIP_SUCCESS` | Transfer ship |
| `WORKFLOW_RECEIVE_SUCCESS` | Transfer receive |
| `UNAUTHORIZED_TRANSFER_SHIP` | Forbidden ship attempt |
| `UNAUTHORIZED_TRANSFER_RECEIVE` | Forbidden receive attempt |
| `REFRESH_TOKEN_REPLAY` | Replay attack detected |
| `INVENTORY_UNFREEZE` | Item unfrozen |
| `LOT_QUARANTINE` | Lot quarantined |
| `LOT_RELEASE_QUARANTINE` | Lot released from quarantine |
| `PO_EMAILED` | Purchase Order emailed |
| `WORKFLOW_*` via `WorkflowService` | All document state transitions |

### Before/After State Evidence

```typescript
// transfer-post.service.ts:200-215
await tx.auditLog.create({
  data: {
    action: 'WORKFLOW_SHIP_SUCCESS',
    beforeStateJson: JSON.stringify({ status: transfer.status, version: transfer.version }),
    afterStateJson: JSON.stringify({ status: 'IN_TRANSIT', version: transfer.version + 1 }),
    ipAddress: ipAddress || null,
  },
});
```

### ⚠️ Gaps in Audit Coverage

| Gap | Severity |
|-----|---------|
| No audit on successful login | Medium — cannot track who logged in from where |
| No audit on user creation/modification (admin actions) | Medium |
| No audit on KR creation/submission | Low |
| `updateProfile` not audited | Medium — email changes untracked |
| Adjustment line `unitCost` being silently overridden | Low — `adjustment-post.service.ts:72-91` |

### Approval Trail

`ApprovalEvent` table tracks full approval history with `fromStatus`, `toStatus`, `userId`, `userRole`, `stepNumber`, `comments`.

---

## Phase 9 — Database Audit

### Schema Quality

| Feature | Assessment |
|---------|-----------|
| UUID primary keys | ✅ All tables |
| Decimal precision | ✅ `@db.Decimal(18, 4)` on all quantities/prices |
| Foreign key constraints | ✅ Cascades, Restrict, SetNull correctly applied |
| Optimistic lock `version` | ✅ All mutable documents |
| `@@map` naming | ✅ Consistent `snake_case` table names |

### Indexes

| Index | Table | Purpose |
|-------|-------|---------|
| `[warehouseId, itemId, postedAt DESC]` | `stock_ledger` | ✅ Movement queries |
| `[warehouseId, itemId]` | `warehouse_item_lots` | ✅ Lot balance queries |
| `[documentId, documentType]` | `approval_events` | ✅ Approval step counting |
| `[targetTable, targetId]` | `audit_logs` | ✅ Incident investigation |
| `[userId, createdAt DESC]` | `audit_logs` | ✅ User activity queries |
| `[tokenHash]` | `refresh_tokens` | ✅ UNIQUE — token lookup |
| `[sessionId]` | `refresh_tokens` | ✅ Session revocation |
| `[isActive, expiresAt]` | `warehouse_locks` | ✅ Lock queries |
| `[itemId, expiryDate ASC]` | `lots` | ✅ FEFO queries |
| `[status, createdAt]` | `outbox_events` | ✅ Outbox polling |

### Missing Indexes / Risks

| Issue | Table | Severity |
|-------|-------|---------|
| No index on `warehouseId` in `warehouse_items` | `warehouse_items` | 🟡 Medium — full scan on large warehouses |
| No index on `status` in `goods_received_notes` | `goods_received_notes` | 🟡 Medium — reconciliation job scans all posted GRNs |
| No index on `documentId` in `stock_ledger` | `stock_ledger` | 🟡 Medium — reconciliation orphan check |
| `qtyOnHand` in `warehouse_items` can go negative | `warehouse_items` | 🔴 Critical — no `CHECK (qtyOnHand >= 0)` constraint |
| No partial index on `isActive=true` for locks | `warehouse_locks` | 🟢 Low |

### Constraint Risks

```prisma
// No DB-level constraint preventing negative stock
qtyOnHand Decimal @default(0) @db.Decimal(18, 4)
// Missing: @check(qtyOnHand >= 0)
```
This means if application logic has a bug, stock can go negative without a database-level guard.

---

## Phase 10 — Restaurant Operations Audit

### Feature Matrix

| Feature | Status | Evidence |
|---------|--------|---------|
| **Recipes / BOM** | ❌ Not implemented | No recipe, BOM, or bill-of-materials model in schema |
| **Kitchen Production** | ❌ Not implemented | No production order model |
| **Consumption Tracking** | ❌ Not implemented | No consumption event model |
| **Waste Tracking** | ⚠️ Stub only | `yield.service.ts` — in-memory mock data, no database |
| **Kitchen Requests** | ✅ Implemented | `kitchen_requests` table, workflow service |
| **Department Management** | ✅ Implemented | `departments` table |
| **Yield Tracking (stub)** | ⚠️ In-memory only | `yield.service.ts:18-43` — hardcoded mock records, not persisted |

> **Critical finding:** The `YieldService` stores yield/waste data in a JavaScript `private batches: YieldBatch[]` array. Data is **lost on every server restart**. There is no corresponding database table for yield batches.

### BOM Implementation Impact Estimate

To add BOM/Recipe support, the following would be required:
- 3-4 new Prisma models (Recipe, RecipeLine, ProductionOrder, ProductionLine)
- New API module with full CRUD + posting workflow
- Integration with AllocationService for ingredient deduction
- WAC impact on finished goods
- **Estimate:** Moderate refactoring (2-3 sprints), can be added safely alongside existing code

---

## Phase 11 — Production Readiness Audit

### Infrastructure

| Component | Status | Evidence |
|-----------|--------|---------|
| **Docker** | ✅ Full docker-compose | `docker-compose.yml` — 5 services (db, redis, api, web, caddy) |
| **Health Checks** | ✅ Implemented | `health.controller.ts` — DB, Redis, BullMQ, StockLedger checks |
| **Structured Logging** | ✅ pino JSON logs | `app.module.ts:60-84`, correlation ID per request |
| **Metrics (Prometheus)** | ✅ Implemented | `/metrics` endpoint, custom counters/histograms |
| **Grafana Dashboard** | ⚠️ Config exists | `grafana-dashboard.json` exists but setup not in compose |
| **Rate Limiting** | ✅ 100 req/60s | `app.module.ts:93` |
| **HTTPS/TLS** | ✅ Caddy auto-TLS | `Caddyfile`, `docker-compose.yml:114-115` |
| **Resource Limits** | ✅ CPU/memory limits | `docker-compose.yml:60-66` |
| **CI/CD** | ⚠️ `.github/` present | Not fully inspected — existence confirmed, not verified |
| **Automated Backups** | ❌ Not in compose | No `pg_dump` backup service defined |
| **Database Migrations** | ✅ Prisma migrations | `prisma/migrations/` directory |
| **OpenTelemetry** | ✅ Configured | `otel.ts` |
| **Distributed Lock** | ✅ Redis-based | Reconciliation job uses `RedisLockService` |
| **Outbox Pattern** | ✅ Implemented | `OutboxEvent` table + `outbox.service.ts` |
| **Archive Tables** | ✅ Implemented | `audit_logs_archive`, `stock_ledger_archive` |

### Background Jobs

| Job | Schedule | Purpose |
|-----|---------|---------|
| `ReconciliationJob` | `0 1 * * *` (1am daily) | Stock-to-ledger integrity check |
| `LowStockAlertJob` | Scheduled | Reorder point alerts |
| `ExpiryAlertJob` | Scheduled | Near-expiry notifications |
| `WacConsistencyJob` | Scheduled | WAC integrity check |
| `LockCleanupJob` | Scheduled | Stale warehouse lock cleanup |
| `NotificationCleanupJob` | Scheduled | Old notification pruning |
| `IdempotencyCleanupJob` | Scheduled | Old idempotency log cleanup |
| `TokenCleanupJob` | Scheduled | Expired refresh token cleanup |
| `ArchivalJob` | Scheduled | Move old logs to archive tables |

### Production Gaps

| Gap | Severity |
|-----|---------|
| No automated database backup | 🔴 Critical |
| Grafana not in docker-compose | 🟡 Medium |
| No alerting channel (email/Slack) | 🟡 Medium |
| Forgot-password / reset-password are stubs | 🔴 Critical |
| No staging environment defined | 🟡 Medium |

---

## Phase 12 — Technical Debt Analysis

### Severity Rankings

| Rank | Issue | File | Severity |
|------|-------|------|---------|
| 1 | **Yield service in-memory storage** (data lost on restart) | `operations/yield/yield.service.ts` | 🔴 Critical |
| 2 | **Password reset is a stub** | `auth.service.ts:182-186` | 🔴 Critical |
| 3 | **KR fulfill does not deduct stock** | `kitchen-requests.service.ts` | 🔴 Critical |
| 4 | **Fallback JWT secret in code** | `jwt.strategy.ts:27` | 🔴 Critical |
| 5 | **No database backup strategy** | `docker-compose.yml` | 🔴 Critical |
| 6 | **`updateProfile` accepts `body: any`** — no DTO validation | `auth.service.ts:129` | 🟡 Medium |
| 7 | **`eslint-disable` suppression comments** | Multiple files | 🟡 Medium |
| 8 | **`inventory.service.ts:144`** — `balanceAfter: 0` placeholder | `inventory.service.ts` | 🟡 Medium |
| 9 | **`inventory.service.ts:145`** — `performedByUserName: 'System User'` hardcoded | `inventory.service.ts` | 🟢 Low |
| 10 | **WAC recalculation race** — In `grn-post.service.ts`, the upsert increments qty first, then WAC is recalculated separately. If WAC recalculation uses the already-incremented qty, the formula `preQty = currentQty - rxQty` is correct only because it subtracts back, but this is fragile | `grn-post.service.ts:118-145` | 🟡 Medium |
| 11 | **No `CHECK` constraint on negative qty** | `schema.prisma:580` | 🟡 Medium |
| 12 | **PO `email()` is a stub** | `po.service.ts:347-371` | 🟡 Medium |
| 13 | **Reconciliation job scans ALL posted GRNs** (N+1 pattern) | `reconciliation.job.ts:255-272` | 🟡 Medium |
| 14 | **`requestNumber` in KR uses `Math.random()`** — not sequential, not unique-guaranteed | `kitchen-requests.service.ts:25` | 🟡 Medium |
| 15 | **Dead code files**: Multiple `*.txt` and `build_output*.txt` files in root | root directory | 🟢 Low |

---

## Phase 13 — Future Change Impact Analysis

| Feature | Impact | Notes |
|---------|--------|-------|
| **Costing Engine (FIFO/Standard)** | 🟡 Moderate Refactoring | WAC already exists — adding FIFO requires adding a CostLayer table and rewriting allocation logic |
| **Returns Management (GRN Reverse / Vendor Return)** | ✅ Can be added safely | `GrnVoidService` exists, extend to create return PO + negative GRN |
| **BOM / Recipes** | ✅ Can be added safely | No conflicts with existing schema; add new models |
| **Reorder Planning** | ✅ Can be added safely | `reorderPoint` field already on `Item` model; just needs planning algorithm |
| **Advanced Approvals (multi-step)** | 🟡 Moderate Refactoring | `ApprovalEvent` table tracks steps, but `WorkflowService.executeTransition()` defines fixed role-based rules; multi-step rules need redesign |
| **GS1 Barcodes** | ✅ Can be added safely | `BarcodeMapping` table exists; extend to GS1 format fields |
| **Multi-company Support** | 🔴 Major Redesign | No `company` entity in schema; would require adding company isolation to all tables (multi-tenancy migration) |
| **Lot-level FEFO Costing** | 🟡 Moderate Refactoring | Requires adding `unitCost` to `WarehouseItemLot`; backfill data for existing lots |
| **Password Reset (real)** | ✅ Can be added safely | Need email provider + token table |
| **Yield/BOM → Database** | ✅ Can be added safely | Add model to schema, replace in-memory service |

---

## Phase 14 — Final Report

---

## Executive Summary

LogiRest is a **professionally architected, NestJS + PostgreSQL monorepo** with a genuinely ledger-based inventory engine. The core inventory workflows (GRN, Transfer, Issue, Adjustment, Stocktake) are robustly implemented with pessimistic row locking, optimistic version control, FEFO/FIFO lot allocation, WAC costing, full audit trails, and idempotency protection.

The security posture is above average for an early-stage system — JWT with refresh token rotation, CSRF protection, rate limiting, Helmet, and per-request correlation IDs are all present. The deployment is Docker-ready with Caddy TLS, health checks, and Prometheus metrics.

However, **critical production-blocking issues exist**: a non-functional password reset flow, yield/waste data stored in memory (lost on restart), Kitchen Requests not linked to actual stock deductions, and no automated database backup strategy.

---

## Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Architecture** | **8/10** | Clean NestJS monorepo, proper module separation, outbox pattern, ledger-based design |
| **Inventory Engine** | **8/10** | True ledger, FEFO/FIFO, pessimistic locks, WAC — excellent for the stage |
| **Security** | **6/10** | Good foundation (RTR, CSRF, Helmet), critical flaws (password reset stub, JWT fallback secret) |
| **Database** | **7/10** | Good schema design, proper indexes, no negative-qty constraint, some missing indexes |
| **Scalability** | **6/10** | Redis caching, BullMQ, distributed locks — but no horizontal scaling in compose, single DB instance |
| **Production Readiness** | **5/10** | Docker + Caddy + health checks done, but no backups, no alerting, stubs in critical flows |
| **Code Quality** | **7/10** | Clean services, some any types, eslint-disable comments, in-memory yield service |
| **Overall** | **47/70** ≈ **67/100** | Solid foundation with critical operational gaps |

---

## Feature Status Summary

### ✅ Fully Implemented Features
- Ledger-based inventory (StockLedger + CostLedger)
- WAC (Weighted Average Cost) with `CostLedger` history
- FEFO and FIFO lot allocation engine
- GRN posting with stock receipt and WAC update
- Inventory Issues with lot-level deductions
- Transfers with Ship (FEFO deduction) + Receive (WAC update) + transit loss
- Adjustments (IN/OUT) with WAC update on inflows
- Stocktake with snapshot, variance, and adjustment posting
- Optimistic locking (`version` field) on all documents
- Pessimistic row locking (`SELECT FOR UPDATE`) on inventory balances
- Deadlock prevention (sorted lot lock acquisition)
- Refresh Token Rotation (RTR) with replay detection
- JWT authentication (cookie + bearer)
- RBAC with warehouse scope enforcement
- CSRF protection
- Rate limiting (ThrottlerGuard)
- Helmet security headers
- Input validation (class-validator, whitelist)
- Idempotency guard (POST endpoints)
- Full audit trail with before/after state
- Approval events log
- Notifications system
- Health checks (DB, Redis, BullMQ, StockLedger)
- Docker Compose deployment (5 services)
- Caddy TLS reverse proxy
- Prometheus metrics
- OpenTelemetry tracing
- pino structured logging with correlation IDs
- Outbox pattern for event publishing
- Background jobs (8 scheduled jobs)
- Archive tables for old records
- Daily reconciliation job with auto-freeze on discrepancy
- Lot quarantine management
- Warehouse lock during stocktake
- Barcode scanning API
- Document sequence numbering
- Kitchen Requests (create, submit, fulfill, cancel)
- Purchase Requests (CRUD + workflow)
- Purchase Orders (CRUD + workflow)
- GRN (CRUD + post)

### ⚠️ Partially Implemented Features
- Yield/waste tracking (in-memory only, not persisted to DB)
- Lot expiry status update (alerts exist but no auto-transition to EXPIRED)
- FX rates (model exists, no rate conversion in costing)
- Swagger API docs (dev only, no auth)
- Grafana dashboard (config file exists, not in compose)

### ❌ Missing Features
- Password reset (completely non-functional stub)
- Email sending (PO email is a stub returning success without sending)
- BOM / Recipes
- Production orders
- Returns management (vendor returns / credit notes)
- Reorder planning algorithm
- Multi-company support
- FIFO costing layers
- Automatic lot expiry status transitions
- Account lockout on failed logins
- Avatar upload (stub only)
- Automated database backups
- Alerting channel integration (email/Slack on critical events)

---

## Risk Register

### 🔴 Critical Risks

| # | Risk |
|---|------|
| C1 | **No database backups** — Any server failure or accidental deletion causes permanent data loss |
| C2 | **Password reset stub** — Users cannot reset passwords; a compromised account cannot be remediated |
| C3 | **Hardcoded fallback JWT secret** — If `JWT_ACCESS_SECRET` is not set in production, all JWT tokens can be forged |
| C4 | **Kitchen Request fulfill does not deduct stock** — Fulfilled KRs don't move inventory; stock balances are incorrect for kitchens using this flow |
| C5 | **Yield/waste data lost on restart** — No persistence; all waste tracking data is lost every deployment |
| C6 | **No `CHECK` constraint on qtyOnHand ≥ 0** — Application bugs could silently result in negative inventory |

### 🟡 High Risks

| # | Risk |
|---|------|
| H1 | **No account lockout** — Brute-force attacks on login are only rate-limited at 100/60s per IP, not per-account |
| H2 | **No lot auto-expiry** — Lots remain ACTIVE past their expiry date unless manually quarantined; expired stock could be issued |
| H3 | **Reconciliation N+1 on GRNs** — `reconciliation.job.ts:250-272` queries each GRN individually in a loop; will be extremely slow with >1000 GRNs |
| H4 | **WAC not updated on negative adjustments** — Outflows use the current WAC but don't update it, which is correct accounting, but no guard prevents WAC from becoming 0 if all stock is removed then partial stock re-added at wrong cost |
| H5 | **KR `requestNumber` not unique-guaranteed** — `Date.now() + random 4-digit` could collide under concurrent requests |
| H6 | **Missing audit on successful logins** — Cannot answer "Who logged in from where and when?" |
| H7 | **`updateProfile` accepts `body: any`** — No DTO validation; email or role could be accidentally overwritten |
| H8 | **No alerting channel** — Reconciliation discrepancies create DB notifications but don't page anyone externally |

### 🟠 Medium Risks

| # | Risk |
|---|------|
| M1 | **Single PostgreSQL instance** — No read replicas, no standby; DB failure = complete outage |
| M2 | **Transfer receive WAC calculation bug risk** — WAC is computed inline in `transfer-post.service.ts` without using `WacService`, creating duplicate logic that could drift |
| M3 | **Issue/Adjustment not decorated with `@Idempotent`** — Network retry could double-post a stock deduction |
| M4 | **No staging environment** — No evidence of a pre-prod environment to validate changes before live |
| M5 | **Swagger exposed without auth in staging** — API schema visible to anyone who can reach the staging URL |
| M6 | **CSRF bypass via Authorization header** — Bearer-token clients have no CSRF protection |

### 🟢 Low Risks

| # | Risk |
|---|------|
| L1 | Dead output/audit files in repo root (178 files) — clutters repo, no functional risk |
| L2 | `balanceAfter: 0` placeholder in inventory movements API — UI will show incorrect running balance |
| L3 | `performedByUserName: 'System User'` hardcoded in movements API |
| L4 | `PO.email()` stub — cannot email POs to suppliers |
| L5 | Grafana dashboard not wired into Docker Compose |
| L6 | No documented runbook for WAC reset procedure |

---

## Top 20 Go-Live Risks

If this system goes live today, these are the top 20 risks in order of operational/financial impact:

| # | Risk | Impact | Explanation |
|---|------|--------|-------------|
| 1 | **No database backup** | CATASTROPHIC | A single disk failure, accidental `DROP TABLE`, or ransomware attack permanently destroys all inventory, financial, and audit data. No recovery is possible. |
| 2 | **Password reset non-functional** | SEVERE | Users who forget passwords or whose accounts are compromised cannot regain access or be secured. Admin intervention required for every password issue. |
| 3 | **KR Fulfillment doesn't deduct stock** | SEVERE | Kitchens use the system to request and "fulfill" stock, but no actual inventory movement occurs. Stock balances will overstate available quantities. Kitchen operations create phantom stock. |
| 4 | **Yield/waste data lost on restart** | HIGH | Every deployment or container restart wipes all recorded waste and yield data. The kitchen waste tracking module is functionally useless for historical reporting. |
| 5 | **Lot expiry not auto-enforced** | HIGH | An item with `expiryDate = yesterday` remains ACTIVE in the system. It will be allocated to kitchen requests and issues unless someone manually sets it to QUARANTINE. Food safety risk. |
| 6 | **No account lockout** | HIGH | An attacker can brute-force any account password without lockout. The 100 req/60s IP rate limit can be bypassed from multiple IPs or proxies. |
| 7 | **Hardcoded JWT fallback secret** | HIGH | If `JWT_ACCESS_SECRET` is not in the production `.env`, the server uses the known fallback string. Any person with this code can forge valid JWTs for any user ID. |
| 8 | **Reconciliation N+1 on GRNs** | MEDIUM-HIGH | As GRN count grows past 1000, the daily reconciliation job will execute thousands of individual database queries inside a loop, potentially taking hours and causing DB performance degradation during the 1am window. |
| 9 | **No negative-qty DB constraint** | MEDIUM-HIGH | If any application logic bug causes `qtyOnHand` to go below zero (e.g., a race condition slips through), the database will accept it silently. Financial reports will show negative stock value. |
| 10 | **Issue/Adjustment not idempotent** | MEDIUM | If a client submits an issue, receives a timeout, and retries — the issue could be posted twice, doubling the stock deduction. Without version-check enforcement, this is a real scenario. |
| 11 | **WAC duplicate logic in TransferReceive** | MEDIUM | `transfer-post.service.ts` re-implements WAC calculation inline instead of using `WacService`. If WAC formula is fixed in `WacService`, the transfer logic won't be updated automatically. WAC will diverge between GRN receipts and transfer receipts. |
| 12 | **No external alerting** | MEDIUM | Reconciliation discrepancies, replay attacks, and orphaned lots create DB notifications, but nothing calls a pager, Slack, or email. Operators won't know unless they actively check the system. |
| 13 | **Single DB instance** | MEDIUM | PostgreSQL runs as a single Docker container with no standby. Any container failure, OOM kill, or maintenance causes complete system downtime. |
| 14 | **Email sending stub** | MEDIUM | PO emails to suppliers silently succeed but never send. Procurement staff will believe suppliers were notified when they weren't. |
| 15 | **FX rates not used in costing** | MEDIUM | POs support multi-currency, but WAC is always calculated in the PO line's unit price without currency conversion. Multi-currency operations will produce incorrect cost calculations. |
| 16 | **KR `requestNumber` collision risk** | LOW-MEDIUM | Under concurrent load, two KRs created at the same millisecond could get the same number. While unlikely, it violates `@unique` and would cause a database error. |
| 17 | **Missing index on `goods_received_notes.status`** | LOW-MEDIUM | The reconciliation job fetches ALL posted GRNs without a proper index on status. This becomes a full table scan as the GRN table grows. |
| 18 | **Profile update without validation** | LOW-MEDIUM | `updateProfile` accepts `body: any`. A malformed request could overwrite the user's email to an invalid format, locking them out. |
| 19 | **`balanceAfter: 0` in stock movements** | LOW | The inventory movements API always returns `balanceAfter: 0`. Any UI showing running balances will display zero, making the movement history useless for auditing. |
| 20 | **Swagger API docs exposed** | LOW | In any non-production environment reachable from outside (staging/demo), the full API schema is publicly accessible without authentication, enabling reconnaissance. |

---

*This audit was generated from direct source code inspection. All evidence references are to actual file paths and line numbers.*

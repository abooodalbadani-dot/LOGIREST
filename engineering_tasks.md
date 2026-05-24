# Engineering Implementation Tasks
## Converted from Enterprise Production Readiness Audit
**Source**: [enterprise_production_readiness_audit.md](file:///C:/Users/Qursan/.gemini/antigravity-ide/brain/8438b317-aaf6-4318-913f-1e10d37e3acb/enterprise_production_readiness_audit.md)  
**Generated**: 2026-05-24 | **Total Tasks**: 72 | **Sprints**: 6

---

## Legend

- `[P]` — Can run in parallel with other [P] tasks in same sprint
- `[BE]` — Backend (NestJS/Prisma)
- `[FE]` — Frontend (Next.js)
- `[DB]` — Database/Migration
- `[DO]` — DevOps/Deployment
- `[SEC]` — Security
- `[OBS]` — Observability
- `[TEST]` — Testing

**Status**: `[ ]` = Todo | `[/]` = In Progress | `[x]` = Done

---

## SPRINT 1 — Critical Blockers: Inventory Safety & Security Correctness
> **Goal**: Fix bugs that will cause production incidents on day 1.  
> **Duration**: ~5 days

---

### S1-T01 `[BE]` Fix Warehouse Lock Reset Bug
**Severity**: 🔴 CRITICAL (C-1)  
**File**: `apps/api/src/jobs/lock-cleanup.job.ts`  

**Problem**: `LockCleanupJob` marks `WarehouseLock.status = STALE` but never resets `Warehouse.isLocked = false`. Every stocktake permanently locks the warehouse.

**Implementation**:
```typescript
// In cleanupExpiredLocks(), after updateMany on warehouse_locks:
await this.prisma.warehouse.updateMany({
  where: { id: { in: expiredLocks.map(l => l.warehouseId) } },
  data: { isLocked: false },
});
```

**Acceptance Criteria**:
- [ ] After lock `expiresAt` passes, `Warehouse.isLocked` is set to `false`
- [ ] `isWarehouseLocked()` returns `false` for expired locks
- [ ] Unit test asserts both `WarehouseLock.status = STALE` and `Warehouse.isLocked = false` after cleanup

---

### S1-T02 `[BE]` Fix Health Check — Add Live DB Ping
**Severity**: 🔴 CRITICAL (C-2)  
**File**: `apps/api/src/health/health.controller.ts`

**Problem**: Returns static `{ status: 'OK' }`. Kubernetes/ECS health probes always pass even when DB is down.

**Implementation**:
```typescript
@Get()
@Public()
async check() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'OK', db: 'connected', timestamp: new Date().toISOString() };
  } catch {
    throw new ServiceUnavailableException({ status: 'ERROR', db: 'disconnected' });
  }
}
```

**Acceptance Criteria**:
- [ ] Returns `200 { status: 'OK', db: 'connected' }` when DB is reachable
- [ ] Returns `503` when DB is unreachable
- [ ] `PrismaService` injected into `HealthModule`

---

### S1-T03 `[BE][SEC]` Enforce HOLD/QUARANTINE Lot Filtering in Allocation
**Severity**: 🔴 CRITICAL (C-10)  
**File**: `apps/api/src/modules/ledger/allocation.service.ts`

**Problem**: `allocate()` fetches lots with `qtyOnHand > 0` but does not check `lot.status`. HOLD/QUARANTINE lots can be issued.

**Implementation**:
```typescript
// In warehouseItemLot.findMany where clause, add:
lot: { status: LotStatus.ACTIVE }
```

**Acceptance Criteria**:
- [ ] Lots with `status = HOLD` are excluded from allocation
- [ ] Lots with `status = QUARANTINE` are excluded from allocation
- [ ] Existing unit test updated to include a HOLD lot in fixture and verify it is skipped
- [ ] Error message is thrown when only non-ACTIVE lots exist but stock is > 0

---

### S1-T04 `[BE][SEC]` Add Warehouse Lock Check for Kitchen Requests
**Severity**: 🔴 CRITICAL  
**File**: `apps/api/src/modules/workflow/workflow.service.ts`

**Problem**: `verifyWarehouseLocks()` does not check Kitchen Requests. Kitchen Requests consume inventory and must respect warehouse locks.

**Implementation**:
```typescript
// In verifyWarehouseLocks(), add:
if (normalizedType === 'kitchen_request' && action === 'POST') isMutating = true;
```

**Acceptance Criteria**:
- [ ] Kitchen Request POST action blocked when `Warehouse.isLocked = true`
- [ ] Returns `HTTP 423 Locked` with correct message
- [ ] Unit test verifies kitchen_request is blocked during active stocktake lock

---

### S1-T05 `[BE][SEC]` Disable Swagger in Production
**Severity**: 🔴 CRITICAL (C-8)  
**File**: `apps/api/src/main.ts`

**Problem**: `SwaggerModule.setup()` runs unconditionally. API schema is publicly accessible in production.

**Implementation**:
```typescript
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
```

**Acceptance Criteria**:
- [ ] `GET /api/docs` returns `404` when `NODE_ENV=production`
- [ ] Swagger still accessible in dev/staging (`NODE_ENV=development`)

---

### S1-T06 `[BE][SEC]` Add Rate Limiting to Auth Endpoints
**Severity**: 🔴 CRITICAL (C-9)  
**File**: `apps/api/src/app.module.ts`, `apps/api/src/auth/auth.controller.ts`

**Implementation**:
```bash
# Install
npm install @nestjs/throttler
```
```typescript
// app.module.ts imports:
ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])
// app.module.ts providers:
{ provide: APP_GUARD, useClass: ThrottlerGuard }
// auth.controller.ts on POST /login:
@Throttle({ default: { limit: 10, ttl: 60000 } })
```

**Acceptance Criteria**:
- [ ] 11th login attempt within 60 seconds returns `429 Too Many Requests`
- [ ] Non-auth endpoints are not rate-limited (or have higher limits)
- [ ] `X-RateLimit-Remaining` header is returned

---

### S1-T07 `[DB]` Add Missing Database Indexes
**Severity**: 🔴 HIGH (H-4, H-5)  
**File**: `apps/api/prisma/schema.prisma`  
**Migration**: `apps/api/prisma/migrations/`

**Missing Indexes**:
```prisma
model AuditLog {
  @@index([targetTable, targetId])
  @@index([userId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
}

model ApprovalEvent {
  @@index([documentId, documentType])
}

model RefreshToken {
  @@index([expiresAt])  // For cleanup queries
}

model NotificationLog {
  @@index([createdAt(sort: Desc)])  // For TTL cleanup
}
```

**Acceptance Criteria**:
- [ ] Migration runs cleanly: `prisma migrate deploy`
- [ ] `EXPLAIN ANALYZE` on `AuditLog WHERE targetTable = X AND targetId = Y` uses index scan

---

### S1-T08 `[BE][SEC]` Add Helmet Security Headers
**Severity**: 🔴 HIGH (H-1)  
**File**: `apps/api/src/main.ts`

```bash
npm install helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet());
```

**Acceptance Criteria**:
- [ ] `X-Frame-Options: DENY` header present on all responses
- [ ] `X-Content-Type-Options: nosniff` header present
- [ ] `Content-Security-Policy` header present
- [ ] `Strict-Transport-Security` header present (production only)

---

## SPRINT 2 — Critical Blockers: Deployment Infrastructure
> **Goal**: Make the system deployable in containers.  
> **Duration**: ~5 days

---

### S2-T09 `[DO]` Create Multi-Stage Dockerfile for API
**Severity**: 🔴 CRITICAL (C-6)  
**File**: `apps/api/Dockerfile` [NEW]

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN npm ci --workspace=apps/api
RUN npm run build --workspace=apps/api

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

**Acceptance Criteria**:
- [ ] `docker build -f apps/api/Dockerfile .` completes without error
- [ ] Container starts, passes `/health` with live DB
- [ ] Image size < 500MB

---

### S2-T10 `[DO]` Create Multi-Stage Dockerfile for Web
**Severity**: 🔴 CRITICAL (C-6)  
**File**: `apps/web/Dockerfile` [NEW]

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN npm ci --workspace=apps/web
RUN npm run build --workspace=apps/web

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**Acceptance Criteria**:
- [ ] `docker build -f apps/web/Dockerfile .` completes without error
- [ ] Frontend loads and hits the API correctly

---

### S2-T11 `[DO]` Create docker-compose.yml for Full Stack
**Severity**: 🔴 CRITICAL (C-6)  
**File**: `docker-compose.yml` [NEW]

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: logirest
      POSTGRES_USER: logirest
      POSTGRES_PASSWORD: logirest_secret
    volumes: [db_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U logirest"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://logirest:logirest_secret@db:5432/logirest
      REDIS_URL: redis://redis:6379
      FRONTEND_URL: http://web:3000
      NODE_ENV: production
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    ports: ["4000:4000"]

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: http://api:4000
    depends_on: [api]
    ports: ["3000:3000"]

volumes:
  db_data:
```

**Acceptance Criteria**:
- [ ] `docker compose up` starts all 4 services
- [ ] `curl http://localhost:4000/health` returns `{ status: 'OK', db: 'connected' }`
- [ ] Frontend login flow works end-to-end

---

### S2-T12 `[DO]` Create Production Seed File
**Severity**: 🔴 CRITICAL (C-4)  
**File**: `apps/api/prisma/seed.prod.ts` [NEW]

**Problem**: Current `seed.ts` creates 3 users with `password123`. Never run in production.

**Implementation**:
- Create `seed.prod.ts` with **only** essential reference data (currencies, UoMs, categories)
- NO users, NO fake stock, NO demo branches
- Add first-run admin creation prompt via CLI args
- Update `package.json` scripts: `"seed:prod": "ts-node prisma/seed.prod.ts"`
- Add `README` warning: `seed.ts` is DEV ONLY

**Acceptance Criteria**:
- [ ] `seed.prod.ts` contains no hardcoded user credentials
- [ ] Contains SAR, USD, EUR currencies
- [ ] Contains standard UoMs (KG, LTR, PCS, etc.)
- [ ] `seed.ts` header has prominent `DEV ONLY — DO NOT RUN IN PRODUCTION` warning
- [ ] `.env.example` documents how to create the first admin user

---

### S2-T13 `[DO]` Add `.env.example` for Production
**Severity**: 🔴 CRITICAL  
**File**: `apps/api/.env.example`

**Add missing production variables**:
```bash
# Required in production
DATABASE_URL=postgresql://user:pass@host:5432/logirest
PORT=4000
FRONTEND_URL=https://your-domain.com
JWT_ACCESS_SECRET=<min-32-char-random-secret>
JWT_REFRESH_SECRET=<min-32-char-random-secret>
NODE_ENV=production

# Optional
IDEMPOTENCY_TTL_HOURS=24
TRANSFER_OVERDUE_DAYS=7
REDIS_URL=redis://localhost:6379
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@logirest.app
```

**Acceptance Criteria**:
- [ ] All env vars used in codebase documented
- [ ] `envSchema` in `env.validation.ts` updated to validate `REDIS_URL` (optional with default)
- [ ] `JWT_SECRET` removed from `.env.example` (unused, misleading)

---

### S2-T14 `[DO]` Add GitHub Actions CI Pipeline
**Severity**: 🔵 LOW → Required for production  
**File**: `.github/workflows/ci.yml` [NEW]

```yaml
name: CI
on: [push, pull_request]
jobs:
  api-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        options: --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test --workspace=apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          JWT_ACCESS_SECRET: test-secret-at-least-32-chars-long
          JWT_REFRESH_SECRET: test-secret-at-least-32-chars-long
          FRONTEND_URL: http://localhost:3000
  
  web-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build --workspace=apps/web
        env:
          NEXT_PUBLIC_API_URL: http://localhost:4000
```

**Acceptance Criteria**:
- [ ] Pipeline runs on every push
- [ ] API tests pass in CI environment
- [ ] Web builds without error in CI

---

## SPRINT 3 — Email, Async Delivery & Notifications
> **Goal**: Make the notification system actually notify users.  
> **Duration**: ~7 days

---

### S3-T15 `[BE]` Implement BullMQ + Redis Module
**Severity**: 🔴 CRITICAL (C-7)  
**Files**: `apps/api/src/app.module.ts`, `apps/api/package.json`

```bash
npm install bullmq @nestjs/bullmq ioredis
```
```typescript
// app.module.ts
BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
BullModule.registerQueue({ name: 'outbox' }),
```

**Acceptance Criteria**:
- [ ] Redis connection established on startup
- [ ] `outbox` queue visible in Redis via CLI
- [ ] Graceful shutdown drains queue

---

### S3-T16 `[BE]` Create OutboxEvent Prisma Model + Migration
**Severity**: 🔴 CRITICAL (C-7)  
**File**: `apps/api/prisma/schema.prisma`

```prisma
model OutboxEvent {
  id          String   @id @default(uuid())
  eventType   String
  payload     Json
  status      String   @default("PENDING")  // PENDING | SUCCEEDED | FAILED
  attempts    Int      @default(0)
  lastError   String?
  processedAt DateTime?
  createdAt   DateTime @default(now())
  expiresAt   DateTime // createdAt + 7 days for succeeded

  @@index([status, createdAt])
  @@map("outbox_events")
}
```

**Acceptance Criteria**:
- [ ] Migration runs: `prisma migrate dev --name add_outbox_events`
- [ ] `OutboxEvent` created atomically inside workflow transactions

---

### S3-T17 `[BE]` Create OutboxService — Transactional Event Writer
**Severity**: 🔴 CRITICAL (C-7)  
**File**: `apps/api/src/modules/outbox/outbox.service.ts` [NEW]

**Responsibilities**:
- `writeEvent(tx, eventType, payload)` — writes to `outbox_events` inside caller's transaction
- Called from `WorkflowService.executeTransition()` after status update

**Acceptance Criteria**:
- [ ] Outbox write is **inside** the same Prisma transaction as the status update
- [ ] If transaction rolls back, no outbox event is created
- [ ] `eventType` is one of: `PR_SUBMITTED`, `PR_APPROVED`, `PO_APPROVED`, `GRN_POSTED`, `ISSUE_POSTED`, `TRANSFER_SHIPPED`, `TRANSFER_RECEIVED`, `KITCHEN_REQUEST_SUBMITTED`, `ADJUSTMENT_POSTED`, `STOCKTAKE_POSTED`

---

### S3-T18 `[BE]` Create OutboxWorker — BullMQ Processor
**Severity**: 🔴 CRITICAL (C-7)  
**File**: `apps/api/src/modules/outbox/outbox.worker.ts` [NEW]

**Responsibilities**:
- Polls `outbox_events WHERE status = PENDING ORDER BY createdAt ASC`
- Dispatches email/push per `eventType`
- Updates `status = SUCCEEDED | FAILED`, increments `attempts`
- Retry up to 3 times with exponential backoff

**Acceptance Criteria**:
- [ ] Worker processes events within 10 seconds of creation
- [ ] Failed events (3 attempts) set `status = FAILED`, log `lastError`
- [ ] Succeeded events get `processedAt` timestamp
- [ ] Duplicate events skipped (idempotent worker)

---

### S3-T19 `[BE]` Implement Email Delivery via SMTP
**Severity**: 🔴 CRITICAL (C-3)  
**File**: `apps/api/src/modules/outbox/email.service.ts` [NEW]

```bash
npm install nodemailer @types/nodemailer
```

**Email Templates** (HTML — minimum viable):
| EventType | Recipients | Subject |
|---|---|---|
| `PR_SUBMITTED` | APPROVER role users | Purchase Request {number} awaiting approval |
| `PR_APPROVED` | PR creator | Your PR {number} has been approved |
| `GRN_POSTED` | INV_MGR role | GRN {number} posted — stock updated |
| `KITCHEN_REQUEST_SUBMITTED` | WH_KEEPER | Kitchen Request {number} submitted |
| `TRANSFER_SHIPPED` | WH_KEEPER (destination) | Transfer {number} in transit to you |
| `LOW_STOCK_ALERT` | INV_MGR, WH_KEEPER | ⚠️ Low stock: {item} in {warehouse} |

**Acceptance Criteria**:
- [ ] Email sent to correct role-based recipients
- [ ] `SMTP_*` env vars drive configuration
- [ ] If `SMTP_HOST` not set, email silently skipped (not error)
- [ ] Email HTML has brand header: "LogiRest Inventory Management"
- [ ] No hardcoded credentials anywhere

---

### S3-T20 `[BE]` Add OutboxCleanup Cron Job (7-Day TTL)
**Severity**: 🔴 CRITICAL (C-7)  
**File**: `apps/api/src/modules/outbox/outbox-cleanup.job.ts` [NEW]

**Implementation**:
- Delete `OutboxEvent WHERE status = SUCCEEDED AND processedAt < now() - 7 days`
- Runs daily at 02:00 AM
- Log count of deleted records

**Acceptance Criteria**:
- [ ] Old succeeded events purged daily
- [ ] Failed events retained indefinitely (for investigation)
- [ ] Cleanup result logged with count

---

### S3-T21 `[BE]` Expand Workflow Notification Triggers
**Severity**: 🔴 HIGH (H-12)  
**File**: `apps/api/src/modules/workflow/workflow.service.ts`

**Add missing notification dispatches** (via OutboxService):
- `grn` + `POSTED` → notify `INV_MGR`
- `adjustment` + `POSTED` → notify `INV_MGR`, `AUDITOR`
- `kitchen_request` + `SUBMITTED` → notify `WH_KEEPER`
- `kitchen_request` + `POSTED` → notify `KITCHEN_CHIEF` (fulfilled)
- `stocktake` + `STARTED` → notify `WH_KEEPER`, `INV_MGR`
- `stocktake` + `POSTED` → notify `INV_MGR`, `AUDITOR`
- `transfer` + `RECEIVED` → notify source `WH_KEEPER`

**Acceptance Criteria**:
- [ ] All 7 new notification triggers emit OutboxEvents
- [ ] Each notification references the correct document number and warehouse
- [ ] Existing 3 triggers unchanged

---

### S3-T22 `[BE]` Add Low-Stock Threshold Alert System
**Severity**: 🔴 HIGH  
**Files**: `apps/api/src/jobs/low-stock-alert.job.ts` [NEW]

**Implementation**:
- New scheduled job running daily at 06:00 AM
- Queries `WarehouseItem WHERE qtyOnHand <= reorderPoint`
- Requires new `Item.reorderPoint Decimal?` field (new migration)
- Emits `LOW_STOCK_ALERT` OutboxEvent per item

**Acceptance Criteria**:
- [ ] Items with `qtyOnHand <= reorderPoint` generate alerts
- [ ] No duplicate alerts for same item on consecutive days (debounce: 24h)
- [ ] Items with null `reorderPoint` skipped

---

## SPRINT 4 — Reporting: Export & Enterprise Formatting
> **Goal**: Produce exportable, enterprise-grade reports.  
> **Duration**: ~7 days

---

### S4-T23 `[BE]` Install Report Export Libraries
**Severity**: 🔴 CRITICAL (C-5)  
**File**: `apps/api/package.json`

```bash
npm install exceljs
npm install @types/pdfkit pdfkit
```

**Acceptance Criteria**:
- [ ] `exceljs` importable in report controller
- [ ] No breaking changes to existing API

---

### S4-T24 `[BE]` Add XLSX Export — Stock Movements
**Severity**: 🔴 CRITICAL (C-5)  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

```typescript
@Get('movements/export')
async exportMovements(@ActiveScope('warehouseId') wh, @Res() res, @Query() q) {
  // Fetch all (no pagination for export)
  const data = await this.getMovementsData(wh, q);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Stock Movements');
  ws.columns = [
    { header: 'Date', key: 'postedAt', width: 20 },
    { header: 'Item', key: 'itemName', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Type', key: 'documentType', width: 20 },
    { header: 'Document Ref', key: 'documentId', width: 25 },
    { header: 'Quantity', key: 'quantity', width: 12 },
  ];
  // Add enterprise header (company, warehouse, generated at, generated by)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=stock-movements.xlsx');
  await wb.xlsx.write(res);
}
```

**Acceptance Criteria**:
- [ ] `GET /reports/movements/export` returns valid `.xlsx` file
- [ ] Report header includes: Warehouse Name, Date Range, Generated At, Generated By (user name)
- [ ] All rows included (no pagination limit)
- [ ] Numeric columns formatted as numbers (not strings)

---

### S4-T25 `[BE]` Add XLSX Export — Expiry Report
**Severity**: 🔴 CRITICAL (C-5)  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

**Columns**: Item Name, SKU, Lot Number, Expiry Date, Days Until Expiry, Qty On Hand, Warehouse

**Acceptance Criteria**:
- [ ] `GET /reports/expiry/export` returns valid `.xlsx`
- [ ] Items expiring within 7 days highlighted in yellow (cell fill)
- [ ] Items already expired highlighted in red

---

### S4-T26 `[BE]` Add XLSX Export — Available Inventory
**Severity**: 🔴 CRITICAL (C-5)  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

**Columns**: Category, Item Name, SKU, UoM, Qty On Hand, Qty Allocated, Qty Available, WAC, Total Value

**Acceptance Criteria**:
- [ ] `GET /reports/available-inventory/export` returns valid `.xlsx`
- [ ] "Total Value" column = Qty On Hand × WAC (Decimal, 2 places)
- [ ] Sheet footer row shows SUM of Total Value

---

### S4-T27 `[BE]` Add XLSX Export — Stocktake Variance
**Severity**: 🔴 CRITICAL (C-5)  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

**Columns**: Item, SKU, Lot, Snapshot Qty, Counted Qty, Variance, WAC, Variance Value

**Acceptance Criteria**:
- [ ] `GET /reports/stocktake-variance/export?sessionId=X` returns valid `.xlsx`
- [ ] Positive variance (surplus) shown in green
- [ ] Negative variance (deficit) shown in red
- [ ] Session number, date, and warehouse in report header

---

### S4-T28 `[BE]` Add XLSX Export — Procurement Status
**Severity**: 🔴 HIGH  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

**Acceptance Criteria**:
- [ ] `GET /reports/procurement-status/export` returns valid `.xlsx`

---

### S4-T29 `[BE]` Fix N+1 Query — Overdue Transfers Report
**Severity**: 🔴 HIGH (H-3)  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

**Problem**: `approvalEvent.findFirst` called inside a loop per transfer.

**Fix**: Batch-fetch all ship events in one query, then map by `documentId`.
```typescript
const shipEvents = await this.prisma.approvalEvent.findMany({
  where: { documentId: { in: transferIds }, toStatus: 'IN_TRANSIT' },
  orderBy: { createdAt: 'desc' },
});
const eventMap = new Map(shipEvents.map(e => [e.documentId, e]));
```

**Acceptance Criteria**:
- [ ] `getOverdueTransfersList()` makes exactly 2 DB queries regardless of transfer count
- [ ] Results identical to previous implementation

---

### S4-T30 `[BE]` Fix N+1 Query — Currency Summaries Report
**Severity**: 🔴 HIGH (H-3)  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

**Fix**: Pre-fetch all FX rates in one query before the loop.
```typescript
const fxRates = await this.prisma.fXRate.findMany({
  where: { toCurrencyId: baseCurrency.id },
  orderBy: { effectiveFrom: 'desc' },
});
const fxMap = new Map(fxRates.map(r => [r.fromCurrencyId, r]));
```

**Acceptance Criteria**:
- [ ] `getCurrencySummaries()` makes O(1) FX rate queries
- [ ] Results identical to previous implementation

---

### S4-T31 `[BE]` Add WAC History Report
**Severity**: 🔴 HIGH  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

```typescript
@Get('wac-history')
async getWacHistory(
  @ActiveScope('warehouseId') warehouseId: string,
  @Query('itemId') itemId: string,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
)
```

**Acceptance Criteria**:
- [ ] Returns `CostLedger` entries filtered by warehouse + item + date range
- [ ] Includes: posted date, document type, document ref, qty, unit price, new WAC
- [ ] XLSX export available at `GET /reports/wac-history/export`

---

### S4-T32 `[BE]` Add Lot Traceability Report
**Severity**: 🔴 HIGH  
**File**: `apps/api/src/modules/reports/reports.controller.ts`

```typescript
@Get('lot-trace')
async getLotTrace(
  @ActiveScope('warehouseId') warehouseId: string,
  @Query('lotId') lotId: string,
)
```

Returns: all `LotAllocation` records linked to the lot, with parent document reference and dates.

**Acceptance Criteria**:
- [ ] Trace shows: received via which GRN, allocated to which Issues/Transfers
- [ ] XLSX export available

---

### S4-T33 `[FE]` Add Export Buttons to All Report Pages
**Severity**: 🔴 CRITICAL (C-5)  
**Files**: All files under `apps/web/src/app/[locale]/(app)/reports/*/`

**Implementation**: Add "Export XLSX" button to each report page that calls the `/export` endpoint.

**Acceptance Criteria**:
- [ ] Export button present on: movements, expiry, available-inventory, stocktake-variance, procurement-status
- [ ] Loading state shown while export generates
- [ ] File downloads automatically
- [ ] Export button disabled while report data is loading

---

### S4-T34 `[FE]` Add Print Layout CSS
**Severity**: 🔴 HIGH  
**File**: `apps/web/src/app/globals.css`

```css
@media print {
  nav, sidebar, .no-print { display: none !important; }
  .print-header { display: block; }
  table { page-break-inside: avoid; }
}
```

Add `.print-header` component with: Company Name, Branch, Report Title, Generated At, Generated By.

**Acceptance Criteria**:
- [ ] `window.print()` produces clean layout
- [ ] Navigation and sidebars hidden in print view
- [ ] Report header with company/branch/timestamp visible in print
- [ ] Table rows don't break across pages

---

## SPRINT 5 — Observability, Cleanup & Correctness
> **Goal**: Make the system diagnosable and self-maintaining.  
> **Duration**: ~7 days

---

### S5-T35 `[BE][OBS]` Add Structured JSON Logging
**Severity**: 🔴 HIGH (H-8)  
**File**: `apps/api/src/main.ts`, `apps/api/package.json`

```bash
npm install nestjs-pino pino-http pino-pretty
```
```typescript
// app.module.ts
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})
```

**Acceptance Criteria**:
- [ ] All log output is JSON in production (`NODE_ENV=production`)
- [ ] Human-readable pretty-print in development
- [ ] Each log line includes: `timestamp`, `level`, `context`, `message`, `requestId`
- [ ] No sensitive data (tokens, passwords) in any log line

---

### S5-T36 `[BE][OBS]` Add Request Correlation IDs
**Severity**: 🔴 HIGH  
**File**: `apps/api/src/interceptors/` [NEW: `correlation-id.interceptor.ts`]

**Implementation**:
- Generate UUID per request if `X-Correlation-ID` header not present
- Attach to all log context via `AsyncLocalStorage`
- Return `X-Correlation-ID` in response header

**Acceptance Criteria**:
- [ ] Every log line includes `correlationId`
- [ ] Response includes `X-Correlation-ID` header
- [ ] Frontend logs and backend logs can be correlated using this ID

---

### S5-T37 `[BE][OBS]` Persist Reconciliation Run Results
**Severity**: 🟡 MEDIUM (M-4)  
**File**: `apps/api/prisma/schema.prisma` + `apps/api/src/modules/ledger/reconciliation.job.ts`

```prisma
model ReconciliationRun {
  id               String   @id @default(uuid())
  ranAt            DateTime @default(now())
  itemsChecked     Int
  discrepanciesFound Int
  frozenItems      String[] // list of SKUs frozen
  durationMs       Int

  @@map("reconciliation_runs")
}
```

**Acceptance Criteria**:
- [ ] Every reconciliation run saves a `ReconciliationRun` record
- [ ] Admins can query: `GET /admin/reconciliation-runs` to see history
- [ ] Frozen item SKUs listed in the run record

---

### S5-T38 `[DB]` Add Notification Log Cleanup Job
**Severity**: 🔴 HIGH (H-6)  
**File**: `apps/api/src/jobs/notification-cleanup.job.ts` [NEW]

**Implementation**:
- Delete `NotificationLog WHERE isRead = true AND createdAt < now() - 30 days`
- Delete `NotificationLog WHERE isRead = false AND createdAt < now() - 90 days`
- Runs daily at 03:00 AM

**Acceptance Criteria**:
- [ ] Old read notifications cleaned up after 30 days
- [ ] Old unread notifications cleaned up after 90 days
- [ ] Cleanup count logged per run

---

### S5-T39 `[DB]` Add IdempotencyLog Cleanup Job
**Severity**: 🔴 HIGH (H-7)  
**File**: `apps/api/src/jobs/idempotency-cleanup.job.ts` [NEW]

**Implementation**:
- Delete `IdempotencyLog WHERE createdAt < now() - IDEMPOTENCY_TTL_HOURS`
- Add `IDEMPOTENCY_TTL_HOURS` to `envSchema` Zod validation with default `24`
- Runs hourly

**Acceptance Criteria**:
- [ ] Expired idempotency keys deleted automatically
- [ ] TTL configurable via `IDEMPOTENCY_TTL_HOURS` env var
- [ ] `IDEMPOTENCY_TTL_HOURS` is validated at startup

---

### S5-T40 `[DB]` Add RefreshToken Cleanup Job
**Severity**: 🔴 HIGH (H-10)  
**File**: `apps/api/src/jobs/token-cleanup.job.ts` [NEW]

**Implementation**:
- Delete `RefreshToken WHERE (isRevoked = true OR expiresAt < now()) AND createdAt < now() - 7 days`
- Runs daily at 04:00 AM

**Acceptance Criteria**:
- [ ] Expired/revoked tokens cleaned after 7-day grace window
- [ ] Active tokens never deleted
- [ ] Cleanup count logged

---

### S5-T41 `[BE]` Verify Reconciliation Sign Convention
**Severity**: 🔴 HIGH (H-11)  
**Files**: `apps/api/src/modules/operations/issue-post.service.ts`, `apps/api/src/modules/operations/transfer-post.service.ts`, `apps/api/src/modules/operations/adjustment-post.service.ts`

**Audit Task**: Inspect all `StockLedger.create()` calls to confirm:
- IN operations (GRN, positive adjustment, transfer receive): `quantity > 0`
- OUT operations (issue, negative adjustment, transfer ship): `quantity < 0`
- If incorrect, add sign fix + migration

**Acceptance Criteria**:
- [ ] `SUM(quantity) WHERE warehouseId=X AND itemId=Y` equals `WarehouseItem.qtyOnHand`
- [ ] Reconciliation job runs without false positives on a clean database
- [ ] Unit test verifies sign convention for each operation type

---

### S5-T42 `[BE]` Add qtyAllocated Reconciliation Check
**Severity**: 🟡 MEDIUM (M-5)  
**File**: `apps/api/src/modules/ledger/reconciliation.job.ts`

**Add to `runReconciliation()`**:
- Cross-check `WarehouseItem.qtyAllocated` against `SUM(LotAllocation.quantityAllocated)` for active documents
- Log discrepancies separately (don't freeze for this — softer check)

**Acceptance Criteria**:
- [ ] `qtyAllocated` discrepancies are logged with severity WARN
- [ ] A notification is sent to ADMIN on discrepancy (non-freezing)

---

### S5-T43 `[DB]` Add StocktakeSnapshot.createdAt
**Severity**: 🟡 MEDIUM (M-9)  
**File**: `apps/api/prisma/schema.prisma`

```prisma
model StocktakeSnapshot {
  // Add:
  createdAt DateTime @default(now())
}
```

**Acceptance Criteria**:
- [ ] Migration applied cleanly
- [ ] `createdAt` populated automatically on snapshot creation

---

### S5-T44 `[BE]` Add Frozen Item Recovery Endpoint
**Severity**: 🟡 MEDIUM  
**File**: `apps/api/src/modules/inventory/inventory.controller.ts`

**Problem**: Once reconciliation freezes an item (`isFrozen = true`), there is no API to unfreeze it after manual correction.

```typescript
@Patch(':id/unfreeze')
@Roles(Role.ADMIN)
async unfreezeItem(@Param('id') itemId: string, @ActiveScope('warehouseId') warehouseId: string) {
  // Validate user is ADMIN, log audit trail, set isFrozen = false
}
```

**Acceptance Criteria**:
- [ ] ADMIN-only endpoint to unfreeze a frozen item
- [ ] Requires `reason` field in body
- [ ] `AuditLog` entry created with before/after state

---

### S5-T45 `[BE]` Fix CORS for Multi-Environment
**Severity**: 🔴 HIGH (H-9)  
**File**: `apps/api/src/main.ts`

**Implementation**:
```typescript
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});
```

**Acceptance Criteria**:
- [ ] Multiple origins supported via comma-separated `FRONTEND_URL`
- [ ] Unknown origins rejected with `403`
- [ ] No fallback to localhost in production (validated by Zod)

---

### S5-T46 `[BE]` Add Document Number Format Cleanup
**Severity**: 🟡 MEDIUM (M-7)  
**File**: `apps/api/src/modules/sequencing/document-sequence.service.ts`

**Problem**: Format is `GOODS_RECEIVED_NOTE-2026-HQ-00001`. Should be `GRN-2026-HQ-00001`.

**Implementation**: Map `DocumentType` to short prefix:
```typescript
const PREFIX_MAP: Record<DocumentType, string> = {
  PURCHASE_REQUEST: 'PR',
  PURCHASE_ORDER: 'PO',
  GOODS_RECEIVED_NOTE: 'GRN',
  INVENTORY_ISSUE: 'ISS',
  TRANSFER: 'TRF',
  ADJUSTMENT: 'ADJ',
  KITCHEN_REQUEST: 'KR',
  STOCKTAKE: 'ST',
};
```

**Acceptance Criteria**:
- [ ] New documents use short prefix format
- [ ] Existing document numbers unchanged (migration not needed — format stored in `prefix` column)
- [ ] Unit test verifies format: `PR-2026-HQ-00001`

---

## SPRINT 6 — Security Hardening, Testing & Polish
> **Goal**: Harden security, add coverage, improve UX.  
> **Duration**: ~7 days

---

### S6-T47 `[BE][SEC]` Add Stale Session Refresh Token Audit
**Severity**: 🟡 MEDIUM  
**File**: `apps/api/src/auth/rtr.service.ts`

**Add**: When detecting a replayed token, emit a `SECURITY_ALERT_REPLAY_ATTACK` notification to all ADMIN users (via OutboxEvent).

**Acceptance Criteria**:
- [ ] Replay attack triggers ADMIN notification
- [ ] Alert includes: user ID, session ID, IP address, timestamp

---

### S6-T48 `[BE][SEC]` Enforce Password Complexity in DTOs
**Severity**: 🔵 LOW (L-2)  
**File**: `apps/api/src/auth/dto/login.dto.ts` + user management DTOs

**Implementation**: For user creation/password change DTOs:
```typescript
@IsString()
@MinLength(8)
@Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/, {
  message: 'Password must contain uppercase, number, and special character'
})
password: string;
```

**Acceptance Criteria**:
- [ ] Password < 8 chars rejected with descriptive error
- [ ] Passwords without uppercase rejected
- [ ] Passwords without number rejected

---

### S6-T49 `[BE][SEC]` Validate JWT_SECRET Removal from Env Schema
**Severity**: 🔵 LOW (L-3)  
**File**: `apps/api/src/config/env.validation.ts`

- Remove `JWT_SECRET` from `.env.example` (unused — only `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` used)
- Add comment explaining which secret is used for what

**Acceptance Criteria**:
- [ ] `JWT_SECRET` not referenced anywhere in codebase (grep check)
- [ ] `.env.example` only lists variables that are actually consumed

---

### S6-T50 `[BE]` Add Concurrency Test — Double-Post Prevention
**Severity**: 🔴 CRITICAL  
**File**: `apps/api/test/concurrency.spec.ts` [NEW]

**Scenarios**:
1. Two concurrent GRN posts for same document → only one succeeds
2. Two concurrent Issue posts for same item → total deducted correctly
3. Two concurrent stocktake lock creations → only one lock active

**Acceptance Criteria**:
- [ ] Tests use `Promise.all()` to simulate concurrency
- [ ] Optimistic locking prevents double-posting
- [ ] Stock totals remain correct after concurrent operations

---

### S6-T51 `[BE]` Add End-to-End Workflow Integration Test
**Severity**: 🔴 CRITICAL  
**File**: `apps/api/test/workflow-e2e.spec.ts` [NEW]

**Test Scenario**: Full procurement cycle:
```
Create PR → Submit PR → Approve PR →
Create PO (from PR) → Approve PO →
Create GRN (from PO) → Post GRN →
Verify StockLedger entry created →
Verify WarehouseItem.qtyOnHand increased →
Verify WAC updated →
Create Issue → Post Issue →
Verify StockLedger entry negative →
Verify WarehouseItem.qtyOnHand decreased →
Run Reconciliation → Verify no discrepancy
```

**Acceptance Criteria**:
- [ ] Full cycle completes without error
- [ ] Ledger quantities balance after full cycle
- [ ] Reconciliation reports 0 discrepancies

---

### S6-T52 `[BE]` Add Stocktake Lock Lifecycle Test
**Severity**: 🔴 CRITICAL  
**File**: `apps/api/test/stocktake-lock.spec.ts` [NEW]

**Scenario**:
1. Start stocktake → verify warehouse locked
2. GRN post attempt → verify 423 Locked
3. Simulate lock expiry (manipulate `expiresAt`)
4. Run `LockCleanupJob.cleanupExpiredLocks()`
5. Verify `Warehouse.isLocked = false`
6. GRN post attempt → verify it succeeds

**Acceptance Criteria**:
- [ ] Test verifies the complete lock→expire→unlock cycle
- [ ] This test would have caught the C-1 bug

---

### S6-T53 `[BE]` Add Reconciliation Sign Convention Test
**Severity**: 🔴 HIGH  
**File**: `apps/api/src/modules/ledger/reconciliation.job.spec.ts`

**Add tests**:
- Issue 100 units → `StockLedger.quantity = -100`
- Receive 100 units (GRN) → `StockLedger.quantity = +100`
- Run reconciliation → `SUM = 0 = qtyOnHand` after full in/out cycle

**Acceptance Criteria**:
- [ ] Passing tests confirm sign convention is correct
- [ ] Reconciliation detects injected discrepancy correctly

---

### S6-T54 `[BE]` Add Audit Log for Master Data Mutations
**Severity**: 🔴 HIGH (H-8)  
**Files**: `apps/api/src/modules/master-data/` controllers

**Problem**: User role changes, item creation, supplier updates leave no audit trail.

**Implementation**: Add `AuditLog` entries to:
- `UserService.updateRole()` — log before/after role
- `ItemService.create/update()` — log item mutations  
- `SupplierService.create/update()` — log supplier mutations
- `WarehouseService.create/update()` — log warehouse mutations

**Acceptance Criteria**:
- [ ] Role change generates `AuditLog` entry with `action: USER_ROLE_CHANGED`
- [ ] All master data CRUD operations are auditable
- [ ] `AUDITOR` role can query audit logs via `GET /admin/audit-logs`

---

### S6-T55 `[FE]` Add Real-Time Notification Bell with Polling
**Severity**: 🔴 HIGH  
**File**: `apps/web/src/app/[locale]/(app)/layout.tsx` or shared component

**Implementation**: Add notification bell that:
- Polls `GET /api/v1/notifications` every 30 seconds
- Shows unread count badge
- Dropdown lists last 10 unread notifications
- Click marks notification as read

**Acceptance Criteria**:
- [ ] Badge shows correct unread count
- [ ] Clicking bell opens notification dropdown
- [ ] Clicking a notification navigates to the relevant document
- [ ] "Mark all read" button available

---

### S6-T56 `[FE]` Add Low-Stock Warning to Inventory List
**Severity**: 🔴 HIGH  
**File**: `apps/web/src/app/[locale]/(app)/inventory/` pages

**Implementation**:
- Items with `qtyOnHand <= reorderPoint` highlighted with ⚠️ warning
- Items with `qtyOnHand = 0` shown with 🔴 "Out of Stock" badge

**Acceptance Criteria**:
- [ ] Visual indicator for low-stock items
- [ ] Out-of-stock items shown distinctly
- [ ] Filter: "Show only low-stock items"

---

### S6-T57 `[FE]` Add Empty State Components
**Severity**: 🟡 MEDIUM  
**Files**: All report and list pages

**Implementation**: When API returns empty array, show:
- Relevant icon
- Descriptive message ("No stock movements in this period")
- Action button if applicable ("Create Purchase Request")

**Acceptance Criteria**:
- [ ] Empty state shown on: movements, expiry, available-inventory, PR list, PO list, transfers, issues, adjustments
- [ ] Each empty state has unique message (not generic "No data")

---

### S6-T58 `[FE]` RTL Layout Verification & Fix
**Severity**: 🔴 HIGH  
**Files**: `apps/web/src/app/globals.css`, locale-specific layouts

**Implementation**:
- Verify `dir="rtl"` applied to `<html>` for Arabic locale
- Fix any LTR-only CSS (text alignment, flex direction, padding/margin)
- Test tables, forms, modals, sidebars in RTL

**Acceptance Criteria**:
- [ ] Arabic locale renders all pages in RTL
- [ ] No layout breakage in RTL mode
- [ ] Icons and directional elements (arrows, chevrons) mirrored appropriately

---

### S6-T59 `[BE]` Add FX Rate Management API
**Severity**: 🟡 MEDIUM (M-8)  
**File**: `apps/api/src/modules/master-data/` 

**Implementation**:
- `POST /master-data/fx-rates` — Create new FX rate entry (ADMIN, GM roles only)
- `GET /master-data/fx-rates` — List all FX rates with latest effective rate
- Rate effective from `effectiveFrom` date (historical rates preserved)

**Acceptance Criteria**:
- [ ] New rates can be added without deleting historical rates
- [ ] `getCurrencySummaries` report always uses the rate effective at time of PO creation (or latest)
- [ ] `AuditLog` entry created on FX rate change

---

### S6-T60 `[BE]` Add REJECT Workflow Action
**Severity**: 🟡 MEDIUM (M-6)  
**Files**: `packages/shared-types/src/workflows/`, `apps/api/src/modules/`

**Problem**: Only `CANCEL` exists. Business needs formal `REJECT` with mandatory reason.

**Implementation**:
- Add `REJECT` action to shared-types workflow definitions
- Valid transitions: `SUBMITTED → REJECTED`, `APPROVED → REJECTED` (for GM override)
- `REJECTED` is terminal (no further transitions)
- `comments` field mandatory for REJECT action

**Acceptance Criteria**:
- [ ] `REJECT` action defined in shared-types
- [ ] Backend enforces mandatory `comments` for REJECT
- [ ] `ApprovalEvent` records the rejection reason
- [ ] `REJECTED` documents visible in lists with distinct UI treatment

---

### S6-T61 `[DO]` Add Environment Promotion Documentation
**Severity**: 🟡 MEDIUM  
**File**: `apps/api/README.md`

**Document**:
1. Migration deployment strategy (`prisma migrate deploy` in container entrypoint)
2. Zero-downtime migration guidelines (additive-only changes)
3. Rollback procedure (Prisma does not auto-rollback — manual steps)
4. First-run admin setup procedure
5. Production environment variables reference

**Acceptance Criteria**:
- [ ] README covers all 5 points above
- [ ] Includes example `docker compose` production command

---

### S6-T62 `[BE]` Add Supplier Contact Email to Notification System
**Severity**: 🟡 MEDIUM  
**File**: `apps/api/prisma/schema.prisma` + notifications

**Extend `Supplier` model**:
- `contactName String?`
- `contactPhone String?`
- `isActive Boolean @default(true)`

Send email to `Supplier.contactEmail` when:
- PO is approved (notify supplier of new PO)
- GRN is posted (confirm receipt)

**Acceptance Criteria**:
- [ ] Schema migration applied
- [ ] Supplier email notification dispatched via OutboxService on PO approval

---

## Summary Table

| Sprint | Focus | Tasks | Duration |
|---|---|---|---|
| Sprint 1 | Critical bugs: inventory safety, security | S1-T01 → S1-T08 | 5 days |
| Sprint 2 | Critical: deployment infrastructure | S2-T09 → S2-T14 | 5 days |
| Sprint 3 | Email, async delivery, notifications | S3-T15 → S3-T22 | 7 days |
| Sprint 4 | Reporting: XLSX export, N+1 fixes | S4-T23 → S4-T34 | 7 days |
| Sprint 5 | Observability, cleanup, correctness | S5-T35 → S5-T46 | 7 days |
| Sprint 6 | Security, testing, UX polish | S6-T47 → S6-T62 | 7 days |
| **Total** | | **62 tasks** | **~38 days** |

## Parallel Execution Map

```
Sprint 1 (can parallelize):
  Dev A: S1-T01, S1-T04       (inventory/workflow bugs)
  Dev B: S1-T02, S1-T05       (health check, swagger)
  Dev C: S1-T03, S1-T06, S1-T08  (security)
  Dev D: S1-T07               (DB indexes — migration)

Sprint 2 (can parallelize):
  Dev A: S2-T09               (API Dockerfile)
  Dev B: S2-T10               (Web Dockerfile)
  Dev C: S2-T12, S2-T13       (prod seed, env vars)
  Dev D: S2-T14               (CI pipeline)
  → S2-T11 (docker-compose): after T09 + T10 done

Sprint 3 (sequential within story, parallel across):
  Dev A: S3-T15, S3-T17, S3-T18   (BullMQ + outbox)
  Dev B: S3-T16               (DB schema)
  Dev C: S3-T19               (email service)
  → S3-T20, S3-T21, S3-T22: after T15-T19

Sprint 4 (highly parallel):
  Dev A: S4-T23, S4-T24, S4-T25   (exports)
  Dev B: S4-T26, S4-T27, S4-T28   (exports)
  Dev C: S4-T29, S4-T30       (N+1 fixes)
  Dev D: S4-T31, S4-T32       (new reports)
  Dev E: S4-T33, S4-T34       (frontend)
```

## Go-Live Checklist

After completing **Sprint 1 + Sprint 2**:
- [ ] `Warehouse.isLocked` bug fixed and tested (S1-T01)
- [ ] `/health` pings database (S1-T02)
- [ ] Dockerfiles build and run (S2-T09, S2-T10, S2-T11)
- [ ] No demo credentials in production seed (S2-T12)
- [ ] Swagger hidden in production (S1-T05)
- [ ] Helmet headers active (S1-T08)
- [ ] Rate limiting on auth (S1-T06)
- [ ] HOLD lots not allocated (S1-T03)

After **Sprint 3 + Sprint 4**:
- [ ] Email notifications working (S3-T19)
- [ ] XLSX export on all reports (S4-T24 → S4-T28)
- [ ] BullMQ outbox operational (S3-T15 → S3-T18)

**Full Production Ready**: After all 6 sprints complete.

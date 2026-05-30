# Engineering Tasks — LogiRest Risk Remediation
**Source:** Full Technical Audit Report | **Generated:** 2026-05-30  
**Total Tasks:** 20 | **Sprints:** 4

> Tasks are ordered by operational and financial risk. P0 tasks are **pre-launch blockers** — the system must not go live until they are all closed.

---

## 🔴 P0 — Pre-Launch Blockers (Sprint 1)

---

### TASK-001 · Database Automated Backup Strategy
**Risk:** C1 — No database backup → permanent data loss on any failure  
**Effort:** S (2–4 hours)

**Objective:** Implement automated, tested, offsite database backups.

**Acceptance Criteria:**
- [ ] Add a `db-backup` service to `docker-compose.yml` that runs `pg_dump` on a cron schedule (daily minimum, hourly preferred for production).
- [ ] Compressed dump is written to a mounted volume AND uploaded to an S3-compatible bucket (MinIO in dev, real S3 in prod).
- [ ] Backup service uses `POSTGRES_*` env vars from the existing `.env` pattern — no hardcoded credentials.
- [ ] A `restore.sh` script is documented in `README.md` and tested against a fresh container.
- [ ] Retention policy: keep 7 daily, 4 weekly backups — older dumps are pruned by the script.
- [ ] Health check fails if the last backup is older than 26 hours (add check to `health.controller.ts`).

**Files to change:**
- `docker-compose.yml` — add `db-backup` service
- `scripts/db-backup.sh` — new file
- `scripts/db-restore.sh` — new file
- `.env.example` — add `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`, `BACKUP_RETENTION_DAYS`
- `apps/api/src/health/health.controller.ts` — add backup freshness check

---

### TASK-002 · Password Reset — Real Implementation
**Risk:** C2 — Password reset is a non-functional stub  
**Effort:** M (1–2 days)

**Objective:** Implement a secure, token-based password reset flow.

**Acceptance Criteria:**
- [ ] Add `PasswordResetToken` Prisma model: `{ id, userId, tokenHash, expiresAt, usedAt? }`.
- [ ] `POST /api/v1/auth/forgot-password` generates a cryptographically random 32-byte token, hashes it with SHA-256, stores in DB, expires in 1 hour. Sends email with reset link.
- [ ] `POST /api/v1/auth/reset-password` accepts `{ token, newPassword }`. Validates token exists, is not used, is not expired. Updates `passwordHash` via `bcrypt`. Marks token as `usedAt = now()`. Revokes all active refresh tokens for the user.
- [ ] Token is single-use (usedAt check prevents replay).
- [ ] Email sending uses the existing `OutboxService` pattern to dispatch a `PASSWORD_RESET_EMAIL` event — the actual SMTP delivery is handled by the outbox worker.
- [ ] Add `TokenCleanupJob` extension to also prune expired/used password reset tokens.
- [ ] `resetPassword` stub in `auth.service.ts:182-186` is removed completely.

**Files to change:**
- `apps/api/prisma/schema.prisma` — add `PasswordResetToken` model
- `apps/api/src/auth/auth.service.ts` — replace stubs at lines 173–186
- `apps/api/src/jobs/token-cleanup.job.ts` — add reset token pruning
- `apps/api/src/modules/outbox/outbox.service.ts` — register `PASSWORD_RESET_EMAIL` event type
- New migration: `prisma/migrations/`

---

### TASK-003 · Kitchen Request → Stock Deduction Link
**Risk:** C4 — KR `FULFILL` does not deduct stock; fulfillments create phantom inventory  
**Effort:** M (1–2 days)

**Objective:** Fulfilling a Kitchen Request must create and post an `InventoryIssue` automatically, causing real stock movement.

**Acceptance Criteria:**
- [ ] When `KitchenRequestsService.fulfill()` is called and transition succeeds, it automatically creates an `InventoryIssue` in `SUBMITTED` status linked to the KR's `warehouseId` and `departmentId`.
- [ ] Issue lines are created from the KR items with `quantityFulfilled` (not `quantityRequested`).
- [ ] The issue is immediately auto-posted via `IssuePostService.post()` within the same Prisma transaction.
- [ ] `KitchenRequest` record stores `issueId` FK (add field to schema).
- [ ] If any stock allocation fails (insufficient qty), the KR fulfillment is rejected with a descriptive error — no partial fulfillment without explicit flag.
- [ ] `AuditLog` entry records `KR_FULFILLED_AND_ISSUED` with before/after state.
- [ ] Unit test: fulfilling a KR for 5 units of Item X reduces `WarehouseItem.qtyOnHand` by 5.

**Files to change:**
- `apps/api/prisma/schema.prisma` — add `issueId String?` to `KitchenRequest`
- `apps/api/src/modules/kitchen-requests/kitchen-requests.service.ts` — rewrite `fulfill()` method
- New migration

---

### TASK-004 · Yield/Waste Service — Database Persistence
**Risk:** C5 — Yield data is stored in-memory and is lost on every restart  
**Effort:** M (1 day)

**Objective:** Replace in-memory `YieldBatch[]` with a persisted `YieldBatch` Prisma model.

**Acceptance Criteria:**
- [ ] Add `YieldBatch` model to `schema.prisma`: `{ id, recipeName, category, warehouseId?, inputQty, outputQty, wasteQty, yieldPct, standardYield, efficiency, createdAt }`.
- [ ] `YieldService.findAll()`, `findOne()`, `create()` all use Prisma (no in-memory array).
- [ ] `create()` auto-calculates `wasteQty`, `yieldPct`, `efficiency` before persisting.
- [ ] The hardcoded mock seed data in `yield.service.ts:18-43` is removed entirely.
- [ ] Existing `GET /yield` and `POST /yield` endpoints remain contract-compatible.

**Files to change:**
- `apps/api/prisma/schema.prisma` — add `YieldBatch` model
- `apps/api/src/modules/operations/yield/yield.service.ts` — replace in-memory storage
- New migration

---

### TASK-005 · Remove Hardcoded JWT Fallback Secret
**Risk:** C3 — Known fallback `dev-jwt-access-secret-key-at-least-32-chars-long` allows JWT forgery  
**Effort:** XS (1 hour)

**Objective:** The application must fail to start if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` env vars are not set.

**Acceptance Criteria:**
- [ ] `jwt.strategy.ts` throws a fatal error on startup if `JWT_ACCESS_SECRET` is undefined — no fallback.
- [ ] `rtr.service.ts` throws a fatal error on startup if `JWT_REFRESH_SECRET` is undefined — no fallback.
- [ ] `app.module.ts` validates required env vars using NestJS `ConfigModule` with `validationSchema` (Joi or Zod).
- [ ] `.env.example` documents both vars as required with instructions for generating a secure value: `openssl rand -hex 64`.
- [ ] Dev `docker-compose.override.yml` provides placeholder dev-only secrets (clearly labeled `# DEV ONLY`).

**Files to change:**
- `apps/api/src/auth/jwt.strategy.ts` — remove fallback at line 27
- `apps/api/src/app.module.ts` — add `ConfigModule.forRoot({ validationSchema })`
- `apps/api/.env.example`

---

### TASK-006 · Lot Auto-Expiry Status Transition
**Risk:** C6 / H2 — Expired lots remain ACTIVE; expired food can be allocated and issued  
**Effort:** S (4–6 hours)

**Objective:** Lots past their `expiryDate` must be automatically transitioned to `EXPIRED` status and frozen from allocation.

**Acceptance Criteria:**
- [ ] `ExpiryAlertJob` (existing at `jobs/expiry-alert.job.ts`) is extended to also call `tx.lot.updateMany({ where: { expiryDate: { lte: now }, status: LotStatus.ACTIVE } }, { data: { status: LotStatus.EXPIRED } })`.
- [ ] `AllocationService.allocate()` already filters `status: ACTIVE` — verify this also excludes newly-expired lots after the job runs.
- [ ] `ReconciliationJob` check for `EXPIRED` lots with positive balance produces a `CRITICAL` notification (this already exists — verify coverage).
- [ ] An `AuditLog` entry `LOT_AUTO_EXPIRED` is written for each auto-expired lot, including lot number, item SKU, and expiry date.
- [ ] `ExpiryAlertJob` runs daily (before business hours, suggest `0 0 * * *`).

**Files to change:**
- `apps/api/src/jobs/expiry-alert.job.ts` — add auto-transition block

---

## 🟠 P1 — Critical Security (Sprint 2)

---

### TASK-007 · Account Lockout on Failed Logins
**Risk:** H1 — Brute-force login with no per-account lockout  
**Effort:** S (4–6 hours)

**Objective:** Lock an account after N consecutive failed login attempts and require admin unlock or time-based release.

**Acceptance Criteria:**
- [ ] Add `failedLoginAttempts Int @default(0)` and `lockedUntil DateTime?` to the `User` model.
- [ ] `AuthService.login()` increments `failedLoginAttempts` on each failure.
- [ ] After 5 consecutive failures: set `lockedUntil = now() + 15 minutes`, create `NotificationLog` for `Role.ADMIN`.
- [ ] Login check runs `lockedUntil > now()` check before password validation — returns `UnauthorizedException('Account temporarily locked')` without revealing the lock reason.
- [ ] Successful login resets `failedLoginAttempts = 0` and `lockedUntil = null`.
- [ ] Admin endpoint `POST /api/v1/admin/users/:id/unlock` allows manual unlock.
- [ ] Threshold and lockout duration are configurable via `SystemSetting` table (keys: `AUTH_MAX_ATTEMPTS`, `AUTH_LOCKOUT_MINUTES`).

**Files to change:**
- `apps/api/prisma/schema.prisma` — add fields to `User`
- `apps/api/src/auth/auth.service.ts` — add lockout logic
- New admin endpoint or extend existing users controller
- New migration

---

### TASK-008 · Profile Update — DTO Validation & Audit
**Risk:** H7, M6 — `updateProfile` accepts `body: any`; no email confirmation; no audit  
**Effort:** XS (2–3 hours)

**Objective:** Replace `body: any` with a strict DTO; audit all profile changes.

**Acceptance Criteria:**
- [ ] Create `UpdateProfileDto` with `class-validator`: `name?: IsString()`, `language?: IsIn(['en','ar'])`, `phone?: IsOptional, IsString()`, `locale?: IsIn(...)`, `notification_preferences?: ValidateNested()`.
- [ ] Remove `email` from the update payload — email changes require a separate verified-email flow (not in scope here; just block it).
- [ ] Remove `role` and `scopes` from the update response — these must not be client-settable.
- [ ] Add `AuditLog` entry `USER_PROFILE_UPDATED` with before/after state for every successful call.
- [ ] `AuthService.updateProfile()` is refactored to accept `UpdateProfileDto`, not `any`.

**Files to change:**
- `apps/api/src/auth/dto/update-profile.dto.ts` — new file
- `apps/api/src/auth/auth.service.ts` — line 129, replace `body: any`
- `apps/api/src/auth/auth.controller.ts`

---

### TASK-009 · Successful Login Audit Log
**Risk:** H6 — Cannot answer "Who logged in from where and when?"  
**Effort:** XS (1 hour)

**Objective:** Write an `AuditLog` entry for every successful login.

**Acceptance Criteria:**
- [ ] `AuthService.login()` (after successful authentication, before returning the token) creates `AuditLog { action: 'LOGIN_SUCCESS', userId, targetTable: 'users', targetId: user.id, ipAddress, beforeStateJson: '{}', afterStateJson: '{ "email": "...", "role": "..." }' }`.
- [ ] IP address is extracted from the Express request and passed through from the controller.
- [ ] `AuthService.login()` controller passes `req.ip` / `x-forwarded-for`.

**Files to change:**
- `apps/api/src/auth/auth.service.ts` — login method
- `apps/api/src/auth/auth.controller.ts` — pass `ipAddress`

---

### TASK-010 · Issue & Adjustment Idempotency
**Risk:** M3 — Network retry could double-post a stock deduction  
**Effort:** S (3–4 hours)

**Objective:** Protect `POST /inventory-issues/:id/post` and `POST /adjustments/:id/post` with idempotency keys.

**Acceptance Criteria:**
- [ ] Add `@Idempotent()` decorator to the `post` action handler in `InventoryIssueController` and `AdjustmentController`.
- [ ] Add `@ApiIdempotentHeader()` to both Swagger docs.
- [ ] `IssuePostService.post()` and `AdjustmentPostService.post()` remain unchanged — the guard handles deduplication at the HTTP layer.
- [ ] Verify that `TransferPostService.ship()` and `TransferPostService.receive()` are also protected (inspect their controllers).
- [ ] Integration test: submitting the same idempotency key twice returns the cached response and does NOT create a duplicate `StockLedger` entry.

**Files to change:**
- `apps/api/src/modules/operations/issues/issues.controller.ts`
- `apps/api/src/modules/operations/adjustments/adjustments.controller.ts`
- Verify `transfer-post.controller.ts` ship/receive endpoints

---

## 🟡 P2 — Data Integrity (Sprint 3)

---

### TASK-011 · Database Negative-Quantity Constraint
**Risk:** C6 — Application bugs can silently produce negative stock  
**Effort:** XS (2 hours)

**Objective:** Add database-level `CHECK` constraints to prevent negative inventory quantities.

**Acceptance Criteria:**
- [ ] Raw SQL migration adds: `ALTER TABLE warehouse_items ADD CONSTRAINT chk_qty_on_hand_non_negative CHECK (qty_on_hand >= 0)`.
- [ ] Same constraint on `warehouse_item_lots.qty_on_hand`.
- [ ] Same constraint on `kitchen_request_items.quantity_fulfilled >= 0`.
- [ ] Existing data is validated before the migration runs (add a pre-check query in the migration that aborts if any negative records exist).
- [ ] `LedgerLockService.assertItemBalance()` and `assertLotBalance()` remain as the application-level check (defense-in-depth).

**Files to change:**
- `apps/api/prisma/migrations/` — new raw SQL migration
- `apps/api/prisma/schema.prisma` — add `@db.check()` annotation if supported

---

### TASK-012 · WAC Duplicate Logic — Unify Transfer Receive
**Risk:** M2 — WAC recalculation in transfer-post diverges from WacService  
**Effort:** S (3–4 hours)

**Objective:** Replace the inline WAC calculation in `transfer-post.service.ts` with calls to `WacService`.

**Acceptance Criteria:**
- [ ] `TransferPostService` injects `WacService`.
- [ ] All WAC recalculation logic in `transfer-post.service.ts` (currently inline formula in receive path) is replaced with `this.wacService.recalculate(...)` or `handlePositiveAdjustment(...)`.
- [ ] The inline duplicate formula at `transfer-post.service.ts:516-531` is removed.
- [ ] Unit test: confirm WAC after a transfer receive is identical to WAC after an equivalent GRN receipt of the same item at the same cost.

**Files to change:**
- `apps/api/src/modules/operations/transfer-post.service.ts`

---

### TASK-013 · Reconciliation Job — Fix N+1 on GRN Cost Orphan Check
**Risk:** H3 — Individual GRN queries in a loop cause O(n) DB round-trips  
**Effort:** S (2–3 hours)

**Objective:** Replace the per-GRN loop in `reconciliation.job.ts:255-272` with a single set-based SQL query.

**Acceptance Criteria:**
- [ ] The per-GRN `await this.prisma.costLedger.count(...)` loop is replaced with a single `$queryRaw`:
  ```sql
  SELECT grn.id, grn."grnNumber"
  FROM goods_received_notes grn
  INNER JOIN stock_ledger sl ON sl."documentId" = grn.id AND sl."documentType" = 'GOODS_RECEIVED_NOTE'
  LEFT JOIN cost_ledger cl ON cl."documentId" = grn.id AND cl."documentType" = 'GOODS_RECEIVED_NOTE'
  WHERE grn.status = 'POSTED' AND cl.id IS NULL
  ```
- [ ] The result drives the same notification creation logic.
- [ ] Add index `@@index([documentId, documentType])` on `cost_ledger` if not already present.

**Files to change:**
- `apps/api/src/modules/ledger/reconciliation.job.ts` — lines 250–272
- `apps/api/prisma/schema.prisma` — verify/add index on `cost_ledger`

---

### TASK-014 · KR `requestNumber` — Use Document Sequence
**Risk:** H5 — `Date.now() + random 4-digit` can produce duplicate document numbers  
**Effort:** XS (1–2 hours)

**Objective:** Replace the random KR number with the `DocumentSequenceService`.

**Acceptance Criteria:**
- [ ] `KitchenRequestsService.create()` calls `DocumentSequenceService.generateNext(tx, DocumentType.KITCHEN_REQUEST, branchId)`.
- [ ] `DocumentType.KITCHEN_REQUEST` sequence seed is present in `document_sequences` table (add to seed if missing).
- [ ] The random `Math.random()` generation at line 25 of `kitchen-requests.service.ts` is removed.
- [ ] The create operation is wrapped in a `prisma.$transaction`.

**Files to change:**
- `apps/api/src/modules/kitchen-requests/kitchen-requests.service.ts` — line 25
- `apps/api/prisma/seed.ts` — add KR sequence seed if missing

---

### TASK-015 · Fix `balanceAfter: 0` in Stock Movements API
**Risk:** L2 — UI shows `0` for all running balances in movement history  
**Effort:** S (3–4 hours)

**Objective:** Compute a real running balance from the `StockLedger` for the movements endpoint.

**Acceptance Criteria:**
- [ ] `inventory.service.ts` movements query uses a SQL window function to compute `running_balance`.
- [ ] `balanceAfter` in the API response returns the actual computed running balance.
- [ ] `performedByUserName: 'System User'` hardcode is replaced by joining to `ApprovalEvent` to get the actual posting user's name.

**Files to change:**
- `apps/api/src/modules/inventory/inventory.service.ts` — movement query

---

### TASK-016 · Missing Database Indexes
**Risk:** M1, H3 — Full table scans degrade performance under load  
**Effort:** XS (1 hour)

**Objective:** Add missing indexes identified in the audit.

**Acceptance Criteria:**
- [ ] `goods_received_notes`: add `@@index([status])`.
- [ ] `stock_ledger`: add `@@index([documentId])`.
- [ ] `cost_ledger`: add `@@index([documentId])`.
- [ ] `warehouse_locks`: add `@@index([warehouseId, isActive])`.
- [ ] Run `npx prisma migrate dev --name add_missing_indexes`.

**Files to change:**
- `apps/api/prisma/schema.prisma`
- New migration

---

## 🟢 P3 — Quality & Observability (Sprint 4)

---

### TASK-017 · Grafana Dashboard — Wire into Docker Compose
**Risk:** M5 — Metrics collected but no observability dashboard accessible  
**Effort:** S (3–4 hours)

**Objective:** Add Grafana to the Docker Compose stack connected to the Prometheus metrics endpoint.

**Acceptance Criteria:**
- [ ] `docker-compose.yml` adds a `grafana` service (`grafana/grafana:10-alpine`) with volume persistence.
- [ ] Grafana is pre-configured with a Prometheus datasource pointing to the API `/metrics` endpoint.
- [ ] Existing `grafana-dashboard.json` is mounted as a provisioned dashboard.
- [ ] Grafana exposed on port `3001` or behind Caddy at a sub-path.
- [ ] Default admin password set via `GRAFANA_ADMIN_PASSWORD` env var in `.env.example`.

**Files to change:**
- `docker-compose.yml`
- `grafana/provisioning/datasources/prometheus.yml` — new file
- `grafana/provisioning/dashboards/dashboard.yml` — new file
- `.env.example`

---

### TASK-018 · External Alerting Channel Integration
**Risk:** H8 — Reconciliation discrepancies and security events only create DB notifications; nobody gets paged  
**Effort:** M (1 day)

**Objective:** Critical system events must trigger external notifications via webhook.

**Acceptance Criteria:**
- [ ] Add `AlertService` (`modules/alerts/alert.service.ts`) that dispatches an `OutboxEvent` of type `EXTERNAL_ALERT`.
- [ ] Outbox worker sends a webhook POST to `ALERT_WEBHOOK_URL` (Slack-compatible payload).
- [ ] The following events trigger `AlertService.sendCritical()`:
  - Reconciliation discrepancy found (freeze triggered)
  - Refresh token replay attack detected
  - Orphaned lot detected
  - Cost ledger orphan detected
- [ ] `ALERT_WEBHOOK_URL` is optional — if not set, `AlertService` logs a warning and skips.
- [ ] `.env.example` documents `ALERT_WEBHOOK_URL`.

**Files to change:**
- `apps/api/src/modules/alerts/alert.service.ts` — new
- `apps/api/src/modules/alerts/alert.module.ts` — new
- `apps/api/src/modules/ledger/reconciliation.job.ts`
- `apps/api/src/auth/rtr.service.ts`
- `apps/api/src/modules/outbox/outbox.processor.ts`

---

### TASK-019 · TypeScript Strict Mode — Remove `body: any` and `eslint-disable` Comments
**Risk:** M6 — Unsafe types hide bugs at compile time  
**Effort:** M (1 day)

**Objective:** Replace all `body: any` patterns and `eslint-disable` suppression comments with proper types.

**Acceptance Criteria:**
- [ ] All `eslint-disable @typescript-eslint/no-unsafe-*` comments in post-services are removed.
- [ ] Post-services use typed Prisma result types (`Prisma.XxxGetPayload<{include: {...}}>`) instead of `any`.
- [ ] `AuthService.updateProfile(body: any)` → `UpdateProfileDto` (TASK-008).
- [ ] `tsconfig.json` `strict: true` is confirmed enabled.
- [ ] `npm run type-check` passes with zero errors.

**Files to change:**
- `apps/api/src/modules/operations/issue-post.service.ts`
- `apps/api/src/modules/operations/adjustment-post.service.ts`
- `apps/api/src/modules/purchasing/grn-post.service.ts`
- `apps/api/src/modules/operations/transfer-post.service.ts`
- `apps/api/tsconfig.json`

---

### TASK-020 · Swagger API Docs — Require Auth in Non-Dev Environments
**Risk:** L5 — API schema exposed publicly in staging  
**Effort:** XS (1 hour)

**Objective:** Protect Swagger UI with basic auth in non-production non-dev environments.

**Acceptance Criteria:**
- [ ] Swagger setup in `main.ts` only enabled if `NODE_ENV === 'development'` OR `SWAGGER_ENABLED=true`.
- [ ] If enabled, HTTP Basic Auth wraps `/api/docs` using `SWAGGER_USER` / `SWAGGER_PASSWORD` env vars.
- [ ] `.env.example` documents `SWAGGER_ENABLED`, `SWAGGER_USER`, `SWAGGER_PASSWORD`.
- [ ] Production compose does NOT set `SWAGGER_ENABLED`.

**Files to change:**
- `apps/api/src/main.ts`
- `.env.example`

---

## Summary Table

| Task | Title | Priority | Effort | Sprint |
|------|-------|----------|--------|--------|
| TASK-001 | Database Automated Backup | P0 🔴 | S | 1 |
| TASK-002 | Password Reset — Real Implementation | P0 🔴 | M | 1 |
| TASK-003 | Kitchen Request → Stock Deduction | P0 🔴 | M | 1 |
| TASK-004 | Yield Service — DB Persistence | P0 🔴 | M | 1 |
| TASK-005 | Remove Hardcoded JWT Fallback Secret | P0 🔴 | XS | 1 |
| TASK-006 | Lot Auto-Expiry Status Transition | P0 🔴 | S | 1 |
| TASK-007 | Account Lockout on Failed Logins | P1 🟠 | S | 2 |
| TASK-008 | Profile Update — DTO Validation & Audit | P1 🟠 | XS | 2 |
| TASK-009 | Successful Login Audit Log | P1 🟠 | XS | 2 |
| TASK-010 | Issue & Adjustment Idempotency | P1 🟠 | S | 2 |
| TASK-011 | DB Negative-Quantity Constraint | P2 🟡 | XS | 3 |
| TASK-012 | WAC Unify Transfer Receive | P2 🟡 | S | 3 |
| TASK-013 | Reconciliation Job N+1 Fix | P2 🟡 | S | 3 |
| TASK-014 | KR Document Sequence | P2 🟡 | XS | 3 |
| TASK-015 | Fix `balanceAfter: 0` in Movements | P2 🟡 | S | 3 |
| TASK-016 | Missing DB Indexes | P2 🟡 | XS | 3 |
| TASK-017 | Grafana in Docker Compose | P3 🟢 | S | 4 |
| TASK-018 | External Alerting Channel | P3 🟢 | M | 4 |
| TASK-019 | TypeScript Strict Mode Cleanup | P3 🟢 | M | 4 |
| TASK-020 | Swagger Auth Protection | P3 🟢 | XS | 4 |

**Effort Legend:** XS = <2h | S = 2–6h | M = 1–2 days

---

## Sprint Roadmap

```
Sprint 1 (Week 1) — PRE-LAUNCH BLOCKERS
  TASK-005 → TASK-001 → TASK-006 → TASK-002 → TASK-003 → TASK-004

Sprint 2 (Week 2) — SECURITY HARDENING
  TASK-009 → TASK-008 → TASK-010 → TASK-007

Sprint 3 (Week 3) — DATA INTEGRITY
  TASK-011 → TASK-016 → TASK-014 → TASK-012 → TASK-013 → TASK-015

Sprint 4 (Week 4) — QUALITY & OBSERVABILITY
  TASK-020 → TASK-017 → TASK-019 → TASK-018
```

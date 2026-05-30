# Research & Design Decisions: LogiRest Engineering Recovery & Stabilization

This document resolves all technical unknowns identified in the Technical Context of `plan.md` and documents architectural decisions for each workstream in this feature.

---

## 1. API Pagination Envelope — Remaining Endpoints (FR-001, FR-002)

### Context & Problem
Spec 041 resolved 21 broken endpoints. This spec addresses the full breadth of the audit: the same pagination contract must apply to *all* remaining listing endpoints (including master-data endpoints for barcodes, currencies, audit logs, notification templates, and the operational endpoints for stock movements, lot tracking, adjustments, and stocktakes).

### Resolution Decisions

- **Decision**: Apply the identical NestJS service-layer `{ data: T[], meta: { total, page, page_size, total_pages } }` wrapping to all remaining list endpoints not addressed in spec 041.
- **Rationale**: Using a single consistent pattern across 100% of endpoints eliminates all current and future Zod parsing errors in the frontend, achieving SC-001.
- **Pattern**: Each service method builds the meta block from the ORM's `count()` result and the query's `skip`/`take` parameters. The controller returns the assembled object with no transformation layer.
- **Frontend**: All hooks that were not consolidated in 041 also adopt `paginatedSchema()` from `packages/shared-types`.

---

## 2. Negative Stock Prevention (FR-010, FR-012, SC-001)

### Context & Problem
Concurrent stock deductions (kitchen issues, inter-warehouse transfers, variance adjustments) can race and drive a warehouse item's `qtyOnHand` below zero when processed without serialized locks or a hard database-level constraint.

### Resolution Decisions

- **Decision (Database Layer)**: Add a PostgreSQL `CHECK` constraint:
  ```sql
  ALTER TABLE "InventoryLot" ADD CONSTRAINT "chk_qty_non_negative"
  CHECK ("qtyOnHand" >= 0);
  ```
  This provides an absolute last-resort guarantee regardless of application-layer bugs.

- **Decision (Application Layer)**: Inside every stock deduction service method, after acquiring the `SELECT FOR UPDATE` row lock and before writing the deduction, explicitly check that `qtyOnHand - deductionQty >= 0`. If the check fails:
  1. Abort the Prisma transaction immediately.
  2. Throw a `BadRequestException` with message `"Insufficient stock: requested quantity exceeds available on hand."`.
  3. The HTTP layer maps this to a `400 Bad Request` response. No ledger entry is written.

- **Rationale**: Defense-in-depth — the application check provides a friendly `400` response with a descriptive message before the database `CHECK` constraint ever fires (which would produce an ugly `P2002` Prisma error). The DB constraint acts as a safety net for any future code paths that might bypass the service layer.

- **Alternatives Considered**:
  - *Partial fulfillment*: Rejected. Incomplete stock deductions cause accounting discrepancies that require manual correction, violating the audit integrity principle.
  - *Queue-and-retry*: Rejected. Adds distributed state complexity incompatible with the stabilization phase scope and the Zero-Trust monorepo constraint.

---

## 3. Automated Backup Pipeline (FR-011, SC-006, SC-007)

### Context & Problem
No automated database backup mechanism exists. A host failure would cause total data loss. The target SLA is 24-Hour RPO (daily backups) and 4-Hour RTO (restore from offsite in under 4 hours).

### Resolution Decisions

- **Decision (Backup Mechanism)**: Use `pg_dump` (PostgreSQL native utility) executed via a Node.js `child_process.execSync` call inside a NestJS `@nestjs/schedule` CronJob. The dump is compressed (gzip), encrypted with AES-256 using a secret key from environment, and uploaded to an S3-compatible bucket via AWS SDK v3 `PutObjectCommand`.

- **Decision (Cron Schedule)**: `@Cron('0 2 * * *')` — daily at 02:00 UTC server time. This minimizes operational impact during low-traffic hours.

- **Decision (Backup Metadata Tracking)**: After each successful upload, record the UTC timestamp in a Redis key or a simple PostgreSQL row in a `SystemMeta` table (`key = 'last_backup_at'`, `value = ISO8601 timestamp`). The `/health` endpoint queries this value.

- **Decision (Health Endpoint)**: `GET /health` returns `{ status: 'ok' | 'degraded', lastBackupAt: ISO8601, backupAgeHours: number }`. Status is `degraded` if `backupAgeHours > 26`. Response HTTP code remains `200` in both cases (monitoring tools check the `status` field).

- **Decision (Restore Drill Script)**: A shell script `scripts/backup-restore-drill.sh` automates:
  1. Download the latest encrypted backup from S3.
  2. Decrypt and decompress.
  3. Restore to a sandboxed PostgreSQL instance.
  4. Run a row-count spot-check query against key tables.
  5. Report elapsed time and pass/fail status.

- **Rationale**: `pg_dump` is the industry standard for PostgreSQL backups. S3 provides geo-redundant offsite storage. The restore drill script formalizes and validates the 4-hour RTO commitment.

- **Alternatives Considered**:
  - *WAL archiving (continuous archiving)*: More complex, requires additional infrastructure (pgBackRest/Barman). Deferred to post-stabilization if RPO needs to improve below 24 hours.
  - *Docker volume snapshots*: Not portable or restorable across host failures.

---

## 4. Health Check Endpoint Design (FR-011)

### Resolution Decisions

- **Decision**: A new `HealthController` is created at `apps/api/src/health/health.controller.ts`. It is a lightweight NestJS controller with a single `GET /health` route. It is excluded from JWT auth guards via a `@Public()` decorator (or equivalent unauthenticated route).
- **Response contract**:
  ```json
  {
    "status": "ok" | "degraded",
    "timestamp": "2026-05-30T02:00:00Z",
    "checks": {
      "database": "ok",
      "backup": {
        "status": "ok" | "degraded",
        "lastBackupAt": "2026-05-30T02:00:00Z",
        "ageHours": 12.5
      }
    }
  }
  ```
- **Rationale**: A structured health payload allows monitoring tools (Prometheus, UptimeRobot, Grafana) to scrape individual check statuses without parsing prose.

---

## 5. JWT Startup Validation & Scope Preservation (FR-003, FR-005)

*Both items were resolved in spec 041 (branch `041-master-issue-registry`). The implementation decisions are documented in `specs/041-master-issue-registry/research.md` sections 3 and 4. No new decisions are required here — this spec inherits those resolved items as prerequisites.*

---

## 6. Warehouse Route Deconfliction (FR-004)

*Resolved in spec 041. See `specs/041-master-issue-registry/research.md` section 2.*

---

## 7. Default Department Seed (FR-006)

*Resolved in spec 041. See `specs/041-master-issue-registry/research.md` section 5 and `data-model.md`.*

---

## 8. Frontend Scope Guard & Loading Spinner (FR-007, FR-008, FR-009)

*Resolved in spec 041. See `specs/041-master-issue-registry/research.md` section 6.*

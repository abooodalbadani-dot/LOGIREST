# Research & Architectural Decisions: LogiRest Risk Remediation

This document records the technology choices, architectural selections, and design rationales for the LogiRest risk remediation tasks (TASK-001 through TASK-020).

---

### 1. Database Automated Backup Strategy (TASK-001)

* **Decision**: Implement a dedicated `db-backup` container inside the Docker Compose stack running `pg_dump` on a cron schedule, compressing via `gzip`, and uploading to an S3-compatible bucket utilizing environment variable credentials (`BACKUP_S3_ACCESS_KEY` / `SECRET_KEY`).
* **Rationale**: Containerizing the backup mechanism makes it completely portable across development (using local MinIO) and production (using AWS S3). Utilizing environment variables keeps it perfectly aligned with the repository's `.env` practices while maintaining security.
* **Alternatives Considered**:
  * *Host-based Cron*: Rejected. Relies on host-level PostgreSQL installation and environment setup, complicating local and staging cluster consistency.
  * *Database Replication (Hot Standby)*: Rejected. While excellent for high-availability, replication replicates corruption or accidental table drops immediately, so it does not replace a point-in-time point recovery strategy.

---

### 2. Failed Login Account Lockout Strategy (TASK-007)

* **Decision**: Implement the lockout counter and release timestamp directly inside the `User` database model (`failedLoginAttempts` and `lockedUntil` fields). Use a dual release strategy: the lock expires automatically after 15 minutes (verified via a simple `lockedUntil > now` timestamp comparison) OR can be manually cleared by an administrator immediately.
* **Rationale**: Storing the lockout variables directly in PostgreSQL guarantees that lockout state persists across server restarts and clustered server nodes without adding a new caching infrastructure dependency (e.g. Redis). Dual release minimizes administrative support load while protecting against automated brute force.
* **Alternatives Considered**:
  * *In-Memory Cache (e.g., NestJS CacheManager)*: Rejected. State is lost on server restart, enabling attackers to reset their lockout counters by triggering a server reboot or targeting different cluster nodes.
  * *Strict Administrator Unlock Only*: Rejected. Significantly increases support tickets for accidental lockouts of legitimate kitchen staff during busy operational hours.

---

### 3. Kitchen Request → Stock Deduction Transaction Link (TASK-003)

* **Decision**: Fulfilling a Kitchen Request atomically creates and posts a submitted `InventoryIssue` in the same Prisma transaction, executing raw SQL `SELECT FOR UPDATE` pessimistic serializable locks on target lot and item inventory balances.
* **Rationale**: Atomic execution guarantees that kitchen requisitions are backed by physical stock. Implementing raw SQL pessimistic locks on inventory balances prevents race conditions where concurrent checkouts double-allocate the same items.
* **Alternatives Considered**:
  * *Asynchronous outbox queue processing*: Rejected. Leads to "ghost inventory" where stock shows as available during the delay between request fulfillment and physical deduction, causing operational errors in the kitchen.

---

### 4. Weighted Average Cost (WAC) Calculation Unification (TASK-012)

* **Decision**: Inject `WacService` into `TransferPostService` and replace the inline average cost formula with unified methods (`recalculate` or `handlePositiveAdjustment`).
* **Rationale**: Eliminates duplication of accounting formulas. A unified calculation ensures absolute valuation parity between Goods Received Notes (GRN), positive inventory adjustments, and incoming transfers between branches.
* **Alternatives Considered**:
  * *Independent calculation helper in shared package*: Rejected. Keeping the logic inside `WacService` centralizes database queries and state management.

---

### 5. Set-Based Cost Ledger Reconciliation checking (TASK-013)

* **Decision**: Replace the O(n) looping query checking for orphaned GRN cost records in `reconciliation.job.ts` with a single raw `$queryRaw` SQL query performing an inner join to stock ledgers and left joining to cost ledgers.
* **Rationale**: Resolves N+1 database roundtrips. A single database check computes outcomes in a single roundtrip, protecting database resource consumption during nightly audits.
* **Alternatives Considered**:
  * *Prisma Batching chunk queries*: Rejected. While simpler to write in ORM, it still triggers multiple roundtrips and is far less performant than a native SQL join.

---

### 6. External Alerting Webhook Format (TASK-018)

* **Decision**: Outbox worker dispatches HTTP POST payloads containing Slack/Discord-compatible attachments to a configurable `ALERT_WEBHOOK_URL`.
* **Rationale**: Slack-compatible formatting is the industry standard for lightweight alerting. It allows native delivery to Slack channels, Discord webhooks, or Microsoft Teams with zero intermediate layers or translation servers.
* **Alternatives Considered**:
  * *PagerDuty API Envelope*: Rejected. Restricts alerting destinations to PagerDuty only, whereas Slack-compatible formats are highly universal.

# Research Document: Sprint 2 Quality Hardening

This document records the architectural research, design decisions, and technology selections for the Sprint 2 quality hardening items.

## 1. Metrics & Monitoring Integration (TASK-016)

### Decision
Inject the existing `MetricsService` into `OutboxWorker` (`apps/api/src/modules/outbox/outbox.worker.ts`) and increment the standard Prometheus counter `failedOutboxEventsCounter` on any event processing failure.

### Rationale
Prometheus metrics must represent application errors in real-time. Integrating directly with the existing `MetricsService` allows SREs to monitor outbox failures through the centralized Grafana dashboard without introducing extra latency or secondary storage layers.

### Alternatives Considered
- **Database-Only Tracking**: Querying the database `outbox_events` table for `FAILED` status. *Rejected* due to query overhead and lack of real-time SRE alert notification capability.

---

## 2. Background Task Standardization (TASK-017)

### Decision
Migrate the `LockCleanupJob` (`apps/api/src/jobs/lock-cleanup.job.ts`) from standard Node.js `setInterval` loop to NestJS `@nestjs/schedule` `@Cron('*/1 * * * *')` decorator execution.

### Rationale
- Integrates fully with the NestJS application lifecycle (`OnApplicationBootstrap` / `BeforeApplicationShutdown`).
- Prevents JavaScript timer drift.
- Standardizes background tasks in a single registry, facilitating testing and observability.

### Alternatives Considered
- **BullMQ / Queue Schedulers**: *Rejected* because expired lock cleanup is a simple internal cleanup task that does not warrant queue cluster overhead.

---

## 3. Login Failure Audit Trails (TASK-018)

### Decision
Extend the NestJS authentication logic (`apps/api/src/auth/auth.service.ts`) to write an immutable `AuditLog` record containing target entity details on any unsuccessful login attempt (incorrect credentials, non-existent user, or suspended accounts).

### Rationale
Strict security compliance requires logging failed logins to detect credential stuffing and brute-force attacks. Recording these in the existing audited `audit_logs` table ensures administrators can immediately view failed logins in the audit console.

### Alternatives Considered
- **Standard Server Logging (winston/pino)**: *Rejected* as standard logs are subject to rotation and not easily searchable by web-based administrators in the Admin UI.

---

## 4. Administrative Dashboard Interfaces (TASK-019 & TASK-020)

### Decision
Build two new dedicated management screens inside the Admin workspace:
1. **Frozen Items Management** (`/admin/frozen-items`): Queries `GET /api/v1/admin/frozen-items` and triggers `POST /api/v1/admin/unfreeze/:warehouseId/:itemId`.
2. **Outbox Retry Console** (`/admin/outbox`): Queries `GET /api/v1/admin/outbox/failed` and triggers individual retry `POST /api/v1/admin/outbox/:id/retry` and bulk retry `POST /api/v1/admin/outbox/retry-all`.

### Rationale
Empowers operators to resolve stock discrepancies (frozen items) and failed system notifications without needing command-line tools or database direct write permissions, keeping actions within secure role-based limits.

---

## 5. Outbox Event Database Constraints (TASK-021)

### Decision
Create a Prisma database migration applying a raw SQL `CHECK` constraint on `outbox_events.status` enforcing only valid values: `('PENDING', 'SUCCEEDED', 'FAILED')`.

### Rationale
Ensures strict database-level state validation, preventing corrupt data injections from any raw SQL execution or direct mutations.

---

## 6. Distributed Alert Debouncing (TASK-022)

### Decision
Inject the Redis client into `LowStockAlertJob` (`apps/api/src/jobs/low-stock-alert.job.ts`) and migrate from an in-memory JS `Map` to Redis keys (`alert:lowstock:debounce:${itemId}`) with a 24-hour expiration (`EX 86400`).

### Rationale
Using Redis guarantees that debounce states are shared across multiple API instances and fully survive server deployments or crash restarts, preventing duplicate alert spam.

### Alternatives Considered
- **PostgreSQL Database Storage**: *Rejected* as ephemeral debounce state is high-write and high-expire, making memory-backed Redis caching significantly more performant and lightweight.

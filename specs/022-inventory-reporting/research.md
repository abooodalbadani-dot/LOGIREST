# Research and Architecture Decisions: Inventory Query, Reporting, & Administrative Jobs

This document consolidates architectural decisions, rationales, and alternatives evaluated during the planning phase.

## 1. Warehouse Lock Expired State Representation

- **Decision**: Introduce a explicit `status` enum field (`ACTIVE`, `STALE`, `RELEASED`) on the `WarehouseLock` table. The lock-cleanup background job will scan for locks where `expiresAt < NOW()` and update their status to `STALE` in the database, keeping `isActive = true`.
- **Rationale**: 
  - Having a status enum simplifies the query in `WarehouseLockGuard` (it just checks `isActive = true`).
  - Simplifies the UI as the frontend can query stale locks directly without recalculating timestamps.
  - Prevents race conditions and reduces CPU comparison overhead on every write operation.
- **Alternatives considered**:
  - *Dynamic Evaluation*: Skip background database updates and perform timestamp comparisons (`expiresAt < NOW()`) in the NestJS Guard. Rejected because it increases database query complexity on high-throughput mutation endpoints.

## 2. In-App Notification Read State Updates

- **Decision**: Expose `PATCH /notifications/:id/read` for marking individual notifications as read and `POST /notifications/read-all` for bulk marking all notifications of the active user role/warehouse scope as read.
- **Rationale**:
  - Providing both endpoints aligns with modern notification center UX best practices (dismissing individual critical alerts vs clearing all history).
- **Alternatives considered**:
  - *Bulk Only*: Rejected because users would not be able to clear individual items, resulting in a poor alert UX.
  - *Individual Only*: Rejected because it requires users to click multiple times to clear a long list of notifications.

## 3. Data Export Support (CSV/Excel)

- **Decision**: Defer backend-side CSV/Excel document generation. The backend API serves standard JSON responses only. If CSV downloads are needed, the Next.js frontend will parse the JSON payloads and generate the CSV client-side.
- **Rationale**:
  - Keeps the backend codebase clean and decoupled from third-party binary generation libraries (e.g. `exceljs` or `csv-writer`).
  - Decreases memory usage and CPU cycles on the NestJS backend.
- **Alternatives considered**:
  - *Server-side CSV generation*: Rejected because the frontend is perfectly capable of rendering and converting JSON tabular data to CSV with negligible client-side footprint.

## 4. Notification Transport

- **Decision**: Implement database-stored notifications using a `NotificationLog` table. The frontend will fetch alerts using regular HTTP polling. WebSockets or Server-Sent Events (SSE) are out of scope for this phase.
- **Rationale**:
  - Keeps implementation scope minimal, highly testable, and deterministic.
- **Alternatives considered**:
  - *WebSockets / SSE*: Deferred to a future optimization phase to prevent architecture creep in Phase 9.

## 5. Overdue Transfers Metric

- **Decision**: Determine overdue transfers dynamically inside the `ReportsService` by querying transfers with status `IN_TRANSIT` where the `shippedAt` date is older than `NOW() - TRANSFER_OVERDUE_DAYS` (default 7 days, configurable via environment variable).
- **Rationale**:
  - Standardized calculation that does not require persistent columns in the DB, reducing write operations while providing accurate dashboard KPIs.
- **Alternatives considered**:
  - *Background Job Status Flagging*: Run a cron job to update a `isOverdue` flag on the `Transfer` table. Rejected because overdue state is a dynamic function of time and does not warrant continuous database write operations.

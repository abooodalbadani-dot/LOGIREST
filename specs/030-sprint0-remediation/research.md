# Research and Design Decisions: Sprint 0 Readiness Hardening

## 1. Reconciliation Job Scheduler Migration (TASK-005)

- **Decision**: Migrate `ReconciliationJob` from custom `setTimeout` scheduling to NestJS `@nestjs/schedule` module with `@Cron('0 1 * * *')`.
- **Rationale**: 
  - The custom `setTimeout` is unstable because server restarts wipe out the scheduled task, leading to silent gaps in reconciliation execution.
  - NestJS `@Cron` relies on the internal cron runner of the NestJS container, ensuring the job executes reliably at exactly 1:00 AM daily.
  - Graceful shutdowns will be handled via NestJS lifecycle hooks.
- **Alternatives considered**: 
  - *BullMQ schedule*: Overkill for a simple single-server daily batch job when `@nestjs/schedule` is already installed and fully integrated.
  - *Keep setTimeout*: Rejected because it lacks persistence and error recovery across process restarts.

---

## 2. SMTP Delivery Transparency (TASK-006)

- **Decision**:
  - Implement a discriminated union return type for `EmailService.sendEmail()`:
    ```ts
    export type EmailResult =
      | { ok: true }
      | { ok: false; reason: 'SMTP_UNCONFIGURED' | 'SEND_FAILED'; error?: string };
    ```
  - In `OutboxWorker.process()`, when email fails with `SMTP_UNCONFIGURED`, transition outbox event to status `FAILED` and `lastError: 'SMTP_NOT_CONFIGURED'`.
  - Create a NestJS interceptor/service to create an administrative NotificationLog alert.
  - Add a dedicated `/admin/system/email-status` endpoint in `AdminController` returning email health metrics.
- **Rationale**:
  - Raw boolean returns are ambiguous and conceal configuration issues.
  - Quiet swallows of email delivery failures lead to missed operational alerts.
  - Distinguishing unconfigured SMTP prevents infinite retry loops on non-transient configuration issues.
- **Alternatives considered**: 
  - *Throw exception inside sendEmail*: Rejected because outbox processor is a background worker; throwing exceptions directly would trigger default retry middleware instead of custom state mapping.

---

## 3. Database Check Constraints (TASK-007)

- **Decision**: Add raw PostgreSQL `CHECK` constraints to `warehouse_items`, `warehouse_item_lots`, and `outbox_events` tables using a custom Prisma migration file generated via `npx prisma migrate dev --create-only --name add_nonneg_qty_constraints`.
- **Rationale**:
  - Application-level validation can be bypassed by direct SQL queries, migration scripts, or concurrency races.
  - DB-level constraints serve as the final P0 line of defense for database state integrity.
- **Alternatives considered**:
  - *Application-only validation*: Rejected because concurrency bugs or developer oversights could still write negative inventory values to the database.

---

## 4. Remove Hardcoded Currency Displays (TASK-008)

- **Decision**: Refactor frontend components `StoreManagerDashboard.tsx` and `DashboardClient.tsx` to read the base currency dynamically via the `useAdminSettings` hook. Remove the hardcoded PO demo record from `SearchClient.tsx`.
- **Rationale**:
  - System currency must not be hardcoded to `'SAR'` so that the software remains localized and customizable for multi-regional setups.
- **Alternatives considered**:
  - *Query base currency inside each component via API call*: Rejected as `useAdminSettings` already caches system configurations efficiently.

---

## 5. Document Cancellation Workflow (TASK-009)

- **Decision**:
  - Add `'CANCELLED'` and `'VOIDED'` states to standard document statuses in `shared-types` contracts.
  - Expose a `POST /purchase-requests/:id/cancel` endpoint mapped through a `WorkflowStateGuard` verifying role capabilities.
  - Invoke `workflowService.executeTransition(id, 'purchaseRequest', 'CANCEL', userId, role)`.
  - Add a dynamic Cancel button in `purchase-request-form.tsx` visible only when a document is in DRAFT state.
- **Rationale**:
  - Operators need a standard way to cancel draft documents.
  - Restricting the transition strictly to DRAFT stage (Phase 1) ensures zero impact on inventory stock ledgers, eliminating risk of financial or ledger drift.
- **Alternatives considered**:
  - *Delete documents*: Rejected because complete audit trails are required by our constitution (immutable audit records). Documents must never be deleted, only transitioned to a cancelled state.

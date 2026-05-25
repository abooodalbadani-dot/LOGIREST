# Implementation Plan: Sprint 0 Readiness Hardening

**Branch**: `030-sprint0-remediation` | **Date**: 2026-05-25 | **Spec**: [specs/030-sprint0-remediation/spec.md](spec.md)
**Input**: Feature specification from `/specs/030-sprint0-remediation/spec.md`

---

## Summary

Implement five core Sprint 0 remediation tasks (TASK-005 to TASK-009) to harden the LogiRest system for its production pilot launch. The plan involves:
1. Migrating `ReconciliationJob` to NestJS standard `@Cron` scheduler.
2. Introducing unconfigured SMTP status mapping to outbox dispatches, raising admin notification alerts, and exposing a `/admin/system/email-status` health dashboard.
3. Adding raw PostgreSQL `CHECK` constraints to database tables to enforce stock quantity positive invariants.
4. Refactoring financial UI widgets to display configured currencies dynamically via settings.
5. Implementing draft document workflow cancellation transitions in state machines, APIs, and client forms.

---

## Technical Context

- **Language/Version**: TypeScript / Node.js 20+
- **Primary Dependencies**: NestJS, Next.js 16, Prisma
- **Storage**: PostgreSQL (with PostgREST/REST and Prisma)
- **Testing**: Jest (E2E, unit)
- **Target Platform**: Windows / Linux server
- **Project Type**: Web Application Monorepo (Next.js 16 frontend + NestJS backend)
- **Performance Goals**: Operational UI feedback <100ms, API response time <200ms
- **Constraints**: 100% of stock ledger quantity edits are locked down; no negative inventory values written to the DB.

---

## Constitution Check

*GATE: Passed. All rules are respected.*
- **Backend supreme authority**: DB constraints are verified at the PostgreSQL level. Status transitions are guarded strictly on the NestJS backend via `WorkflowStateGuard` and `WorkflowAction` decorators.
- **Strict separation of concerns**: The web app only calls the backend API and doesn't access any database directly. All shared validation structures are imported from `packages/shared-types`.
- **DRY schema principle**: Zod schemas and type definitions are reused from `packages/shared-types`.
- **Auditing**: Document cancellation writes standard approval events and audit log entries.

---

## Project Structure

### Documentation (this feature)

```text
specs/030-sprint0-remediation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: Technical decisions & rationales
├── data-model.md        # Phase 1 output: DB models and constraints
├── quickstart.md        # Phase 1 output: Quick verification guide
└── contracts/
    └── api.md           # Phase 1 output: HTTP API endpoints contracts
```

### Source Code Structure

Our codebase is structured as a monorepo:

```text
apps/
├── api/ (NestJS Backend API)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── admin/       # System status & settings endpoints
│   │   │   ├── ledger/      # Reconciliation Job
│   │   │   ├── outbox/      # OutboxWorker and EmailService
│   │   │   └── purchase-requests/
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
└── web/ (Next.js 16 Frontend App)
    ├── src/
    │   ├── features/
    │   │   ├── dashboard/   # Dashboard widgets
    │   │   └── purchasing/  # Purchase request forms and actions
    │   └── app/
```

---

## Proposed Changes

### 1. Reconciliation Job Scheduler Migration (TASK-005)

#### [MODIFY] [reconciliation.job.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/ledger/reconciliation.job.ts)
- Remove imports of `OnModuleInit` and `OnModuleDestroy` from `@nestjs/common` if unused.
- Remove `timeoutId`, `OnModuleInit`, `OnModuleDestroy`, and `scheduleNextRun()` from the class.
- Decorate `runReconciliation()` with `@Cron('0 1 * * *', { name: 'daily-reconciliation' })` from `@nestjs/schedule`.

#### [MODIFY] [reconciliation.job.spec.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/ledger/reconciliation.job.spec.ts)
- Update mock setup: remove any manual spies or overrides on `scheduleNextRun` to align with the refactored class.

---

### 2. SMTP Delivery Transparency (TASK-006)

#### [MODIFY] [email.service.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/outbox/email.service.ts)
- Export and introduce the discriminated union `EmailResult`:
  ```ts
  export type EmailResult =
    | { ok: true }
    | { ok: false; reason: 'SMTP_UNCONFIGURED' | 'SEND_FAILED'; error?: string };
  ```
- Change `sendEmail` to return `Promise<EmailResult>`.
- If `this.transporter` is unconfigured, return `{ ok: false, reason: 'SMTP_UNCONFIGURED' }`.
- In `try/catch` wrapper, on success return `{ ok: true }`, on error return `{ ok: false, reason: 'SEND_FAILED', error: err.message }`.

#### [MODIFY] [outbox.worker.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/outbox/outbox.worker.ts)
- Intercept return value of `emailService.sendEmail`.
- If `ok === false` and `reason === 'SMTP_UNCONFIGURED'`:
  - Transition outbox event to status `FAILED` and set `lastError = 'SMTP_NOT_CONFIGURED'`.
  - Create a new in-system administrative alert using `NotificationLog`:
    ```ts
    await tx.notificationLog.create({
      data: {
        targetRole: Role.ADMIN,
        message: 'System email server is not configured. Outbox events are failing.',
        isRead: false,
      }
    });
    ```

#### [MODIFY] [admin.controller.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/admin/admin.controller.ts)
- Inject `EmailService`.
- Add a new endpoint `GET /admin/system/email-status` restricted to the `ADMIN` role.
- Query `outbox_events` for `status: 'FAILED'` and `lastError: 'SMTP_NOT_CONFIGURED'` to aggregate health metrics:
  - `smtpConfigured` (read from `emailService.isSmtpConfigured()`)
  - `failedEventCount` (count matching DB events)
  - `lastFailureAt` (newest matching DB timestamp)

---

### 3. Database Check Constraints (TASK-007)

#### [NEW] [migration.sql](file:///e:/Kitchen‑Store Inventory System/apps/api/prisma/migrations/)
- Generate an empty/create-only migration using `npx prisma migrate dev --create-only --name add_nonneg_qty_constraints`.
- Append constraint SQL scripts:
  - Check on `warehouse_items`: `qty_on_hand >= 0` and `qty_allocated >= 0`
  - Check on `warehouse_item_lots`: `qty_on_hand >= 0`
  - Check on `outbox_events`: `status IN ('PENDING', 'SUCCEEDED', 'FAILED')`

---

### 4. Remove Hardcoded Currency Displays (TASK-008)

#### [MODIFY] [StoreManagerDashboard.tsx](file:///e:/Kitchen‑Store Inventory System/apps/web/src/features/dashboard/components/StoreManagerDashboard.tsx)
- Inject `useAdminSettings` hook.
- Extract `base_currency` and use it as parameters in `formatCurrency(...)` formatting widgets instead of the hardcoded `'SAR'` string.

#### [MODIFY] [DashboardClient.tsx](file:///e:/Kitchen‑Store Inventory System/apps/web/src/app/[locale]/(app)/dashboard/DashboardClient.tsx)
- Retrieve `base_currency` dynamically from `useAdminSettings` hook to override default mock settings.

#### [MODIFY] [SearchClient.tsx](file:///e:/Kitchen‑Store Inventory System/apps/web/src/app/[locale]/(app)/search/SearchClient.tsx)
- Remove hardcoded demo purchase order record with `'4,250 SAR'` to reflect empty search status or real search integrations.

---

### 5. Document Cancellation Workflow (TASK-009)

#### [MODIFY] [statuses.ts](file:///e:/Kitchen‑Store Inventory System/packages/shared-types/src/contracts/statuses.ts)
- Add `'CANCELLED'` and `'VOIDED'` to the standard list of document statuses.

#### [MODIFY] [purchase-requests.controller.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/purchase-requests/purchase-requests.controller.ts)
- Add `POST /purchase-requests/:id/cancel` endpoint using the `WorkflowStateGuard` and `WorkflowAction` decorators, calling `prService.cancel(...)`.

#### [MODIFY] [purchase-requests.service.ts](file:///e:/Kitchen‑Store Inventory System/apps/api/src/modules/purchase-requests/purchase-requests.service.ts)
- Add `cancel(id, userId, role)` method calling `workflowService.executeTransition(id, 'purchaseRequest', 'CANCEL', userId, role)`.

#### [MODIFY] [purchase-request-form.tsx](file:///e:/Kitchen‑Store Inventory System/apps/web/src/features/purchasing/components/purchase-request-form.tsx)
- Import custom react mutation hook `useCancelPR`.
- Place a secondary action button "Cancel" in the form action list, visible only if document is in draft state (`!isLocked && initialData?.id`).
- On click, execute `cancelPR` mutation and redirect to the Purchase Request list view.

---

## Verification Plan

### Automated Tests

- **Reconciliation Job scheduler tests**:
  ```bash
  npm run test -- apps/api/src/modules/ledger/reconciliation.job.spec.ts
  ```
- **Database constraints E2E integration tests**:
  ```bash
  npx jest --config apps/api/test/jest-e2e.json apps/api/test/db-integrity.e2e-spec.ts
  ```
- **Document Cancellation state machine transitions e2e tests**:
  ```bash
  npx jest --config apps/api/test/jest-e2e.json apps/api/test/workflow-transitions.e2e-spec.ts
  ```

### Manual Verification

- **Email Health Dashboard**: Verify configuration status changes dynamically and failed dispatches are reflected cleanly under `/admin/system/email-status`.
- **Dynamic Currency Formatting**: Set database currency configuration to `'AED'` and verify that all dashboard financial totals reflect `'AED'` formatting instantly.
- **Form Cancellation**: Access a draft Purchase Request, click the Cancel button, and verify the status transitions cleanly to CANCELLED in lists.

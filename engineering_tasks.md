# Engineering Implementation Tasks
## LogiRest — Production Readiness Remediation
**Source:** [Enterprise Production Readiness Audit](./enterprise_production_readiness_audit.md)
**Created:** 2026-05-25 | **Status:** OPEN

---

## Legend

| Symbol | Meaning |
|---|---|
| 🔴 | Critical — blocks production |
| 🟠 | High — must fix in Sprint 1 |
| 🟡 | Medium — hardening |
| 🔵 | Low — technical excellence |
| `[ ]` | Not started |
| `[/]` | In progress |
| `[x]` | Done |

---

## SPRINT 0 — Critical Pre-Production Blockers
> **Goal:** Clear all 10 critical blockers. Estimated: **5–7 engineering days**
> All tasks in this sprint are gate conditions for production pilot launch.

---

### TASK-001 🔴 — Wire Admin Roles UI to Real Backend API
**Audit Ref:** `C-FE-1`, `C-TEST-1`
**Priority:** CRITICAL
**Effort:** 2 days (BE: 0.5d, FE: 1d, Tests: 0.5d)

**Problem:**
`useAdminRoles.ts` returns a static `MOCK_ROLES` array with a simulated 500ms delay.
`useUpdateRolePermissions()` performs a fake mutation that never persists.
The `/admin/roles` page appears functional but changes are silently discarded.

**Affected Files:**
- `apps/web/src/features/admin/hooks/useAdminRoles.ts` — **REPLACE** mock with real API calls
- `apps/api/src/modules/admin/admin.controller.ts` — **ADD** roles endpoints
- `apps/api/src/modules/admin/admin.service.ts` — **ADD** role query logic
- `packages/shared-types/src/index.ts` — verify `Role` enum is exported

**Implementation Steps:**

**Backend:**
1. Add `GET /admin/roles` endpoint — return a structured list of all `Role` enum values, their display names, descriptions, and current user counts via `prisma.user.groupBy({ by: ['role'], _count: true })`.
2. The `Role` enum is enforced by the DB/auth layer; permission matrix is in `shared-types`. The endpoint should expose both.
3. Response type:
```ts
// packages/shared-types
export interface RoleDescriptor {
  id: Role;
  displayName: string;
  description: string;
  userCount: number;
}
```

**Frontend:**
1. Replace `MOCK_ROLES` in `useAdminRoles.ts` with `apiClient.get<RoleDescriptor[]>('/admin/roles')`.
2. Remove `await new Promise(resolve => setTimeout(resolve, 500))` fake delay.
3. `useUpdateRolePermissions()` — the role permission matrix lives in `shared-types` (not DB), so this mutation should call a real `PATCH /admin/roles/:id/permissions` endpoint if dynamic permissions are needed, OR the UI should be read-only (displaying the static matrix from `canPerformActionV2`) with a note that permissions are code-managed.
4. Remove all `MOCK_ROLES` references.

**Acceptance Criteria:**
- `[ ]` `GET /admin/roles` returns real data from DB
- `[ ]` `/admin/roles` page shows real user counts per role
- `[ ]` No `MOCK_ROLES` constant in any production file
- `[ ]` Unit test: `admin.service.spec.ts` — role list query
- `[ ]` E2E test: admin-roles.e2e-spec.ts — roles API integration

---

### TASK-002 🔴 — Fix Security Replay Attack Outbox Handler
**Audit Ref:** `C-BE-1`, `C-EMAIL-2`, `C-SEC-*`
**Priority:** CRITICAL
**Effort:** 0.5 days

**Problem:**
`rtr.service.ts` emits `SECURITY_ALERT_REPLAY_ATTACK` to the outbox on token replay detection.
`OutboxWorker.renderTemplate()` and `resolveRecipients()` have no `case` for this event type.
It falls through to `default` — dispatched to zero recipients, silently swallowed.

**Affected Files:**
- `apps/api/src/modules/outbox/outbox.worker.ts` — **ADD** case handler
- `apps/api/src/modules/outbox/email.service.ts` — **ADD** email template

**Implementation Steps:**

1. In `OutboxWorker.resolveRecipients()`:
```ts
case 'SECURITY_ALERT_REPLAY_ATTACK':
  return prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { email: true, name: true },
  });
```

2. In `OutboxWorker.renderTemplate()`:
```ts
case 'SECURITY_ALERT_REPLAY_ATTACK':
  return {
    subject: '🚨 SECURITY ALERT: Token Replay Attack Detected',
    html: `
      <h2>Security Alert — Refresh Token Replay</h2>
      <p>A refresh token replay attack was detected at <strong>${payload.timestamp}</strong>.</p>
      <p><strong>User ID:</strong> ${payload.userId}</p>
      <p><strong>Session ID:</strong> ${payload.sessionId}</p>
      <p><strong>IP Address:</strong> ${payload.ipAddress ?? 'Unknown'}</p>
      <p>All tokens for this session have been revoked. Investigate immediately.</p>
    `,
  };
```

3. Add in-system notification for ADMIN role via `NotificationService.createNotification()` inside `rtr.service.ts` after the outbox write.

**Acceptance Criteria:**
- `[ ]` Replay attack triggers email to all active ADMIN users
- `[ ]` Replay attack triggers in-system notification to ADMIN role
- `[ ]` Event no longer falls through to `default` case
- `[ ]` Unit test: `outbox.worker.spec.ts` — SECURITY_ALERT_REPLAY_ATTACK rendering
- `[ ]` E2E test: add case in `rtr.e2e-spec.ts` — verify outbox event is dispatched and template rendered

---

### TASK-003 🔴 — Fix Transfer SHIP/RECEIVE Workflow Role Validation
**Audit Ref:** `C-BE-2`, `C-WF-1`
**Priority:** CRITICAL
**Effort:** 1 day

**Problem:**
`TransferPostService.ship()` validates status by checking `transfer.status !== 'DRAFT'` directly.
`TransferPostService.receive()` checks `transfer.status !== 'IN_TRANSIT'` directly.
Both bypass `canPerformActionV2()` from shared-types, meaning future role matrix changes won't apply to transfers.

**Affected Files:**
- `apps/api/src/modules/operations/transfer-post.service.ts` — **MODIFY** ship() and receive()
- `apps/api/src/modules/workflow/workflow.service.ts` — reference for `canPerformActionV2` usage pattern

**Implementation Steps:**

1. Import `canPerformActionV2` from `@logirest/shared-types` in `transfer-post.service.ts`.
2. In `ship()`, before the status check, add:
```ts
const canShip = canPerformActionV2(
  transfer.status as TransferStatus,
  'SHIP',
  userRole,
  { documentType: DocumentType.TRANSFER }
);
if (!canShip.allowed) {
  throw new ForbiddenException(canShip.reason ?? 'You are not allowed to ship this transfer');
}
```
3. Apply the same pattern in `receive()` with action `'RECEIVE'`.
4. Keep the existing status check as a secondary guard (defense-in-depth), but the role check must come first.

**Acceptance Criteria:**
- `[ ]` `ship()` calls `canPerformActionV2` with user role before any status mutation
- `[ ]` `receive()` calls `canPerformActionV2` with user role before any status mutation
- `[ ]` A WAREHOUSE_KEEPER cannot ship if the role matrix forbids it
- `[ ]` Add test case in `workflow-roles.e2e-spec.ts` — transfer SHIP role enforcement
- `[ ]` Add test case in `workflow-roles.e2e-spec.ts` — transfer RECEIVE role enforcement

---

### TASK-004 🔴 — Add ISSUE_POSTED Outbox Event and NotificationLog
**Audit Ref:** `C-BE-*`, `C-WF-2`, `C-EMAIL-3`
**Priority:** CRITICAL
**Effort:** 0.5 days

**Problem:**
`IssuePostService.post()` performs all inventory mutations and writes StockLedger and AuditLog, but never dispatches an outbox event or creates a NotificationLog entry.
Inventory managers are completely unnotified when stock is consumed.

**Affected Files:**
- `apps/api/src/modules/operations/issue-post.service.ts` — **ADD** outbox dispatch
- `apps/api/src/modules/outbox/outbox.service.ts` — reference for `writeEvent()`
- `apps/api/src/modules/outbox/outbox.worker.ts` — **ADD** `ISSUE_POSTED` case handler
- `apps/api/src/modules/operations/operations.module.ts` — ensure `OutboxModule` is imported

**Implementation Steps:**

1. Inject `OutboxService` into `IssuePostService`.
2. At the end of `post()` (inside the transaction, after status update), add:
```ts
await this.outboxService.writeEvent(tx, 'ISSUE_POSTED', {
  issueId: issue.id,
  issueNumber: updatedIssue.issueNumber,
  warehouseId: issue.warehouseId,
  postedByUserId: userId,
  totalLines: issue.lines.length,
  timestamp: new Date().toISOString(),
});
```
3. In `OutboxWorker.resolveRecipients()`:
```ts
case 'ISSUE_POSTED':
  return prisma.user.findMany({
    where: {
      role: { in: [Role.ADMIN, Role.INV_MANAGER] },
      isActive: true,
    },
    select: { email: true, name: true },
  });
```
4. In `OutboxWorker.renderTemplate()`:
```ts
case 'ISSUE_POSTED':
  return {
    subject: `Stock Issue Posted — ${payload.issueNumber}`,
    html: `<h2>Inventory Issue Posted</h2>
      <p>Issue <strong>${payload.issueNumber}</strong> has been posted.</p>
      <p>Lines: ${payload.totalLines}</p>`,
  };
```
5. Create a `NotificationLog` entry inside the transaction targeting `INV_MANAGER` and `ADMIN` roles.

**Acceptance Criteria:**
- `[ ]` `ISSUE_POSTED` outbox event is written inside the posting transaction
- `[ ]` Outbox worker renders a template for `ISSUE_POSTED`
- `[ ]` Outbox worker resolves INV_MANAGER and ADMIN recipients
- `[ ]` NotificationLog entry created for ISSUE_POSTED
- `[ ]` Unit test in `outbox.worker.spec.ts` — ISSUE_POSTED template rendering
- `[ ]` E2E test: outbox.e2e-spec.ts — verify ISSUE_POSTED event is dispatched after issue post

---

### TASK-005 🔴 — Migrate ReconciliationJob from setTimeout to @Cron
**Audit Ref:** `C-INV-2`, `C-PERF-1`
**Priority:** CRITICAL
**Effort:** 0.5 days (+ performance refactor 1 day)

**Problem:**
`ReconciliationJob` uses `setTimeout(() => ..., delay)` to schedule itself for 01:00 AM.
If the server restarts at 00:59, the next run fires 25 hours later — a silent gap.
Additionally, the reconciliation loop is O(N) sequential transactions — 10k items = 500s runtime.

**Affected Files:**
- `apps/api/src/modules/ledger/reconciliation.job.ts` — **REFACTOR**
- `apps/api/src/app.module.ts` — verify `ScheduleModule.forRoot()` is imported (it is)

**Implementation Steps:**

**Part A — Cron Migration (CRITICAL):**
1. Remove `OnModuleInit`, `OnModuleDestroy`, `timeoutId`, and `scheduleNextRun()`.
2. Replace with `@Cron('0 1 * * *')` decorator on `runReconciliation()`:
```ts
import { Cron } from '@nestjs/schedule';

@Cron('0 1 * * *', { name: 'daily-reconciliation' })
async runReconciliation() { ... }
```
3. Keep `onModuleDestroy` only to handle graceful shutdown if needed.

**Part B — Performance Fix (HIGH, can be done in Sprint 1):**
1. Batch discrepant items: instead of one `$transaction` per discrepant item, collect all discrepancies and perform a single `updateMany` + batched `createMany` for notifications.
2. Use cursor-based pagination over `warehouseItems` (chunked by 500) to avoid loading 10k rows into memory at once.

```ts
// Batch update frozen items
await prisma.warehouseItem.updateMany({
  where: { id: { in: discrepantIds } },
  data: { isFrozen: true },
});

// Batch notifications
await prisma.notification.createMany({
  data: discrepantItems.map(item => ({ ... })),
});
```

**Acceptance Criteria:**
- `[ ]` `ReconciliationJob` uses `@Cron('0 1 * * *')` decorator
- `[ ]` No `setTimeout`, `scheduleNextRun`, `timeoutId` in the class
- `[ ]` Server restart does not cause reconciliation to be skipped
- `[ ]` (Sprint 1) Reconciliation processes items in batches of 500
- `[ ]` Unit test: `reconciliation.job.spec.ts` — verify cron fires at 01:00 (mock scheduler)

---

### TASK-006 🔴 — Fix SMTP Silent Failure — Add Delivery Transparency
**Audit Ref:** `C-BE-4`, `C-EMAIL-1`
**Priority:** CRITICAL
**Effort:** 1 day

**Problem:**
If SMTP is not configured, `EmailService.sendEmail()` returns `true` silently.
The outbox worker marks the event as `SUCCEEDED` even though no email was sent.
Operators have zero visibility that email delivery is broken.

**Affected Files:**
- `apps/api/src/modules/outbox/email.service.ts` — **MODIFY** sendEmail()
- `apps/api/src/modules/outbox/outbox.worker.ts` — **MODIFY** to handle SMTP_UNCONFIGURED result
- `apps/api/src/modules/admin/admin.controller.ts` — **ADD** `GET /admin/system/email-status`

**Implementation Steps:**

1. In `EmailService`, distinguish between "no SMTP configured" and "send success":
```ts
// Return a discriminated union
type EmailResult =
  | { ok: true }
  | { ok: false; reason: 'SMTP_UNCONFIGURED' | 'SEND_FAILED'; error?: string };

async sendEmail(to, subject, html): Promise<EmailResult> {
  if (!this.transporter) {
    this.logger.warn('SMTP not configured — email skipped');
    return { ok: false, reason: 'SMTP_UNCONFIGURED' };
  }
  try {
    await this.transporter.sendMail({ ... });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'SEND_FAILED', error: err.message };
  }
}
```

2. In `OutboxWorker.process()`:
- If result is `SMTP_UNCONFIGURED`: mark outbox event with `lastError: 'SMTP_NOT_CONFIGURED'`, status `FAILED` (or a dedicated status), and DO NOT retry (it's a config issue, not a transient failure).
- Create an admin notification: "Email system is not configured. N events failed to dispatch."

3. Add `GET /admin/system/email-status` endpoint:
```ts
{
  smtpConfigured: boolean,
  failedEventCount: number,
  lastFailureAt: Date | null
}
```

4. Add env validation warning: if `SMTP_HOST` is not set, log a `WARN` at startup.

**Acceptance Criteria:**
- `[ ]` `sendEmail()` returns discriminated result (not raw boolean)
- `[ ]` Outbox worker marks `SMTP_UNCONFIGURED` events as `FAILED` (not `SUCCEEDED`)
- `[ ]` Admin notification created when SMTP is unconfigured and an event is attempted
- `[ ]` `GET /admin/system/email-status` returns SMTP health and failed count
- `[ ]` Unit test: `email.service.spec.ts` — SMTP unconfigured returns `{ ok: false, reason: 'SMTP_UNCONFIGURED' }`
- `[ ]` Integration test: outbox worker correctly handles SMTP_UNCONFIGURED result

---

### TASK-007 🔴 — Add DB-Level Non-Negative Stock CHECK Constraints
**Audit Ref:** `C-DB-1`, `C-INV-1`
**Priority:** CRITICAL
**Effort:** 0.5 days

**Problem:**
`warehouse_items.qty_on_hand` and `warehouse_item_lots.qty_on_hand` have no database-level CHECK constraint.
Only application-level guards prevent negative stock — bypassed by direct SQL or a future code path gap.

**Affected Files:**
- `apps/api/prisma/migrations/` — **NEW** migration file
- `apps/api/prisma/schema.prisma` — verify no `Decimal` default conflict

**Implementation Steps:**

1. Create a new Prisma migration:
```bash
npx prisma migrate dev --name add_nonneg_qty_constraints
```

2. In the migration SQL file, add:
```sql
ALTER TABLE "warehouse_items"
  ADD CONSTRAINT "warehouse_items_qty_on_hand_nonneg"
  CHECK ("qty_on_hand" >= 0);

ALTER TABLE "warehouse_items"
  ADD CONSTRAINT "warehouse_items_qty_allocated_nonneg"
  CHECK ("qty_allocated" >= 0);

ALTER TABLE "warehouse_item_lots"
  ADD CONSTRAINT "warehouse_item_lots_qty_on_hand_nonneg"
  CHECK ("qty_on_hand" >= 0);
```

3. Also add CHECK on `outbox_events.status`:
```sql
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_status_valid"
  CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED'));
```

4. Verify all existing data passes before applying to production (run in transaction with rollback on any violation).

**Acceptance Criteria:**
- `[ ]` Migration applied successfully to dev, staging, and production DB
- `[ ]` `INSERT INTO warehouse_items (qty_on_hand) VALUES (-1)` fails with constraint violation
- `[ ]` `INSERT INTO warehouse_item_lots (qty_on_hand) VALUES (-1)` fails with constraint violation
- `[ ]` `outbox_events.status` rejects any value outside `PENDING/SUCCEEDED/FAILED`
- `[ ]` E2E test: `db-integrity.e2e-spec.ts` — verify negative qty insert is rejected by DB

---

### TASK-008 🔴 — Remove Hardcoded 'SAR' from Dashboard Components
**Audit Ref:** `C-FE-2`, `C-FE-3`, `CRIT-8`, `CRIT-9`
**Priority:** CRITICAL
**Effort:** 1 day

**Problem:**
Multiple production components ignore `settings.base_currency` and hardcode `'SAR'`:
- `StoreManagerDashboard.tsx:94` — `formatCurrency(stats.totalValue, 'SAR', locale)`
- `DashboardClient.tsx:27` — `baseCurrency: 'SAR'`
- `SearchClient.tsx:78` — hardcoded demo result with `'4,250 SAR', '2024-04-20'`
- `useGoodsReceipts.ts:17,133` — `supplierCurrency: 'USD'` and `'SAR'`

**Affected Files:**
- `apps/web/src/features/dashboard/components/StoreManagerDashboard.tsx`
- `apps/web/src/app/[locale]/(app)/dashboard/DashboardClient.tsx`
- `apps/web/src/app/[locale]/(app)/search/SearchClient.tsx`
- `apps/web/src/features/purchasing/api/useGoodsReceipts.ts`
- `apps/web/src/features/purchasing/components/purchase-order-form.tsx`

**Implementation Steps:**

1. **`StoreManagerDashboard.tsx`:** Use the settings hook instead of literal:
```tsx
const { data: settings } = useSettings();
const baseCurrency = settings?.base_currency ?? 'SAR';
// ...
value={formatCurrency(stats.totalValue, baseCurrency, locale as 'ar' | 'en')}
```

2. **`DashboardClient.tsx`:** Remove `baseCurrency: 'SAR'` from the default object. Read from `useSettings()`.

3. **`SearchClient.tsx`:** Remove the entire hardcoded result object:
```tsx
// REMOVE THIS:
{ metadata: { [isRtl ? 'التاريخ' : 'Date']: '2024-04-20', [isRtl ? 'الإجمالي' : 'Total']: '4,250 SAR' } }
```
Connect to the real search API endpoint, or render an empty state if search is not yet implemented.

4. **`useGoodsReceipts.ts`:**
- Remove `supplierCurrency: 'USD'` default (line 17) — fetch from the associated PO's currency.
- Remove `supplierCurrency: 'SAR' // Can be refined to fetch from PO` (line 133) — use `grn.purchaseOrder.currency.code`.

5. **`purchase-order-form.tsx`:** `baseCurrency || 'SAR'` is acceptable IF `baseCurrency` comes from settings. Verify the hook call is present.

**Acceptance Criteria:**
- `[ ]` No literal `'SAR'` in `StoreManagerDashboard.tsx` financial display
- `[ ]` No literal `'SAR'` in `DashboardClient.tsx` initialization
- `[ ]` `SearchClient.tsx` hardcoded demo record removed
- `[ ]` `useGoodsReceipts.ts` fetches supplier currency from PO data
- `[ ]` All currency displays use `settings?.base_currency` with appropriate fallback
- `[ ]` Manual QA: verify dashboard renders correctly when base_currency is 'AED'

---

### TASK-009 🔴 — Add Void/Cancellation Workflow States (Phase 1: CANCELLED for DRAFT)
**Audit Ref:** `C-WF-3`, `C-INV-4`, `CRIT-4`
**Priority:** CRITICAL — Phase 1 (VOIDED for POSTED deferred to Sprint 1)
**Effort:** 2 days

**Problem:**
No document can be voided or cancelled once created. There is no reversal path in any state machine.
This forces manual SQL intervention for any erroneous posting in production.

**Phase 1 Scope (Sprint 0):**
- Add `CANCELLED` state for DRAFT-stage documents (safe, no ledger impact)
- Stub VOIDED state in shared-types for future implementation

**Phase 2 Scope (Sprint 1 — TASK-019):**
- Full VOIDED state for POSTED documents with offsetting ledger entries

**Affected Files:**
- `packages/shared-types/src/index.ts` — **ADD** `CANCELLED` and `VOIDED` states to state machines
- `apps/api/src/modules/workflow/workflow.service.ts` — verify transitions are picked up
- `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts` — **ADD** CANCEL endpoint
- `apps/api/src/modules/purchasing/purchasing.controller.ts` — **ADD** CANCEL endpoint
- `apps/web/src/app/[locale]/(app)/(procurement)/purchase-requests/` — **ADD** Cancel button

**Implementation Steps:**

1. In `shared-types`, add `CANCELLED` to relevant status enums and state machine transitions:
```ts
// PR: DRAFT → CANCELLED (by creator or ADMIN)
// PO: DRAFT → CANCELLED (by creator or ADMIN)
// Transfer: DRAFT → CANCELLED (before SHIP)
// Adjustment: DRAFT → CANCELLED (before POST)
// Issue: DRAFT → CANCELLED (before POST)
// Kitchen Request: DRAFT → CANCELLED (before POST)
```

2. Add `CANCEL` action to `canPerformActionV2` logic for each document type.

3. Add `POST /purchase-requests/:id/cancel`, `POST /purchase-orders/:id/cancel` etc. — each calling `workflow.service.executeTransition()` with action `CANCEL`.

4. Add cancel button in frontend detail views guarded by `canPerformActionV2`.

5. VOIDED state for POSTED documents: stub the enum value, add schema migration, leave service implementation for TASK-019.

**Acceptance Criteria:**
- `[ ]` `CANCELLED` state exists in shared-types state machine for all document types at DRAFT stage
- `[ ]` `POST /:documentType/:id/cancel` endpoints exist and enforce role via `canPerformActionV2`
- `[ ]` Cancel writes ApprovalEvent and AuditLog entry
- `[ ]` Cancel button visible in frontend for eligible documents
- `[ ]` E2E test: workflow-transitions.e2e-spec.ts — DRAFT → CANCELLED transition
- `[ ]` A POSTED document cannot be cancelled (only VOIDED — Phase 2)

---

## SPRINT 1 — High Priority Post-Launch Fixes
> **Goal:** Resolve all HIGH-priority items. Estimated: **2 weeks post-pilot**

---

### TASK-010 🟠 — Persist Low-Stock Alert Debounce to Redis
**Audit Ref:** `C-BE-5`, `HIGH-1`
**Priority:** HIGH
**Effort:** 0.5 days

**Problem:**
`LowStockAlertJob.alertDebounceRegistry` is an in-memory `Map`. On any server restart, all debounce state is lost and 06:00 AM scan fires ALL low-stock alerts again.

**Affected Files:**
- `apps/api/src/jobs/low-stock-alert.job.ts` — **MODIFY** debounce storage
- `apps/api/src/app.module.ts` — verify Redis/BullMQ is available

**Implementation Steps:**
1. Inject `@InjectRedis()` or use BullMQ's underlying Redis connection to persist debounce keys.
2. Replace `this.alertDebounceRegistry.set(key, now)` with:
```ts
await this.redis.set(
  `low_stock_debounce:${debounceKey}`,
  Date.now().toString(),
  'EX', 86400 // 24 hours TTL
);
```
3. Replace `this.alertDebounceRegistry.get(key)` with:
```ts
const lastAlertTime = await this.redis.get(`low_stock_debounce:${debounceKey}`);
if (lastAlertTime && Date.now() - parseInt(lastAlertTime) < this.DEBOUNCE_DURATION_MS) continue;
```

**Acceptance Criteria:**
- `[ ]` Debounce state survives API restart
- `[ ]` Redis keys have 24-hour TTL
- `[ ]` Unit test: `low-stock-alert.job.spec.ts` — debounce persists across simulated restarts

---

### TASK-011 🟠 — Add Unique Constraint on document_sequences
**Audit Ref:** `H-DB-1`, `H-NUM-1`, `HIGH-2`
**Priority:** HIGH
**Effort:** 0.25 days

**Affected Files:**
- `apps/api/prisma/migrations/` — **NEW** migration
- `apps/api/prisma/schema.prisma` — **ADD** `@@unique` constraint

**Implementation Steps:**
1. Add to Prisma schema:
```prisma
model DocumentSequence {
  // ...
  @@unique([documentType, year, branchId])
}
```
2. Generate and apply migration.

**Acceptance Criteria:**
- `[ ]` Duplicate insert on `(documentType, year, branchId)` fails with unique constraint violation
- `[ ]` E2E test: `document-sequence` concurrent generation still produces sequential numbers

---

### TASK-012 🟠 — Add Lot-Level Cross-Check to Reconciliation Job
**Audit Ref:** `C-INV-3`, `HIGH-3`
**Priority:** HIGH
**Effort:** 1 day

**Problem:**
The daily reconciliation only checks `warehouse_items.qty_on_hand` vs `SUM(stock_ledger.quantity)`.
Lot-level balances in `warehouse_item_lots.qty_on_hand` are not verified against per-lot stock ledger sums.
A lot-level drift (correct total, wrong lot split) goes undetected.

**Affected Files:**
- `apps/api/src/modules/ledger/reconciliation.job.ts` — **ADD** lot-level check section

**Implementation Steps:**
1. After the existing item-level check, add:
```ts
// Check C: Lot-level balance vs stock ledger per lot
const lotLedgerTotals = await prisma.stockLedger.groupBy({
  by: ['warehouseId', 'itemId', 'lotId'],
  _sum: { quantity: true },
  where: { lotId: { not: null } },
});

const lotBalances = await prisma.warehouseItemLot.findMany({
  include: { lot: true, warehouse: true, item: true }
});

for (const lot of lotBalances) {
  const key = `${lot.warehouseId}_${lot.itemId}_${lot.lotId}`;
  const ledgerQty = lotLedgerMap.get(key) ?? 0;
  if (!new Prisma.Decimal(lot.qtyOnHand).equals(new Prisma.Decimal(ledgerQty))) {
    // Log warning and raise ADMIN notification (soft check — do not freeze automatically)
  }
}
```
2. Log to `reconciliation_runs` with additional `lotDiscrepanciesFound` field (requires schema migration).

**Acceptance Criteria:**
- `[ ]` Reconciliation job checks lot-level balances against per-lot stock ledger sums
- `[ ]` Lot-level discrepancy creates ADMIN notification (soft alert, not freeze)
- `[ ]` `reconciliation_runs` records lot discrepancy count

---

### TASK-013 🟠 — Validate Adjustment IN Unit Cost (Prevent Zero WAC)
**Audit Ref:** `H-INV-2`, `HIGH-4`
**Priority:** HIGH
**Effort:** 0.5 days

**Problem:**
If an Adjustment IN is posted without a `unitCost`, WAC defaults to `0`, permanently corrupting inventory valuation for that item.

**Affected Files:**
- `apps/api/src/modules/operations/adjustment-post.service.ts` — **ADD** validation
- DTO validation for adjustment lines — **ADD** `@IsPositive()` on `unitCost` for IN adjustments
- `apps/web/src/` — **ADD** unit cost field requirement in Adjustment form for type=IN

**Implementation Steps:**
1. In `adjustment-post.service.ts`, for lines with positive quantity (IN):
```ts
if (Number(line.quantity) > 0 && (!line.unitCost || Number(line.unitCost) <= 0)) {
  throw new BadRequestException(
    `Line for SKU ${item.sku}: Unit cost is required for positive (IN) adjustments`
  );
}
```
2. Add `@IsPositive()` validator on `unitCost` in the adjustment line DTO when type is `IN`.
3. In frontend, mark unit cost as required for IN adjustments.

**Acceptance Criteria:**
- `[ ]` Posting an IN adjustment with missing/zero unit cost throws 400 Bad Request
- `[ ]` Frontend form marks unit cost as required for IN adjustments
- `[ ]` Unit test: `adjustment-post.service.spec.ts` — zero-cost IN adjustment is rejected

---

### TASK-014 🟠 — Adjust Rate Limiting for Operational Endpoints
**Audit Ref:** `C-SEC-1`, `HIGH-5`
**Priority:** HIGH
**Effort:** 0.5 days

**Problem:**
Global throttle of 10 req/60s is too low for warehouse operations (barcode scanning, multi-line GRN creation).
A single GRN with 20 line items processed sequentially would hit this limit.

**Affected Files:**
- `apps/api/src/app.module.ts` — **MODIFY** ThrottlerModule config
- `apps/api/src/modules/operations/*.controller.ts` — **ADD** `@Throttle` overrides

**Implementation Steps:**
1. Update global throttle to a saner default (e.g., 60 req/60s or 100 req/60s):
```ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 60000, limit: 100 },  // General API
  { name: 'auth', ttl: 60000, limit: 10 },    // Auth endpoints only
])
```
2. Apply strict `@Throttle({ auth: { limit: 5 } })` override on `/auth/login` and `/auth/refresh`.
3. Apply relaxed `@SkipThrottle()` or high-limit override on barcode-scan-heavy endpoints like GRN line additions.

**Acceptance Criteria:**
- `[ ]` Login endpoint: max 10 req/60s
- `[ ]` General API: min 60 req/60s (or higher)
- `[ ]` A barcode-scan workflow of 30 rapid requests does not get throttled
- `[ ]` Auth endpoints remain strictly rate-limited

---

### TASK-015 🟠 — Add TRANSFER_RECEIVED NotificationLog Entry
**Audit Ref:** `H-BE-4`, `HIGH-10`
**Priority:** HIGH
**Effort:** 0.25 days

**Affected Files:**
- `apps/api/src/modules/workflow/workflow.service.ts` — **ADD** NotificationLog for TRANSFER_RECEIVED

**Implementation Steps:**
1. In `executeTransition()`, find the `case 'TRANSFER_RECEIVED'` block (or wherever the outbox event is written).
2. After the outbox write, add:
```ts
await tx.notificationLog.create({
  data: {
    targetRole: Role.ADMIN,
    warehouseId: document.fromWarehouseId,
    message: `Transfer ${document.transferNumber} received at ${document.toWarehouse.name}`,
    isRead: false,
  },
});
```

**Acceptance Criteria:**
- `[ ]` TRANSFER_RECEIVED creates a NotificationLog entry
- `[ ]` E2E test: `workflow-e2e.e2e-spec.ts` — verify notification created on receive

---

### TASK-016 🟠 — Add WAC History and Lot Trace to Frontend Reports Hub
**Audit Ref:** `H-FE-2`, `H-RPT-*`, `HIGH-7`
**Priority:** HIGH
**Effort:** 1 day

**Affected Files:**
- `apps/web/src/app/[locale]/(app)/reports/ReportsHubClient.tsx` — **ADD** entries
- `apps/web/src/app/[locale]/(app)/reports/wac-history/` — **CREATE** page
- `apps/web/src/app/[locale]/(app)/reports/lot-trace/` — **CREATE** page

**Implementation Steps:**
1. Add WAC History and Lot Trace entries to `ReportsHubClient.tsx`.
2. Create `wac-history/page.tsx`:
   - Query param: `itemId` (required), `startDate`, `endDate`
   - Call `GET /reports/wac-history?itemId=...`
   - Table: Date | SKU | Document Type | Qty | Unit Price | New WAC
   - Export button → `GET /reports/wac-history/export`
3. Create `lot-trace/page.tsx`:
   - Query param: `lotId` (required)
   - Call `GET /reports/lot-trace?lotId=...`
   - Header: Lot Number, Item SKU, Received Date, Expiry Date, Status
   - Table: Document Number | Document Type | Qty Allocated | Date | Status
   - Export button → `GET /reports/lot-trace/export`

**Acceptance Criteria:**
- `[ ]` WAC History appears in Reports Hub navigation
- `[ ]` Lot Trace appears in Reports Hub navigation
- `[ ]` Both pages load data from real API
- `[ ]` Both pages have working XLSX export buttons

---

### TASK-017 🟠 — Fix Reports Export Memory Issue (Chunked/Streamed Export)
**Audit Ref:** `H-RPT-1`, `C-PERF-2`, `HIGH-9`
**Priority:** HIGH
**Effort:** 1.5 days

**Problem:**
`exportMovements()` calls `getMovements()` with limit `'1000000'` — materializes the entire result in memory before streaming.
For a warehouse with 1M movements, this causes out-of-memory crashes.

**Affected Files:**
- `apps/api/src/modules/reports/reports.controller.ts` — **MODIFY** export methods
- `apps/api/src/modules/reports/reports.service.ts` — **EXTRACT** query logic (see TASK-018)

**Implementation Steps:**
1. Replace unlimited `take: 1000000` with cursor-based chunking:
```ts
const CHUNK_SIZE = 1000;
let lastId: string | undefined;
const allData: FormattedRow[] = [];

do {
  const chunk = await this.prisma.stockLedger.findMany({
    where,
    take: CHUNK_SIZE,
    skip: lastId ? 1 : 0,
    cursor: lastId ? { id: lastId } : undefined,
    orderBy: { postedAt: 'desc' },
    include: { item: true },
  });
  allData.push(...chunk.map(formatRow));
  lastId = chunk.length === CHUNK_SIZE ? chunk[chunk.length - 1].id : undefined;
} while (lastId);
```
2. Add a configurable export limit: `MAX_EXPORT_ROWS = parseInt(process.env.MAX_EXPORT_ROWS || '50000')`.
3. If the count exceeds the limit, return a `413 Payload Too Large` with a message to apply date filters.

**Acceptance Criteria:**
- `[ ]` No export endpoint uses `take: 1000000`
- `[ ]` Exports are chunked in batches of 1000 rows
- `[ ]` Export requests for datasets > `MAX_EXPORT_ROWS` return 413 with a helpful message
- `[ ]` Export of 10k rows completes without OOM

---

### TASK-018 🟠 — Extract ReportsService from ReportsController
**Audit Ref:** `H-BE-2`, `HIGH-8`
**Priority:** HIGH
**Effort:** 1.5 days

**Problem:**
All 1,038 lines of query logic are in `reports.controller.ts`. This violates SRP, makes unit testing impossible, and cannot be reused.

**Affected Files:**
- `apps/api/src/modules/reports/reports.controller.ts` — **EXTRACT** all query methods
- `apps/api/src/modules/reports/reports.service.ts` — **CREATE**
- `apps/api/src/modules/reports/reports.module.ts` — **ADD** provider

**Implementation Steps:**
1. Create `reports.service.ts` with all data-fetching methods (getKpis, getDashboard, getMovements, getExpiryReport, getStocktakeVariance, getProcurementStatus, getCurrencySummaries, getWacHistory, getLotTrace, getOverdueTransfersList).
2. Controller becomes thin — delegates to service, handles HTTP concerns (response headers, XLSX write, query parsing).
3. Add `reports.service.spec.ts` with unit tests.

**Acceptance Criteria:**
- `[ ]` `reports.controller.ts` contains no direct Prisma query calls
- `[ ]` `reports.service.ts` contains all query logic
- `[ ]` `reports.service.spec.ts` covers all report queries
- `[ ]` All existing report API endpoints remain functional

---

### TASK-019 🟠 — Implement VOIDED State for POSTED Documents (Phase 2)
**Audit Ref:** `C-WF-3`, `C-INV-4`
**Priority:** HIGH (deferred from Sprint 0 due to complexity)
**Effort:** 3 days

**Problem:**
Once a GRN, Issue, or Adjustment is POSTED, there is no system mechanism to reverse it. Manual SQL is the only option.

**Affected Files:**
- `packages/shared-types/src/index.ts` — **ADD** `VOIDED` states and `VOID` action
- `apps/api/src/modules/operations/grn-void.service.ts` — **CREATE**
- `apps/api/src/modules/operations/issue-void.service.ts` — **CREATE**
- `apps/api/src/modules/operations/adjustment-void.service.ts` — **CREATE**
- `apps/api/prisma/migrations/` — **ADD** VOIDED enum values
- Frontend void buttons on POSTED document detail pages

**Implementation Steps:**
1. Add `VOIDED` to status enums in shared-types and Prisma schema.
2. Create void services with offsetting ledger entries:
   - GRN void: creates negative StockLedger entries for each GRN line (reversal)
   - Recalculates WAC by subtracting the received cost
   - Creates CostLedger entry with negative quantity
3. Void is ADMIN-only action.
4. Void writes AuditLog, ApprovalEvent, and creates VOIDED NotificationLog.
5. Voided documents are read-only; no further transitions possible.

**Acceptance Criteria:**
- `[ ]` `VOIDED` state exists in state machine for GRN, Issue, Adjustment, Transfer
- `[ ]` `POST /:documentType/:id/void` endpoint exists and is ADMIN-only
- `[ ]` Void creates offsetting StockLedger and CostLedger entries
- `[ ]` WAC is recalculated after GRN void
- `[ ]` E2E test: GRN POST → VOID → verify StockLedger net zero
- `[ ]` E2E test: Issue POST → VOID → verify stock restored

---

## SPRINT 2-3 — Medium Priority Hardening
> **Goal:** System hardening, observability, security depth. Estimated: **3–4 weeks**

---

### TASK-020 🟡 — Add SMTP Runtime Configuration Admin UI
**Audit Ref:** `C-BE-4`, `C-EMAIL-1` (Phase 2)
**Priority:** MEDIUM
**Effort:** 1.5 days

**Implementation:**
1. `POST /admin/settings/smtp` — saves SMTP config to DB `system_settings` table (encrypted at rest).
2. `EmailService` reads from DB on startup (with env var fallback).
3. Frontend: Admin → Settings → Email Configuration panel.

**Acceptance Criteria:**
- `[ ]` SMTP settings configurable via Admin UI without server restart
- `[ ]` SMTP settings stored encrypted in DB
- `[ ]` "Test Email" button in UI sends a test email and shows result

---

### TASK-021 🟡 — Add CSRF Protection on Mutating Endpoints
**Audit Ref:** `C-SEC-2`
**Priority:** MEDIUM
**Effort:** 1 day

**Implementation:**
1. Implement double-submit cookie CSRF pattern or use `csurf`/`nestjs-csrf`.
2. Apply CSRF middleware to all `POST`, `PATCH`, `PUT`, `DELETE` routes.
3. Frontend: include CSRF token in all state-mutating requests.

---

### TASK-022 🟡 — Add Login Failure Audit Logging
**Audit Ref:** `H-SEC-3`
**Priority:** MEDIUM
**Effort:** 0.5 days

**Affected Files:**
- `apps/api/src/auth/auth.service.ts` — **ADD** audit log on failed login

**Implementation:**
```ts
// On failed login:
await this.prisma.auditLog.create({
  data: {
    userId: user?.id ?? null,
    action: 'LOGIN_FAILED',
    targetTable: 'users',
    targetId: user?.id ?? email,
    ipAddress,
    beforeStateJson: JSON.stringify({ email, reason: 'invalid_password' }),
    afterStateJson: JSON.stringify({ attempt: 'FAILED' }),
  }
});
```

**Acceptance Criteria:**
- `[ ]` Failed login attempts recorded in `audit_logs`
- `[ ]` Includes IP address, email attempted, timestamp

---

### TASK-023 🟡 — Add Failed Outbox Event Requeue UI
**Audit Ref:** `H-OBS-4`
**Priority:** MEDIUM
**Effort:** 1 day

**Implementation:**
1. `GET /admin/outbox/failed` — list all `FAILED` outbox events with details.
2. `POST /admin/outbox/:id/retry` — resets status to `PENDING`, clears `attempts` counter.
3. Frontend: Admin → Outbox Monitoring panel.

---

### TASK-024 🟡 — Add Frozen Items Dashboard
**Audit Ref:** `H-OBS-3`
**Priority:** MEDIUM
**Effort:** 0.5 days

**Implementation:**
1. `GET /admin/inventory/frozen` — list all `isFrozen: true` items with warehouse, last reconciliation discrepancy, and freeze timestamp.
2. `POST /admin/inventory/:id/unfreeze` — ADMIN-only; unfreezes and writes AuditLog.
3. Frontend: Admin → Inventory Integrity panel.

---

### TASK-025 🟡 — Add Quarantine Lot Management UI
**Audit Ref:** `H-INV-1`
**Priority:** MEDIUM
**Effort:** 1 day

**Implementation:**
1. `PATCH /lots/:id/quarantine` and `PATCH /lots/:id/release-quarantine` — ADMIN/INV_MANAGER.
2. Frontend: Lot detail view — quarantine status badge + action buttons.

---

### TASK-026 🟡 — Parameterize seed.prod.ts for Multi-Client Deployment
**Audit Ref:** `C-DB-3`
**Priority:** MEDIUM
**Effort:** 0.5 days

**Affected Files:**
- `apps/api/prisma/seed.prod.ts`

**Implementation:**
Replace hardcoded SAR/USD values with env vars:
```ts
const BASE_CURRENCY_CODE = process.env.BASE_CURRENCY_CODE || 'SAR';
const BASE_CURRENCY_NAME = process.env.BASE_CURRENCY_NAME || 'Saudi Riyal';
```
Remove hardcoded FX rates — they should be entered via admin UI post-deployment.

---

### TASK-027 🟡 — Add Branch-Aware XLSX Report Headers
**Audit Ref:** `H-RPT-4`
**Priority:** MEDIUM
**Effort:** 0.5 days

**Affected Files:**
- `apps/api/src/modules/reports/reports.controller.ts` — **MODIFY** `generateXlsxResponse()`

**Implementation:**
1. Accept `branchName` and `warehouseName` as parameters to `generateXlsxResponse()`.
2. Add these to row 1/2 of the XLSX alongside "LogiRest Inventory Management System".

---

### TASK-028 🟡 — Add Expiry Warning Scheduled Job
**Audit Ref:** Missing automation, `H-EMAIL-3`
**Priority:** MEDIUM
**Effort:** 1 day

**Implementation:**
1. New job `expiry-alert.job.ts` with `@Cron('0 7 * * *')` (07:00 AM daily).
2. Queries `warehouse_item_lots` where `expiryDate` within 7 days.
3. Dispatches `EXPIRY_WARNING` outbox event per warehouse.
4. Debounce using Redis keys (same pattern as TASK-010).

---

### TASK-029 🟡 — Add Prisma Middleware for Soft-Delete Enforcement
**Audit Ref:** `H-BE-3`
**Priority:** MEDIUM
**Effort:** 1 day

**Affected Files:**
- `apps/api/src/database/prisma.service.ts` — **ADD** middleware

**Implementation:**
```ts
this.$use(async (params, next) => {
  const softDeleteModels = ['Item', 'Supplier', 'Warehouse', 'User'];
  if (softDeleteModels.includes(params.model) && params.action === 'findMany') {
    params.args = params.args ?? {};
    params.args.where = { ...params.args.where, isActive: true };
  }
  return next(params);
});
```

---

### TASK-030 🟡 — Add CI Schema Drift Check
**Audit Ref:** `C-DB-4`
**Priority:** MEDIUM
**Effort:** 0.5 days

**Implementation:**
Add to CI pipeline (GitHub Actions or equivalent):
```yaml
- name: Check Prisma schema drift
  run: npx prisma migrate status
  env:
    DATABASE_URL: ${{ secrets.CI_DATABASE_URL }}
```
Fail CI if pending migrations exist in a staging environment.

---

### TASK-031 🟡 — Add WAC Consistency Verification Job
**Audit Ref:** Runtime integrity, `H-TEST-1`
**Priority:** MEDIUM
**Effort:** 1 day

**Implementation:**
1. Weekly `@Cron('0 2 * * 0')` (02:00 AM Sunday) job.
2. Computes `SUM(cost_ledger.quantity * cost_ledger.unit_price)` vs `warehouse_items.qty_on_hand * warehouse_items.wac` per item.
3. Flags items where the cost model diverges by > 0.01%.
4. Creates ADMIN notification and logs to a new `cost_integrity_runs` table.

---

## SPRINT 4+ — Low Priority Technical Excellence

---

### TASK-032 🔵 — Add OpenTelemetry Distributed Tracing
**Audit Ref:** `H-OBS-1`
**Priority:** LOW
**Effort:** 2 days

Propagate `x-correlation-id` through BullMQ worker context. Instrument Prisma queries with OpenTelemetry spans.

---

### TASK-033 🔵 — Add Prometheus Metrics Endpoint
**Audit Ref:** `H-OBS-2`
**Priority:** LOW
**Effort:** 1.5 days

Expose `/metrics` with:
- `logirest_posting_operations_total` (counter by document_type)
- `logirest_warehouse_locks_active` (gauge)
- `logirest_reconciliation_discrepancies_total` (counter)
- `logirest_outbox_events_failed_total` (counter)

---

### TASK-034 🔵 — Add Document Numbering Race Condition E2E Test
**Audit Ref:** `C-TEST-2`
**Priority:** LOW
**Effort:** 0.5 days

Concurrent document creation test: 20 parallel requests for PR creation in same branch/year — verify all receive unique sequential numbers.

---

### TASK-035 🔵 — Add WAC Accuracy E2E Test
**Audit Ref:** `H-TEST-1`
**Priority:** LOW
**Effort:** 0.5 days

Full flow test: GRN POST (price X, qty Y) → Issue POST → Transfer → verify WAC at each step.

---

### TASK-036 🔵 — Reconciliation Job E2E Integration Test
**Audit Ref:** `H-TEST-2`
**Priority:** LOW
**Effort:** 0.5 days

Deliberately inject drift (update `qty_on_hand` directly in test DB), trigger reconciliation, verify item is frozen and notification created.

---

### TASK-037 🔵 — API Versioning and Deprecation Strategy
**Audit Ref:** `C-SEC-4`
**Priority:** LOW
**Effort:** 1 day

Document the versioning contract. Add `Deprecation` and `Sunset` headers to endpoints planned for v2. Implement forwarding from `/api/v1` legacy routes.

---

### TASK-038 🔵 — DB Archival Policy for Audit Logs and Stock Ledger
**Audit Ref:** `H-DB-3`
**Priority:** LOW
**Effort:** 1 day

Define and document retention policy. Implement `@Cron('0 3 1 * *')` monthly archival job that moves `audit_logs` and `stock_ledger` older than 2 years to an `_archive` table or exports to cold storage.

---

### TASK-039 🔵 — Add Redis Health Check to /health Endpoint
**Audit Ref:** Deployment risks
**Priority:** LOW
**Effort:** 0.25 days

**Affected Files:**
- `apps/api/src/health/health.controller.ts`

Add Redis connectivity check (BullMQ queue ping) to the existing health endpoint response.

---

## SUMMARY TABLE

| Task | Sprint | Priority | Area | Effort | Status |
|---|---|---|---|---|---|
| TASK-001 Admin Roles API | S0 | 🔴 CRIT | FE+BE | 2d | `[ ]` |
| TASK-002 Replay Attack Handler | S0 | 🔴 CRIT | BE | 0.5d | `[ ]` |
| TASK-003 Transfer Role Validation | S0 | 🔴 CRIT | BE | 1d | `[ ]` |
| TASK-004 ISSUE_POSTED Outbox | S0 | 🔴 CRIT | BE | 0.5d | `[ ]` |
| TASK-005 Reconciliation Cron | S0 | 🔴 CRIT | BE | 0.5d | `[ ]` |
| TASK-006 SMTP Transparency | S0 | 🔴 CRIT | BE | 1d | `[ ]` |
| TASK-007 DB Qty CHECK Constraints | S0 | 🔴 CRIT | DB | 0.5d | `[ ]` |
| TASK-008 Remove Hardcoded SAR | S0 | 🔴 CRIT | FE | 1d | `[ ]` |
| TASK-009 Void/Cancel Phase 1 | S0 | 🔴 CRIT | BE+FE | 2d | `[ ]` |
| TASK-010 Redis Debounce | S1 | 🟠 HIGH | BE | 0.5d | `[ ]` |
| TASK-011 DocSeq Unique Constraint | S1 | 🟠 HIGH | DB | 0.25d | `[ ]` |
| TASK-012 Lot-Level Reconciliation | S1 | 🟠 HIGH | BE | 1d | `[ ]` |
| TASK-013 Adjustment Zero WAC Guard | S1 | 🟠 HIGH | BE+FE | 0.5d | `[ ]` |
| TASK-014 Rate Limit Adjustment | S1 | 🟠 HIGH | BE | 0.5d | `[ ]` |
| TASK-015 TRANSFER_RECEIVED Notif | S1 | 🟠 HIGH | BE | 0.25d | `[ ]` |
| TASK-016 WAC History + Lot Trace UI | S1 | 🟠 HIGH | FE | 1d | `[ ]` |
| TASK-017 Chunked Export | S1 | 🟠 HIGH | BE | 1.5d | `[ ]` |
| TASK-018 ReportsService Extract | S1 | 🟠 HIGH | BE | 1.5d | `[ ]` |
| TASK-019 Void POSTED Documents | S1 | 🟠 HIGH | BE+FE | 3d | `[ ]` |
| TASK-020 SMTP Admin UI | S2 | 🟡 MED | FE+BE | 1.5d | `[ ]` |
| TASK-021 CSRF Protection | S2 | 🟡 MED | BE | 1d | `[ ]` |
| TASK-022 Login Failure Audit | S2 | 🟡 MED | BE | 0.5d | `[ ]` |
| TASK-023 Outbox Requeue UI | S2 | 🟡 MED | FE+BE | 1d | `[ ]` |
| TASK-024 Frozen Items Dashboard | S2 | 🟡 MED | FE+BE | 0.5d | `[ ]` |
| TASK-025 Quarantine Lot UI | S2 | 🟡 MED | FE+BE | 1d | `[ ]` |
| TASK-026 Parameterize seed.prod.ts | S2 | 🟡 MED | BE | 0.5d | `[ ]` |
| TASK-027 Branch-Aware XLSX Headers | S2 | 🟡 MED | BE | 0.5d | `[ ]` |
| TASK-028 Expiry Warning Job | S2 | 🟡 MED | BE | 1d | `[ ]` |
| TASK-029 Soft-Delete Middleware | S3 | 🟡 MED | BE | 1d | `[ ]` |
| TASK-030 CI Schema Drift Check | S3 | 🟡 MED | DevOps | 0.5d | `[ ]` |
| TASK-031 WAC Consistency Job | S3 | 🟡 MED | BE | 1d | `[ ]` |
| TASK-032 OpenTelemetry Tracing | S4 | 🔵 LOW | BE | 2d | `[ ]` |
| TASK-033 Prometheus Metrics | S4 | 🔵 LOW | BE | 1.5d | `[ ]` |
| TASK-034 DocNum Race E2E Test | S4 | 🔵 LOW | Test | 0.5d | `[ ]` |
| TASK-035 WAC Accuracy E2E Test | S4 | 🔵 LOW | Test | 0.5d | `[ ]` |
| TASK-036 Reconciliation E2E Test | S4 | 🔵 LOW | Test | 0.5d | `[ ]` |
| TASK-037 API Versioning Strategy | S4 | 🔵 LOW | BE | 1d | `[ ]` |
| TASK-038 DB Archival Policy | S4 | 🔵 LOW | DB | 1d | `[ ]` |
| TASK-039 Redis Health Check | S4 | 🔵 LOW | BE | 0.25d | `[ ]` |

---

## SPRINT 0 EFFORT SUMMARY

| Area | Tasks | Estimated Days |
|---|---|---|
| Backend | TASK-002, 003, 004, 005, 006 | 3.5d |
| Database | TASK-007 | 0.5d |
| Frontend | TASK-001 (FE part), 008 | 2d |
| Full-Stack | TASK-001 (BE), TASK-009 | 2.5d |
| **Total Sprint 0** | **9 tasks** | **~8.5d** |

**Recommended Sprint 0 Team:**
- 1 Backend Engineer (TASK-002, 003, 004, 005, 006, 007)
- 1 Frontend Engineer (TASK-008)
- 1 Full-Stack / Tech Lead (TASK-001, 009)
- Timeline: **1 week**

---

*Tasks generated from: [enterprise_production_readiness_audit.md](./enterprise_production_readiness_audit.md)*
*Last updated: 2026-05-25*

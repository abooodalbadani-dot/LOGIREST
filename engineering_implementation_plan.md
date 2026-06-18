# LogiRest — Phased Engineering Implementation Plan
**Source:** [Master Architectural Audit Report](master_audit_report.md)  
**Prepared:** 2026-06-18  
**Total Gaps Addressed:** 38 (13 Critical · 18 Medium · 7 Low)  
**Execution Model:** Sequential phases, tasks within each phase can be parallelized by domain

---

> [!CAUTION]
> **Phase 0 MUST be completed and deployed before any other phase begins.** It fixes active security vulnerabilities. Running Phase 1+ without Phase 0 means financial fixes are deployed to an endpoint still accessible by unauthorized roles.

---

## Phasing Strategy

| Phase | Name | Priority Driver | Estimated Scope |
|-------|------|-----------------|-----------------|
| **0** | Security Hardening | Active authentication/authorization vulnerabilities | 5 tasks |
| **1** | Financial Integrity | Incorrect money calculations corrupting live data | 7 tasks |
| **2** | Workflow Completeness | Dead-end state traps and broken lifecycle endpoints | 10 tasks |
| **3** | Data Quality & UI Completion | Schema field gaps, UI action bars, performance indexes | 16 tasks |

---

---

# PHASE 0 — Security Hardening
**Priority:** 🔴 IMMEDIATE — Deploy before any other change  
**Objective:** Close active RBAC holes that allow any authenticated user to mutate procurement state. These are zero-effort exploits for any logged-in user.

---

## Task 0.1 — Harden `RolesGuard` to Default-Deny

**Audit Reference:** Task 4.1.1  
**Severity:** 🔴 Critical  
**File:** `apps/api/src/auth/guards/roles.guard.ts`

### Problem
Lines 23–25 implement **default-allow**: if no `@Roles()` decorator is present on an endpoint, `RolesGuard` returns `true` for any authenticated user. This means every undecorated endpoint is open to all roles including `VIEWER` and `AUDITOR`.

### Implementation Steps

**Step 1 — Create `@AllRoles()` decorator**

Create file: `apps/api/src/auth/decorators/all-roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
export const ALL_ROLES_KEY = 'all_roles';
export const AllRoles = () => SetMetadata(ALL_ROLES_KEY, true);
```

**Step 2 — Modify `roles.guard.ts`**

Replace the current permissive default with a strict default-deny, checking first for the `@AllRoles()` opt-in:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ALL_ROLES_KEY } from '../decorators/all-roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Explicit opt-in for endpoints open to all authenticated users
    const isAllRoles = this.reflector.getAllAndOverride<boolean>(ALL_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isAllRoles) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // DEFAULT-DENY: no @Roles() and no @AllRoles() → reject
    if (!requiredRoles || requiredRoles.length === 0) {
      const request = context.switchToHttp().getRequest<{ method: string; url: string }>();
      this.logger.error(
        `[SECURITY] Endpoint has no @Roles() or @AllRoles() decorator. ` +
        `Method: ${request.method} | Path: ${request.url}. ` +
        `Defaulting to DENY. Add @Roles() or @AllRoles() explicitly.`,
      );
      throw new ForbiddenException('This endpoint requires explicit role authorization.');
    }

    const request = context.switchToHttp().getRequest<{ user?: { role: Role }; method: string; url: string }>();
    const user = request.user;
    if (!user) return false;

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `Unauthorized access attempt. Role: ${user.role} | Method: ${request.method} | Path: ${request.url}`,
      );
      throw new ForbiddenException('You do not have the required role to access this resource.');
    }
    return true;
  }
}
```

**Step 3 — Audit sweep: add `@AllRoles()` to all read-only `@Get()` endpoints**

After deploying the default-deny guard, **every undecorated `@Get()` endpoint will begin throwing 403**. You must immediately add `@AllRoles()` to all read endpoints that are intentionally open to all roles. Run this sweep across all controllers in `apps/api/src/modules/`:

Affected controllers (all `@Get()` and `@Get(':id')` endpoints):
- `grn.controller.ts` — `findAll`, `findOne`
- `po.controller.ts` — `findAll`, `findOne`
- `purchase-requests.controller.ts` — `findAll`, `findOne`
- `issues.controller.ts` — `findAll`, `findOne`
- `adjustments.controller.ts` — `findAll`, `getSummary`, `findOne`
- `transfers.controller.ts` — `findAll`, `findOne`
- `stocktake.controller.ts` — all `@Get()` endpoints
- `items.controller.ts` — `findAll`, `findOne`
- All master-data controllers — `findAll`, `findOne`

**Pattern to apply:**
```typescript
// Before:
@Get()
async findAll(...) { ... }

// After:
@Get()
@AllRoles()
async findAll(...) { ... }
```

### Acceptance Criteria
- [ ] A request from a `VIEWER` to `GET /procurement/grns` returns 200.
- [ ] A request from a `VIEWER` to `POST /procurement/purchase-requests/:id/submit` returns 403.
- [ ] A request from an unauthenticated user to any endpoint returns 401 (JwtAuthGuard).
- [ ] A new `@Post()` endpoint added without `@Roles()` causes a server-side ERROR log and returns 403 — no silent pass-through.

---

## Task 0.2 — Add `@Roles()` to All PR Workflow Mutation Endpoints

**Audit Reference:** Task 1.1.3  
**Severity:** 🔴 Critical  
**File:** `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts`

### Problem
`POST /:id/submit`, `/:id/approve`, `/:id/reject`, `/:id/cancel`, `/:id/convert-to-po` have no `@Roles()` decorators. After Task 0.1 defaults to deny, these will all 403. They need explicit role lists added NOW (before or together with 0.1).

### Implementation Steps

Apply the following `@Roles()` decorators matching the `transitionMapV2` `allowedRoles` in `document-engine.ts` exactly:

```typescript
// POST /:id/submit (line 281)
@Roles(Role.ADMIN, Role.PROC_OFFICER, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'pr', action: 'SUBMIT', modelName: 'purchaseRequest' })

// POST /:id/approve (line 309)
@Roles(Role.ADMIN, Role.APPROVER, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'pr', action: 'APPROVE', modelName: 'purchaseRequest' })

// POST /:id/reject (line 337)
@Roles(Role.ADMIN, Role.APPROVER, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'pr', action: 'REJECT', modelName: 'purchaseRequest' })

// POST /:id/cancel (line 365)
@Roles(Role.ADMIN, Role.PROC_OFFICER, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'pr', action: 'CANCEL', modelName: 'purchaseRequest' })

// POST /:id/convert-to-po (line 393)
@Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'pr', action: 'CONVERT_TO_PO', modelName: 'purchaseRequest' })
```

> [!IMPORTANT]
> The `@Roles()` decorator must come **before** `@UseGuards(WorkflowStateGuard)` in the decorator stack. NestJS evaluates method-level guards in **bottom-up** order, meaning the last-declared decorator runs first. Placing `@Roles()` last (closest to the method) ensures it runs after `JwtAuthGuard` but before `WorkflowStateGuard`, avoiding the DB fetch for unauthorized users.

### Acceptance Criteria
- [ ] `VIEWER` calling `POST /procurement/purchase-requests/:id/submit` → 403.
- [ ] `PROC_OFFICER` calling `POST /procurement/purchase-requests/:id/submit` → 200 (if status allows).
- [ ] `PROC_OFFICER` calling `POST /procurement/purchase-requests/:id/approve` → 403.

---

## Task 0.3 — Add `@Roles()` to All PO Workflow Mutation Endpoints

**Audit Reference:** Task 1.2.1  
**Severity:** 🔴 Critical  
**File:** `apps/api/src/modules/purchasing/purchase-orders/po.controller.ts`

### Problem
Same as Task 0.2 but for PO workflow endpoints. `submit`, `approve`, `reject`, `cancel` all lack `@Roles()`.

### Implementation Steps

```typescript
// POST /:id/submit
@Roles(Role.ADMIN, Role.PROC_OFFICER, Role.INV_MGR, Role.PROC_MGR, Role.BRANCH_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'po', action: 'SUBMIT', modelName: 'purchaseOrder' })

// POST /:id/approve
@Roles(Role.ADMIN, Role.APPROVER, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'po', action: 'APPROVE', modelName: 'purchaseOrder' })

// POST /:id/reject
@Roles(Role.ADMIN, Role.APPROVER, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'po', action: 'REJECT', modelName: 'purchaseOrder' })

// POST /:id/cancel
@Roles(Role.ADMIN, Role.PROC_OFFICER, Role.INV_MGR, Role.PROC_MGR, Role.BRANCH_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'po', action: 'CANCEL', modelName: 'purchaseOrder' })
```

### Acceptance Criteria
- [ ] `PROC_OFFICER` calling `POST /procurement/purchase-orders/:id/approve` → 403.
- [ ] `APPROVER` calling `POST /procurement/purchase-orders/:id/approve` → 200 (if in SUBMITTED state).

---

## Task 0.4 — Lock Master Data Mutation Endpoints

**Audit Reference:** Task 3.1.3  
**Severity:** 🔴 Critical  
**Files:** Categories, UoM, Branches, Departments controllers

### Problem
Master data controllers (`categories`, `uom`, `branches`, `departments`) have no `@Roles()` on their mutation endpoints (POST/PUT/DELETE). Any authenticated user can create or corrupt reference data.

### Implementation Steps

**For each of the following controllers, add `@Roles(Role.ADMIN, Role.GM)` to all `@Post()`, `@Put()`, and `@Delete()` handlers:**

1. `apps/api/src/modules/master-data/categories/categories.controller.ts`
2. `apps/api/src/modules/master-data/units-of-measure/uom.controller.ts`
3. `apps/api/src/modules/master-data/branches/branches.controller.ts`
4. `apps/api/src/modules/master-data/departments/departments.controller.ts`
5. `apps/api/src/modules/master-data/suppliers/suppliers.controller.ts` (if exists)
6. `apps/api/src/modules/master-data/warehouses/warehouses.controller.ts` (if exists)

**Add `@AllRoles()` to all `@Get()` endpoints in these same controllers.**

**Also update `ItemsController`** (`items.controller.ts`):
- `@Post()` and `@Put(':id')` → `@Roles(Role.ADMIN, Role.GM, Role.INV_MGR, Role.STORE_MGR)`
- `@Delete(':id')` → `@Roles(Role.ADMIN, Role.GM)`
- `@Get()` and `@Get(':id')` → `@AllRoles()`

**Remove the undocumented alias** from `ItemsController`:
```typescript
// Before:
@Controller(['items', 'master-data/items'])

// After:
@Controller('master-data/items')
```

Update any frontend calls to `/api/items` → `/api/master-data/items`.

### Acceptance Criteria
- [ ] `VIEWER` calling `POST /master-data/categories` → 403.
- [ ] `INV_MGR` calling `POST /master-data/items` → 200.
- [ ] `INV_MGR` calling `DELETE /master-data/items/:id` → 403.
- [ ] `/api/items` no longer routes to the items controller (404 or redirect).

---

## Task 0.5 — Verify `ScopeValidationService` Handles `PROC_OFFICER` Role

**Audit Reference:** Task 5.2.2  
**Severity:** 🟡 Medium (blocking for PROC_OFFICER users)  
**File:** `apps/api/src/auth/scope-validation.service.ts`

### Problem
`PROC_OFFICER` users may receive empty GRN lists because `ScopeValidationService.validateWarehouse()` may not whitelist this role for fallback to branch-level scope.

### Implementation Steps

1. Open `apps/api/src/auth/scope-validation.service.ts` and locate the method `validateWarehouse`.
2. Identify the `ADMIN_ROLES` or equivalent constant that bypasses strict warehouse scope checking.
3. Ensure `Role.PROC_OFFICER` is included in this set, alongside `Role.PROC_MGR` and `Role.INV_MGR`.
4. Verify that if no `UserWarehouseScope` record exists for a `PROC_OFFICER`, the service falls back to branch-level scope using `branchId` from the user's profile — not returning an empty result or throwing 403.
5. Add a seed step in `prisma/seed.ts` that creates a `UserWarehouseScope` record for each `PROC_OFFICER` user at their primary warehouse during user creation.

### Acceptance Criteria
- [ ] A `PROC_OFFICER` user with no `UserWarehouseScope` row can list GRNs (returns branch-scoped results).
- [ ] A `PROC_OFFICER` user with a `UserWarehouseScope` row sees only that warehouse's GRNs.

---

---

# PHASE 1 — Financial Integrity
**Priority:** 🔴 HIGH — Deploy as second release, directly after Phase 0  
**Objective:** Fix all financial calculation errors that are producing wrong monetary values in live data. Every day this is delayed, WAC records accumulate incorrect cost history.

---

## Task 1.1 — Fix GRN WAC Calculation to Apply FX Rate Conversion

**Audit Reference:** Task 1.3.4  
**Severity:** 🔴 Critical — Financial  
**Files:** `apps/api/src/modules/purchasing/grn-post.service.ts`, `apps/api/src/modules/ledger/wac.service.ts`

### Problem
`grn-post.service.ts` computes WAC using `Number(line.unitPrice)` which is in the PO's **foreign currency** (e.g., USD). No FX rate conversion is applied. All WAC records for foreign-currency POs are storing values in the wrong currency unit.

### Implementation Steps

**Step 1 — Add FX rate lookup inside the GRN post transaction**

In `grn-post.service.ts`, within the `$transaction` callback, after fetching the GRN, add:

```typescript
// Fetch the PO and its currency
const po = await tx.purchaseOrder.findUnique({
  where: { id: grn.poId },
  include: { currency: true },
});

// Fetch the active FX rate for this currency → base currency
// (Assumes an FXRate table exists; adjust model name if different)
const appSettings = await tx.applicationSettings.findFirst({
  select: { baseCurrencyId: true },
});

let fxRate = new Prisma.Decimal(1); // default: base currency PO

if (po?.currencyId && appSettings?.baseCurrencyId && po.currencyId !== appSettings.baseCurrencyId) {
  const fxRecord = await tx.fXRate.findFirst({
    where: {
      fromCurrencyId: po.currencyId,
      toCurrencyId: appSettings.baseCurrencyId,
    },
    orderBy: { effectiveDate: 'desc' },
  });
  if (!fxRecord) {
    throw new BadRequestException(
      `No FX rate found for currency ${po.currency?.code ?? po.currencyId} to base currency. ` +
      `Please add an exchange rate before posting this GRN.`,
    );
  }
  fxRate = new Prisma.Decimal(fxRecord.rate);
}
```

**Step 2 — Apply FX rate to unit price before WAC calculation**

Replace the raw `Number(line.unitPrice)` usage in the WAC recalculation section:

```typescript
// Before:
const unitPriceBase = Number(line.unitPrice);

// After:
const unitPriceForeign = new Prisma.Decimal(line.unitPrice);
const unitPriceBase = unitPriceForeign.mul(fxRate).toDecimalPlaces(4);
```

**Step 3 — Store both `unitPriceForeign` and `unitPriceBase` on `GRNLine`**

Add fields to the schema (part of Task 1.2 migration):
```prisma
model GRNLine {
  // ... existing fields ...
  unitPrice        Decimal   @db.Decimal(18, 4)   // kept for backwards compat — stores foreign price
  unitPriceForeign Decimal?  @db.Decimal(18, 4)   // explicit foreign currency price
  unitPriceBase    Decimal?  @db.Decimal(18, 4)   // converted to base currency using fxRate at time of posting
}
```

Update the GRN post service to write both fields when posting:
```typescript
await tx.gRNLine.update({
  where: { id: line.id },
  data: {
    unitPriceForeign: unitPriceForeign,
    unitPriceBase: unitPriceBase,
  },
});
```

**Step 4 — Pass base-currency price to WAC service**

```typescript
// In wac.service.ts recalculate() call:
await this.wacService.recalculate(
  tx,
  grn.warehouseId,
  line.itemId,
  qtyReceived,
  unitPriceBase, // ← base currency, NOT foreign
  grn.id,
  DocumentType.GOODS_RECEIVED_NOTE,
);
```

### Data Migration Note
> [!WARNING]
> Existing posted GRNs have WAC values calculated without FX conversion. After deploying this fix, run a reconciliation script (`scripts/reconcile-wac-fx.ts`) to identify affected records. **Do not auto-correct live WAC values** — surface them to the finance team for manual review and adjustment documents.

### Acceptance Criteria
- [ ] A GRN posted on a USD PO at FX rate 3.75 stores `unitPriceBase = unitPrice × 3.75`.
- [ ] A GRN posted on a base-currency PO stores `unitPriceBase = unitPrice × 1.0` (unchanged).
- [ ] If no FX rate exists for the PO currency, `POST /procurement/grns/:id/submit` returns 400 with a clear message.
- [ ] `CostLedger` entries for new GRN posts show base-currency values.

---

## Task 1.2 — Add Missing Schema Fields to `GoodsReceivedNote` and `GRNLine`

**Audit Reference:** Tasks 1.3.2, 1.3.3  
**Severity:** 🔴 Critical (financial) + 🟡 Medium (audit)  
**File:** `apps/api/prisma/schema.prisma`

### Problem
`GoodsReceivedNote` is missing: `notes`, `createdById`, `postedAt`, `fxRate` (stored FX rate snapshot).  
`GRNLine` is missing: `unitPriceForeign`, `unitPriceBase`.

### Implementation Steps

**Step 1 — Update `schema.prisma`**

```prisma
model GoodsReceivedNote {
  id             String   @id @default(cuid())
  grnNumber      String   @unique
  poId           String
  warehouseId    String
  status         String   @default("DRAFT")
  // ── NEW FIELDS ──────────────────────────────
  notes          String?
  createdById    String?
  createdBy      User?    @relation("GRNCreatedBy", fields: [createdById], references: [id])
  postedAt       DateTime?
  fxRate         Decimal? @db.Decimal(18, 6)   // FX rate snapshot at time of GRN creation (foreign → base)
  fxRateCapturedAt DateTime?                   // Timestamp when the FX rate was captured
  // ────────────────────────────────────────────
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  version        Int      @default(0)
  lines          GRNLine[]
  purchaseOrder  PurchaseOrder @relation(fields: [poId], references: [id])
  warehouse      Warehouse     @relation(fields: [warehouseId], references: [id])
  approvalEvents ApprovalEvent[]

  @@map("goods_received_notes")
}

model GRNLine {
  // ... existing fields ...
  unitPrice        Decimal  @db.Decimal(18, 4)   // foreign currency (original, kept for compatibility)
  unitPriceForeign Decimal? @db.Decimal(18, 4)   // explicit: price in PO currency
  unitPriceBase    Decimal? @db.Decimal(18, 4)   // price converted to base currency at time of post

  @@map("grn_lines")
}
```

**Step 2 — Generate migration**

```bash
cd apps/api
npx prisma migrate dev --name add_grn_audit_fields
```

**Step 3 — Update `grn.service.ts#create`**

Capture FX rate at creation time:
```typescript
// After fetching PO currency, look up FX rate:
const fxRateRecord = await this.lookupFxRate(tx, po.currencyId, baseCurrencyId);
const fxRateValue = fxRateRecord?.rate ?? 1;

return tx.goodsReceivedNote.create({
  data: {
    // ... existing fields ...
    notes: body.notes ?? null,
    createdById: userId,
    fxRate: new Prisma.Decimal(fxRateValue),
    fxRateCapturedAt: new Date(),
  },
  // ...
});
```

**Step 4 — Update `grn-post.service.ts`** to set `postedAt` on status transition:

```typescript
await tx.goodsReceivedNote.updateMany({
  where: { id: grnId, version: lockedDoc.version },
  data: {
    status: 'POSTED',
    postedAt: new Date(),        // ← capture exact post timestamp
    version: lockedDoc.version + 1,
  },
});
```

**Step 5 — Update `mapGRNDetail` in `grn.controller.ts`**

Replace all hard-coded values:
```typescript
function mapGRNDetail(grn: Record<string, unknown>) {
  const po = grn.purchaseOrder as Record<string, unknown>;
  const currency = po?.currency as Record<string, unknown> | null;
  const creator = grn.createdBy as Record<string, unknown> | null;
  const approvalEvents = (grn.approvalEvents as Record<string, unknown>[]) || [];

  return {
    // ... id, documentNumber, status, etc. ...
    notes: (grn.notes as string) || null,
    createdBy: (creator?.name as string) || 'System',
    createdById: (grn.createdById as string) || null,
    postedAt: grn.postedAt ? new Date(grn.postedAt as string).toISOString() : null,
    currencyCode: (currency?.code as string) || 'BASE',
    currencyId: (po?.currencyId as string) || null,
    fxRate: grn.fxRate ? Number(grn.fxRate) : 1,
    fxRateCapturedAt: grn.fxRateCapturedAt
      ? new Date(grn.fxRateCapturedAt as string).toISOString()
      : null,
    auditLog: approvalEvents.map((e) => ({
      status: e.toStatus as string,
      createdAt: (e.createdAt as Date).toISOString(),
      userName: (e.user as Record<string, unknown>)?.name as string | undefined,
    })),
    // ...
  };
}
```

**Step 6 — Update `grn.service.ts#findOne`** to join `approvalEvents` and `createdBy`:

```typescript
include: {
  lines: { include: { item: { include: { unitOfMeasure: true, category: true } }, lot: true } },
  purchaseOrder: { include: { supplier: true, currency: true } },
  warehouse: true,
  createdBy: { select: { id: true, name: true } },   // ← NEW
  approvalEvents: {                                   // ← NEW
    where: { documentType: DocumentType.GOODS_RECEIVED_NOTE },
    include: { user: { select: { name: true } } },
    orderBy: { stepNumber: 'asc' },
  },
},
```

### Acceptance Criteria
- [ ] `GET /procurement/grns/:id` returns `fxRate`, `notes`, `createdBy`, `postedAt`, and `auditLog` fields.
- [ ] `GRNViewer.tsx` renders the correct FX rate and audit timeline.
- [ ] Notes entered during GRN creation appear in the viewer.

---

## Task 1.3 — Fix PO Auto-Fulfillment After GRN Post

**Audit Reference:** Task 1.2.3  
**Severity:** 🟡 Medium (procurement reporting integrity)  
**File:** `apps/api/src/modules/purchasing/grn-post.service.ts`

### Problem
After a GRN is posted, the parent PO status remains `APPROVED` indefinitely. POs are never automatically transitioned to `PARTIAL` or `FULFILLED`.

### Implementation Steps

**Step 1 — Add quantity reconciliation after GRN post**, within the same Serializable transaction:

```typescript
// After posting GRN and updating warehouseItem quantities:

// 1. Fetch all PO lines and their quantities
const poLines = await tx.pOLine.findMany({
  where: { poId: grn.poId },
  select: { id: true, itemId: true, quantity: true },
});

// 2. Fetch all GRN lines posted against this PO (across all GRNs)
const postedGrnLines = await tx.gRNLine.findMany({
  where: {
    grn: {
      poId: grn.poId,
      status: 'POSTED',
    },
  },
  select: { itemId: true, quantityReceived: true },
});

// 3. Sum received quantities per item
const receivedByItem = new Map<string, Prisma.Decimal>();
for (const gl of postedGrnLines) {
  const existing = receivedByItem.get(gl.itemId) ?? new Prisma.Decimal(0);
  receivedByItem.set(gl.itemId, existing.add(new Prisma.Decimal(gl.quantityReceived)));
}

// 4. Determine new PO status
let allFulfilled = true;
let anyFulfilled = false;

for (const poLine of poLines) {
  const received = receivedByItem.get(poLine.itemId) ?? new Prisma.Decimal(0);
  const ordered = new Prisma.Decimal(poLine.quantity);
  if (received.greaterThanOrEqualTo(ordered)) {
    anyFulfilled = true;
  } else {
    allFulfilled = false;
  }
}

const newPoStatus = allFulfilled ? 'FULFILLED' : anyFulfilled ? 'PARTIAL' : null;

// 5. Update PO status only if it changed
if (newPoStatus && newPoStatus !== currentPo.status) {
  await tx.purchaseOrder.updateMany({
    where: { id: grn.poId, version: currentPo.version },
    data: { status: newPoStatus, version: { increment: 1 } },
  });

  // Write audit event
  await tx.approvalEvent.create({
    data: {
      documentId: grn.poId,
      documentType: DocumentType.PURCHASE_ORDER,
      fromStatus: currentPo.status,
      toStatus: newPoStatus,
      actionPerformed: 'FULFILL',
      userId,
      userRole,
      stepNumber: (await tx.approvalEvent.count({ where: { documentId: grn.poId } })) + 1,
    },
  });
}
```

### Acceptance Criteria
- [ ] After posting a GRN with all PO quantities received, the PO status changes to `FULFILLED`.
- [ ] After posting a GRN with partial quantities, the PO status changes to `PARTIAL`.
- [ ] PO `ApprovalEvent` records the status change with the user who posted the GRN.
- [ ] Reports showing "outstanding POs" no longer include fully received POs.

---

## Task 1.4 — Enforce Serializable Isolation on GRN Post (Concurrency Fix)

**Audit Reference:** Task 7.2.1  
**Severity:** 🔴 Critical — Data integrity under concurrency  
**File:** `apps/api/src/modules/purchasing/grn-post.service.ts`

### Problem
The GRN post transaction uses default Read Committed isolation. Concurrent GRN posts for the same item can cause lost-update anomalies on `WarehouseItem.qtyOnHand` and WAC recalculation.

### Implementation Steps

Wrap the GRN post in a Serializable transaction with retry logic, identical to `grn-void.service.ts`:

```typescript
async post(grnId: string, userId: string, userRole: Role, clientVersion?: number, ipAddress?: string) {
  const maxAttempts = 3;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // ... entire existing post logic ...
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30000,
        },
      );
    } catch (error) {
      const isSerializationError =
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') ||
        (error instanceof Error &&
          (error.message?.includes('40001') ||
            error.message?.includes('40P01') ||
            error.message?.includes('serialization') ||
            error.message?.includes('deadlock')));

      if (isSerializationError && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### Acceptance Criteria
- [ ] Two simultaneous GRN posts for the same item result in correct final `qtyOnHand` (sum of both).
- [ ] One GRN post succeeds on first attempt; the other retries and succeeds.
- [ ] No `qtyOnHand` or WAC discrepancies in a load test of 5 concurrent GRN posts for the same item.

---

## Task 1.5 — Fix `PurchaseOrder.prId` Unique Constraint (1:1 → 1:N)

**Audit Reference:** Task 6.1.1  
**Severity:** 🔴 Critical — Procurement workflow blocker  
**File:** `apps/api/prisma/schema.prisma`

### Problem
`prId String? @unique` on `PurchaseOrder` enforces a strict 1:1 PR → PO relationship. Multiple POs from one PR are impossible, breaking multi-supplier procurement.

### Implementation Steps

**Step 1 — Update `schema.prisma`**

```prisma
model PurchaseOrder {
  // Remove @unique from prId:
  prId           String?    // Was: prId String? @unique
  purchaseRequest PurchaseRequest? @relation(fields: [prId], references: [id])
  // ...
}

model PurchaseRequest {
  // Change from:  purchaseOrder   PurchaseOrder?
  // Change to:
  purchaseOrders PurchaseOrder[]
  // ...
}
```

**Step 2 — Generate migration**

```bash
npx prisma migrate dev --name remove_po_pr_unique_constraint
```

> [!WARNING]
> This migration drops the unique index on `purchase_orders.pr_id`. Validate there are no orphaned records before running. Run `SELECT pr_id, COUNT(*) FROM purchase_orders GROUP BY pr_id HAVING COUNT(*) > 1;` — expect 0 rows before migration.

**Step 3 — Update `convert-to-po` service**

In `purchase-requests.service.ts#convertToPo`, remove any code that checks for existing POs on the PR before creating a new one. The new business logic allows multiple POs per PR — the PR reaches `FULFILLED` only when all line items are covered.

**Step 4 — Update the `findOne` PR response** to return `purchaseOrders[]` (array) instead of a single `purchaseOrder`.

### Acceptance Criteria
- [ ] Creating two POs from the same APPROVED PR succeeds without a unique constraint violation.
- [ ] `GET /procurement/purchase-requests/:id` returns a `purchaseOrders` array.

---

## Task 1.6 — Fix `YieldBatch` Float → Decimal Precision

**Audit Reference:** Task 2.4.1  
**Severity:** 🟡 Medium  
**File:** `apps/api/prisma/schema.prisma`, `apps/api/src/modules/operations/yield/yield.service.ts`

### Implementation Steps

**Step 1 — Update schema**

```prisma
model YieldBatch {
  inputQty      Decimal  @db.Decimal(18, 4)  // Was: Float
  outputQty     Decimal  @db.Decimal(18, 4)  // Was: Float
  wasteQty      Decimal  @db.Decimal(18, 4)  // Was: Float
  yieldPct      Decimal  @db.Decimal(10, 4)  // Was: Float (percentage, e.g. 85.2500)
  standardYield Decimal? @db.Decimal(10, 4)  // Was: Float
  efficiency    Decimal? @db.Decimal(10, 4)  // Was: Float
}
```

**Step 2 — Migrate** with explicit type cast in SQL (PostgreSQL):

```sql
-- In the generated migration file, add explicit casts:
ALTER TABLE "yield_batches"
  ALTER COLUMN "input_qty" TYPE DECIMAL(18,4) USING "input_qty"::DECIMAL(18,4),
  ALTER COLUMN "output_qty" TYPE DECIMAL(18,4) USING "output_qty"::DECIMAL(18,4),
  ALTER COLUMN "waste_qty" TYPE DECIMAL(18,4) USING "waste_qty"::DECIMAL(18,4),
  ALTER COLUMN "yield_pct" TYPE DECIMAL(10,4) USING "yield_pct"::DECIMAL(10,4),
  ALTER COLUMN "standard_yield" TYPE DECIMAL(10,4) USING "standard_yield"::DECIMAL(10,4),
  ALTER COLUMN "efficiency" TYPE DECIMAL(10,4) USING "efficiency"::DECIMAL(10,4);
```

**Step 3 — Update yield service** to use `new Prisma.Decimal(value)` for all arithmetic.

### Acceptance Criteria
- [ ] `yieldPct = 100 - (wasteQty / inputQty * 100)` computes to exactly 4 decimal places.
- [ ] No floating-point drift in yield percentage after 1,000 batch insertions.

---

## Task 1.7 — Add `YIELD_BATCH` to `DocumentType` Enum and Write Ledger Entries

**Audit Reference:** Task 6.1.2  
**Severity:** 🟡 Medium  
**Files:** `schema.prisma`, `apps/api/src/modules/operations/yield/yield.service.ts`

### Implementation Steps

**Step 1 — Add to enum in `schema.prisma`**

```prisma
enum DocumentType {
  PURCHASE_REQUEST
  PURCHASE_ORDER
  GOODS_RECEIVED_NOTE
  INVENTORY_ISSUE
  STOCK_TRANSFER
  STOCK_ADJUSTMENT
  LANDED_COST_VOUCHER
  STOCKTAKE_SESSION
  KITCHEN_REQUEST
  YIELD_BATCH          // ← NEW
}
```

**Step 2 — Migrate**

```bash
npx prisma migrate dev --name add_yield_batch_document_type
```

**Step 3 — Update `yield.service.ts`**

After creating a `YieldBatch` record, write ledger entries within the same transaction:

```typescript
// Consume input items (negative stock movement)
for (const input of batch.inputs) {
  await tx.stockLedger.create({
    data: {
      warehouseId: batch.warehouseId,
      itemId: input.itemId,
      lotId: input.lotId ?? null,
      quantity: new Prisma.Decimal(input.quantity).negated(),
      documentId: yieldBatch.id,
      documentType: DocumentType.YIELD_BATCH,
      idempotencyKey: `YIELD_BATCH:stock:${yieldBatch.id}:input:${input.itemId}`,
    },
  });
}

// Produce output item (positive stock movement)
await tx.stockLedger.create({
  data: {
    warehouseId: batch.warehouseId,
    itemId: batch.outputItemId,
    lotId: batch.outputLotId ?? null,
    quantity: new Prisma.Decimal(batch.outputQty),
    documentId: yieldBatch.id,
    documentType: DocumentType.YIELD_BATCH,
    idempotencyKey: `YIELD_BATCH:stock:${yieldBatch.id}:output`,
  },
});
```

### Acceptance Criteria
- [ ] `StockLedger` entries exist for every yield batch with `documentType = YIELD_BATCH`.
- [ ] The inventory movement report includes yield batches as a transaction type.

---

---

# PHASE 2 — Workflow Completeness
**Priority:** 🔴 HIGH — Broken state machines block operational users  
**Objective:** Implement all missing workflow endpoints, fix dead-end states, and repair all audit trail data flows.

---

## Task 2.1 — Add GRN Void Endpoint to `GrnController` (Resolve URL Fragmentation)

**Audit Reference:** Task 1.3.1  
**Severity:** 🟡 Medium (architectural cleanliness + UX blocker)  
**Files:** `apps/api/src/modules/purchasing/grn/grn.controller.ts`, `apps/api/src/modules/purchasing/purchasing.module.ts`

### Implementation Steps

**Step 1 — Inject `GrnVoidService` into `PurchasingModule`**

In `purchasing.module.ts`, add `GrnVoidService` to providers and imports (import from `OperationsModule` if using shared provider, or move the service to `PurchasingModule`):

```typescript
// If moving service to PurchasingModule:
import { GrnVoidService } from '../operations/grn-void.service';

@Module({
  providers: [..., GrnVoidService],
  // also import LedgerLockService dependency
})
export class PurchasingModule {}
```

**Step 2 — Add void endpoint to `GrnController`**

```typescript
@Post(':id/void')
@Roles(Role.ADMIN, Role.INV_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'grn', action: 'VOID', modelName: 'goodsReceivedNote' })
@HttpCode(HttpStatus.OK)
async void(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @CurrentUser('role') role: Role,
  @Body() body: { version?: number },
  @Req() req: Request,
) {
  const ipAddress =
    (Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for']) ||
    req.ip ||
    undefined;

  const grn = await this.grnVoidService.void(id, userId, role, body.version, ipAddress);
  return mapGRNDetail(grn as Record<string, unknown>);
}
```

**Step 3 — Keep the `OperationsController` generic void** intact for backward compatibility, but deprecate by adding a `@deprecated` JSDoc comment.

### Acceptance Criteria
- [ ] `POST /procurement/grns/:id/void` voids a POSTED GRN and returns the updated GRN detail.
- [ ] `POST /operations/grn/:id/void` still works (backward compatibility).
- [ ] Voiding a non-POSTED GRN returns 400.

---

## Task 2.2 — Add Void Button to `GRNDetailClient.tsx`

**Audit Reference:** Task 5.1.1  
**Severity:** 🟡 Medium  
**File:** `apps/web/src/app/[locale]/(app)/(procurement)/goods-received/[id]/GRNDetailClient.tsx`

### Implementation Steps

**Step 1 — Create `useVoidGRN` hook** in `apps/web/src/features/purchasing/hooks/useVoidGRN.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface VoidGRNPayload { version: number; }

export function useVoidGRN(grnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VoidGRNPayload) =>
      apiClient.post(`/procurement/grns/${grnId}/void`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn', grnId] });
      queryClient.invalidateQueries({ queryKey: ['grns'] });
    },
  });
}
```

**Step 2 — Add Void button in `GRNDetailClient.tsx`**

```tsx
import { useVoidGRN } from '@/features/purchasing/hooks/useVoidGRN';
import { canPerformActionV2 } from '@logirest/shared-types';

// Inside component:
const { mutate: voidGrn, isPending: isVoiding } = useVoidGRN(document.id);

// In the actions section (passed to GRNViewer):
{canPerformActionV2('GRN', document.status, 'VOID', userRole) && (
  <Button
    variant="destructive"
    size="sm"
    disabled={isVoiding}
    onClick={() => {
      if (window.confirm(t('void_confirmation'))) {
        voidGrn({ version: document.version });
      }
    }}
  >
    {isVoiding ? <Spinner /> : t('void_document')}
  </Button>
)}
```

**Step 3 — Fix `GRNViewer.tsx` read-only overlay**

```tsx
// Before:
isPosted={document?.status === 'POSTED'}

// After:
isPosted={['POSTED', 'VOIDED', 'CANCELLED', 'RECEIVED'].includes(document?.status ?? '')}
```

### Acceptance Criteria
- [ ] ADMIN/INV_MGR sees "Void" button on a POSTED GRN detail page.
- [ ] PROC_OFFICER does not see the "Void" button.
- [ ] After voiding, the GRN status updates to VOIDED and the page re-renders.
- [ ] The read-only overlay is active for POSTED, VOIDED, and CANCELLED statuses.

---

## Task 2.3 — Add GRN Status Filter Tabs to `GRNListClient.tsx`

**Audit Reference:** Task 5.1.3  
**Severity:** 🟡 Medium  
**File:** `apps/web/src/app/[locale]/(app)/(procurement)/goods-received/GRNListClient.tsx`

### Implementation Steps

Add a tab strip above the GRN list table:

```tsx
const GRN_STATUS_TABS = ['ALL', 'DRAFT', 'RECEIVED', 'POSTED', 'CANCELLED', 'VOIDED'] as const;
type GRNStatusTab = (typeof GRN_STATUS_TABS)[number];

// State:
const [activeTab, setActiveTab] = useState<GRNStatusTab>('ALL');

// API query param:
const { data } = useGRNList({
  status: activeTab === 'ALL' ? undefined : activeTab,
  page,
  search,
});

// Render tab strip (matching the design system tabs used in PO/PR lists):
<TabStrip
  tabs={GRN_STATUS_TABS.map((s) => ({ id: s, label: t(`status.${s.toLowerCase()}`) }))}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### Acceptance Criteria
- [ ] Clicking "Received" tab shows only GRNs with status RECEIVED.
- [ ] Tab counts update when data loads.
- [ ] "All" tab shows all GRNs regardless of status.

---

## Task 2.4 — Implement "Convert to PO" Button on PR Detail Page

**Audit Reference:** Task 5.1.4  
**Severity:** 🔴 Critical — Workflow dead-end  
**File:** `apps/web/src/app/[locale]/(app)/(procurement)/purchase-requests/[id]/page.tsx`

### Implementation Steps

**Step 1 — Create `useConvertToPO` hook**

```typescript
// apps/web/src/features/purchasing/hooks/useConvertToPO.ts
export function useConvertToPO(prId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      supplierId: string;
      currencyId: string;
      lines: Array<{ itemId: string; unitPrice: number }>;
      version: number;
    }) => apiClient.post(`/procurement/purchase-requests/${prId}/convert-to-po`, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pr', prId] });
      // Navigate to the newly created PO
      router.push(`/${locale}/purchase-orders/${data.data.id}`);
    },
  });
}
```

**Step 2 — Add "Create Purchase Order" button + modal to PR detail page**

When `document.status === 'APPROVED'` and `canPerformActionV2('PR', 'APPROVED', 'CONVERT_TO_PO', userRole)`:

```tsx
<Button onClick={() => setShowConvertModal(true)}>
  <ShoppingCart className="w-4 h-4 mr-2" />
  {t('create_purchase_order')}
</Button>

<ConvertToPOModal
  open={showConvertModal}
  prLines={document.lines}
  onClose={() => setShowConvertModal(false)}
  onSubmit={(supplierId, currencyId, linePrices) =>
    convertToPO({ supplierId, currencyId, lines: linePrices, version: document.version })
  }
/>
```

**The `ConvertToPOModal`** must include:
- Supplier selector (searchable dropdown → `GET /master-data/suppliers`)
- Currency selector (dropdown → `GET /master-data/currencies`)
- Per-line unit price input field (one per PR line)
- Submit with optimistic validation (all fields required)

### Acceptance Criteria
- [ ] APPROVED PR detail page shows "Create Purchase Order" button for ADMIN/PROC_MGR/PROC_OFFICER.
- [ ] Modal accepts supplier, currency, and per-line prices.
- [ ] On success, user is redirected to the new PO detail page.
- [ ] PR status changes to FULFILLED in the background.

---

## Task 2.5 — Implement `POST /stocktake/sessions/:id/recount` Endpoint

**Audit Reference:** Task 2.3.1  
**Severity:** 🔴 Critical — State machine dead-end  
**File:** `apps/api/src/modules/stocktake/stocktake.controller.ts`

### Implementation Steps

**Step 1 — Add the endpoint**

```typescript
@Post('sessions/:id/recount')
@Roles(Role.ADMIN, Role.INV_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({
  docType: 'stocktake',
  action: 'RECOUNT',
  modelName: 'stocktakeSession',
})
@HttpCode(HttpStatus.OK)
async recount(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @CurrentUser('role') role: Role,
  @Body() body: { version?: number; comments?: string },
  @Req() req: Request,
) {
  const ipAddress =
    (Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for']) ||
    req.ip ||
    undefined;

  // Transition: REVIEW → COUNTING (existing count data preserved)
  const session = await this.stocktakeService.recount(id, userId, role, {
    ...body,
    ipAddress,
  });
  return session;
}
```

**Step 2 — Implement `stocktakeService.recount`**

```typescript
async recount(id: string, userId: string, userRole: Role, body: { version?: number; comments?: string; ipAddress?: string }) {
  // Use workflowService.executeTransition to REVIEW → COUNTING
  await this.workflowService.executeTransition(
    id,
    'stocktakeSession',
    'RECOUNT',
    userId,
    userRole,
    body.comments,
    body.version,
    body.ipAddress,
  );
  // Do NOT delete existing StocktakeCount records on recount
  // Existing counts remain; counters submit new counts which upsert via @@unique
  return this.findOne(id);
}
```

### Acceptance Criteria
- [ ] A stocktake session in `REVIEW` status can transition to `COUNTING` via `POST /stocktake/sessions/:id/recount`.
- [ ] Existing `StocktakeCount` records are preserved after recount initiation.
- [ ] Counters can re-submit counts for items, which upsert (not duplicate) via the unique constraint added in Task 2.6.
- [ ] `DRAFT` or `COUNTING` sessions return 400 when recount is called.

---

## Task 2.6 — Fix `StocktakeCount` Concurrent Write Safety

**Audit Reference:** Task 2.3.2  
**Severity:** 🟡 Medium  
**File:** `apps/api/prisma/schema.prisma`, `apps/api/src/modules/stocktake/stocktake.service.ts`

### Implementation Steps

**Step 1 — Add unique constraint and version field**

```prisma
model StocktakeCount {
  id          String  @id @default(cuid())
  sessionId   String
  itemId      String
  lotId       String?
  countedQty  Decimal @db.Decimal(18, 4)
  version     Int     @default(0)   // ← NEW: optimistic locking
  countedAt   DateTime @default(now())
  countedById String?

  session     StocktakeSession @relation(fields: [sessionId], references: [id])
  item        Item             @relation(fields: [itemId], references: [id])

  @@unique([sessionId, itemId, lotId])   // ← NEW: prevent duplicate counts
  @@map("stocktake_counts")
}
```

**Step 2 — Migrate**

```bash
npx prisma migrate dev --name add_stocktake_count_unique_constraint
```

> [!CAUTION]
> Before running this migration, check for existing duplicate `(sessionId, itemId, lotId)` combinations in `stocktake_counts`. If duplicates exist, the migration will fail. Run: `SELECT session_id, item_id, lot_id, COUNT(*) FROM stocktake_counts GROUP BY session_id, item_id, lot_id HAVING COUNT(*) > 1;` and resolve duplicates first (keep the most recent one).

**Step 3 — Change `create` to `upsert` in count submission service**

```typescript
await tx.stocktakeCount.upsert({
  where: {
    sessionId_itemId_lotId: {
      sessionId: body.sessionId,
      itemId: body.itemId,
      lotId: body.lotId ?? null,
    },
  },
  update: {
    countedQty: new Prisma.Decimal(body.countedQty),
    countedAt: new Date(),
    countedById: userId,
    version: { increment: 1 },
  },
  create: {
    sessionId: body.sessionId,
    itemId: body.itemId,
    lotId: body.lotId ?? null,
    countedQty: new Prisma.Decimal(body.countedQty),
    countedById: userId,
  },
});
```

### Acceptance Criteria
- [ ] Two simultaneous count submissions for the same `(session, item, lot)` result in one record with the latest quantity.
- [ ] `version` field increments on each update.
- [ ] No duplicate count records exist after concurrent submission.

---

## Task 2.7 — Implement Transfer Dispute Backend Endpoint

**Audit Reference:** Task 2.2.2  
**Severity:** 🟡 Medium  
**Files:** `packages/shared-types/.../document-engine.ts`, `apps/api/src/modules/operations/transfers/transfers.controller.ts`

### Implementation Steps

**Step 1 — Add `DISPUTE` action to `transitionMapV2` in `document-engine.ts`**

```typescript
'transfer': {
  [TRANSFER_STATUS.DRAFT]: { /* ... existing ... */ },
  [TRANSFER_STATUS.IN_TRANSIT]: {
    'RECEIVE': { targetStatus: TRANSFER_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'BRANCH_MGR'] },
    'DISPUTE': { targetStatus: TRANSFER_STATUS.DISPUTED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'BRANCH_MGR'] }, // ← NEW
  },
  // Add new DISPUTED state:
  [TRANSFER_STATUS.DISPUTED]: {
    'RECEIVE': { targetStatus: TRANSFER_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'] },
    'CANCEL':  { targetStatus: TRANSFER_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
  },
},
```

**Step 2 — Add `DISPUTED` to `TransferStatus` enum** (in `contracts/statuses.ts`):

```typescript
export const TRANSFER_STATUS = {
  DRAFT: 'DRAFT',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  DISPUTED: 'DISPUTED',    // ← NEW
  CANCELLED: 'CANCELLED',
} as const;
```

**Step 3 — Add backend endpoint**

```typescript
@Post(':id/dispute')
@Roles(Role.ADMIN, Role.WH_KEEPER, Role.INV_MGR, Role.BRANCH_MGR)
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'transfer', action: 'DISPUTE', modelName: 'transfer' })
@HttpCode(HttpStatus.OK)
async dispute(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @CurrentUser('role') role: Role,
  @Body() body: {
    version?: number;
    comments: string;            // required: describe the discrepancy
    disputedLines: Array<{       // required: specify which lines are disputed
      lineId: string;
      receivedQty: number;       // actual qty received (may differ from shipped)
    }>;
  },
  @Req() req: Request,
) { /* ... */ }
```

**Step 4 — Rebuild `packages/shared-types`**

```bash
cd packages/shared-types && npm run build
```

**Step 5 — Connect frontend dispute page** to call `POST /operations/transfers/:id/dispute`.

### Acceptance Criteria
- [ ] `POST /operations/transfers/:id/dispute` on an IN_TRANSIT transfer → status becomes DISPUTED.
- [ ] `POST /operations/transfers/:id/receive` on a DISPUTED transfer → resolves to RECEIVED.
- [ ] Stock ledger does not adjust destination warehouse quantities while in DISPUTED state.

---

## Task 2.8 — Verify Transfer Void Correctly Handles Partial Receipts

**Audit Reference:** Task 2.2.1  
**Severity:** 🟡 Medium  
**File:** `apps/api/src/modules/operations/transfer-void.service.ts`

### Implementation Steps

**Step 1 — Open and audit `transfer-void.service.ts`**

Verify the void logic:
1. For RECEIVED transfers: the reversal must use `TransferLine.quantityReceived` (destination reversal) AND `TransferLine.quantityShipped` (source reversal) **independently**.
2. If `quantityReceived < quantityShipped`, two separate `StockLedger` entries are needed:
   - Source warehouse: `+quantityShipped` (restore shipped qty)
   - Destination warehouse: `-quantityReceived` (remove received qty)

**Step 2 — If the service only uses one quantity, fix it:**

```typescript
for (const line of transfer.lines) {
  const shippedQty = Number(line.quantityShipped);
  const receivedQty = Number(line.quantityReceived ?? 0);

  // Always restore source warehouse with shipped qty
  await tx.warehouseItem.update({
    where: { warehouseId_itemId: { warehouseId: transfer.fromWarehouseId, itemId: line.itemId } },
    data: { qtyOnHand: { increment: shippedQty } },
  });
  await tx.stockLedger.create({
    data: { warehouseId: transfer.fromWarehouseId, itemId: line.itemId,
            quantity: shippedQty, documentId: transfer.id,
            documentType: DocumentType.STOCK_TRANSFER,
            idempotencyKey: `TRANSFER:${transfer.id}:${line.id}:void:source` },
  });

  // Only reverse destination if goods were actually received
  if (receivedQty > 0) {
    await tx.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId: transfer.toWarehouseId, itemId: line.itemId } },
      data: { qtyOnHand: { decrement: receivedQty } },
    });
    await tx.stockLedger.create({
      data: { warehouseId: transfer.toWarehouseId, itemId: line.itemId,
              quantity: -receivedQty, documentId: transfer.id,
              documentType: DocumentType.STOCK_TRANSFER,
              idempotencyKey: `TRANSFER:${transfer.id}:${line.id}:void:destination` },
    });
  }
}
```

### Acceptance Criteria
- [ ] Voiding a fully-received transfer restores source qty by shipped amount AND removes received qty from destination.
- [ ] Voiding a partially-received transfer (received 8 of 10 shipped) restores 10 to source and removes 8 from destination.
- [ ] Net inventory across both warehouses balances to zero after void.

---

## Task 2.9 — Fix Issue Delete/Void Hook Mismatch

**Audit Reference:** Task 2.1.1  
**Severity:** 🟡 Medium  
**Files:** Frontend issue hooks, issue detail page

### Implementation Steps

**Step 1 — Audit the existing `useDeleteIssue` hook**

Open `apps/web/src/features/purchasing/hooks/` or `apps/web/src/hooks/` and locate `useDeleteIssue`. Verify:
- It calls `DELETE /operations/issues/:id` — correct for DRAFT deletion.
- It is NOT called for POSTED issues.

**Step 2 — Create `useVoidIssue` hook**

```typescript
// apps/web/src/features/operations/hooks/useVoidIssue.ts
export function useVoidIssue(issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { version: number }) =>
      apiClient.post(`/operations/issue/${issueId}/void`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}
```

**Step 3 — Update the Issue detail page action bar**

```tsx
// Show DELETE only for DRAFT status:
{document.status === 'DRAFT' && <DeleteButton onClick={() => deleteIssue({ version: document.version })} />}

// Show VOID only for POSTED status and ADMIN/INV_MGR:
{document.status === 'POSTED' && canPerformActionV2('ISSUE', 'POSTED', 'VOID', userRole) && (
  <VoidButton onClick={() => voidIssue({ version: document.version })} />
)}
```

### Acceptance Criteria
- [ ] DRAFT issue has a "Delete" button, no "Void" button.
- [ ] POSTED issue has a "Void" button (for ADMIN/INV_MGR), no "Delete" button.
- [ ] Calling void on a DRAFT issue via the hook returns 400.

---

## Task 2.10 — Fix Issue Role SoD: Unify `@Roles()` with `transitionMapV2`

**Audit Reference:** Task 2.1.2  
**Severity:** 🟡 Medium  
**Files:** `issues.controller.ts`, `document-engine.ts`

### Implementation Steps

**Chosen approach:** `transitionMapV2` is the single source of truth. Remove duplicate `@Roles()` from workflow endpoints on issues (keep only on non-workflow endpoints like `create`, `findAll`). The `WorkflowStateGuard` + `canPerformActionV2` handles role enforcement for workflow actions.

```typescript
// POST /:id/submit — REMOVE @Roles(), keep @UseGuards(WorkflowStateGuard):
// Before:
@Roles(Role.ADMIN, Role.INV_MGR, Role.WH_KEEPER, Role.STORE_MGR, Role.BRANCH_MGR, Role.KITCHEN_CHIEF)
@UseGuards(WorkflowStateGuard)

// After (WorkflowStateGuard enforces via canPerformActionV2 which checks transitionMapV2):
@UseGuards(WorkflowStateGuard)
```

> [!IMPORTANT]
> After Task 0.1, the default-deny `RolesGuard` will block these endpoints. You must either keep `@Roles()` decorators matching `transitionMapV2` OR add `@AllRoles()` on workflow endpoints and let `WorkflowStateGuard` solely enforce role access. **Decision:** keep `@Roles()` matching `transitionMapV2` for defense-in-depth. Update `@Roles()` on all issue workflow endpoints to exactly match `transitionMapV2` `allowedRoles`. Do NOT remove `@Roles()`.

Correct decorator for `submit`:
```typescript
@Post(':id/submit')
@Roles(Role.ADMIN, Role.INV_MGR, Role.WH_KEEPER, Role.STORE_MGR, Role.KITCHEN_CHIEF) // exact match with transitionMapV2
@UseGuards(WorkflowStateGuard)
@WorkflowAction({ docType: 'issue', action: 'SUBMIT', modelName: 'inventoryIssue' })
```

### Acceptance Criteria
- [ ] `KITCHEN_CHIEF` can submit an issue but cannot post one (403 on `/post`).
- [ ] `@Roles()` decorators on all issue endpoints exactly match `transitionMapV2` `allowedRoles` for the corresponding action.

---

---

# PHASE 3 — Data Quality & UI Completion
**Priority:** 🟡 MEDIUM — Can be parallelized with Phase 2 for non-dependent tasks  
**Objective:** Fill schema gaps, add performance indexes, complete frontend modules, and eliminate hard-coded data in controllers.

---

## Task 3.1 — Add Missing Fields to `InventoryIssue` and `Adjustment`

**Audit Reference:** Task 6.1.3  
**Files:** `schema.prisma`, `issues.controller.ts`, `adjustments.controller.ts`

Add `notes`, `createdById`, and `postedAt` to both `InventoryIssue` and `Adjustment` models (same pattern as Task 1.2 for GRN):

```prisma
model InventoryIssue {
  // ... existing ...
  notes       String?
  createdById String?
  createdBy   User?    @relation("IssueCreatedBy", fields: [createdById], references: [id])
  postedAt    DateTime?
}

model Adjustment {
  // ... existing ...
  notes       String?
  createdById String?
  createdBy   User?    @relation("AdjustmentCreatedBy", fields: [createdById], references: [id])
  postedAt    DateTime?
}
```

Update the corresponding `mapIssueDetail` and `mapAdjustmentDetail` functions to remove the hard-coded `requestedBy: 'System'` and `notes: ''` values and read from the database instead.

Update `findOne` in both services to include `createdBy` and `approvalEvents`.

---

## Task 3.2 — Add `departmentId` to `PurchaseRequest`

**Audit Reference:** Task 1.1.2  
**Files:** `schema.prisma`, `purchase-requests.controller.ts`

```prisma
model PurchaseRequest {
  // ...
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
}
```

Update `create` endpoint body to accept `departmentId?`.  
Update `mapPRDetail` to use `pr.departmentId` instead of `pr.warehouseId` for the `departmentId` field.

---

## Task 3.3 — Add `warehouseId` to `PurchaseOrder`

**Audit Reference:** Task 1.2.2  
**Files:** `schema.prisma`, `po.controller.ts`, `purchase-requests.service.ts`

```prisma
model PurchaseOrder {
  // ...
  warehouseId String?
  warehouse   Warehouse? @relation(fields: [warehouseId], references: [id])
}
```

In `convert-to-po` service, copy `pr.warehouseId` → `po.warehouseId` on PO creation.  
Update `po.controller.ts#findOne` scope validation to use `po.warehouseId` directly.

---

## Task 3.4 — Add `PurchaseOrder.warehouseId` to Status Enums (Schema Enum Hardening)

**Audit Reference:** Task 1.1.1  
**Files:** `schema.prisma`, all workflow services

> [!WARNING]
> This is a large, high-risk migration. It must be done in a maintenance window. All `status String` fields across `PurchaseRequest`, `PurchaseOrder`, `GoodsReceivedNote`, `InventoryIssue`, `Transfer`, `Adjustment`, and `KitchenRequest` must be converted to Prisma enums.

**Enums to define:**

```prisma
enum PRStatus        { DRAFT SUBMITTED APPROVED REJECTED FULFILLED CANCELLED }
enum POStatus        { DRAFT SUBMITTED APPROVED REJECTED FULFILLED PARTIAL CANCELLED }
enum GRNStatus       { DRAFT RECEIVED POSTED CANCELLED VOIDED }
enum IssueStatus     { DRAFT SUBMITTED POSTED CANCELLED VOIDED }
enum TransferStatus  { DRAFT IN_TRANSIT RECEIVED DISPUTED CANCELLED VOIDED }
enum AdjustmentStatus { DRAFT SUBMITTED APPROVED REJECTED POSTED CANCELLED VOIDED }
enum KitchenReqStatus { DRAFT SUBMITTED FULFILLED CANCELLED VOIDED }
```

**Migration strategy:** Use PostgreSQL `USING` clause to cast existing strings to enum values. Any invalid string will fail the migration — pre-validate with `SELECT DISTINCT status FROM purchase_requests;` for each table.

---

## Task 3.5 — Add `outboxEvent` Status Enum

**Audit Reference:** Task 7.1.1  
**File:** `schema.prisma`

```prisma
enum OutboxStatus { PENDING SUCCEEDED FAILED }

model OutboxEvent {
  status OutboxStatus @default(PENDING)
  // remove dead-lettered index after adding:
  @@index([deadLettered, status, createdAt])
}
```

---

## Task 3.6 — Remove `DocumentCounter` Dead Table

**Audit Reference:** Task 7.2.2  
**File:** `schema.prisma`

1. Verify `DocumentNumberService` uses `DocumentSequence`, not `DocumentCounter`.
2. If `DocumentCounter` is unused, create a migration: `DROP TABLE document_counters;`.
3. Remove the `DocumentCounter` model from `schema.prisma`.

---

## Task 3.7 — Optimize `WarehouseItemLot` FEFO Index

**Audit Reference:** Task 6.1.4  
**File:** `schema.prisma`

```prisma
model WarehouseItemLot {
  // ... existing @@index([warehouseId, itemId, lotId]) ...
  @@index([warehouseId, itemId, qtyOnHand])    // ← NEW: filter out zero-qty lots efficiently in FEFO
}
```

---

## Task 3.8 — Build Landed Cost Voucher Frontend (New, Create, Post pages)

**Audit Reference:** Task 1.4.1  
**Files:** `apps/web/src/app/[locale]/(app)/(procurement)/landed-cost/`

Create three new pages:
1. `/landed-cost/new/page.tsx` — Form: select GRNs (multi-select), enter total cost amount, choose allocation method (By Value / By Quantity / By Weight / Equal), currency.
2. `/landed-cost/[id]/page.tsx` — Detail viewer showing allocations per GRN line and per item.
3. `/landed-cost/[id]/post/page.tsx` — Confirmation page with `POST /procurement/landed-cost/:id/post` action.

API hooks needed:
- `useLandedCostVouchers()` (list)
- `useCreateLandedCostVoucher()` (create)
- `useLandedCostVoucher(id)` (single)
- `usePostLandedCostVoucher(id)` (post)

---

## Task 3.9 — Add `PROC_OFFICER` Scope Whitelist to `ScopeValidationService`

**Audit Reference:** Task 5.2.2  
See Task 0.5 — implement alongside Phase 0.

---

## Task 3.10 — Rebuild `packages/shared-types` and Sync All Consumers

After all `document-engine.ts` changes (Tasks 2.7):
```bash
cd packages/shared-types
npm run build
```

Ensure frontend and backend both resolve the updated types:
```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

Fix all TypeScript errors before finalizing any phase.

---

---

# Verification & Quality Gates

After completing each phase, the following checks MUST pass before merging:

## After Phase 0

```bash
# TypeScript: zero errors
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit

# Lint: zero warnings
cd apps/api && npx eslint src/ --max-warnings=0
cd apps/web && npx eslint src/ --max-warnings=0

# Security guard test:
# Manually test that VIEWER cannot POST to any workflow endpoint
```

## After Phase 1

```bash
# Unit test for WAC FX calculation
cd apps/api && npx jest --testPathPattern=grn-post

# Database migration check
cd apps/api && npx prisma migrate status

# Verify no float fields remain in financial models
grep -n "Float" apps/api/prisma/schema.prisma | grep -v "//.*Float"
```

## After Phase 2

```bash
# Integration tests for workflow state machine
cd apps/api && npx jest --testPathPattern=workflow

# Verify all endpoints have @Roles() or @AllRoles()
# Run a custom audit script:
cd apps/api && npx ts-node scripts/audit-routes.ts

# Next.js build check
cd apps/web && npm run build
```

## After Phase 3

```bash
# Full build
npm run build --workspace=apps/api
npm run build --workspace=apps/web

# Prisma schema validation
cd apps/api && npx prisma validate

# Run full test suite
npm run test --workspace=apps/api
```

---

---

# Cross-Cutting Dependency Graph

```
Task 0.1 (RolesGuard default-deny)
  └── MUST complete before Task 0.2, 0.3, 0.4 (or all endpoints 403)

Task 1.2 (GRN schema migration)
  └── MUST complete before Task 1.1 (FX rate fields on GRNLine needed)
  └── MUST complete before Task 2.2 (postedAt field for void display)

Task 1.5 (Remove PO.prId @unique)
  └── MUST complete before Task 2.4 (Convert to PO allows multiple POs per PR)

Task 2.7 (Transfer DISPUTE in document-engine.ts)
  └── MUST complete before Task 3.10 (shared-types rebuild)
  └── MUST rebuild packages/shared-types BEFORE api/web can use new status

Task 3.4 (Status enum migration)
  └── MUST be last in Phase 3 (highest migration risk, requires all string comparisons updated first)
```

---

# Rollback Plan

Each phase is deployable independently. Rollback strategy per phase:

| Phase | Rollback Method |
|-------|----------------|
| **0** | Revert `roles.guard.ts` to previous default-allow behavior. Remove `@AllRoles()` decorator file. |
| **1** | `npx prisma migrate rollback` for schema changes. The FX fix is additive — old GRN posts still work (fxRate defaults to 1). |
| **2** | New endpoints are additive (no breaking changes). Frontend feature flags can hide new buttons. |
| **3** | Schema enum migration requires rollback migration with `ALTER COLUMN ... TYPE VARCHAR`. Prepare in advance. |

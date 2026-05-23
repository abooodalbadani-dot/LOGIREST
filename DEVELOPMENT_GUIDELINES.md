---
description: Definitive Project Constitution and Development Guidelines for OpenCode Agents
globs: *
alwaysApply: true
---

# DEVELOPMENT_GUIDELINES.md: THE PROJECT CONSTITUTION

This document serves as the absolute law and governing constitution for the development of the Kitchen-Store Inventory System. All AI agents, engineers, and automated processes executing implementation in this repository MUST adhere to these rules without exception. Bypassing or violating any directive in this document is FORBIDDEN.

---

## 1. ARCHITECTURAL AXIOMS (The Zero-Trust Monorepo)

The repository is structured as a strict monorepo containing distinct applications and shared packages. Trust boundaries are enforced as follows:

```
                  +-----------------------------------+
                  |           apps/web                |
                  |     (Next.js 16 Frontend)         |
                  +-----------------+-----------------+
                                    |
                                    | HTTP Requests (with auth headers)
                                    v
                  +-----------------+-----------------+
                  |           apps/api                |
                  |     (NestJS Backend API)          |
                  +-----------------+-----------------+
                                    |
            Imports Zod schemas &   | Imports data models &
            transitionMapV2         | database config
                                    v
+-----------------------------------+-----------------------------------+
|  packages/shared-types            |  apps/api/prisma (schema.prisma)  |
|  (Zod, Workflow Engine, Enums)    |  (Database schema and migrations)  |
+-----------------------------------+-----------------------------------+
```

### 1.1 Backend Supremacy
* **DIRECTIVE**: The NestJS backend (`apps/api`) is the supreme, absolute authority on validation, permission, and state transitions. 
* **RULE**: Frontend (`apps/web`) validation is advisory only, intended solely to optimize the user experience. The backend MUST validate every request payload, security header, and state transition as if the client has zero validation.

### 1.2 Separation of Concerns
* **DIRECTIVE**: Concerns MUST be strictly isolated to their respective modules:
  * `apps/web`: Next.js 16 frontend app. Strictly UI presentation, layout, routing, and user interface state management.
  * `apps/api`: NestJS backend app. Strictly database management, transaction handling, locking engines, security guardrails, and business rule enforcement.
  * `packages/shared-types`: Workflow state engines (`transitionMapV2`, `ROLE_CAPABILITIES`), enums, Zod validation schemas, and common data interfaces.
* **FORBIDDEN**: Bypassing the backend API to query the database from the frontend is strictly FORBIDDEN. Backend logic (e.g., Prisma client, raw SQL execution) MUST NOT be imported or executed in the frontend application.

### 1.3 DRY Schema Enforcement
* **DIRECTIVE**: The backend `apps/api` MUST import Zod validation schemas, document types, and status configurations directly from `@logirest/shared-types` (located in `packages/shared-types`).
* **FORBIDDEN**: Duplication of type declarations, enums, workflow state maps, or validation logic across `apps/web` and `apps/api` is strictly FORBIDDEN. Ensure `@logirest/shared-types` is built and linked in both applications.

---

## 2. AI AGENT OPERATIONAL RULES (OpenCode Directives)

AI agents executing implementation within this repository MUST operate under strict behavioral constraints.

### 2.1 Graphify First
* **DIRECTIVE**: Before searching the codebase, requesting file contents, or tracing dependencies, all agents MUST:
  1. Consult `E:\Kitchen‑Store Inventory System\graphify-out\GRAPH_REPORT.md` to identify components and dependencies.
  2. Query `E:\Kitchen‑Store Inventory System\graphify-out\graph.json` to resolve exact module mappings.
* **FORBIDDEN**: Eager or blind recursive directory searches (e.g., executing broad file listings or guessing NestJS/Next.js file paths) are strictly FORBIDDEN.
* **REQUIRED**: Every time code files are modified or added in a session, agents MUST run:
  ```powershell
  graphify update .
  ```

### 2.2 SpecKit Adherence
* **DIRECTIVE**: Implementation MUST follow the tasks exactly as written in the approved SpecKit plans (under `specs/`).
* **FORBIDDEN**: Bypassing steps, implementing extra features, refactoring unrelated systems, or modifying design layouts without explicit approval from a human architect is strictly FORBIDDEN.

### 2.3 Micro-Phasing & Compilation Safety
* **DIRECTIVE**: Changes MUST be implemented in incremental micro-phases. The monorepo MUST remain in a runnable, compilation-safe, and test-passing state at the end of each phase.
* **REQUIRED**: Each phase completion REQUIRE executing the verification pipeline:
  ```powershell
  # Compile checks
  npm run build --filter=api
  npm run typecheck --filter=web
  # Test checks
  npm run test --filter=api
  ```

---

## 3. DATABASE & STATE PROTOCOLS (InsForge & Prisma)

### 3.1 Single DB Protocol
* **DIRECTIVE**: All database access MUST go through the configured database (`DATABASE_URL`).
* **FORBIDDEN**: Direct, manual SQL insertions, updates, or deletions using database administration tools on live or development schemas are FORBIDDEN.
* **REQUIRED**: Testing database states MUST be set up using `apps/api/prisma/seed.ts`. Reset the database cleanly between test cycles using:
  ```powershell
  npx prisma migrate reset --force
  ```

### 3.2 Pessimistic Locking (SELECT FOR UPDATE)
* **DIRECTIVE**: All stock mutation operations—Goods Received Note (GRN) posting, stock Issues, stock Transfers (Ship & Receive), and stock Adjustments—MUST use raw SQL `SELECT FOR UPDATE` to lock affected inventory records.
* **REQUIRED**: All locks and deductions MUST execute inside a transaction with Serializable isolation:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // 1. Lock items and lots in a deterministic order (by itemId ASC, lotId ASC)
    const lockedLots = await tx.$queryRaw`
      SELECT * FROM "WarehouseItemLot"
      WHERE "warehouseId" = ${warehouseId} AND "itemId" = ${itemId} AND "lotId" IN (${Prisma.join(lotIds)})
      FOR UPDATE
    `;
    // 2. Perform validations (e.g., negative stock checks)
    // 3. Apply balance updates
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
  ```
* **FORBIDDEN**: Deducting stock without deterministic locking or executing concurrent stock writes outside a serializable transaction is FORBIDDEN.

### 3.2.1 Ledger Module & Locking Services
To standardize database concurrency protection and inventory cost valuation, all mutations MUST use the unified ledger services in `apps/api/src/modules/ledger/`:

1. **LedgerLockService**:
   - `lockItem(tx, warehouseId, itemId)`: Obtains a raw `SELECT FOR UPDATE` lock on the global `WarehouseItem` balance row.
   - `lockLots(tx, warehouseId, itemId, lotIds)`: Obtains raw `SELECT FOR UPDATE` locks on specific `WarehouseItemLot` rows. The service automatically sorts the lot IDs ascending (`lotId ASC`) to guarantee deadlock prevention.
   - `assertItemBalance(warehouseItem, requiredQty, itemId)`: Asserts post-lock global balance sufficiency, throwing `UnprocessableEntityException` (422) if insufficient.
   - `assertLotBalance(warehouseItemLot, requiredQty, lotId)`: Asserts post-lock lot balance sufficiency.

2. **AllocationService**:
   - `allocate(tx, warehouseId, itemId, requiredQty)`: Progressively allocates stock from lots.
   - For perishable items (`hasExpiry = true`): FEFO (First-Expired, First-Out) sorted by `expiryDate ASC`, then `receivedDate ASC`. Expired lots are auto-excluded.
   - For batched items (`isBatched = true, hasExpiry = false`): FIFO (First-In, First-Out) sorted by `receivedDate ASC`.
   - For unbatched items (`isBatched = false`): Deducts directly from the global `WarehouseItem` balance.

3. **WacService**:
   - `recalculate(tx, warehouseId, itemId, receivedQty, receivedCost, documentId, idempotencyKey)`: Recalculates WAC on GRN receipts using: `(Current Qty * Current WAC + Received Qty * Received Unit Cost) / (Current Qty + Received Qty)`. Updates `WarehouseItem.wac` and logs cost change in the append-only `CostLedger`. If current quantity is zero or negative, the received cost establishes the new WAC baseline.
   - `handlePositiveAdjustment(tx, warehouseId, itemId, adjustedQty, documentId, idempotencyKey)`: Enforces positive adjustments (surpluses) inheriting the current WAC without recalculating, logging a `CostLedger` entry.


### 3.3 Optimistic Locking
* **DIRECTIVE**: All non-ledger document updates (Purchase Requests, Purchase Orders, Adjustments, Stocktakes) MUST use optimistic locking via a `version` field to prevent simultaneous edit overrides.
* **REQUIRED**: Updates MUST match the target ID and current version, and automatically increment the version:
  ```typescript
  const result = await prisma.purchaseRequest.updateMany({
    where: { id, version },
    data: { ...updateData, version: { increment: 1 } }
  });
  if (result.count === 0) {
    throw new VersionConflictException('Document updated by another user');
  }
  ```

---

## 4. SECURITY & WORKFLOW ENFORCEMENT

### 4.1 IDOR Prevention & Scope Resolution
* **DIRECTIVE**: Branch and warehouse scope resolution MUST occur at the protocol level. The backend MUST resolve scope using incoming headers (`x-warehouse-id`, `x-branch-id`).
* **REQUIRED**: The backend MUST validate these headers against the `UserWarehouseScope` table using a NestJS interceptor/guard:
  ```typescript
  const isAuthorized = await prisma.userWarehouseScope.findUnique({
    where: {
      userId_warehouseId: { userId, warehouseId }
    }
  });
  if (!isAuthorized) throw new ForbiddenException('Scope not authorized');
  ```
* **FORBIDDEN**: Bypassing the Scope Interceptor or trusting user-provided IDs inside the request DTO body or URL parameters is strictly FORBIDDEN.

### 4.2 State Machine Parity
* **DIRECTIVE**: Status transitions MUST be governed by a NestJS `WorkflowStateGuard` that evaluates the state machine before executing any controller method.
* **REQUIRED**: The guard MUST:
  1. Fetch the target document's current status directly from the database.
  2. Verify if the transition is allowed based on the user's role capabilities and `transitionMapV2` imported from `@logirest/shared-types`.
  3. Deny the request if the client attempts to skip steps or transition to an invalid state.
* **FORBIDDEN**: Updating a document status without invoking the `WorkflowStateGuard` is strictly FORBIDDEN.

### 4.3 Immutable Auditing
* **DIRECTIVE**: Every critical mutation (creation, posting, status transition, master-data changes) MUST generate an immutable `AuditLog` entry.
* **REQUIRED**: The entry MUST capture:
  * `beforeStateJson`: State snapshot before the change.
  * `afterStateJson`: State snapshot after the change.
  * `performedByUserId` + `performedByRole`: Derived from the verified JWT claims (NEVER DTO payloads).
* **FORBIDDEN**: The `AuditLog` table is strictly append-only. Adding endpoints or database access patterns to UPDATE or DELETE audit records is FORBIDDEN.

---

## 5. RECOVERY & STABILIZATION PHASE RULES

While the application is undergoing stabilization, these specific rules govern development:

| Step | Rule Category | Strict Enforcement |
|:---|:---|:---|
| **1** | **Route & Navigation** | No orphan routes. Every page must have a valid entry, Back button, and CTA. |
| **2** | **Mutation & Redirect** | No `router.push` outside `onSuccess`. Eager navigation is FORBIDDEN. |
| **3** | **Form Guards** | All forms MUST implement `UnsavedChangesGuard` (opt-out only for AutoSave). |
| **4** | **i18n Parity** | `en.json` and `ar.json` must maintain 1:1 key parity. No raw UI strings. |
| **5** | **UX Completeness** | Locked documents MUST display a Lock Banner. Destructive actions require prompts. |
| **6** | **Runtime Cleanliness** | Zero React warnings, hydration mismatches, or unhandled exceptions. |

**Ratified Version**: 3.0.0
**Effective Date**: 2026-05-21
**Governance Authority**: Principal Architect

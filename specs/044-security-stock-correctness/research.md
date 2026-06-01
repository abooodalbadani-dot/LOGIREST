# Technical Research: Security & Stock Correctness

This document records the core architectural decisions, rationales, and alternative considerations evaluated for Sprint 1.

---

## 🛡️ Decision 1: Centralized Guard Scope Enforcement

We will modify `WorkflowStateGuard` (`apps/api/src/guards/workflow-state.guard.ts`) to intercept all workflow transition requests and dynamically validate user warehouse scopes before evaluating role capabilities.

### ⚙️ Technical Approach

1. Inject `ScopeValidationService` into `WorkflowStateGuard`.
2. Extract the loaded `existingDoc` from the database.
3. Identify the target warehouse identifier:
   - For document types containing `warehouseId` (Purchase Request, Purchase Order, Goods Received Note, Inventory Issue, Kitchen Request, Inventory Adjustment): validate the user's scope against `existingDoc.warehouseId`.
   - For Transfer documents:
     - If the workflow action is `SHIP` or `CANCEL`, validate against `existingDoc.fromWarehouseId`.
     - If the workflow action is `RECEIVE` or `POST`, validate against `existingDoc.toWarehouseId`.
4. If validation fails, log a failed audit entry and throw a `ForbiddenException`.

### ⚖️ Rationale & Alternatives

* **Why this approach**: Centralizing transition validations in the guard prevents bypasses on any workflow endpoints (like `/submit`, `/approve`, `/cancel`) without duplicating check logic in every single controller method.
* **Alternative Considered**: Custom route-level decorators for scopes. *Rejected* because decorators require manual addition on every endpoint and increase the risk of developer omission. Centralizing within the existing `WorkflowStateGuard` guarantees automatic enforcement.

---

## 🚪 Decision 2: PUT/DELETE Route Hardening in Controllers

We will harden the `update` (PUT) and `remove` (DELETE) controller endpoints for draft documents to ensure that users cannot modify or delete drafts outside their scoped warehouses.

### ⚙️ Technical Approach

1. Inside each of the target controller endpoints (PR, PO, GRN, Transfer, Issue, Adjustment, Kitchen Request):
   - Query the database to retrieve the target draft document and resolve its warehouse ID.
   - Execute `scopeValidationService.validateWarehouse(userId, role, document.warehouseId)` (or `fromWarehouseId` for transfers).
   - Reject with `ForbiddenException` if unauthorized.
2. Proceed with service modification or deletion only after scope validation passes.

### ⚖️ Rationale & Alternatives

* **Why this approach**: Draft modifications occur through standard controller endpoints that do not trigger workflow transitions (meaning they do not use `WorkflowStateGuard`). Therefore, explicit controller-level checks are required.
* **Alternative Considered**: Global route-level middleware. *Rejected* because draft documents might be queried using composite keys or route params, which are best parsed and loaded inside the controller context.

---

## 🍲 Decision 3: Kitchen Request Void Stock Restoration

We will restructure `KitchenRequestVoidService` to atomically reverse stock deductions and WAC changes in a transaction-safe manner.

### ⚙️ Technical Approach

1. Fetch the kitchen request and find the linked `InventoryIssue` record.
2. Open a `prisma.$transaction` configured with `isolationLevel: Prisma.TransactionIsolationLevel.Serializable`.
3. Retrieve all warehouse items and lot rows associated with the linked issue lines.
4. Execute a raw SQL query `SELECT * FROM "warehouse_item_lots" WHERE "id" IN (...) FOR UPDATE` (and same for `warehouse_items`) to acquire pessimistic write locks on the rows.
5. Restore the deducted quantity to the `WarehouseItem` and `WarehouseItemLot` balances.
6. Recalculate the Weighted Average Cost (WAC) of the item to correct for valuation adjustments.
7. Insert corresponding `StockLedger` and `CostLedger` reversal entries.
8. Transition both the Kitchen Request and the Inventory Issue to their `VOIDED` states within the same transaction block.

### ⚖️ Rationale & Alternatives

* **Why this approach**: Multi-warehouse inventories suffer severe concurrency drifts if balances are updated without locking. `SELECT FOR UPDATE` prevents race conditions where parallel operations read stale balances, and `Serializable` transaction isolation guarantees logical correctness.
* **Alternative Considered**: Optimistic concurrency version increments. *Rejected* because lot-specific stock movements are high-frequency, making transaction retries too expensive. Pessimistic row locking provides stable operational throughput under high concurrent kitchen voiding loads.

---

## 🚦 Decision 4: Correcting canPerformActionV2 Precedence

We will repair the logic in `document-engine.ts` (`packages/shared-types/src/workflow/document-engine.ts`) to ensure that transition maps always take precedence.

### ⚙️ Technical Approach

```typescript
// Restructure logic:
export function canPerformActionV2(
  docType: DocumentType,
  currentStatus: DocumentStatus,
  action: WorkflowAction,
  userRole: Role
): boolean {
  // 1. First, check if the status transition exists in transitionMapV2
  const allowedTransitions = transitionMapV2[docType]?.[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(action)) {
    return false; // Transition is locked by document status
  }

  // 2. Next, check if the user's role has the capability to perform this action
  const roleCapabilities = ROLE_CAPABILITIES[userRole]?.[docType];
  return roleCapabilities?.includes(action) ?? false;
}
```

### ⚖️ Rationale & Alternatives

* **Why this approach**: Correcting the logical check order enforces that document status locks are evaluated first. If a document is in a status where no transitions are allowed (e.g. `POSTED`), the helper returns `false` early, regardless of whether the user possesses high-level admin or approver roles.

# Research Notes: Sprint 2: Automated Validation & UI Integration

This document outlines the technical research, architectural choices, and design decisions for Phase 0 of the Automated Validation & UI Integration Sprint.

---

## 🔍 Validation Engine Query Optimization (ENG-NEW-001)

### Decision
Use highly optimized raw SQL aggregation queries via Prisma’s `$queryRaw` to compare stock transaction ledger sums against cached inventory totals.
- The daily cron task and on-demand admin endpoint will execute three key verification queries.
- These queries perform an `INNER JOIN` between aggregation sums from `stock_ledger` and the target tables (`warehouse_items`, `warehouse_item_lots`), filtering out active mismatches.

### Rationale
- Standard ORM loops would incur severe N+1 memory and query performance degradation when iterating over thousands of items.
- SQL-level `GROUP BY` and aggregations execute in single-digit milliseconds inside the database.
- Executing under `READ COMMITTED` isolation level (or on read-replicas in production) avoids locking the tables during active hours, preserving physical warehouse speed.

### Alternatives Considered
- **Prisma Entity Loading**: Rejected due to high memory overhead and execution times exceeding the 30-second budget for large datasets.
- **Continuous Middleware Auditing**: Rejected because it causes massive transaction overhead for every inventory operation, slowing down high-volume scanner workflows.

---

## 🔒 Auto-Freeze and Quarantine Mechanism

### Decision
Extend the `WarehouseItem` state mapping with a boolean `isFrozen` column. 
- When the validation engine detects a mismatch, it runs a single-record transaction to update `isFrozen = true` for that item in the specific warehouse where the anomaly occurred.
- The `isFrozen` state is checked in all inventory transaction services (transfers, issues, adjustments). If `isFrozen` is true, the operation immediately aborts with a `409 Conflict` (Item Quarantine).

### Rationale
- Minimizes business disruption. Only the item/lot in the affected branch is frozen; other branches can operate normally.
- Completely prevents stock leakage and database corruption from compounding while the mismatch is audited by an administrator.

### Alternatives Considered
- **Warehouse-Wide Lockdown**: Rejected because locking down an entire warehouse for a single lot mismatch is a severe business impediment.
- **Global Item Lockdown**: Rejected because consistent branches should not be penalized for an error localized in a single branch.

---

## 🤝 Confirm Receipt & Issue Submission State Machine Integration

### Decision
Directly integrate the new UI actions with the NestJS workflow post services:
1. **Confirm Receipt Button**: Wires to `PUT /api/operations/transfers/:id/receive`. This endpoint updates the status to `RECEIVED` inside a serializable transaction block, applying pessimist locks on the destination lot/item balances.
2. **Issue Submit Button**: Wires to `POST /api/operations/issues/:id/submit`. This endpoint transition invokes `IssuePostService`, updates status to `POSTED`, decrements inventory, and locks the form.

### Rationale
- Standardizes document flow on the backend supreme authority.
- Guarantees data integrity using existing transaction locks and `WorkflowStateGuard` rules.

### Alternatives Considered
- **Direct UI-driven State Mutators**: Strictly forbidden by the Zero-Trust Monorepo architectural axioms.

---

## 🛑 Procurement Form Locks

### Decision
In `apps/web/.../pr-form.tsx` and `po-form.tsx`, implement a standard read-only selector state. 
- The React component queries the document status from the backend.
- If the status is not `DRAFT` (e.g. `APPROVED`, `POSTED`, `CANCELLED`), a custom flag `isLocked = true` is set.
- All input fields, addition row triggers, select fields, and the submit buttons are conditionally set with `disabled={isLocked}`.
- A prominent alert lock banner is rendered at the top of the form indicating: "This document is approved and locked. Modifications are disabled."

### Rationale
- UI form inputs visually reflect the immutable state of approved documents, preventing double-approvals or client-side edit attempts.
- Reuses existing component structures without creating duplicate read-only pages, keeping the code clean.

### Alternatives Considered
- **Separate Read-Only Views**: Rejected because it duplicates high volumes of JSX and increases maintenance overhead.

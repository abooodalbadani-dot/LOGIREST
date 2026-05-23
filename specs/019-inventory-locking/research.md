# Research: Inventory Locking & Valuation

**Feature Branch**: `019-inventory-locking` | **Date**: 2026-05-23

This research document details the technical decisions, rationales, and alternatives evaluated for Phase 6 (Inventory Locking, FEFO/FIFO Allocation, and Weighted Average Cost Recalculation).

---

## 1. Pessimistic Concurrency Locking Strategy

### Decision
Use PostgreSQL raw SQL `SELECT FOR UPDATE` locks on targeted rows of `"WarehouseItem"` and `"WarehouseItemLot"` inside an active Prisma database transaction (`tx`).

### Rationale
- **Prisma Limitations**: Prisma's query builder does not natively support locking hints like `SELECT FOR UPDATE` or `SELECT FOR SHARE`.
- **Absolute Integrity**: Standard optimistic concurrency control (`version` fields) works well for documents (PR, PO) but causes excessive transaction rollbacks and retries on fast-moving inventory rows (e.g., when multiple kitchen requests or GRNs update the same item/lot simultaneously).
- **Database Enforcement**: `SELECT FOR UPDATE` blocks subsequent concurrent select/update attempts on the same rows at the database driver level, forcing serial execution.

### Alternatives Considered
- **Optimistic Locking on Stock Balances**: Rejected because concurrent issues during peak kitchen hours would cause high conflict rates, throwing frequent `409` errors and disrupting operations.
- **Application-Level Locks (Redis/Memory)**: Rejected because it introduces external dependencies, network overhead, and fails to handle database mutations triggered outside the main application container.

---

## 2. Deadlock Prevention (Lock Ordering)

### Decision
Enforce a strict, deterministic ordering strategy: all inventory rows locked within a single transaction must be sorted ascending by `itemId`, and within the same item, sorted ascending by `lotId` prior to executing the `SELECT FOR UPDATE` queries.

### Rationale
- **Circular Wait Elimination**: Deadlocks occur when Transaction 1 holds a lock on Item A and waits for Item B, while Transaction 2 holds a lock on Item B and waits for Item A. Sorting the resource locks deterministically ensures both transactions attempt to acquire locks in the same sequence (A then B), resolving contention sequentially.

### Alternatives Considered
- **Random Lock Ordering**: Rejected as it guarantees deadlocks under concurrent transactional stress.
- **Short Transaction Timeouts**: Rejected because aborting and retrying transactions still degrades throughput compared to eliminating deadlocks by design.

---

## 3. Allocation Strategy (FEFO vs. FIFO vs. Unbatched)

### Decision
Implement a unified `AllocationService` that inspects the master data `Item` configuration and routes allocations dynamically:
1. **Perishable/Expiry Items** (`hasExpiry = true`): FEFO (First-Expired, First-Out). Sorted by `expiryDate ASC`, then `receivedDate ASC`. Expired lots (expiry in the past) are filtered out from allocation.
2. **Batched/Non-Perishable Items** (`isBatched = true, hasExpiry = false`): FIFO (First-In, First-Out). Sorted by `receivedDate ASC`.
3. **Standard/Unbatched Items** (`isBatched = false, hasExpiry = false`): Direct global balance deduction from `WarehouseItem` without generating lot allocations.

### Rationale
- **LogiRest Constitution Compliance**: Aligns with Core Principle III (Safety & Waste Reduction).
- **Waste Mitigation**: FEFO prevents perishables from spoiling in store rooms. FIFO ensures general materials are rotated properly.

### Alternatives Considered
- **Manual Batch Selection Only**: Rejected because it increases manual entry errors and slows down high-volume scanning wedge workflows in kitchens.

---

## 4. Weighted Average Cost (WAC) Valuation

### Decision
Recalculate the Weighted Average Cost (WAC) only on Goods Received Notes (GRNs) using the formula:
$$\text{New WAC} = \frac{\text{Current Qty} \times \text{Current WAC} + \text{Received Qty} \times \text{Received Cost}}{\text{Current Qty} + \text{Received Qty}}$$
Cost is warehouse-scoped and updated directly in `"WarehouseItem"`. Every change is logged as an immutable entry in `"CostLedger"`. Positive adjustments (surpluses) inherit the current WAC and do not alter the unit cost basis.

### Rationale
- **Standard Accounting Practices**: Adjustments, write-offs, or issues should not alter the unit purchase price basis of inventory assets. Only actual purchase transactions (GRNs) establish new pricing baselines.
- **Isolation**: Storing WAC per warehouse prevents price distortions between branches caused by localized shipping costs or regional pricing.

### Alternatives Considered
- **Global (Company-Wide) WAC**: Rejected because local shipping, custom duties, and localized branch purchasing prices require warehouse-level cost center accuracy.

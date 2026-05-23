# Feature Specification: Inventory Transactions (Phase 7)

**Feature Branch**: `020-inventory-transactions`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "Phase 7 of LogiRest Kitchen-Store Inventory System: Inventory Transactions"

## Clarifications

### Session 2026-05-23

- Q: How should the system handle incoming inventory mutations when the active stocktake lock has exceeded its 72-hour duration without being posted or canceled? → A: Block all postings and require manual Admin/Manager unlock via endpoint.
- Q: How should the system handle a transfer receipt where receivedQty < shippedQty? → A: Complete the receipt, change status to RECEIVED, and store the variance and varianceReason on the transfer line.
- Q: At what level should the negative stock check be enforced during stock deduction? → A: Enforce at both levels: block if the specific lot goes negative (for batched items) OR if the warehouse-item total goes negative.
- Q: Should WAC be recalculated for all posted adjustments or only for positive adjustments (INCREASE)? → A: Recalculate WAC only on INCREASE adjustments. DECREASE adjustments do not alter the WAC.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Posting a Goods Received Note (GRN) (Priority: P1)

A warehouse keeper posts a GRN for incoming goods. The backend atomically locks the warehouse items and item lots, updates quantities, recalculates the Weighted Average Cost (WAC), records a ledger entry, and saves cost ledger and audit records.

**Why this priority**: Goods receiving is the entry point for all inventory, setting the initial stock levels and unit cost baseline.

**Independent Test**: Can be tested by posting a RECEIVED GRN. Verifies that inventory balance and WAC update correctly, and StockLedger shows positive change.

**Acceptance Scenarios**:

1. **Given** a GRN in RECEIVED status for a specific warehouse, **When** post is called by an authorized role, **Then** quantities are incremented in WarehouseItemLot and WarehouseItem, WAC is recalculated, and StockLedger entry is recorded.
2. **Given** a warehouse is locked under stocktake, **When** GRN post is called, **Then** the request is rejected with 423 Locked.

---

### User Story 2 - Posting an Inventory Issue (Priority: P1)

A warehouse keeper posts a Stock Issue. The backend uses the FEFO/FIFO allocation algorithm to select the correct lots, locks the rows, decreases the on-hand quantities, records lot allocation details, and logs the StockLedger (ISSUE_OUT) entries.

**Why this priority**: Stock issuing is the primary way stock leaves the warehouse for department consumption.

**Independent Test**: Can be tested by posting a SUBMITTED Stock Issue, checking that stock is decremented in correct FEFO/FIFO order and allocations are logged.

**Acceptance Scenarios**:

1. **Given** a Stock Issue in SUBMITTED status with items, **When** post is called, **Then** the system allocates lots according to FEFO/FIFO, deducts stock, and records ISSUE_OUT ledger entries.
2. **Given** an issue quantity exceeding available stock for a lot/item, **When** post is called, **Then** the transaction rolls back with 422 Unprocessable Entity.

---

### User Story 3 - Warehouse Transfer Shipping & Receiving (Priority: P2)

A warehouse keeper ships items from a source warehouse and receives them at a destination warehouse. The transfer happens in two atomic steps: SHIP (deducts source stock, sets status to IN_TRANSIT) and RECEIVE (adds destination stock, updates status to RECEIVED, records any quantity variance and varianceReason).

**Why this priority**: Moving stock between warehouses safely requires strict transactional boundaries to prevent stock "disappearing" or duplicating.

**Independent Test**: Can be tested by shipping a transfer (verifying deduction) and then receiving it (verifying addition and variance tracking).

**Acceptance Scenarios**:

1. **Given** a Transfer in DRAFT status, **When** ship is called, **Then** the source warehouse inventory is decremented, a TRANSFER_OUT ledger entry is created, and status becomes IN_TRANSIT.
2. **Given** a Transfer in IN_TRANSIT status, **When** receive is called, **Then** the destination warehouse inventory is incremented, a TRANSFER_IN ledger entry is created, and status becomes RECEIVED.

---

### User Story 4 - Posting Stock Adjustments (Priority: P2)

An authorized user registers stock adjustments (surpluses/deficits). The backend verifies status and locks the rows, applying the adjustment to the live balance and logging it to the stock ledger.

**Why this priority**: Adjustments handle unexpected stock variations (damage, theft, counting errors).

**Independent Test**: Can be tested by submitting and posting an adjustment, checking that inventory updates correctly.

**Acceptance Scenarios**:

1. **Given** an Adjustment in APPROVED status with direction INCREASE, **When** post is called, **Then** stock is incremented and ADJUSTMENT_IN ledger entries are written.
2. **Given** an Adjustment in APPROVED status with direction DECREASE, **When** post is called, **Then** stock is decremented and ADJUSTMENT_OUT ledger entries are written.

---

### User Story 5 - Posting a Stocktake Session (Priority: P3)

An administrator posts a completed stocktake count. The system reconciles the variance between the counted quantities and the snapshots, writes adjustment entries to the stock ledger, updates live balances, and releases the warehouse lock.

**Why this priority**: Resolving periodic physical counts is necessary to keep system stock aligned with physical stock.

**Independent Test**: Can be tested by posting an APPROVED stocktake, verifying live stock matches counted quantities, and checking that the warehouse lock is deactivated.

**Acceptance Scenarios**:

1. **Given** a Stocktake Session in APPROVED status, **When** post is called, **Then** the system writes STOCKTAKE_ADJ ledger entries for any variance, updates WarehouseItemLot, and deactivates the WarehouseLock.

### Edge Cases

- What happens if concurrent transactions try to allocate the same lot?
  - Row locking (SELECT FOR UPDATE) blocks concurrent operations on those specific lots until the first transaction commits or rolls back.
- What happens if the destination warehouse is locked during Transfer RECEIVE?
  - The RECEIVE transaction is rejected with 423 Locked.
- What happens if WAC calculation results in a division by zero or negative cost?
  - The system checks if `currentQty + receivedQty == 0`. If so, WAC remains unchanged or defaults to the incoming item unit cost to avoid division-by-zero or negative cost.
- What happens if an API call is retried?
  - Posting actions check the database document status first. If already POSTED, the request is rejected or resolved idempotently.
- What happens if a stocktake lock exceeds its 72-hour duration?
  - The lock status transitions to "STALE" but continues to block all inventory mutations in that warehouse. An Administrator or Manager must execute a manual unlock command to clear the lock.
- What happens if shipped quantity does not match received quantity during transfer RECEIVE?
  - The receiving transaction completes, updates status to RECEIVED, and records the variance quantity and mandatory `varianceReason` on the transfer line, allowing resolution to proceed offline.
- What happens if a lot has sufficient quantity but the overall item balance in the warehouse goes negative, or vice versa?
  - The transaction is blocked and rolled back. Both the individual lot balance (for batched items) and the overall warehouse-item balance must remain non-negative after deduction.
- What happens to WAC during stock adjustments?
  - An `INCREASE` adjustment triggers WAC recalculation using the line's `unitCost` and updates `WarehouseItem.weightedAvgCost`. A `DECREASE` adjustment does not trigger WAC recalculation, as stock is deducted at the current average cost, leaving the average cost unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST perform all posting actions (GRN post, Issue post, Transfer ship/receive, Adjustment post, Stocktake post) within atomic database transactions.
- **FR-002**: System MUST acquire pessimistic row locks (`SELECT FOR UPDATE`) on mutating `WarehouseItemLot` and `WarehouseItem` records inside the posting transaction to ensure serialization.
- **FR-003**: System MUST execute the FEFO/FIFO lot allocation algorithm during Issue post and Transfer ship, selecting lots progressively based on expiry or receipt date.
- **FR-004**: System MUST recalculate the Weighted Average Cost (WAC) of items upon posting a GRN or an `INCREASE` stock adjustment using the WAC formula, logging the WAC update in `CostLedger`.
- **FR-005**: System MUST prevent negative stock levels by verifying available balance inside the locked transaction; any negative balance at either the specific lot level (for batched items) or the warehouse-item total level MUST trigger a transaction rollback and throw a 422 error.
- **FR-006**: System MUST verify that the target warehouse is not locked under stocktake before executing any posting transaction (except Stocktake post).
- **FR-007**: System MUST write immutable, append-only entries to `StockLedger` for every inventory change.
- **FR-008**: System MUST write audit logs (`AuditLog`) capturing the state before and after each posting transaction.
- **FR-009**: System MUST treat expired stocktake locks (>72 hours) as active blockers ("STALE") for all inventory mutations until they are manually unlocked by an authorized `ADMIN` or `INV_MGR` user.
- **FR-010**: System MUST allow transfer receipt completion with a quantity variance, provided a non-empty `varianceReason` is supplied.

### Key Entities *(include if feature involves data)*

- **StockLedger**: Append-only transaction log representing historical inventory movements. Attributes include `transactionType`, `documentId`, `qtyChange`, `resultingQtyOnHand`, `unitCost`, and `postedAt`.
- **CostLedger**: Append-only log of WAC changes. Attributes include `oldWac`, `newWac`, `triggerType`, and `recordedAt`.
- **WarehouseItemLot**: Live position table tracking quantities per item, per lot, per warehouse.
- **WarehouseItem**: Live position table tracking total quantity and WAC per item, per warehouse.
- **WarehouseLock**: Record blocking all inventory write operations for a warehouse while a stocktake session is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Posting transactions execute in under 500ms under typical loads.
- **SC-002**: System prevents negative stock (onHandQty < 0) under concurrent load with zero exceptions.
- **SC-003**: 100% of inventory movements result in matching append-only `StockLedger` records.
- **SC-004**: All ledger entries are fully auditable, matching exactly with document-level totals.

## Assumptions

- Database transactions use appropriate isolation levels (e.g. Serializable or Read Committed with raw locks).
- All transactions are driven by users with appropriate roles as verified by guards.
- Currency rates (FX rates) are captured correctly prior to GRN posting.

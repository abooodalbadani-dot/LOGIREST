# Feature Specification: Inventory Locking

**Feature Branch**: `019-inventory-locking`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "Implement Phase 6 Inventory Locking (Pessimistic row lock engine, FEFO/FIFO allocation service, and WAC calculator service) as described in PROJECT_MAP.md"

## Clarifications

### Session 2026-05-23
- Q: At what stage in the document lifecycle should the system execute lot allocation and deduct stock? → A: Option A - At posting time only (Hard Deduction). No allocations exist for draft documents. All checks and lock allocations happen atomically when posting.
- Q: How should the system handle lots that have already passed their expiry dates during automatic allocation? → A: Option A - Auto-Exclude Expired Lots (Safe by Default). Expired lots are completely filtered out from automatic FEFO allocation. Issues/transfers will fail if only expired lots have stock.
- Q: Should positive inventory adjustments (e.g., adding stock due to a discovered surplus) recalculate the item's WAC, and if so, at what cost basis? → A: Option A - Inherit Current WAC (No change to cost basis). Discovered surpluses are valued at the current WAC. The total asset value increases, but the unit WAC remains unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Intelligent Lot Allocation (FEFO/FIFO) (Priority: P1)

As a warehouse keeper, I want the system to automatically allocate inventory from the correct batches or lots when issuing or transferring stock—using First-Expired, First-Out (FEFO) for items with expiry dates and First-In, First-Out (FIFO) for items without expiry dates—so that inventory waste is minimized and older stock is utilized first.

**Why this priority**: Core inventory compliance requirement. Ensuring that perishable or aged stock is utilized first is essential to prevent inventory write-offs and financial loss.

**Independent Test**: Can be tested by posting a stock deduction request (e.g., an issue or transfer) for an item that has multiple lots with different expiry dates or received dates, and verifying that the system deducts stock from the oldest/closest-to-expiry lots first.

**Acceptance Scenarios**:

1. **Given** a batched item with expiry tracking has Lot A (expires in 5 days, 10 units on hand) and Lot B (expires in 10 days, 20 units on hand),  
   **When** a user posts a stock issue for 15 units of this item,  
   **Then** the system allocates 10 units from Lot A and 5 units from Lot B.

2. **Given** a batched item without expiry tracking has Lot C (received 3 days ago, 10 units on hand) and Lot D (received 1 day ago, 20 units on hand),  
   **When** a user posts a stock issue for 15 units of this item,  
   **Then** the system allocates 10 units from Lot C and 5 units from Lot D.

3. **Given** an unbatched item with no expiry tracking has a total balance of 30 units on hand,  
   **When** a user posts a stock issue for 15 units of this item,  
   **Then** the system deducts 15 units directly from the global balance without allocating from specific lots.

---

### User Story 2 - Prevention of Negative Stock and Race Conditions (Priority: P1)

As a store owner, I want the system to block concurrent transactions from double-deducting stock or driving inventory levels below zero, so that our digital records always match the actual physical stock in the warehouse.

**Why this priority**: Fundamental database constraint. Negative stock breaks auditing invariants, creates reconciliation issues, and indicates a race condition or logic failure in the application.

**Independent Test**: Can be tested by simulating two rapid, concurrent deduction requests that together exceed the available stock of a lot or item, and verifying that one request succeeds while the other is rejected with an insufficient stock message, leaving the final balance non-negative.

**Acceptance Scenarios**:

1. **Given** Lot A of an item has 10 units available,  
   **When** two concurrent transaction requests are submitted to deduct 6 units each from Lot A,  
   **Then** one transaction completes successfully (reducing the balance to 4 units) and the other transaction is sequentially blocked until the first completes, and then fails with a stock shortage rejection.

2. **Given** multiple transactions are concurrently trying to lock and deduct stock from different combinations of items,  
   **When** the transactions execute,  
   **Then** the system locks the items in a deterministic, sequential order (e.g., sorted by item ID and lot ID) to guarantee that no deadlock occurs.

---

### User Story 3 - Automatic Weighted Average Cost (WAC) Recalculation (Priority: P2)

As an inventory accountant, I want the system to automatically recalculate the weighted average cost (WAC) of an item whenever new stock is received at a different price, so that our balance sheets and cost of goods sold (COGS) are always accurate and reflect real-time pricing.

**Why this priority**: Necessary for financial accuracy. Prevents manual cost adjustments and ensures inventory valuation is dynamically calculated on every receipt.

**Independent Test**: Can be tested by posting a Goods Received Note (GRN) for an item with a unit price different from its current average cost, and verifying that the item's unit cost updates to the correct weighted average and that a cost log is created.

**Acceptance Scenarios**:

1. **Given** an item has 10 units on hand at a current WAC of $5.00,  
   **When** a GRN is posted receiving 10 additional units of the item at $7.00 each,  
   **Then** the system updates the item's WAC to $6.00 and logs the cost recalculation in the cost ledger.

2. **Given** an item has 0 units on hand,  
   **When** a GRN is posted receiving 10 units at $8.00 each,  
   **Then** the system sets the item's WAC directly to $8.00.

---

### Edge Cases

- **Partial Availability**: If a user requests a deduction of 20 units of a batched item, and the sum of all available lots is only 15 units, the entire transaction must rollback and reject, leaving no partial deductions.
- **WAC Calculation with Negative Corrections**: If stock adjustments or inventory corrections temporarily drive stock levels to zero or negative, a subsequent GRN must establish the unit cost as the new cost basis rather than producing dividing-by-zero or negative cost calculations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement pessimistic row-level locking on inventory balance rows (`WarehouseItem` and `WarehouseItemLot`) during any write transaction to guarantee sequential mutation and prevent race conditions.
- **FR-002**: For items configured with expiry date tracking, the system MUST allocate stock for deductions using a First-Expired, First-Out (FEFO) order (sorted by expiry date ascending, then received date ascending).
- **FR-003**: For items configured with batch/lot tracking but no expiry date, the system MUST allocate stock for deductions using a First-In, First-Out (FIFO) order (sorted by received date ascending).
- **FR-004**: For items with no batch or expiry tracking, the system MUST deduct quantities directly from the global warehouse item balance without generating lot allocations.
- **FR-005**: The system MUST reject any transaction that attempts to deduct more stock than is currently available in the locked lot or item balance, throwing an insufficient stock exception and rolling back all changes.
- **FR-006**: When locking multiple items or lots in a single transaction, the system MUST sort and acquire locks in a deterministic order (by item ID ascending, then lot ID ascending) to prevent circular deadlocks.
- **FR-007**: The system MUST automatically recalculate the Weighted Average Cost (WAC) of an item upon posting a Goods Received Note (GRN).
- **FR-008**: The WAC recalculation formula MUST be: `New WAC = (Current Qty * Current WAC + Received Qty * Received Unit Cost) / (Current Qty + Received Qty)`.
- **FR-009**: The system MUST record cost adjustments and WAC recalculations in an append-only cost ledger, capturing the old cost, new cost, quantity received, received cost, and the triggering GRN document ID.
- **FR-010**: The system MUST execute lot allocation and stock deduction atomically at the exact moment of posting (POST/SHIP) for all inventory-mutating transactions (draft documents do not reserve or allocate stock).
- **FR-011**: The system MUST exclude expired lots (where expiry date is in the past) from the automatic FEFO allocation logic by default.
- **FR-012**: Positive inventory adjustments (stock increases) MUST inherit the item's current Weighted Average Cost (WAC) and MUST NOT trigger recalculation or change the item's unit cost basis.

### Key Entities *(include if feature involves data)*

- **WarehouseItem**: Tracks the live global inventory balance and unit cost of an item in a specific warehouse.
  - *Attributes*: Warehouse reference, Item reference, Quantity on hand, Weighted average cost.
- **WarehouseItemLot**: Tracks the live inventory balance of a specific batch or lot of an item in a warehouse.
  - *Attributes*: Warehouse reference, Item reference, Lot reference, Quantity on hand, Date received, Expiry date.
- **LotAllocation**: Records the specific lots and quantities allocated for deduction during a transaction.
  - *Attributes*: Transaction reference, Lot reference, Quantity allocated.
- **StockLedger**: An append-only ledger recording all stock movements (inbound receipts, outbound issues, transfers, and adjustments).
  - *Attributes*: Warehouse reference, Item reference, Lot reference, Transaction type, Quantity change, Performed by user, Idempotency key.
- **CostLedger**: An append-only ledger recording all cost basis changes and WAC recalculations.
  - *Attributes*: Warehouse reference, Item reference, Old WAC, New WAC, Quantity received, Received unit cost, Triggering document reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent updates to the same stock balance or lot are processed sequentially without race conditions or balance corruption.
- **SC-002**: 100% of batched items with expiry dates are allocated in strict FEFO order (oldest expiry date first) for all stock deductions.
- **SC-003**: 100% of batched items without expiry dates are allocated in strict FIFO order (oldest receipt date first) for all stock deductions.
- **SC-004**: 100% of cost basis recalculations are accurate to 4 decimal places and logged in the cost ledger.
- **SC-005**: Zero transactions can result in negative stock balances for any lot or warehouse item.
- **SC-006**: Zero transactions result in database deadlocks under concurrent load.

## Assumptions

- **A-001**: Items are correctly configured as batched and/or having expiry dates before transactions are posted.
- **A-002**: Database transactions are supported and enforce atomicity and serialization for all ledger modifications.
- **A-003**: Weighted average cost calculation only triggers on inbound inventory receipts (GRNs) and is not affected by adjustments unless explicitly specified.

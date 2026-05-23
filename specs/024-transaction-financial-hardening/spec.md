# Feature Specification: Transactional & Financial Hardening (Phase 2)

**Feature Branch**: `024-transaction-financial-hardening`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "read this file @[c:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\095346a0-3262-4203-aadf-1684e17f34d6\\production_hardening_roadmap.md] and creat a specification for the phase 2 only"

## Clarifications

### Session 2026-05-24

- Q: What is the authorized workflow to unfreeze/reactivate a frozen `WarehouseItem`? → A: Admin posts a Stock Adjustment document referencing the reconciliation discrepancy, which automatically unfreezes the SKU upon posting.
- Q: How should the frontend UI handle and represent a frozen SKU in transaction creation screens? → A: Disable selection entirely in UI grids/dropdowns (rendering the item as locked/greyed out with a warning tooltip), and block submission with a backend validation error.
- Q: Are draft/non-posted documents or internal stocktake sessions included in this sequential numbering service? → A: Both drafts and posted documents share the sequence; if a draft is posted, it retains its number. Deleting a draft marks the number as cancelled but preserves the record.
- Q: Which financial account or entity should bear the cost of the transit loss? → A: Charge the loss to a system-wide Transit Loss Expense account, referencing the original transfer transaction ID.
- Q: Should the sequence generation endpoint enforce its own specific rate limits or throttling? → A: Rely on global API rate limits and standard database transaction timeouts/lock queues, with no sequence-specific throttling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recalculate Cost Basis on Transfers (Priority: P1)

As a warehouse manager, I want the system to propagate the Weighted Average Cost (WAC) from the source to the destination warehouse on transfer receipts based on the actual quantity received, and explicitly write off any transit losses, so that our asset values are financially accurate and reflect physical reality.

**Why this priority**: Crucial business functionality. Currently, the transfer receipt service resets WAC to 0 or ignores the cost basis, erasing the financial value of transferred inventory.

**Independent Test**: Can be fully tested by submitting a transfer shipment with items having a non-zero WAC, posting a transfer receipt with a quantity discrepancy, and verifying that the destination warehouse WAC is correctly recalculated based on received quantity and that a transit loss is recorded in the ledgers.

**Acceptance Scenarios**:

1. **Given** a source warehouse item with WAC $10.00 and a destination warehouse with no current stock, **When** a transfer of 10 units is received in full, **Then** the destination warehouse item WAC is updated to $10.00.
2. **Given** a source warehouse item with WAC $10.00, **When** a transfer of 10 units is shipped but only 8 units are received, **Then** the destination WAC is recalculated based on the 8 received units, and a `TRANSIT_LOSS` of 2 units at $10.00 each is logged in both stock and cost ledgers.

---

### User Story 2 - Sequential Document Numbering (Priority: P2)

As an auditor, I want all key inventory documents (Purchase Orders, Goods Receipt Notes, Stock Adjustments, and Transfer Receipts) to be assigned sequential, branch-prefixed, and annually resetting numbers, so that our documentation meets enterprise compliance standards and prevents gaps or collisions.

**Why this priority**: High compliance requirement. Current document numbering uses `Date.now() + Math.random()` string formats which are non-sequential.

**Independent Test**: Can be tested by generating multiple concurrent documents of the same type within the same branch and calendar year, and asserting that their document numbers are sequential, gap-free, and formatted as `{DOC_TYPE}-{YYYY}-{BRANCH_CODE}-{SEQUENCE_5_DIGITS}`.

**Acceptance Scenarios**:

1. **Given** a document sequence initialized for a branch and year, **When** a new Purchase Order is created, **Then** it receives the next sequential number (e.g., `PO-2026-HQ-00001`).
2. **Given** document generation requests are sent concurrently, **When** documents are processed, **Then** the system assigns consecutive numbers without duplicates or collisions.
3. **Given** the year transitions to a new calendar year, **When** a document is created, **Then** the sequence resets to `00001` (e.g., `PO-2027-HQ-00001`).

---

### User Story 3 - Automated Reconciliation & SKU-level Lock (Priority: P3)

As a store supervisor, I want an automated daily job to audit the database records for stock discrepancies and, if any drift is found, immediately freeze mutations for the affected item while raising an alert, so that database errors do not compound without halting unaffected operations.

**Why this priority**: Automates database and ledger integrity checking, protecting the inventory ledger from cascading errors without disrupting unrelated warehouse operations.

**Independent Test**: Can be tested by injecting a manual quantity discrepancy on a warehouse item record, running the reconciliation job, and verifying that the item's state is updated to frozen (blocking mutations) and a critical alert is dispatched to administrators.

**Acceptance Scenarios**:

1. **Given** a warehouse item quantity matches the sum of its ledger entries, **When** the daily reconciliation job runs, **Then** the item remains active and unfrozen.
2. **Given** a discrepancy exists between a warehouse item's physical quantity and its ledger history, **When** the reconciliation job runs, **Then** the item's state is set to frozen, mutations are blocked for it, and a critical alert is logged.

---

### Edge Cases

- **Simultaneous Transfers**: Handling WAC recalculations when multiple transfers for the same item are received at the same time in the same destination warehouse.
- **Negative Recalculation**: Ensuring that under no circumstances can WAC calculations or adjustments result in negative unit costs or negative stock values.
- **Year-End Concurrency**: Document creation requests initiated right at the stroke of midnight on December 31st/January 1st must transition to the new year sequence cleanly.
- **Discrepancy Resolution**: A frozen item/SKU is reactivated automatically only when an authorized Administrator posts a Stock Adjustment document referencing and correcting the discrepancy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST perform Weighted Average Cost (WAC) recalculations using mathematically precise decimal representation (eliminating native floating-point rounding errors) for all financial calculations.
- **FR-002**: System MUST recalculate the destination warehouse's WAC on receipt of a transfer using the formula:
  $$\text{WAC}_{\text{new}} = \frac{(\text{Qty}_{\text{existing}} \times \text{WAC}_{\text{existing}}) + (\text{Qty}_{\text{received}} \times \text{WAC}_{\text{source}})}{\text{Qty}_{\text{existing}} + \text{Qty}_{\text{received}}}$$
- **FR-003**: System MUST record any discrepancy between shipped and received quantities in a transfer receipt as a `TRANSIT_LOSS` or `DISCREPANCY` transaction in both `StockLedger` and `CostLedger`, charging the monetary cost of the loss directly to a system-wide Transit Loss Expense account, and referencing the original transfer transaction ID.
- **FR-004**: System MUST format document numbers as `{DOC_TYPE}-{YYYY}-{BRANCH_CODE}-{SEQUENCE_5_DIGITS}` for the following document types: Purchase Orders (`PO`), Goods Receipt Notes (`GRN`), Stock Adjustments (`SA`), and Transfer Receipts (`TR`).
- **FR-005**: System MUST store document sequences in a dedicated tracking table with a compound unique key on document type, year, and branch identifier, and perform increments atomically at the database transaction level to prevent duplicate numbering.
- **FR-006**: System MUST reset document sequences to `00001` automatically when the calendar year transitions.
- **FR-007**: System MUST run a daily reconciliation job that compares `WarehouseItem` qtyOnHand with the historical sum of its transaction quantities in the `StockLedger`.
- **FR-008**: System MUST support freezing a specific SKU (setting an `isFrozen` flag on `WarehouseItem`) if a discrepancy is detected by the reconciliation job, blocking any subsequent stock adjustments, transfers, or receipts for that specific item until resolved.
- **FR-009**: System MUST generate and dispatch a high-severity notification alert to administrators upon detecting reconciliation drift.
- **FR-010**: System MUST automatically unfreeze/reactivate a frozen SKU only upon successful posting of a Stock Adjustment document that corrects the reconciliation discrepancy.
- **FR-011**: Frontend UI MUST disable selection of frozen SKUs in document creation screens (rendering the items greyed out with a warning tooltip), and Backend API MUST explicitly validate and reject any submission containing frozen items with a clear validation error.
- **FR-012**: Document sequences MUST be generated and assigned when the document draft is initially created. If a draft is deleted, its sequence number MUST be preserved in the database but marked as 'cancelled' to maintain audit log completeness and explain any sequence number gaps.

### Key Entities *(include if feature involves data)*

- **DocumentSequence**: Represents the sequence counter for document types. Key attributes: `id`, `documentType` (Enum), `year` (Int), `branchId` (String), `currentSequence` (Int), and prefix (String). Compound unique key on `[documentType, year, branchId]`.
- **WarehouseItem**: Represents the stock level of an item at a warehouse. Key attributes include `isFrozen` (Boolean) to support SKU-level locking, `qtyOnHand`, and `wac`.
- **TransitLoss / Discrepancy Ledger**: Log representation of transit quantity and value differences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Financial rounding error drift is reduced to exactly zero over 100,000 simulated transaction postings.
- **SC-002**: Document generation sequence is collision-free under a concurrency load of 100 requests per second.
- **SC-003**: Reconciliation job completes checking 10,000 SKUs across all warehouses in under 2 minutes.
- **SC-004**: Any attempts to mutate a frozen SKU return an explicit validation error within 100ms.

## Assumptions

- The database schema supports adding `isFrozen` to `WarehouseItem`.
- The timezone used for the annual sequence reset is configured globally (e.g., UTC or Server Local Time).
- The transaction sequence increments are fully backed by the database's locking or atomic operation mechanisms.
- Throttling and security of the document numbering endpoints rely on global API rate limits and database transaction timeouts rather than sequence-specific limits.

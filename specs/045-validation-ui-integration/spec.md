# Feature Specification: Sprint 2: Automated Validation & UI Integration

**Feature Branch**: `045-validation-ui-integration`  
**Created**: 2026-06-01  
**Status**: Draft  
**Input**: User description: "Sprint 2: Automated Validation & UI Integration"

## Clarifications

### Session 2026-06-01

- Q: What is the exact operational scope of the auto-freeze action when an inventory balance discrepancy is detected? → A: Freeze the item only in the affected warehouse where the mismatch was detected.
- Q: At what time should the daily automated cron job execute the ledger consistency scan? → A: Run daily at 1:00 AM (during low-activity hours, matching ledger reconciliation).
- Q: Who should be the recipients of the high-priority notifications when an inventory consistency check fails? → A: Dispatch alerts to global System Administrators AND the local managers/keepers scoped to the affected warehouse.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Stock-to-Ledger Consistency Verification Engine (Priority: P1)

The system automatically audits and certifies inventory balance consistency by comparing the physical transaction logs in the ledger with the cached inventory totals on hand. This ensures that physical stock levels match transaction history exactly across items, warehouses, and lots, and automatically quarantines problematic inventory if a discrepancy occurs.

**Why this priority**: Preventing stock leakage and ensuring ledger-to-balance consistency is a core integrity requirement. Detecting anomalies and freezing compromised items automatically prevents financial and inventory corruption before subsequent operations occur.

**Independent Test**: An administrator triggers the consistency verification engine via a manual admin action, receiving a detailed verification log indicating 100% consistency. To verify failure paths, a database inconsistency is intentionally simulated (e.g. manually modifying a quantity on hand balance). When the engine runs again, it flags the item, applies a lock to block all posting/issue transactions for that item, logs the consistency violation, and issues a critical high-priority alert.

**Acceptance Scenarios**:

1. **Given** a consistent inventory state where stock ledger transaction totals match physical item and lot quantities on hand, **When** the validation engine executes, **Then** it returns a success outcome with a "Certificate of Consistency" detailing verified items, warehouses, and lots with zero discrepancies.
2. **Given** an inconsistent inventory state where the sum of StockLedger quantities does not match the quantity on hand for a WarehouseItem, **When** the validation engine executes, **Then** it identifies the discrepancy, automatically freezes the affected WarehouseItem, records the failure in the audit log, and dispatches critical alerts to administrators.
3. **Given** an inconsistent lot state where the sum of WarehouseItemLot quantities does not equal the WarehouseItem quantity on hand, **When** the validation engine executes, **Then** it flags the inconsistency, freezes the item, and blocks any stock transfers, inventory issues, or procurement postings for that item.

---

### User Story 2 - Confirm Receipt Button in Transfer Viewer UI (Priority: P2)

Warehouse Keepers and Inventory Managers need the ability to complete stock transfers that are currently in-transit by confirming receipt directly inside the transfer viewer.

**Why this priority**: Users must be able to complete the physical stock transfer workflow in the UI. Without this button, transfers remain permanently stuck in-transit, preventing accurate receipt registration and stock reconciliation at the receiving warehouse.

**Independent Test**: A Warehouse Keeper views a stock transfer document in in-transit status, clicks "Confirm Receipt", confirms the confirmation dialog, and verifies that the document status transitions to received and the on-screen controls update dynamically.

**Acceptance Scenarios**:

1. **Given** a stock transfer document in `IN_TRANSIT` status, **When** an authorized user views it in the transfer viewer, **Then** they see an active "Confirm Receipt" button.
2. **Given** a stock transfer document in `IN_TRANSIT` status, **When** the user clicks the "Confirm Receipt" button and approves the confirmation prompt, **Then** the transfer transitions to `RECEIVED` status, the stock balances at the destination warehouse are updated, and the "Confirm Receipt" button is hidden.
3. **Given** a stock transfer document in any status other than `IN_TRANSIT` (e.g., `DRAFT`, `RECEIVED`, `CANCELLED`), **When** the user views it in the transfer viewer, **Then** the "Confirm Receipt" button is not visible or is disabled.

---

### User Story 3 - Submit Button and Hook in Inventory Issue Form (Priority: P2)

Users need to submit draft inventory issues to process physical inventory consumption and transition issues out of draft status.

**Why this priority**: Without a submit action in the UI, inventory issues are permanently locked in a draft state, making it impossible for users to log actual inventory issues and consume stock via the frontend interface.

**Independent Test**: An inventory manager opens a draft inventory issue form, fills in the required fields, clicks the "Submit" button, and verifies that the issue transitions out of draft status and inventory counts decrement accordingly.

**Acceptance Scenarios**:

1. **Given** a draft inventory issue form, **When** the user opens the page, **Then** a visible "Submit" button is displayed.
2. **Given** a draft inventory issue form, **When** the user clicks the "Submit" button and confirms the action, **Then** the UI submits the issue to the backend, the issue transitions out of `DRAFT` status, and the form locks to prevent further edits.
3. **Given** a submitted or voided inventory issue, **When** a user views it, **Then** the "Submit" button is hidden, and all fields are displayed as read-only.

---

### User Story 4 - Form Lock for Non-Draft Procurement Documents (Priority: P3)

Procurement forms (Purchase Requests and Purchase Orders) must be completely locked in the UI once they are approved, posted, or cancelled, mirroring database status locks.

**Why this priority**: Prevents accidental or unauthorized modifications to finalized procurement documents that have already been integrated with financial or vendor records.

**Independent Test**: A user navigates to the edit page of a posted Purchase Order or an approved Purchase Request, and verifies that all input fields, select dropdowns, line item lists, and action buttons are fully disabled.

**Acceptance Scenarios**:

1. **Given** a Purchase Request or Purchase Order in `DRAFT` status, **When** the user opens the edit page, **Then** all form controls are fully editable, and the save/submit actions are enabled.
2. **Given** a Purchase Request or Purchase Order in any non-draft status (e.g., `APPROVED`, `POSTED`, `CANCELLED`), **When** the user opens the edit page, **Then** all input fields, item additions, selectors, and save actions are completely disabled, displaying the document in a read-only state.
3. **Given** an approved Purchase Order, **When** an administrator views it, **Then** all financial and line items are locked, but a read-only audit log section remains accessible.

---

### Edge Cases

- **Concurrent Transactions During Validation**: What happens if the validation engine runs during active, high-volume transactions?
  - *Resolution*: The validation queries must execute using an isolation level or query optimization strategy that prevents lock contention (e.g., read-committed or querying against read-replicas) to ensure normal warehouse operations are not blocked.
- **Alert Delivery Failures**: What happens if the validation engine detects a discrepancy but the Slack webhook or SMTP service is temporarily unavailable?
  - *Resolution*: The system must prioritize the safety lock (immediately auto-freezing the item in the database) and log the failure locally, while retrying the alert dispatch asynchronously.
- **Direct Route Access**: What happens if a user tries to access `/edit` for a non-draft Purchase Order by manually entering the URL?
  - *Resolution*: The UI must evaluate the document state immediately upon data fetch and render the entire form as read-only, preventing any POST/PUT actions from being executed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement an automated ledger-to-balance validation engine that runs daily at 1:00 AM and compares stock transaction ledger sums against cached inventory on-hand balances.
- **FR-002**: The validation engine MUST verify three balance invariants for all active items:
  1. `StockLedger` sum = `WarehouseItem.qtyOnHand` for each item/warehouse.
  2. `StockLedger` sum (by lot) = `WarehouseItemLot.qtyOnHand` for each lot/item/warehouse.
  3. `WarehouseItemLot.qtyOnHand` sum = `WarehouseItem.qtyOnHand` for each item.
  4. Cost ledger transactions and Weighted Average Cost (WAC) values reconcile.
  5. Transfers preserve exact valuation (shipped value = received value + transit loss value).
- **FR-003**: The system MUST provide an authenticated administrative API endpoint to trigger the validation engine on-demand.
- **FR-004**: Upon detecting any consistency discrepancy, the validation engine MUST immediately freeze the affected `WarehouseItem` in that specific warehouse only (setting its status to frozen to block subsequent postings/issues in that warehouse) and record a critical audit log entry.
- **FR-005**: Upon detecting a discrepancy, the system MUST dispatch high-priority notifications to global System Administrators (ADMIN role) AND the local managers/keepers scoped to the affected warehouse via Slack and email.
- **FR-006**: The Transfer Viewer UI MUST render a "Confirm Receipt" button when a transfer's status is `IN_TRANSIT`.
- **FR-007**: Clicking "Confirm Receipt" MUST invoke the transfer receipt state transition, update the document status to `RECEIVED`, record the receipt on-hand balances, and hide the button.
- **FR-008**: The Inventory Issue form UI MUST display a "Submit" button when the issue is in `DRAFT` status.
- **FR-009**: Clicking "Submit" on an Inventory Issue form MUST invoke the issue submission hook, post the inventory transaction, decrement warehouse balances, transition the issue status out of `DRAFT`, and lock the form.
- **FR-010**: The Purchase Request and Purchase Order edit screens MUST completely disable and lock all inputs, selections, line-item controls, and submit actions if the document status is not `DRAFT`.

### Key Entities *(include if feature involves data)*

- **WarehouseItem**: Represents physical inventory totals for a specific item in a warehouse. Attributes include item ID, warehouse ID, quantity on hand, and status (active/frozen).
- **WarehouseItemLot**: Represents inventory totals tracked by lot for an item. Attributes include lot ID, item ID, warehouse ID, and quantity on hand.
- **StockLedger**: Represents the historical transaction ledger recording all inventory ins and outs. Attributes include transaction ID, item ID, warehouse ID, lot ID, quantity, and timestamp.
- **StockTransfer**: Represents a stock transfer document. Attributes include document ID, from warehouse, to warehouse, status (DRAFT, IN_TRANSIT, RECEIVED), and transfer lines.
- **InventoryIssue**: Represents an inventory consumption or issue document. Attributes include document ID, warehouse ID, status (DRAFT, POSTED, VOIDED), and issue lines.
- **PurchaseRequest / PurchaseOrder**: Represents procurement documents with state locks. Attributes include document ID, warehouse ID, status, and lines.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ledger validation scans execute and complete in under 30 seconds for the entire database under normal operating conditions.
- **SC-002**: 100% of physical-to-ledger mismatches are successfully caught, and the affected items are automatically frozen within 1 second of detection.
- **SC-003**: In-transit stock transfer receipt transitions can be fully completed in the UI with a single click, taking under 2 seconds to update the screen.
- **SC-004**: Users are completely blocked from modifying approved or posted procurement documents in the UI, resulting in zero accidental double-approvals or unauthorized modifications.

## Assumptions

- The backend already supports standard role permissions (e.g., `WH_KEEPER` or `INV_MGR`) and basic state machine transitions.
- The `isFrozen` (or similar lock) mechanism exists or is easily supportable on the `WarehouseItem` table without schema modifications.
- Alert notifications (Slack and SMTP) use existing, configured infrastructure settings.
- The user has already run the necessary database migrations and Sprint 1 changes.

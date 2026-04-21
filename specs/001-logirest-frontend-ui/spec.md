# Feature Specification: LogiRest Frontend UI

**Feature Branch**: `001-logirest-frontend-ui`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: User description: "Build the LogiRest Frontend: an Arabic-first (RTL) internal web UI for a multi-branch restaurant chain to run inventory and procurement operations quickly and accurately—reducing waste, preventing stock manipulation, and enabling full auditability."

## Clarifications

### Session 2026-04-19
- Q: FX Rate Source → A: Internal Table (Using rates manually managed in the system's Currency master data).
- Q: Mobile Camera Scanning → A: UI Hooks Only (Prepare layouts/buttons, but scanning logic is deferred/mocked).
- Q: Data Visibility Scope (RBAC) → A: Branch/Warehouse Scoped (Users only see data for their assigned locations).
- Q: Stocktake Lock Behavior → A: Block Posting Only (Users can prepare drafts, but "POST" is disabled until lock released).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Warehouse Inventory Operations (Priority: P1)

As a Warehouse Keeper, I want to perform daily inventory tasks like issuing stock and receiving transfers using a barcode-first interface, so that I can update stock levels accurately and quickly without manual entry errors.

**Why this priority**: This is the core operational value. Without accurate real-time inventory movement, the system cannot fulfill its purpose of reducing waste and preventing manipulation.

**Independent Test**: Can be fully tested by creating a mock "Issue" or "Transfer" document, scanning items into the line items list, and confirming the total, ensuring the interface handles barcode termination characters correctly.

**Acceptance Scenarios**:

1. **Given** an open "Issue" form, **When** a user scans a valid item barcode, **Then** the item is added to the document line items with the default quantity and focus returns to the scan field.
2. **Given** a line item requiring lot allocation, **When** the user clicks the FEFO guide, **Then** the system presents the oldest available lots first for selection.
3. **Given** a completed document, **When** the user clicks "POST", **Then** a clear confirmation modal appears warning that the action is irreversible before finalizing.

---

### User Story 2 - Procurement Workflow (Priority: P1)

As a Procurement Officer, I want to manage the transition from Purchase Request (PR) to Goods Received Note (GRN), handling multi-currency purchases and capturing the foreign exchange (FX) rate at the time of receipt.

**Why this priority**: Procurement is the "input" to the inventory system. Capturing FX at GRN is critical for financial auditability in multi-currency environments.

**Independent Test**: Can be tested by creating a PR, converting it to a PO in a foreign currency, and then creating a GRN where the FX rate is manually captured and locked upon posting.

**Acceptance Scenarios**:

1. **Given** a list of approved PRs, **When** the user selects one to convert, **Then** a PO form is generated with all items pre-filled, allowing supplier and currency selection.
2. **Given** a PO in a foreign currency, **When** posting a GRN, **Then** the UI mandates the entry or confirmation of the current FX rate, which is then stored permanently with the document.

---

### User Story 3 - Stocktake & Warehouse Locking (Priority: P2)

As an Inventory Manager, I want to run a stocktake session that takes a snapshot of current stock and locks movement in the warehouse during the counting process.

**Why this priority**: Essential for auditability and preventing stock manipulation during audits.

**Independent Test**: Can be tested by initiating a stocktake for a specific warehouse and verifying that other operational screens (Issue, Transfer) display a "Locked" status and prevent posting for that warehouse.

**Acceptance Scenarios**:

1. **Given** a warehouse with an active stocktake "Counting" phase, **When** a user attempts to create an "Issue" document for that warehouse, **Then** the system displays a prominent lock banner and disables the "POST" button.
2. **Given** a stocktake count entry, **When** a variance is detected, **Then** the UI requires a mandatory adjustment reason to be entered before the session can be finalized.

---

### Edge Cases

- **Duplicate Scan**: If a user scans the same barcode twice in rapid succession, the system increments the quantity of the existing line item instead of creating a new row, providing clear visual feedback.
- **Expired Items**: When scanning a lot that is past its expiry date, the UI must flag the item with a high-visibility warning and block its issuance unless an specific administrative override reason is provided.
- **Network Loss during Scan**: Since this is frontend-focused, the UI must handle connectivity drops gracefully, informing the user that the last scan was not synchronized and preserving local state if possible.
- **Incorrect Currency Formatting**: In multi-currency screens, all numeric values must be rendered in `dir="ltr"` (left-to-right) context even within the RTL layout to prevent digit reversal in Arabic contexts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a global RTL (Right-to-Left) layout switch based on the selected locale (Arabic-first).
- **FR-002**: Every operational screen MUST support "Scan Mode" where the search input is persistent and optimized for USB barcode wedge input.
- **FR-003**: System MUST implement Role-Based Access Control (RBAC) in the UI, restricting visibility and actions to the user's assigned branch, warehouse, and department scope.
- **FR-004**: Posted documents (GRN, Issue, Stocktake) MUST be rendered as read-only, with no edit or delete controls visible.
- **FR-005**: The UI MUST provide a "Lock Banner" component that appears on any document screen when the selected warehouse is under an active stocktake; the "POST" action MUST be disabled while the lock is active, though drafts may still be prepared.
- **FR-006**: System MUST support multi-currency entry for POs, with the base currency total calculated live using rates manually managed in the system's FX Rates master data table.
- **FR-007**: System MUST provide "Loading", "Empty", "Error", and "Permission Denied" states for every data-fetching component.

### Key Entities *(include if feature involves data)*

- **Inventory Document**: Represents any stock movement (GRN, Issue, Transfer, Adjustment). Attributes include document number, type, warehouse, status (Draft/Posted), and timestamp.
- **Line Item**: A specific item entry within a document, tied to a Lot/Batch and expiry date.
- **Master Data Entity**: High-level records (Items, Warehouses, Suppliers, Users) used to populate dropdowns and validate entries.
- **Stocktake Session**: A specialized workflow entity that manages snapshots, counting, and variance adjustments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Warehouse workers can complete a stock issue of 10 items in under 60 seconds using the barcode-first scan mode.
- **SC-002**: 100% of "POST" actions are preceded by an irreversible confirmation dialog.
- **SC-003**: RTL layout is correctly applied across all 116+ target screens without horizontal overflow or font-rendering issues.
- **SC-004**: Users are prevented from posting movements to a locked warehouse in 100% of attempts.

## Assumptions

- **Users**: Users are presumed to have a basic understanding of inventory terms and have access to USB barcode scanners.
- **Environment**: The application is intended for modern web browsers; old IE support is out of scope.
- **Data Integrity**: We assume the API stubs will eventually be replaced by a backend that enforces the same idempotency and posting rules reflected in the UI.
- **Barcode Formats**: We assume standard EAN/UPC or GS1-128 barcodes are utilized, and the USB wedge is configured to send a carriage return (`Enter`) after the scan.

## [NEEDS CLARIFICATION]

- **Q1 [FX Rate Source]**: RESOLVED (2026-04-19)
- **Q2 [Mobile Camera Scanning]**: RESOLVED (2026-04-19)

# Feature Specification: API Controllers (Phase 8)

**Feature Branch**: `021-api-controllers`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "create a specification for the phase 8 only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Authentication & Scope Authorization (Priority: P1)

As a system user, I want to log in securely and have my session scoped to my authorized branch and warehouse, so that I cannot view or modify inventory data belonging to other warehouses.

**Why this priority**: Core security invariant. Authentication and multi-tenant warehouse data isolation must be enforced before any transaction or master data API is exposed.

**Independent Test**: Log in as a Warehouse Keeper assigned only to Warehouse A, verify that requests to view or edit Warehouse B's inventory return an authorization error.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they request data with a header specifying a warehouse they are authorized for, **Then** the request succeeds.
2. **Given** a user is logged in, **When** they request data with a header specifying a warehouse they are NOT authorized for, **Then** the system returns a 403 Forbidden error.
3. **Given** a user is NOT logged in, **When** they access any protected endpoint, **Then** the system returns a 401 Unauthorized error.

---

### User Story 2 - Procurement Document Lifecycles: PR, PO, & GRN (Priority: P1)

As a Purchase Officer or Warehouse Keeper, I want to manage the full lifecycle of Purchase Requests, Purchase Orders, and Goods Received Notes, so that I can draft, submit, approve, and post received goods into inventory.

**Why this priority**: Essential procurement workflow. It is required to bring stock into the system and record the necessary ledger entries.

**Independent Test**: Create a PR draft, transition it through submission and approval, convert it to a PO, approve the PO, create a GRN for the PO, and post the GRN to increment warehouse inventory.

**Acceptance Scenarios**:

1. **Given** a document in Draft status, **When** a user with appropriate role submits it, **Then** the status changes to Submitted and an approval event is logged.
2. **Given** a Purchase Order is approved, **When** a Warehouse Keeper creates and posts a Goods Received Note against it, **Then** the GRN status changes to Posted, inventory quantities are increased, and a Stock Ledger record is created.
3. **Given** a user tries to modify a document that has already been Posted, **When** they submit a change request, **Then** the system rejects the update.

---

### User Story 3 - Stocktake and Reconciliation (Priority: P2)

As a Warehouse Manager, I want to run a stocktake session to verify and adjust physical quantities, ensuring that the warehouse is locked during counting to prevent inventory discrepancy.

**Why this priority**: Required for data integrity during physical audits. Prevents race conditions during stock reconciliation.

**Independent Test**: Start a stocktake session, attempt to post a GRN or Issue to the same warehouse (which should fail), input count results, approve the session, and post it to release the lock and reconcile inventory.

**Acceptance Scenarios**:

1. **Given** a stocktake session is started, **When** any user attempts to post an inventory-altering transaction for that warehouse, **Then** the transaction is blocked with a 423 Locked error.
2. **Given** a stocktake session is in Review status, **When** an Admin posts the session, **Then** the system reconciles balances, releases the warehouse lock, and logs Stock Ledger adjustment entries.

---

### User Story 4 - Operations: Issues, Transfers, and Adjustments (Priority: P2)

As a Warehouse Keeper or Kitchen Staff, I want to issue items, transfer stock between warehouses, and perform stock adjustments, so that inventory movement and corrections are tracked.

**Why this priority**: Core operations. Handles all inventory consumption, internal distribution, and administrative stock corrections.

**Independent Test**: Initiate an inventory transfer from Warehouse A to Warehouse B, ship the items (deducting from A), and receive them at Warehouse B (adding to B) with variance recording if quantities differ.

**Acceptance Scenarios**:

1. **Given** an inventory transfer is in transit, **When** it is received with a discrepancy in quantity, **Then** the system requires a variance reason and records the difference in the transaction.
2. **Given** an inventory issue is submitted, **When** it is posted, **Then** items are allocated and deducted from stock using FEFO/FIFO rules.

---

### Edge Cases

- **Concurrent Approvals**: What happens when two managers attempt to approve the same Purchase Request simultaneously? The system must detect the race and reject the second approval with a 409 Conflict.
- **Stocktake Lock Expiry**: How does the system handle a warehouse lock that remains active after the stocktake is complete or abandoned? The lock remains active but can be manually marked as stale and unlocked by an administrator.
- **Negative Stock Prevention**: What happens if an issue is posted concurrently, and the combined quantity exceeds available stock? The system must block the second deduction and throw an insufficient stock error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate users and maintain secure sessions, exposing endpoints for login, logout, and checking current session status.
- **FR-002**: The system MUST authorize requests based on the user's role and validate the warehouse scope specified in headers against the user's authorized scopes.
- **FR-003**: The system MUST expose CRUD endpoints for all master data entities (Branches, Warehouses, Items, Suppliers, UOMs, Categories, Currencies, FX Rates, and Barcodes) with pagination and filtering.
- **FR-004**: The system MUST enforce the document state machine transitions (Draft -> Submitted -> Approved -> Posted/Cancelled) at the controller level using a workflow state guard.
- **FR-005**: The system MUST prevent duplicate creation of documents by validating client-provided idempotency keys on creation endpoints.
- **FR-006**: The system MUST reject any stock-mutating write operations on a warehouse that is currently locked by an active stocktake session.
- **FR-007**: The system MUST require variance reasons when receiving transfers where the received quantity does not match the shipped quantity.
- **FR-008**: The system MUST block hard deletion of master data entities (e.g., Items, Warehouses) if they have associated transaction history. Instead, the system MUST support soft-deletion or archiving (using the `isActive` status flag). The system MUST block archiving a warehouse if it has a non-zero stock balance, but allow archiving (`isActive = false`) if it has historical transactions with exactly zero stock. Archived warehouses MUST be excluded from active operational queries while remaining queryable for reports and audit logs.

### Key Entities *(include if feature involves data)*

- **User Session**: Authentication context containing user permissions and authorized warehouse scopes.
- **Master Data (Items, Warehouses, UOMs, Suppliers, etc.)**: Lookup records used in inventory transactions.
- **Procurement Documents (PR, PO, GRN)**: Request, order, and receipt documents governing the purchasing lifecycle.
- **Operational Documents (Issues, Transfers, Adjustments)**: Movement and adjustment records tracking internal stock actions.
- **Stocktake Session**: The orchestration record for physical counts, variance audit, and lock management.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of API endpoints enforce role-based access control and warehouse scope validation.
- **SC-002**: 100% of document status transitions are validated against the transition rules, returning errors for out-of-sequence actions.
- **SC-003**: Zero stock-mutating operations can bypass the active stocktake lock on a warehouse.
- **SC-004**: Double-submissions with the same idempotency key are detected and resolved without producing duplicate records.

## Assumptions

- The frontend application will provide the active warehouse and branch IDs in headers for all scoped queries.
- Master data lookup values (e.g. Base Currency, default UOMs) are seeded before testing document transactions.
- Deleting an entity with transactional dependencies is restricted to preserve ledger integrity.

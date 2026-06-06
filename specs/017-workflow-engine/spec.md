# Feature Specification: Workflow Engine

**Feature Branch**: `017-workflow-engine`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "read this e:\kitchen-store-inventory-system\PROJECT_MAP.md file and creat a specification for the phase 4 only"

## Clarifications

### Session 2026-05-22

- Q: How should the conversion of an APPROVED Purchase Request (PR) to a Purchase Order (PO) be triggered? → A: Manual Action (The Procurement Officer manually triggers the conversion via `POST /api/purchase-requests/:id/convert-to-po`).
- Q: The `ApprovalEvent` model in `schema.prisma` currently lacks fields for `stepNumber`, `userRole`, and `comments`. How should we handle storing these fields? → A: Schema Update (Modify `schema.prisma` to add `stepNumber: Int`, `userRole: Role`, and `comments: String?` fields, and create a migration).
- Q: How should workflow status transition attempts (both successful and failed) be logged to satisfy the security audit logging requirement (FR-007)? → A: Database `AuditLog` (Write a record directly to the existing database `AuditLog` table with action, targetTable, state JSONs, etc.).
- Q: When a user triggers a workflow transition, should the `WorkflowStateGuard` validate that the client's expected version matches the current database version, or should version verification be deferred entirely to the database update transaction? → A: Defer to Update (The guard only validates status transitions and role capabilities; version matching and concurrency exceptions are handled inside the database transaction).
- Q: How should workflow state transitions handle documents that belong to a warehouse that is currently locked for stocktake? → A: Only Block Inventory-Affecting Actions (Only block transitions that mutate stock levels, e.g., POST for GRN/Issue/Adjustment, SHIP/RECEIVE for Transfer, allowing planning/procurement PR/PO to proceed).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Document Status Transition Enforcement (Priority: P1)

As a store manager or procurement officer, when I perform an action on a document (like submitting a draft, or approving a request), the system must validate that the document is currently in the correct state for that action and transition it to the new state. If the document is already in a locked status, or the transition is invalid, the action must be rejected.

**Why this priority**: Core system integrity. Prevents documents from bypassing approval states or double-submitting.

**Independent Test**: Create a draft document, submit it to transition it to pending, and try to submit it again. The second submission must fail.

**Acceptance Scenarios**:

1. **Given** a Purchase Request in DRAFT status, **When** the creator submits it, **Then** the status transitions to SUBMITTED and an approval event is logged.
2. **Given** a Purchase Request in SUBMITTED status, **When** the creator tries to submit it again, **Then** the action is rejected and the status remains SUBMITTED.
3. **Given** a Purchase Request in APPROVED status, **When** the creator tries to edit it, **Then** the edit is rejected because the document is locked in its current status.

---

### User Story 2 - Role-Based Workflow Capability Validation (Priority: P1)

As an administrator, I want to ensure that only users with correct roles can execute specific status transitions (e.g., only Approvers can approve, Warehouse Keepers can count stocktake). If a user attempts an unauthorized transition, the system must block it.

**Why this priority**: Essential for security and audit compliance. Bypassing authorization violates the zero-trust architecture.

**Independent Test**: A Warehouse Keeper tries to approve a Purchase Request. The approval must be blocked.

**Acceptance Scenarios**:

1. **Given** a Purchase Request in SUBMITTED status, **When** a user with the APPROVER role approves it, **Then** the status transitions to APPROVED.
2. **Given** a Purchase Request in SUBMITTED status, **When** a user with the WAREHOUSE_KEEPER role attempts to approve it, **Then** the system blocks the action and logs a security exception.

---

### User Story 3 - Conversion of Approved Purchase Requests (Priority: P2)

As a Procurement Officer, when a Purchase Request is APPROVED, I want to convert it to a Purchase Order to initiate purchasing with a supplier. The system should create a corresponding PO referencing the original PR.

**Why this priority**: Streamlines the procurement pipeline and preserves the audit trail between PR and PO.

**Independent Test**: Convert an approved PR to a PO and verify the new PO links back to the PR.

**Acceptance Scenarios**:

1. **Given** a Purchase Request in APPROVED status, **When** a Procurement Officer converts it to a Purchase Order, **Then** a new Purchase Order is created in DRAFT status referencing the PR ID.

---

### Edge Cases

- **Concurrent Status Modifications**: Two users attempt to transition the same document simultaneously. Since `WorkflowStateGuard` only validates state and role authorization, concurrency is enforced at the database layer (using the version lock). The second user's update will fail the version check during the update transaction and return a `409 Conflict` exception.
- **Database/Network Failures**: How does the system handle a transition action if the database connectivity is lost during the state transition transaction?
- **Warehouse Operational Locks**: When a warehouse is locked for stocktake, the workflow engine (or validation layer) MUST block transitions that physically mutate stock levels (e.g., `POST` actions on GoodsReceivedNote, InventoryIssue, Adjustment, or `SHIP`/`RECEIVE` on Transfer), while permitting non-inventory-affecting workflows (PR/PO draft, submission, and approval) to proceed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authorize every state transition against a predefined document state machine.
- **FR-002**: The system MUST validate that the user's role has permission to execute the requested action before transitioning the state.
- **FR-003**: The system MUST load the document's current state directly from the database for validation to prevent client-side bypass.
- **FR-004**: The system MUST automatically update the document's status to the target status upon a successful transition.
- **FR-005**: Every successful workflow action MUST create an immutable Approval Event record containing the action type, step number, timestamp, user ID, user role, and optional comments.
- **FR-006**: The system MUST reject any invalid status transition or unauthorized action with a clear error indicating the validation failure.
- **FR-007**: Every status transition attempt (both successful and failed) MUST be recorded in the database `AuditLog` table, capturing the user ID, transition action, document type, ID, and before/after state JSON.
- **FR-008**: The system MUST support manual conversion of an APPROVED Purchase Request to a DRAFT Purchase Order via a specialized transition action endpoint.

### Key Entities *(include if feature involves data)*

- **Workflow State Machine**: The core model mapping documents (Purchase Request, Purchase Order, Goods Received Note, Stock Issue, Transfer, Stocktake, Adjustment, Kitchen Request) to their allowable states and valid transition actions.
- **Approval Event**: The ledger record tracking actions taken during a document's lifecycle (e.g., Draft, Submit, Approve, Reject, Cancel, Post, Close). The Prisma schema will be updated to include explicit columns: `stepNumber` (Int), `userRole` (Role), and `comments` (String?).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of state transitions are validated on the server-side against the canonical state machine.
- **SC-002**: Attempting an unauthorized action (e.g., Warehouse Keeper approving a PO) fails with a security warning.
- **SC-003**: 100% of successful transitions generate corresponding Approval Event records.
- **SC-004**: Workflow validations and role checks complete in under 50 milliseconds per request.

## Assumptions

- The backend relies on user roles provided by the authenticated JWT.
- Document roles and capability mappings are canonically defined and shared between the frontend and backend to avoid duplication.
- System configurations (such as role mappings) are static and do not change dynamically during runtime.

# Feature Specification: Fix Transfer SHIP/RECEIVE Workflow Role Validation

**Feature Branch**: `029-transfer-workflow-validation`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "read this file @[c:\Users\Qursan\.gemini\antigravity-ide\brain\d4a83ce1-2060-498d-a220-76ddd6347b80\engineering_tasks.md] and creat a specification for the TASK-003 only"

## Clarifications

### Session 2026-05-25
- Q: What is the required destination and persistence level for logging blocked/forbidden transfer actions? → A: Log to standard application logs (e.g. logger.warn) and write a persistent record to the database `AuditLog` table.
- Q: When a user triggers SHIP or RECEIVE, should the system check that the user is authorized for the specific warehouse involved in that action (i.e. origin warehouse for shipping, destination warehouse for receiving)? → A: Yes, strictly validate branch scope (Origin warehouse for SHIP, Destination warehouse for RECEIVE).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centralized Role Authorization for Transfer Ship/Receive (Priority: P1)

As an authorized warehouse keeper or system administrator, I want my identity and role to be validated against the centralized permission matrix when attempting to ship or receive inventory transfers, so that only authorized personnel can perform these critical inventory state changes.

**Why this priority**:
Ensuring role-based access control is vital for preventing fraud, unauthorized stock movements, and inventory drift. Centralizing permission checks ensures consistent rule enforcement across all system modules.

**Independent Test**:
Attempt to execute the "SHIP" action on a draft transfer using a user role that has shipping permission (e.g., Admin) and confirm it succeeds. Then, attempt the same action with a user role that does not have shipping permission (e.g., standard operator or restricted warehouse keeper role) and confirm that the system blocks the action and returns a forbidden status error.

**Acceptance Scenarios**:

1. **Given** an inventory transfer in `DRAFT` status and a user with a role that is authorized to ship transfers, **When** the user attempts to ship the transfer, **Then** the system authorizes the action, transitions the transfer status to `IN_TRANSIT`, and records the operation.
2. **Given** an inventory transfer in `DRAFT` status and a user with a role that is NOT authorized to ship transfers, **When** the user attempts to ship the transfer, **Then** the system rejects the operation, returns a permission violation error, and preserves the transfer in its `DRAFT` status.
3. **Given** an inventory transfer in `IN_TRANSIT` status and a user with a role that is authorized to receive transfers, **When** the user attempts to receive the transfer, **Then** the system authorizes the action, transitions the transfer status to `RECEIVED` (or completed status), and updates the inventory stock counts.
4. **Given** an inventory transfer in `IN_TRANSIT` status and a user with a role that is NOT authorized to receive transfers, **When** the user attempts to receive the transfer, **Then** the system rejects the operation, returns a permission violation error, and preserves the transfer in its `IN_TRANSIT` status.
5. **Given** an inventory transfer in `DRAFT` status and a user who is authorized to ship transfers globally or at that origin branch, **When** they attempt to ship the transfer, **Then** the system authorizes the action.
6. **Given** an inventory transfer in `DRAFT` status and a user who is authorized to ship transfers but is NOT scoped to the origin warehouse branch, **When** they attempt to ship the transfer, **Then** the system rejects the operation and returns a branch scope permission violation error.
7. **Given** an inventory transfer in `IN_TRANSIT` status and a user who is authorized to receive transfers but is NOT scoped to the destination warehouse branch, **When** they attempt to receive the transfer, **Then** the system rejects the operation and returns a branch scope permission violation error.

---

### User Story 2 - Lifecycle State Guarding as Defense-in-Depth (Priority: P2)

As an inventory operations manager, I want the system to double-check that a transfer is in a valid lifecycle status before executing state transitions, even if the user has the correct role, so that invalid states (such as shipping an already received transfer) are blocked.

**Why this priority**:
Provides defense-in-depth protection. Role authorization is the primary guard, but checking document state transitions prevents data corruption and logical state bypasses.

**Independent Test**:
Attempt to perform the "SHIP" action on a transfer that is already in `IN_TRANSIT` or `RECEIVED` status using an authorized Admin account, and verify that the system rejects the transition due to invalid status flow.

**Acceptance Scenarios**:

1. **Given** an inventory transfer that has already been shipped (status `IN_TRANSIT`), **When** an authorized Admin attempts to trigger the "SHIP" action again, **Then** the system rejects the operation due to an invalid starting status.
2. **Given** an inventory transfer that is in `DRAFT` status, **When** an authorized user attempts to trigger the "RECEIVE" action directly, **Then** the system rejects the operation because a transfer must be shipped (`IN_TRANSIT`) before it can be received.

---

### Edge Cases

- **User Role Changes Mid-Session**: If a user's role is updated or demoted in the database, the system must evaluate their permission using their current persistent role at the transaction level rather than relying on stale cached session data.
- **Missing or Corrupted User Context**: If an operational API call occurs without a valid authenticated user context or role, the system must reject the request immediately as forbidden.
- **Locked/Frozen Items in Transfer**: If a transfer contains items that are currently frozen or locked for reconciliation, the system must block shipment/receipt even if the user has appropriate role permissions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authorize any attempt to ship a transfer document against the centralized role permission matrix before executing the transition.
- **FR-002**: The system MUST authorize any attempt to receive a transfer document against the centralized role permission matrix before executing the transition.
- **FR-003**: The system MUST reject ship or receive attempts for any user role not explicitly authorized by the centralized role permissions.
- **FR-004**: The system MUST enforce document status validation as a secondary check (defense-in-depth) after checking role permissions, ensuring that transitions are only made from valid starting states (e.g., `SHIP` can only move from `DRAFT`, `RECEIVE` can only move from `IN_TRANSIT`).
- **FR-005**: In the event of a permission failure, the system MUST abort the database transaction, log the forbidden attempt to standard application logs (e.g., logger.warn), write a persistent entry to the database `AuditLog` table for security auditing, and return a clear, user-friendly access-denied error.
- **FR-006**: The system MUST validate that the user's operational branch scope matches the specific warehouse involved in the action (the origin warehouse for a `SHIP` action, and the destination warehouse for a `RECEIVE` action) unless they hold a global administrator bypass role.

### Key Entities *(include if feature involves data)*

- **Inventory Transfer**: A document representing stock in transit between warehouses. Key attributes include Transfer Number, Status (DRAFT, IN_TRANSIT, RECEIVED), Sending Warehouse, Receiving Warehouse, and the list of item quantities.
- **User Role / Authorization Context**: The operational identity and role assignment (e.g., ADMIN, WAREHOUSE_KEEPER, STORE_MANAGER) that determines user access rights using the centralized system role permissions matrix.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of transfer ship and receive operations undergo authorization validation against the centralized permission matrix prior to database modification.
- **SC-002**: Unauthorized users attempting ship/receive transitions are blocked 100% of the time, returning a forbidden error with a response time of under 200ms.
- **SC-003**: The authorization checks add negligible overhead, maintaining api execution performance with less than 10ms of latency added per request.

## Assumptions

- The centralized permissions matrix (defined via `canPerformActionV2` in `@logirest/shared-types`) is the single source of truth for transfer transitions, actions `'SHIP'` and `'RECEIVE'`, and document type `TRANSFER`.
- The API has access to the authenticated user's current database-backed role at the time of processing the request.
- The existing system role definitions currently support granular transition actions such as SHIP and RECEIVE.

# Feature Specification: Concurrency Control

**Feature Branch**: `018-concurrency-control`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "Implement Phase 5 Concurrency Control (Optimistic locking handler, idempotency guard, and warehouse lock guard) as described in PROJECT_MAP.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Concurrent Document Updates (Optimistic Locking) (Priority: P1)

As a system user, I want to be protected from overwriting someone else's changes when editing a document, so that data integrity is maintained when multiple people work on the same inventory data.

**Why this priority**: Preventing data loss and accidental overwrites is a core requirement for a multi-user inventory system. It avoids conflicting inventory updates.

**Independent Test**: Can be tested by opening the same document in two separate browser windows (or API clients) with the same starting version. Modifying the document in the first window and saving it succeeds. Attempting to save modifications in the second window fails with a version conflict notification showing current editor details.

**Acceptance Scenarios**:

1. **Given** User A and User B have both opened purchase order PO-100 at version 1,  
   **When** User A updates the order description and saves,  
   **Then** the system successfully saves the update and increments the version to 2.

2. **Given** User A has successfully saved PO-100 (now at version 2),  
   **When** User B attempts to save their edits using the stale version 1,  
   **Then** the system rejects User B's change, displays a concurrency conflict message showing who modified it, and prevents data from being overwritten.

---

### User Story 2 - Duplicate Document Creation Prevention (Idempotency) (Priority: P1)

As an integration client or web user, I want the system to ensure that submitting a document creation request multiple times due to network glitches only creates one document, so that duplicate inventory entries and ledger records are prevented.

**Why this priority**: Essential to prevent double-posting, duplicate ledger entries, and financial reconciliation issues.

**Independent Test**: Can be tested by sending two identical creation requests with the same unique identification key in rapid succession. The system returns success for the first request, and for the second request, returns the same result or a duplicate notification without creating a second record in the database.

**Acceptance Scenarios**:

1. **Given** a user is submitting a new Goods Received Note (GRN) with a unique submission key,  
   **When** the request completes successfully,  
   **Then** a single GRN is created and its response details are recorded.

2. **Given** a submission request with a key that is already currently being processed,  
   **When** a duplicate request is received before the first completes,  
   **Then** the system rejects the second request with a conflict response to prevent duplicate execution.

3. **Given** a submission request has successfully completed and is cached,  
   **When** a duplicate request is received within 24 hours,  
   **Then** the system returns the cached response from the first request without executing the creation logic again.

---

### User Story 3 - Warehouse Lock Enforcement during Stocktake (Priority: P1)

As a warehouse manager, I want the warehouse to be locked for stock mutations when an active stocktake is happening, so that live inventory counts are not corrupted by concurrent transfers or sales.

**Why this priority**: Ensures stocktake accuracy. If warehouse stock moves during a count, the counted numbers won't match the snapshot, rendering the stocktake invalid.

**Independent Test**: Can be tested by starting a stocktake session for Warehouse A (which locks the warehouse) and then attempting to post a transfer, issue, or adjustment for Warehouse A. The system must reject the mutation attempts with a warehouse locked status.

**Acceptance Scenarios**:

1. **Given** Warehouse A is under an active stocktake session,  
   **When** a warehouse keeper attempts to post an inventory issue or complete a stock transfer for Warehouse A,  
   **Then** the system blocks the action and informs the user that the warehouse is currently locked due to stocktake.

2. **Given** Warehouse A is locked for stocktake,  
   **When** an administrator views the lock status,  
   **Then** they see the lock creator, start time, and lock expiration date.

---

### User Story 4 - Stale Warehouse Lock Administration (Priority: P2)

As an inventory administrator, I want warehouse locks that exceed their duration to become stale but remain locked until manually cleared, so that critical stocktaking processes are not silently bypassed or corrupted by automatic releases.

**Why this priority**: Ensures safety. Auto-releasing after a timeout could silently allow postings during a delayed physical count, leading to severe discrepancies.

**Independent Test**: Can be tested by setting a warehouse lock's expiration time to a past date. Verify that the warehouse remains locked to standard users, but an administrator can invoke a dedicated unlock action to release the warehouse.

**Acceptance Scenarios**:

1. **Given** a stocktake session has exceeded its maximum 72-hour window and its lock is expired,  
   **When** a warehouse keeper attempts to post an inventory transaction,  
   **Then** the transaction is still blocked because the lock must be manually cleared.

2. **Given** an administrator or manager accesses a stale lock,  
   **When** they perform a manual override unlock,  
   **Then** the lock is deactivated, and standard inventory transactions are immediately allowed again.

---

### Edge Cases

- **Server Crash during Processing**: If a request with a unique idempotency key starts processing but the server crashes mid-execution, the key remains in a "pending" state. The system must allow the user/client to retry the request after a safety timeout, or allow an administrator to clear stalled keys.
- **Concurrent Lock and Posting Request**: If a stocktake is started at the exact millisecond an issue is being posted, the database transaction order must prevent a race condition. The posting transaction must either lock before the stocktake lock is written, or fail with a lock error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement version-based concurrency checks on all editable documents (Purchase Requests, Purchase Orders, Goods Received Notes, Inventory Issues, Transfers, and Adjustments).
- **FR-002**: When saving edits to a document, the system MUST verify that the client-provided version matches the database version. On mismatch, the update MUST be rejected and a concurrency conflict response returned.
- **FR-003**: The system MUST require a client-generated unique identification key (idempotency key) for all document creation requests.
- **FR-004**: The system MUST log all idempotency keys and cache their responses for a duration of 24 hours.
- **FR-005**: If a request is received with a key that is currently processing, the system MUST return a conflict response.
- **FR-006**: The system MUST support locking a warehouse to block all inventory-mutating writes (such as posting receipts, issues, transfers, or adjustments) during a stocktake.
- **FR-007**: A warehouse lock MUST record the associated stocktake session, the user who initiated the lock, the lock time, and the expected expiration time.
- **FR-008**: Warehouse locks MUST NOT automatically unlock upon expiration; instead, they must enter a stale state that requires manual release by an authorized administrator or manager.
- **FR-009**: The system MUST enforce that administrative lock-override actions are logged in the audit history.

### Key Entities *(include if feature involves data)*

- **IdempotencyLog**: Represents a unique API/request execution log used to prevent duplicate operations.
  - *Attributes*: Unique key, request path, status (pending/completed), response body hash, response status code, created time, expires time.
- **WarehouseLock**: Represents an active or stale lock on a warehouse that prevents stock mutations.
  - *Attributes*: Locked warehouse reference, associated stocktake session reference, lock status (active/stale/inactive), locked by user, locked time, expires time, unlocked by user, unlocked time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of duplicate document creation requests sent within 24 hours with the same key must return the cached response or a duplicate warning instead of creating duplicate records.
- **SC-002**: 100% of concurrent updates to the same document that conflict in version must be rejected without data corruption or overwriting concurrent work.
- **SC-003**: Zero stock mutation transactions (goods receipt, issue, transfer, adjustment) can be posted to a locked warehouse during an active or stale stocktake lock.
- **SC-004**: Users are notified of a concurrency conflict within 1 second of submitting their stale edits.

## Assumptions

- **A-001**: Clients are responsible for generating and sending a standard unique identifier (UUID) as the idempotency key for creation requests.
- **A-002**: Standard database transactions are used to ensure the atomic check-and-set behavior for version locks and warehouse locks.
- **A-003**: Network latency between client and server is within normal limits; clients will retry requests if they do not receive a response.
- **A-004**: Administrative users have the necessary training to resolve version conflicts manually if they arise.

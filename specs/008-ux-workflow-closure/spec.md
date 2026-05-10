# Feature Specification: UX Completeness & Workflow Closure

**Feature Branch**: `008-ux-workflow-closure`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "phase 5 of STRICT FRONTEND RECOVERY MASTER PLAN.md"

## Clarifications

### Session 2026-05-10
- Q: Confirmation Dialog Intensity → A: Simple Confirmation (Clear warning text + "Cancel" / "Delete" buttons)
- Q: DocumentLock Enforcement Method → A: Component Disabling (Disable individual form components)
- Q: Create Button Placement → A: Header Action (Top-right of the page layout)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Destructive Action Confirmation (Priority: P1)

As a user, I want to be warned before I permanently delete or reject data, so I don't lose information by mistake.

**Why this priority**: Preventing accidental data loss is critical for system integrity and user trust, especially in an inventory management context where deletions are permanent.

**Independent Test**: Can be fully tested by attempting to delete a record on any list or detail page and verifying that a confirmation dialog appears and that the deletion only occurs after explicit user confirmation.

**Acceptance Scenarios**:

1. **Given** a record on a list page, **When** I click the "Delete" button, **Then** a confirmation dialog MUST appear before any API call is made.
2. **Given** the delete confirmation dialog, **When** I click "Cancel", **Then** the record MUST NOT be deleted and the dialog MUST close.
3. **Given** the delete confirmation dialog, **When** I click "Confirm Delete", **Then** the record MUST be deleted and a success notification MUST appear.

---

### User Story 2 - Read-only Closed Documents (Priority: P1)

As a user, I want approved or closed documents to be locked, so I can be sure the record is immutable and I don't accidentally edit historical data.

**Why this priority**: Historical data integrity is a core requirement. Allowing edits to closed documents would invalidate audits and financial records.

**Independent Test**: Can be tested by navigating to an "Approved" or "Closed" document detail page and verifying that the `DocumentLock` component is visible and all inputs are disabled.

**Acceptance Scenarios**:

1. **Given** a document with status "Closed" or "Approved", **When** I view its detail page, **Then** a `DocumentLock` indicator MUST be prominently displayed.
2. **Given** a locked document, **When** I attempt to interact with any form input or action button (Save, Edit, Delete), **Then** all such elements MUST be disabled or hidden.
3. **Given** a locked document, **When** I look for navigation, **Then** I MUST still be able to navigate back to the list or previous page.

---

### User Story 3 - Universal Create Access (Priority: P2)

As a user, I want to be able to start a new record from any list page, so I don't have to navigate elsewhere to begin a task.

**Why this priority**: Improves workflow efficiency and reduces friction by ensuring common actions are always available in context.

**Independent Test**: Can be tested by visiting every list page in the application and confirming a "Create" button is present and functional.

**Acceptance Scenarios**:

1. **Given** I am on any list page (e.g., Inventory, Procurement, Staff), **When** I look at the page header or toolbar, **Then** a "Create [Entity]" button MUST be visible.
2. **Given** a list page, **When** I click the "Create" button, **Then** I MUST be navigated to the corresponding creation form.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every list page MUST provide a visible and functional "Create" button, consistently placed in the page header (top-right) for standard accessibility.
- **FR-002**: Every "Delete" or "Reject" action MUST trigger a confirmation modal or dialog before the mutation is executed.
- **FR-003**: Confirmation dialogs MUST use the "Simple Confirmation" pattern (Clear warning text + "Cancel" / "Delete" buttons) and clearly state the consequences of the destructive action (e.g., "This action cannot be undone").
- **FR-004**: Documents with "Closed", "Approved", or "Finalized" status MUST render a `DocumentLock` indicator.
- **FR-005**: Locked documents MUST have all individual form inputs, select boxes, and action buttons (except "Back" or "Print") disabled at the component level to preserve readability and scrollability.
- **FR-006**: Users MUST be able to navigate back to the previous context from any detail or edit page without dead-ends.

### Key Entities *(include if feature involves data)*

- **Document**: Represents any transactional entity (Stocktake, Procurement Order, etc.) that follows a lifecycle from Draft to Closed.
- **Lifecycle Status**: An attribute of a Document that determines its editability (e.g., Draft, Pending, Approved, Closed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of list pages have a "Create" workflow entry point.
- **SC-002**: 100% of destructive mutations (Delete/Reject) are preceded by a confirmation dialog.
- **SC-003**: 100% of closed/approved documents render the `DocumentLock` component and disable all form inputs.
- **SC-004**: Zero user reports of "dead-end" pages where navigation is impossible.

### Edge Cases

- **Network Failure during Deletion**: If the network fails after confirming a deletion, a clear error message MUST be shown, and the record MUST remain in the list (or reappear if optimistically removed).
- **Concurrency Status Change**: If a document is approved/closed by another user while the current user is viewing it in "Edit" mode, the system SHOULD attempt to lock the UI and notify the user that the document is now read-only.
- **Deep-Linked Destructive Actions**: Any URL-driven deletion or rejection (if they exist) MUST still require a user confirmation step to prevent "one-click" malicious links.

## Assumptions

- The `DocumentLock` component already exists or its design is established.
- The `ConfirmationDialog` pattern is standardized across the app.
- "Closed" and "Approved" are the standard terminal statuses for all document-like entities.
- Authorization (RBAC) is already handled at the route/component level; this feature focuses on the UX/UI manifestation of those states.

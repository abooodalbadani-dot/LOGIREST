# Feature Specification: Sprint 0 Readiness Hardening

**Feature Branch**: `030-sprint0-remediation`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "/speckit-specify @[c:\Users\Qursan\.gemini\antigravity-ide\brain\22249d41-8366-4567-a28c-f9498ab1228b\implementation_plan.md] @[c:\Users\Qursan\.gemini\antigravity-ide\brain\d4a83ce1-2060-498d-a220-76ddd6347b80\engineering_tasks.md] read this files and creat a specification"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email Delivery Status Transparency and Alerting (Priority: P1)

Administrators and operators need reliable visibility into email delivery. If the system's email server is unconfigured, background messages must be clearly marked as failed, and administrators must be alerted via an in-system notification so they can resolve the configuration gap. Administrators also need a status dashboard to check the health of the email server.

**Why this priority**: High priority because quiet swallows of email delivery failures lead to missed operational alerts (e.g. security alerts) and lost transparency.

**Independent Test**: Can be fully tested by attempting to trigger an email-based event (like a security alert) when SMTP is unconfigured. The event should transition to a failed state, an in-system alert should appear for admins, and the admin system status dashboard should show the email delivery system is unhealthy.

**Acceptance Scenarios**:

1. **Given** the email server is unconfigured, **When** an event triggers an automated email, **Then** the outbox event is marked as failed, a notification log is generated to alert administrators of the unconfigured state, and the email status dashboard shows the unconfigured state and count of failed dispatches.
2. **Given** the email server is fully configured, **When** an event triggers an automated email, **Then** the email is successfully dispatched and marked as succeeded.

---

### User Story 2 - Draft Document Cancellation (Priority: P1)

Operators need to cancel saved draft documents (e.g., purchase requests) that are no longer needed, directly from the user interface. This transitions the document to a terminal cancelled state to clean up clutter.

**Why this priority**: High priority because without a cancellation workflow, incorrect drafts remain in the system forever or require direct database intervention.

**Independent Test**: Can be fully tested by creating a draft purchase request, clicking "Cancel" in the form action bar, and confirming that the document status transitions to "Cancelled" and can no longer be edited or progressed.

**Acceptance Scenarios**:

1. **Given** a saved purchase request in "Draft" status, **When** the operator clicks the "Cancel" button, **Then** the document status transitions to "Cancelled", an audit log entry is recorded, and the document is locked from further modifications.
2. **Given** a purchase request that has already been submitted or posted, **When** attempting to cancel, **Then** the cancellation action is forbidden.

---

### User Story 3 - Multi-Currency Dashboard Support (Priority: P2)

Store managers and administrators need to see all dashboard financial metrics in their configured store currency rather than hardcoded values.

**Why this priority**: Medium priority as it enables regional localized deployment without hardcoded assumptions.

**Independent Test**: Can be fully tested by changing the store currency configuration in settings from one currency to another (e.g., SAR to AED) and verifying that all currency formats on the store manager dashboard update dynamically.

**Acceptance Scenarios**:

1. **Given** the store base currency is configured in system settings, **When** a manager views the dashboard, **Then** all financial values are formatted using the configured currency.

---

### User Story 4 - Automated Inventory Reconciliation (Priority: P2)

The system must run a daily reconciliation check to ensure system ledger inventory matches physical totals, alerting administrators to any discrepancies. The scheduler must run reliably at a fixed daily hour (1:00 AM) and survive server restarts.

**Why this priority**: Medium priority for inventory audits and variance detection.

**Independent Test**: Can be fully tested by verifying the scheduler executes the job daily at 1:00 AM regardless of system restarts.

**Acceptance Scenarios**:

1. **Given** the system is running, **When** the clock strikes 1:00 AM, **Then** the inventory reconciliation job runs, matches ledger totals to physical stock, and logs the results.

---

### User Story 5 - Database State Integrity Safeguards (Priority: P3)

The system must prevent negative stock quantities (allocated or on-hand) and invalid outbox states at the database level, serving as a last line of defense against application-level logic errors.

**Why this priority**: Technical excellence priority to ensure absolute data consistency.

**Independent Test**: Can be fully tested by attempting to save a negative stock quantity directly via database insert, which must be rejected.

**Acceptance Scenarios**:

1. **Given** the database schema, **When** any query attempts to insert or update a warehouse item or lot with a negative on-hand or allocated quantity, **Then** the database rejects the operation.

### Edge Cases

- What happens when a user attempts to cancel a document that is in a non-draft state?
  - The system must prevent this action, return a validation error, and ensure the status remains unchanged.
- What happens when the reconciliation job runs and finds a discrepancy?
  - The discrepant items are flagged as frozen, and an administrative notification is created.
- What happens when the email server is configured mid-operation?
  - Future outbox events will succeed, and the dashboard status will reflect a healthy state. Existing failed events remain failed to preserve history.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST transition background outbox events to a failed state when the email server is unconfigured, logging a clear reason.
- **FR-002**: System MUST generate an in-system notification alert for administrators when an email dispatch fails due to an unconfigured email server.
- **FR-003**: System MUST provide an administrative status page displaying email delivery health, including configuration status, failed event counts, and last failure timestamp.
- **FR-004**: System MUST allow draft purchase requests to transition to a cancelled state, preventing any further workflow progression or edits.
- **FR-005**: System MUST validate that only documents in draft status can be cancelled.
- **FR-006**: System MUST format all dashboard monetary values using the base currency defined in the system settings.
- **FR-007**: System MUST run the inventory reconciliation job daily at 1:00 AM, ensuring restarts do not miss scheduling slots.
- **FR-008**: Database MUST reject any records where warehouse item quantity on hand, warehouse item allocated quantity, or warehouse item lot quantity is negative.
- **FR-009**: Database MUST reject outbox events with statuses other than 'PENDING', 'SUCCEEDED', or 'FAILED'.

### Key Entities *(include if feature involves data)*

- **System Settings**: Stores the configured base currency of the store.
- **Outbox Event**: Records outgoing messages, their status ('PENDING', 'SUCCEEDED', 'FAILED'), and delivery errors.
- **Notification Log**: In-system alert messages targeting specific administrative roles.
- **Purchase Request**: Procurement document tracking draft, active, cancelled, or voided states.
- **Warehouse Item**: Records quantity on hand and quantity allocated for individual items.
- **Warehouse Item Lot**: Records quantity on hand split by inventory lot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can inspect email delivery health on a dashboard within 2 clicks from the main admin navigation.
- **SC-002**: 100% of unconfigured email server dispatch attempts result in failed status and an in-system notification within 5 seconds.
- **SC-003**: Draft documents can be cancelled in under 3 seconds from the user interface.
- **SC-004**: 100% of database queries attempting to save negative quantities are rejected.
- **SC-005**: The daily reconciliation job triggers exactly once every 24 hours at 1:00 AM, with zero missed runs due to server restarts.

## Assumptions

- The base currency setting already exists in the system settings and is retrievable by the application.
- Standard email templates are configured for outbox message types.
- The workflow engine supports custom transitions like CANCEL.
- Administrators will manually monitor and resolve unconfigured email system alerts.

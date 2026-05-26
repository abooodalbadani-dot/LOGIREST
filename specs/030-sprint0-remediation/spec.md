# Feature Specification: Sprint 0 Readiness Hardening

**Feature Branch**: `030-sprint0-remediation`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "/speckit-specify @[c:\Users\Qursan\.gemini\antigravity-ide\brain\155f7477-4d03-4aed-b7e5-83f096d2c9d7\engineering_tasks.md] read this file and creat a specification for the Sprint 0 — Pre-Production Critical Blockers only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Posted Document Voiding and Inventory Reversal (Priority: P1)

As an inventory manager or administrator, I need to void mistakenly posted inventory documents (Goods Received Notes, Stock Issues, Adjustments, Transfers, Kitchen Requests) so that stock levels, average costs, and ledger balances are automatically reversed and corrected without manual database overrides.

**Why this priority**: Highly critical because once documents are posted, any mistakes corrupt inventory counts and financial valuations. Having no reversal mechanism is an operational showstopper.

**Independent Test**: Can be fully tested by posting a Goods Received Note (which increases stock and updates cost values), then selecting the "Void" option, providing a mandatory explanation, and verifying that stock quantities are decreased back to their original state and offsetting ledger entries are posted.

**Acceptance Scenarios**:
1. **Given** a posted inventory document, **When** an authorized administrator or inventory manager selects the "Void" option and provides a required explanation comment, **Then** the document status transitions to "Voided", offsetting ledger entries are recorded, stock balances are adjusted back to their pre-posting levels, and the document is locked from any future status updates.
2. **Given** a posted inventory document, **When** an unauthorized user attempts to void the document, **Then** the action is rejected and status remains unchanged.

---

### User Story 2 - Real-time Roles Management and Search Integration (Priority: P1)

As an administrator or operator, I need the administration dashboard and search interfaces to display real-time live system data instead of static demo mock data, so that user permissions can be configured accurately and transaction lookups represent actual inventory history.

**Why this priority**: High priority because operational auditing and user permissions cannot be validated or trusted while mock data occupies critical production screens.

**Independent Test**: Can be fully tested by creating a new custom system role, verifying it immediately appears on the Roles page with accurate user counts, and searching for a recently created purchase order to verify it shows real-world transaction dates and amounts.

**Acceptance Scenarios**:
1. **Given** the roles administration view, **When** the page is loaded, **Then** all displayed roles, permission configurations, and active user counts match actual live database records.
2. **Given** the global transaction search page, **When** a search query is submitted, **Then** search results populate using live documents, showing actual numbers, amounts, and dates, with zero static sample data visible.

---

### User Story 3 - Operational Fail-Safe Warnings and Database Safeguards (Priority: P1)

As a system operator, I need the system to immediately halt transactions that violate physical rules (such as negative stock quantities) and notify administrators when critical notification delivery subsystems fail.

**Why this priority**: Critical to guarantee that application bugs or integration failures do not result in silent data corruption or lost alerts.

**Independent Test**: Can be fully tested by running a command that attempts to reduce item stock below zero, verifying it is rejected at the data storage layer, and simulating an unconfigured email service to verify outbox dispatch failures trigger visible alert notifications.

**Acceptance Scenarios**:
1. **Given** an item with 5 units on hand, **When** a transaction attempts to allocate or consume more than 5 units, **Then** the operation is rejected, and the database prevents negative stock quantities.
2. **Given** an unconfigured notification delivery channel, **When** an outbox message is triggered, **Then** the message status is marked as failed, and a system alert notification is created for administrators.

---

### User Story 4 - Settings-Driven Multi-Currency Dashboard (Priority: P2)

As a store manager, I need to see dashboard metrics and transaction totals rendered in the base currency defined in the global settings, so that financial reporting is accurate across different regional configurations.

**Why this priority**: Medium priority to enable flexible localized deployments without hardcoding currency assumptions.

**Independent Test**: Can be fully tested by altering the base currency configuration in system settings (e.g., from SAR to USD) and verifying that the dashboard metrics and purchasing interfaces immediately update their currency labels.

**Acceptance Scenarios**:
1. **Given** the store manager dashboard, **When** system settings specify a particular base currency, **Then** all financial statistics display totals dynamically formatted in that currency.

---

### User Story 5 - Environment-Isolated Secrets Configuration (Priority: P2)

As a system deployer, I need to configure all sensitive production credentials (database access keys, token encryption keys) outside the application source code files, so that production environments can be run securely and secrets are never committed to version control.

**Why this priority**: Essential security step to secure deployment environments and meet compliance standards.

**Independent Test**: Can be fully tested by deploying the system using container orchestration variables and validating that the orchestration file contains only variable references instead of plaintext values.

**Acceptance Scenarios**:
1. **Given** a containerized system launch, **When** the environment variable file is loaded, **Then** all system components read passwords and keys from the environment variables, and the system fails to boot with a clear error if they are missing.

---

### Edge Cases

- **Voiding depleted stock**: What happens if a user voids a Goods Received Note, but some of the received stock has already been consumed or moved, meaning there is not enough stock to reverse?
  - The system must prevent the void operation and return a clear validation error stating that reversing the document would result in negative stock.
- **Concurrently voiding the same document**: How does the system handle concurrent void requests for the same posted document?
  - The system must apply concurrency locks to ensure only the first request is processed and subsequent attempts fail gracefully.
- **Search returns zero results**: What happens if the query returns nothing or the search is blank?
  - The search interface must show a clean, user-friendly empty state rather than showing previous demo results or throwing an unhandled error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The container orchestration files MUST NOT contain hardcoded plaintext credentials (database passwords, session tokens, refresh tokens) and MUST read them from external environment configurations.
- **FR-002**: The database schema MUST enforce check constraints at the database storage layer to prevent item quantities on hand or quantities allocated from falling below zero.
- **FR-003**: The notification dispatch service MUST truthfully return a failure response and mark outbox events as failed when the email server is unconfigured, instead of silently succeeding.
- **FR-004**: The system MUST generate a system-level notification alert targeting administrators when a background outbox dispatch fails due to an unconfigured email server.
- **FR-005**: The administration roles configuration screen MUST load roles, user associations, and permissions from live database APIs, and all hardcoded mock arrays MUST be removed.
- **FR-006**: The store manager dashboard and purchasing screens MUST format financial values dynamically using the base currency defined in system settings.
- **FR-007**: The search user interface MUST query live endpoints to display real transaction history and MUST NOT show static demo cards.
- **FR-008**: The system MUST allow administrators and inventory managers to void posted inventory documents (Goods Received Notes, Issues, Adjustments, Transfers, Kitchen Requests).
- **FR-009**: Reversing a posted document MUST execute within a database transaction, creating offsetting ledger entries for stock count, cost valuation history, and updating the document status to "Voided".
- **FR-010**: The void action MUST require the user to input a mandatory reason comment that is stored in the document's audit log.

### Key Entities *(include if feature involves data)*

- **Inventory Document**: Base entity representing Goods Received Notes, Stock Issues, Adjustments, Transfers, and Kitchen Requests, tracking their status (Draft, Submitted, Posted, Voided).
- **Stock Ledger**: Chronological transaction log recording all stock increases, decreases, and offsetting void entries.
- **Cost Ledger**: Audit trail of cost adjustments and average unit cost history.
- **System Settings**: Global store settings containing configuration variables such as the base currency and SMTP settings.
- **System Role**: Permission profile mapping users to system access levels (e.g. Administrator, Inventory Manager) and defining action clearance.
- **Outbox Event**: Queue entry for background tasks, recording dispatch status (Pending, Succeeded, Failed) and failure details.
- **System Alert**: Internal messaging entity used to notify administrators about system configuration errors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of hardcoded secrets are removed from container configuration files, and they only reference environment variables.
- **SC-002**: Database constraints reject any transaction trying to set stock quantities below zero, throwing a database constraint exception.
- **SC-003**: Role management and global search views load real data in under 2 seconds, displaying zero mock values.
- **SC-004**: Changing base currency in settings changes the currency formatting on all dashboard panels instantly upon page refresh.
- **SC-005**: Voiding a posted Goods Received Note updates average unit costs and decreases on-hand quantity within a single database transaction in under 5 seconds.
- **SC-006**: A document can only be voided if a text comment of at least 5 characters is provided.

## Assumptions

- The base currency setting is already populated in system settings and accessible via existing settings retrieval methods.
- Standard role definitions (Administrator, Inventory Manager) exist and can perform action checks.
- Audit logging infrastructure is available to write and persist the document void events and reason comments.
- System notifications are displayed in the admin UI and do not rely solely on email dispatches.

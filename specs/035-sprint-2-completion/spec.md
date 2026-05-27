# Feature Specification: Sprint 2 Quality Hardening & Completion

**Feature Branch**: `035-sprint-2-completion`  
**Created**: 2026-05-27  
**Status**: Draft  
**Input**: User description: "Sprint 2 Completion — Critical Remediation Items Only"

## Clarifications

### Session 2026-05-27

- **Q: Goods Receipt Note (GRN) Void WAC Recalculation Strategy** → **A: Timeline Recalculation (Option A)**. The system will sequentially replay all Cost Ledger entries for the target item and warehouse that occur after the voided GRN's posting timestamp to recalculate the WAC downstream, preserving absolute mathematical and audit accuracy.
- **Q: Expiry Alert Debounce Caching Duration** → **A: 7-Day Debounce (Option A)**. Once an expiry warning is sent for a specific lot, it is debounced in Redis for 7 days (or until the lot is consumed/removed) to prevent daily notification noise for Inventory Managers.
- **Q: Stock Transfer Void Notification Policy** → **A: Standard Audit Trail Only (Option A)**. When a posted Stock Transfer is voided, the event will be captured in the immutable `AuditLog` and `ApprovalEvent` tables only, without pushing active UI notification alerts to warehouse keepers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Goods Receipt Note (GRN) Data Integrity (Priority: P1)

As a Procurement Manager or Warehouse Keeper, I want the Goods Received Note (GRN) system to interact with actual live inventory and purchasing APIs rather than simulated mock data, so that our stock levels, supplier currencies, and financial base currencies are 100% accurate and integrated in real time.

**Why this priority**: Absolute blocker. Mock data in GRN operations makes inventory tracking, supplier accounts, and cost calculations completely non-functional in a production environment. Real API integration ensures actual system state updates.

**Independent Test**: Navigate to the Goods Received list page, create a new GRN from a purchase order, view its details, post it, and verify that actual inventory updates occur immediately and that the currency is dynamically pulled from the purchase order/supplier and base currency settings.

**Acceptance Scenarios**:

1. **Given** a user is on the Goods Received list page, **When** the page loads, **Then** it retrieves and displays the actual paginated GRN list from the backend database.
2. **Given** a user is viewing a specific GRN's details, **When** they click "Post", **Then** the GRN state is updated to POSTED, stock levels are actualized, and the transaction is committed.
3. **Given** a GRN is associated with a specific Purchase Order, **When** a user posts the GRN, **Then** the supplier currency is dynamically resolved from the PO/Supplier record, and the base currency is retrieved from the system-wide settings, rather than falling back to hardcoded defaults.

---

### User Story 2 - Automated Inventory Expiry Alerts (Priority: P2)

As an Inventory Manager, I want to receive proactive system notifications when any stock lot approaches its expiration date within 7 days, so that I can take immediate action to prioritize consumption or schedule a write-off.

**Why this priority**: Critically prevents financial loss due to expired ingredients or goods, and ensures compliance with health and safety standards.

**Independent Test**: Manually adjust a stock lot's expiry date to be within the next 7 days, trigger the expiry check process, and verify that the system generates a bilingual expiry warning notification to all active Inventory Managers.

**Acceptance Scenarios**:

1. **Given** a stock lot has an expiry date within 7 days, **When** the system runs its periodic checks, **Then** a warning event is published.
2. **Given** an expiry warning event has been published, **When** the outbox processor processes the event, **Then** it resolves active Inventory Managers as the target recipients, and renders an email containing the item name, SKU, lot number, warehouse, quantity, and expiration date.

---

### User Story 3 - Real-time Stock Transfer Notifications (Priority: P3)

As a Warehouse Keeper at both the sending and receiving warehouses, I want to be immediately notified in-system whenever a stock transfer is marked as received, so that we have complete visibility over inventory movement and transit statuses.

**Why this priority**: Essential for operational coordination between warehouses, reducing communications lag and ensuring correct stock receipt counts.

**Independent Test**: Initiate a stock transfer, mark it as received at the destination warehouse, and verify that notification entries are generated in real-time for both the sending and receiving warehouse keepers, and that a background transfer received event is written.

**Acceptance Scenarios**:

1. **Given** a warehouse keeper receives a stock transfer, **When** the transfer receipt is finalized, **Then** the system automatically dispatches a transfer received outbox event and logs live notification entries for both the destination and source warehouse keepers.

---

### User Story 4 - High-Fidelity Void Operations (Priority: P4)

As an Inventory Administrator, I want to ensure that voiding any posted document (GRN, stock issue, adjustment, transfer, kitchen request) performs strict business logic validations, cost recalculations (WAC), and ledger reversals, and is fully covered by automated regression tests.

**Why this priority**: High risk. Improper voiding can corrupt the Weighted Average Cost (WAC) calculations and leave orphan entries in financial ledgers. Complete unit and E2E coverage guarantees safety.

**Independent Test**: Post a document, void it, and verify that all ledger movements are mathematically reversed, the state updates to VOIDED, and the WAC recalculates accurately.

**Acceptance Scenarios**:

1. **Given** a posted GRN, **When** voided, **Then** the system checks if the associated lot is partially consumed; if yes, it blocks the void with an error; if no, it reverses the ledger and recalculates the item's WAC.
2. **Given** an administrator attempts to void a document, **When** the document is NOT in a POSTED state or the concurrency version doesn't match, **Then** the request is rejected with a validation error.

---

### User Story 5 - Secure System Settings Administration (Priority: P5)

As a Security Administrator, I want all system settings updates (such as changing mail providers, SMTP configurations, and system names) to be strictly validated on the server side to prevent invalid data or unknown properties from being persisted.

**Why this priority**: High security. SMTP credentials, email configurations, and system-wide properties must be clean, validated, and sanitized to prevent injection attacks or mail relay exploits.

**Independent Test**: Attempt to save invalid email server port values or unrecognized encryption methods, and verify the server rejects the request with a detailed validation message.

**Acceptance Scenarios**:

1. **Given** a user is updating system settings, **When** they submit invalid values (e.g. non-numeric port, unknown mail provider, invalid email format), **Then** the system returns a 400 Bad Request error.
2. **Given** a settings payload containing unknown fields, **When** processed by the server, **Then** the unknown fields are stripped, and only validated settings are updated.

---

### Edge Cases

- **Partially Consumed Lot Voids**: If a user attempts to void a GRN whose stock has already been partially used by a stock issue or transfer, the system blocks the void request to prevent negative inventory balances or corrupted cost history.
- **Concurrent Sequence Allocation**: If two users attempt to create documents at the exact same millisecond, the database must enforce a unique sequence constraint, ensuring absolutely zero duplicate document numbers are generated.
- **Unauthorized Void Attempts**: If a Warehouse Keeper attempts to void a posted document, the request must fail with a strict Forbidden error at the service boundary.
- **Missing Cost History for Adjustment IN**: If an inventory adjustment (IN) is posted without a specified unit cost, the system must default to the current WAC for that item; if no WAC history exists, it must reject the post.
- **Void Notification Exclusion**: When any posted document (including Stock Transfers) is voided, the action is logged strictly in the central audit trail (immutably in `AuditLog` and `ApprovalEvent`) and does not generate active UI notification logs for warehouse keepers.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve and save Goods Received Notes (GRN) via real backend API endpoints, eliminating all simulated or mock data operations.
- **FR-002**: System MUST dynamically resolve the supplier currency for a GRN from the associated purchase order and supplier entity, and resolved base currency from system settings.
- **FR-003**: System MUST automatically dispatch an `EXPIRY_WARNING` notification event to all active Inventory Managers (`Role.INV_MGR`) when a lot approaches its expiry date within 7 days, using a 7-day Redis-based debounce cache to prevent duplicate alerts.
- **FR-004**: System MUST dispatch a `TRANSFER_RECEIVED` outbox event and generate targeted system notifications for both the source and destination warehouse keepers immediately upon receiving a stock transfer.
- **FR-005**: System MUST enforce strict state validation guards for voiding operations (GRN, Issue, Adjustment, Transfer, Kitchen Request), requiring the document to be in a `POSTED` status, with version matches, and verifying that the stock lot is not partially consumed.
- **FR-006**: System MUST perform dynamic Weighted Average Cost (WAC) recalculations upon voiding a GRN by sequentially replaying all downstream Cost Ledger entries for that item in that warehouse that occur after the voided GRN's posting timestamp.
- **FR-007**: System MUST strictly validate all fields submitted to the system settings update API (such as SMTP parameters, system name, timezone, base currency), returning a 400 error on any validation failure and filtering out unwhitelisted fields.
- **FR-008**: System MUST enforce database-level composite uniqueness constraints on document sequence numbers.

### Key Entities

- **GoodsReceiptNote (GRN)**: Represents the receiving transaction of goods, containing supplier currency, base currency, and associations to stock lots.
- **OutboxEvent**: Represents an asynchronous system event/notification payload to be resolved and rendered by background notification workers.
- **NotificationLog**: Represents an in-system notification entry targeted to specific user roles or warehouses.
- **StockLedger / CostLedger**: Financial and stock balance logs tracking every movement, cost, and recalculated WAC.
- **SystemSetting**: Centralized configuration parameters including SMTP credentials, system naming, and base currencies.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Goods Received Note page operations execute with 100% live API data, and zero mock delays or setTimeout simulations remain in the codebase.
- **SC-002**: 100% of lots expiring within 7 days trigger a single, non-duplicate notification delivered within 5 seconds of the scheduled check.
- **SC-003**: 100% of concurrent document creation requests (e.g. 20 concurrent creation commands) result in unique, sequential document numbers without database constraint violations.
- **SC-004**: Voiding a posted document successfully reverses all corresponding stock ledger entries and updates WAC correctly in less than 500 milliseconds.
- **SC-005**: 100% of settings updates are validated; any payload containing malformed data (such as non-numeric ports or invalid emails) is rejected within 100ms.

---

## Assumptions

- **A-001**: The backend GRN list, detail, and post endpoints are fully designed in the database and API controllers but were bypassed by frontend mocks.
- **A-002**: System settings are managed globally under a unified configuration profile, and a settings context/hook is available in the web application.
- **A-003**: Background workers (OutboxWorker) have access to active system user tables to resolve target roles and their associated contact information.
- **A-004**: The system's standard validation framework (class-validator/class-transformer or equivalent) is globally configured on the API layer.

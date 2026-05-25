# Feature Specification: Sprint 1 Production Readiness Remediation

**Feature Branch**: `031-sprint-1-remediation`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "read this file @[c:\Users\Qursan\.gemini\antigravity-ide\brain\d4a83ce1-2060-498d-a220-76ddd6347b80\engineering_tasks.md] and creat a specification for the sprint 1 only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure and Chronologically Consistent Inventory Voiding & Reversal (Priority: P1)

Inventory operators occasionally post erroneous documents (Goods Receipt Notes, Stock Issues, or Adjustments). To maintain ledger integrity without risky raw database edits, the system must support reversing posted transactions through a strict, rule-governed `VOID` state, ensuring physical inventory reality is strictly respected.

**Why this priority:** High priority as this represents a critical accounting and operations gap. Erroneous postings currently lock the system or require direct SQL intervention, which endangers data integrity.

**Independent Test:** An Admin attempts to void a posted GRN where some stock has already been issued. The system blocks the void and warns the admin. The admin then voids/reverses the downstream issues first, after which the GRN is successfully voided. Stock counts are reversed, WAC is recalculated safely, and a Net Zero balance is recorded in the Stock and Cost Ledgers.

**Acceptance Scenarios:**

1. **Given** a POSTED Goods Receipt Note (GRN) containing 50 units of an item, **When** an Admin user attempts to VOID this GRN but 20 units have already been consumed or issued (leaving only 30 units on hand in the warehouse), **Then** the system MUST block the transaction at the service layer and throw a validation error: `"Cannot void GRN: 20 units have already been consumed. Please reverse the downstream issues first."`
2. **Given** a POSTED GRN where all received stock remains fully available, **When** an Admin user voids the GRN, **Then** the system MUST execute the following within a single atomic database transaction:
   - Create offsetting negative StockLedger entries for each GRN line item.
   - Recalculate the Weighted Average Cost (WAC) by subtracting the received cost layer.
   - Create CostLedger entries with negative quantities to offset the original cost layer.
   - Transition the document's state to `VOIDED` (rendering it permanently read-only).
   - Write an AuditLog entry and create a `VOIDED` NotificationLog entry.
3. **Given** a POSTED Issue or Adjustment, **When** an Admin user voids the document, **Then** the system MUST restore the corresponding quantities, update WAC accordingly, and transition the document to `VOIDED`.

---

### User Story 2 - Forensic Auditability & Interactive Reports Drill-down (Priority: P1)

Warehouse auditors and financial managers need to trace inventory valuation trends (WAC History) and follow specific batches of stock (Lot Trace) to their absolute origins to investigate discrepancy or product recalls.

**Why this priority:** Vital for regulatory compliance, inventory trace audits, and financial accuracy. Static report grids without drill-down access make forensic audits slow and inefficient.

**Independent Test:** An auditor opens the WAC History report, filters for a specific item, observes a cost recalculation, and clicks the clickable document reference link in the table to immediately open the original GRN detail view in a new tab.

**Acceptance Scenarios:**

1. **Given** a WAC History report showing chronological average cost adjustments, **When** the user views the table of results, **Then** every row MUST include a hyperlinked reference to the source transaction (e.g., PO, GRN, Adjustment, or Transfer) directing the user to that specific document's detail view page.
2. **Given** a Lot Trace report, **When** the user searches for a specific batch/lot, **Then** each entry in the allocation table MUST act as a hyperlinked entry point to the original source document that initiated that allocation or transfer.
3. **Given** both reports, **When** a user clicks the export button, **Then** they MUST receive a fully formatted Excel (XLSX) file containing all trace columns.

---

### User Story 3 - Proactive Export Protection and UX Safeguards (Priority: P2)

Generating extremely large data reports can degrade database performance and trigger server Out-Of-Memory (OOM) exceptions. The system must restrict massive exports while guiding the user with actionable suggestions.

**Why this priority:** High impact on performance stability. Prevents application crashes when exporting millions of rows.

**Independent Test:** A user requests an export on a broad search yielding 80,000 records. The UI dynamically checks the count first, disables the export trigger, and displays a prominent alert advising the user to apply narrower date or warehouse filters.

**Acceptance Scenarios:**

1. **Given** a reports search panel (Movements, Expiry, WAC, or Lot Trace), **When** the matching database record count exceeds the maximum limit of 50,000 rows, **Then** the "Export to Excel" button MUST be disabled, and a warning panel must advise: `"Export limit exceeded (maximum 50,000 rows). Please narrow your selection by applying Date or Warehouse filters to enable export."`
2. **Given** an export request within the 50,000 limit, **When** the export is triggered, **Then** the server MUST retrieve the data in cursor-based paginated chunks of 1,000 rows and stream the response to the browser to ensure memory footprint remains minimal (<50MB).

---

### User Story 4 - Resilient Alert Debouncing & System Notification Logs (Priority: P2)

Operations teams must receive real-time, non-spammy system alerts. Debouncing states must survive application restarts, and critical milestones (such as receiving inventory transfers) must be logged transparently.

**Why this priority:** Resolves operational alert spamming (duplicate emails on server restarts) and ensures tracking transparency.

**Independent Test:** A low-stock alert is sent at 06:00 AM. The API server restarts at 07:00 AM. The next scan checks Redis, finds the alert is still debounced within its 24-hour TTL, and does not resend the duplicate email alert.

**Acceptance Scenarios:**

1. **Given** a low-stock event, **When** the system generates an alert, **Then** it MUST store a debounce key in Redis with a 24-hour Time-To-Live (TTL), ensuring the debounce state survives server restarts.
2. **Given** a completed stock transfer, **When** the transfer status updates to `TRANSFER_RECEIVED`, **Then** the system MUST immediately write a corresponding entry to `NotificationLog` targeting the WAREHOUSE_MANAGER and ADMIN roles.

---

### Edge Cases

- **Chronological WAC Drift on Void:** If a GRN posted last week is voided today, but other GRNs have been posted in the meantime, WAC recalculations must be run chronologically from the date of the voided receipt forward, to ensure correct current valuation.
- **Adjustment Cost Validation:** Adjustments with positive quantity (IN) represent stock additions and MUST mandate a positive unit cost. Adjustments with negative quantity (OUT) represent stock write-offs or consumption and do NOT require a unit cost.
- **Concurrent Document Numbering:** If two users create a document at the exact same millisecond, the database unique constraint `@@unique([documentType, year, branchId])` will prevent duplicate sequence numbers. The transaction service must capture this exception and gracefully retry or fail.
- **Rate Limit for Scanners:** Warehouse staff scanning rapid barcodes in succession could trigger rate-limiting. Operational endpoints must bypass global strict throttles, while auth endpoints (Login/Refresh) must be capped strictly (max 10 req/60s).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-010**: System MUST persist the Low-Stock Alert Debounce registry to Redis with a 24-hour Time-To-Live (TTL), preventing duplicate alerts after server restarts.
- **FR-011**: The database schema MUST enforce uniqueness on `DocumentSequence` using the composite key `@@unique([documentType, year, branchId])` at the database level.
- **FR-012**: The Daily Reconciliation Job MUST verify lot-level balances in `warehouse_item_lots.qty_on_hand` against the sum of matching entries in the Stock Ledger, creating a soft alert notification for ADMINs on discrepancy.
- **FR-013**: System MUST validate that all Inventory Adjustments representing stock increases (quantity > 0) have a positive, non-zero unit cost, blocking empty or zero cost inputs at both the API (DTO) and Frontend UI layers.
- **FR-014**: System MUST adjust rate limits: Global/Operational endpoints increased to 100 req/60s (to prevent barcode scanning throttling), while Authentication endpoints (login/refresh) are strictly rate-limited to 10 req/60s.
- **FR-015**: System MUST write a `NotificationLog` record targeting WAREHOUSE_MANAGER and ADMIN roles whenever a stock transfer is successfully received (`TRANSFER_RECEIVED`).
- **FR-016**: System MUST introduce WAC History and Lot Trace interactive reports to the Reports Hub, supporting robust search filters and Excel exports.
- **FR-017**: All report exports MUST use cursor-based pagination (chunks of 1,000 rows) and reject datasets larger than 50,000 rows with a `413 Payload Too Large` error.
- **FR-018**: The backend architecture MUST extract all reporting and data-fetching SQL query logic out of `ReportsController` and consolidate it inside a dedicated, unit-tested `ReportsService`.
- **FR-019**: System MUST allow ADMINs to void POSTED GRNs, Issues, and Adjustments, creating offsetting negative ledger entries, recalculating WAC, making the document read-only, and validating that the void does not create negative inventory (Option A).

### Key Entities *(include if feature involves data)*

- **StockLedger**: Represents chronological movement of stock. Voiding creates an exact negative offset row.
- **CostLedger**: Tracks unit pricing and historical value layers. Voiding creates negative value layers.
- **DocumentSequence**: Composite key `[documentType, year, branchId]` ensures sequential, unique, conflict-free numbering.
- **NotificationLog**: Records in-system events (like transfer receipts) for routing to relevant warehouse and admin roles.
- **RedisDebounceKey**: Temporary memory key with 24-hour TTL used to prevent system alert spam.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-010**: 100% of WAC history and lot trace rows are clickable, successfully routing users to the correct source documents (PO, GRN, Transfer, etc.) within 2 seconds.
- **SC-011**: Zero duplicate low-stock alerts are sent to users if the API server is restarted within 24 hours of a previous alert.
- **SC-012**: 100% of large exports (>50,000 records) are proactively blocked in the UI with a helpful warning panel, and successful exports run using under 50MB of memory on the server.
- **SC-013**: Attempts to void a GRN that would drop an item's warehouse stock balance below zero are blocked 100% of the time, throwing a clear explanation instead of causing silent inventory corruption.
- **SC-014**: Barcode-heavy workflows can execute up to 100 requests per minute without encountering rate-limiting screens.

## Assumptions

- **Redis Availability**: A standard Redis cache cluster is available and shared across BullMQ queue and debounce registries.
- **Prisma Support**: The database engine is PostgreSQL, which natively supports custom composite unique constraints and check constraints.
- **Admin Authorizations**: Voiding posted transactions is a highly restricted privilege reserved exclusively for users with the `ADMIN` role.
- **Chronological Recalculations**: Historical WAC adjustments assume correct chronological ledger entry sorting based on `postedAt` timestamp order.

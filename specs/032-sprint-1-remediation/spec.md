# Feature Specification: Sprint 1 — High-Priority Hardening

**Feature Branch**: `032-sprint-1-remediation`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "read this file @[c:\Users\Qursan\.gemini\antigravity-ide\brain\155f7477-4d03-4aed-b7e5-83f096d2c9d7\engineering_tasks.md] and creat a specification for the Sprint 1 — High-Priority Hardening only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unique and Sequential Document Numbering (Priority: P1)

To ensure reliable tracking of financial and inventory events, every document (such as Goods Receipt Notes, Stock Issues, and Adjustments) must have a unique sequential number. The system must prevent duplicate document numbers even during concurrent operations.

**Why this priority**: Crucial for legal compliance and accounting integrity. Duplicate document sequence numbers corrupt historical tracking and audits.

**Independent Test**: Simulate two users attempting to submit/post a document at the exact same millisecond under the same year, branch, and document type. The system guarantees that one succeeds and the other is either retried or fails cleanly without creating duplicate sequence numbers.

**Acceptance Scenarios**:
1. **Given** a document sequence for a specific year, branch, and document type, **When** a new document is generated, **Then** it MUST receive the next sequential number.
2. **Given** a concurrent insertion request, **When** a duplicate combination of document type, year, and branch is attempted, **Then** the database MUST reject it and prevent duplicate sequence generation.

---

### User Story 2 - Real-time SMTP Configuration and Validation Interface (Priority: P1)

Administrators must be able to configure and verify SMTP settings at runtime to ensure system email notifications are delivered successfully.

**Why this priority**: High priority as unconfigured or broken SMTP settings prevent users from receiving critical system alerts.

**Independent Test**: An admin navigates to Admin Settings, inputs SMTP details, clicks "Send Test Email", and verifies they receive the test email instantly, and that the UI indicates successful validation.

**Acceptance Scenarios**:
1. **Given** an authenticated administrator, **When** they access Admin Settings, **Then** they MUST be able to configure SMTP host, port, user, password, and encryption.
2. **Given** unconfigured SMTP settings, **When** the page loads, **Then** a warning banner MUST alert the admin that email delivery is inactive.
3. **Given** SMTP configuration changes, **When** the admin triggers a test email, **Then** the system MUST attempt to send a test message to the admin's email and report the result in the UI.

---

### User Story 3 - Adjustment Valuation Protection (Priority: P1)

When adjusting stock levels, adding inventory requires assigning a cost. The system must prevent Adjustment IN operations with a zero or empty unit cost, protecting the Weighted Average Cost (WAC) calculations from corruption.

**Why this priority**: Crucial for financial reporting and inventory valuation accuracy. Zero-cost additions lead to incorrect average cost bases.

**Independent Test**: An inventory manager creates an Adjustment IN and tries to submit it with a zero or empty unit cost. The UI prevents submission and highlights the field as required. The API rejects any direct attempts to post zero-cost additions.

**Acceptance Scenarios**:
1. **Given** an inventory adjustment of type "IN" (adding stock), **When** the operator enters a zero or null unit cost, **Then** the system MUST block submission.
2. **Given** an inventory adjustment of type "OUT" (removing stock), **When** the operator submits the document, **Then** the unit cost MUST be optional.

---

### User Story 4 - Seamless Barcode Scanning & Rate Limit Tuning (Priority: P1)

Warehouse operators scanning barcodes rapidly or running bulk operations should not trigger rate-limiting errors. Sensitive endpoints like authentication must remain tightly capped to prevent brute-force attacks.

**Why this priority**: Essential for operational productivity. Default strict rate limits block standard warehousing workflows.

**Independent Test**: An operator scans 30 items in a minute. The system processes all scans without rate-limiting them. A script attempting to guess passwords is blocked after 5 attempts.

**Acceptance Scenarios**:
1. **Given** a user executing standard operational requests (like barcode lookup or GRN line additions), **When** they make up to 100 requests per minute, **Then** the system MUST allow them without throttle errors.
2. **Given** a user attempting to authenticate, **When** they make more than 5 attempts within a minute, **Then** the system MUST block further attempts.

---

### User Story 5 - Interactive Reports Hub with WAC History and Lot Traceability (Priority: P2)

Auditors require access to detailed valuation trends (WAC History) and lot-level tracking (Lot Traceability) directly in the Reports Hub to audit inventory and track stock origins.

**Why this priority**: Vital for audit compliance, trace audits, and stock recall management.

**Independent Test**: An auditor opens the Reports Hub, sees the new report cards, clicks WAC History, filters by date, and views the chronological cost updates with clickable document links.

**Acceptance Scenarios**:
1. **Given** the Reports Hub, **When** the user opens it, **Then** it MUST display 8 report cards, including "WAC History" and "Lot Traceability".
2. **Given** the WAC History or Lot Trace reports, **When** the user views the table, **Then** every row MUST have a hyperlinked reference to the source transaction document.

---

### User Story 6 - Memory-Safe Streaming and Export Guard for Large Reports (Priority: P2)

Generating very large reports can crash the server due to high memory usage. The system must restrict exports that are too large and stream standard exports efficiently.

**Why this priority**: Prevents server crashes and ensures API stability.

**Independent Test**: A user attempts to export a report that yields 80,000 matching rows. The system disables the export button and displays a warning to filter the results.

**Acceptance Scenarios**:
1. **Given** a report yielding over 50,000 rows, **When** the user views the report, **Then** the export option MUST be disabled with a message suggesting narrowing the filters.
2. **Given** a report export under 50,000 rows, **When** the export runs, **Then** the system MUST stream the spreadsheet in chunks to keep memory usage minimal.

---

### User Story 7 - Batch Reconciliation Operations (Priority: P2)

Reconciliation runs must process discrepant items efficiently in batches to prevent database locks and application slowdowns.

**Why this priority**: Improves system performance during nightly audits.

**Independent Test**: The nightly reconciliation job runs, identifies 50 discrepant items, freezes them in a single database batch update, and completes in under 30 seconds.

**Acceptance Scenarios**:
1. **Given** a reconciliation job run, **When** discrepancies are found, **Then** the system MUST freeze all discrepant items in a single batch operation rather than individual transactions.

---

### Edge Cases

- **Concurrent Sequence Allocation**: If two users save a document simultaneously, the composite unique key blocks duplicates, and the service retries the transaction.
- **WAC Calculation Safeguard**: Adjustment INs with positive quantities must require a cost, while negative adjustments (OUTs) bypass cost validation since they write off existing valued stock.
- **Export Limit Message**: If data exceeds 50,000 rows, the warning banner must guide the user on which filters to apply (e.g., date ranges, branch/warehouse limits).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-101**: The database schema MUST enforce a unique constraint on `DocumentSequence` using the composite key `(document_type, year, branch_id)`.
- **FR-102**: System MUST implement an Admin Settings UI for SMTP configurations (host, port, user, password, encryption) and a "Send Test Email" utility.
- **FR-103**: System MUST block Adjustments of type "IN" that have a null, zero, or negative unit cost.
- **FR-104**: Rate limiting MUST be configured to support at least 100 requests per minute for operational endpoints while retaining strict limits (≤ 5/min) on auth endpoints.
- **FR-105**: Reports Hub MUST include cards, pages, and filters for WAC History and Lot Traceability.
- **FR-106**: Export endpoints MUST limit spreadsheet generation to 50,000 rows and stream responses using chunk-based retrieval to minimize memory usage.
- **FR-107**: The reconciliation job MUST batch-update discrepant items to freeze them in a single database round-trip.
- **FR-108**: All report data-fetching SQL queries MUST be consolidated inside a dedicated, unit-tested `ReportsService`.

### Key Entities *(include if feature involves data)*

- **DocumentSequence**: Maps unique next-number sequences per document type, year, and branch.
- **StockLedger / CostLedger**: Sources for WAC History and Lot Traceability report queries.
- **SystemSetting**: Stores encrypted SMTP configuration details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: Zero duplicate document sequence numbers are generated under concurrent workloads.
- **SC-102**: Exporting reports with up to 50,000 rows consumes less than 50MB of memory on the server.
- **SC-103**: Test email function provides a real-time success or failure response within 5 seconds.
- **SC-104**: WAC History and Lot Traceability tables provide direct, clickable links to source documents.

## Assumptions

- **PostgreSQL Database**: The underlying database is PostgreSQL, supporting composite unique constraints.
- **Admin Access**: SMTP settings and reconciliation logs are restricted to users with the Admin role.

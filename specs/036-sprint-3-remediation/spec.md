# Feature Specification: Sprint 3 Remediation and System Hardening

**Feature Branch**: `036-sprint-3-remediation`  
**Created**: 2026-05-27  
**Status**: Draft  
**Input**: User description: "Create a specification for the Sprint 3 tasks based on engineering_tasks.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visual Audit of Lot Movements & Cost History (Priority: P1)

Inventory managers and cost auditors need a visual interface to track item cost lifecycles and trace lot movements to investigate inventory deviations.

**Why this priority**: High value for operational transparency and cost control. It enables non-technical managers to audit system state and resolve discrepancy reports without manual database lookups.

**Independent Test**: Can be fully tested by navigating the Reports Hub, opening WAC Cost History/Lot Traceability pages, applying filters for specific items/lots/warehouses, and asserting the rendered timeline/movement logs match the inventory transactions.

**Acceptance Scenarios**:

1. **Given** an item has undergone multiple transactions (e.g., GRN with different costs, Issues, Transfers), **When** an Inventory Manager views the "WAC Cost History" report for that item in a specific warehouse, **Then** they see a chronological timeline of WAC changes corresponding to each transaction.
2. **Given** a specific stock lot number has moved between warehouses or been partially consumed, **When** the manager queries the "Lot Traceability" report, **Then** they see the complete, sequential movement history of that lot from its initial entry to its current balance.

---

### User Story 2 - Progressive and Resilient Report Export (Priority: P1)

Finance and management users need to export massive sets of stock movement history (100,000+ rows) to spreadsheets without system crashes, timeouts, or high memory spikes.

**Why this priority**: Essential for business operations. Large-scale reports are exported regularly for accounting, and failure to do so blocks financial closing.

**Independent Test**: Trigger a stock movements export containing over 100,000 records and verify that the download starts promptly, finishes successfully, and is correctly branded.

**Acceptance Scenarios**:

1. **Given** the database contains 100,000+ stock ledger records, **When** a user clicks "Export Stock Movements", **Then** the file begins downloading immediately, streams progressively, and completes successfully without browser or server timeout.
2. **Given** a generated spreadsheet report, **When** opened by a user, **Then** it must include a prominent header displaying the dynamic system name and the branch/restaurant branding from system settings.

---

### User Story 3 - Cost Accuracy & Data Integrity Safeguards (Priority: P2)

The system must automatically enforce safeguards against zero-cost manual stock adjustments, duplicate document sequence generation, and unauthorized document voiding.

**Why this priority**: Crucial for data integrity. Prevents inventory value corruption, duplicate invoice numbers, and security bypasses in high-risk document operations.

**Independent Test**: Attempt unauthorized voiding, trigger concurrent document creations, and attempt manual stock additions without specifying unit cost.

**Acceptance Scenarios**:

1. **Given** a user is logged in with a warehouse keeper role (non-manager), **When** they attempt to void a posted document (GRN, Transfer, Adjustment), **Then** the system immediately rejects the action with a clear unauthorized error message.
2. **Given** a manual "Adjustment IN" is created with no specified unit cost, **When** the system has existing WAC history for that item, **Then** the adjustment automatically adopts the current WAC.
3. **Given** a manual "Adjustment IN" is created with no specified unit cost, **When** the item has no WAC history in the warehouse, **Then** the system rejects the transaction and prompts the user to enter an explicit unit cost.
4. **Given** multiple users submit documents concurrently, **When** document sequence numbers are generated, **Then** the system must guarantee absolute uniqueness of document numbers at the system level, failing gracefully if conflict occurs without producing duplicates.

---

### User Story 4 - Automated Lot-level Audit & Operations Dashboard Metrics (Priority: P2)

IT operators and administrators need a continuous, automated audit mechanism that scans lot balances and alerts them if physical stock counts drift from ledger transaction histories.

**Why this priority**: Vital for system reliability and observability. Ensures discrepancies are captured and surfaced in monitoring dashboards before affecting accounting.

**Independent Test**: Artificially introduce a lot balance discrepancy in the database, run the automated auditing job, and check that the discrepancy metric increments on the ops dashboard and details are logged.

**Acceptance Scenarios**:

1. **Given** a stock lot balance in the system does not match the sum of its historic movement ledger entries, **When** the periodic reconciliation job runs, **Then** the system must identify the discrepancy, log detailed warn messages (lot, SKU, warehouse, drift size), and increment the discrepancy counter.
2. **Given** a lot discrepancy is found and logged, **When** an operator views the Prometheus operations dashboard `/metrics` page, **Then** they must see a non-zero count under the reconciliation discrepancies metric.

---

### User Story 5 - Smooth Handheld Barcode Scanning (Priority: P3)

Warehouse keepers using rapid handheld barcode scanners need to process multiple lines on documents without getting blocked by standard system rate-limiters.

**Why this priority**: Key to user experience and operational efficiency in high-throughput warehouse environments.

**Independent Test**: Use a mock automated script or rapid manual scans to submit 60+ line updates to a document within one minute and verify they are all processed without rate-limiting blocks.

**Acceptance Scenarios**:

1. **Given** a warehouse keeper is scanning items rapidly to add or update lines in a document, **When** they exceed the standard system-wide rate limit (e.g., 10 requests per minute), **Then** the system must allow their rapid scanning requests to succeed smoothly on designated entry endpoints (up to 100 requests per minute) while keeping rate limits active for standard browsing.

---

### Edge Cases

- **Partially Consumed Lots during Voiding**: What happens when an Inventory Manager tries to void a posted Goods Receipt Note (GRN) but some items from the received lot have already been consumed or transferred?
  - *Resolution*: The system must reject the void operation and display a message stating that the lot has been partially consumed and cannot be voided.
- **Unreachable Metrics System**: What happens if the backend metrics aggregator is temporarily offline or slow during a reconciliation drift check?
  - *Resolution*: The reconciliation job must degrade gracefully, logging the warnings and executing the lot freeze without blocking the entire job.
- **Concurrent Sequence Numbers in Multi-Branch Environments**: How does the system handle sequence numbering if two branches attempt to generate a document number at the exact same millisecond?
  - *Resolution*: The system must rely on strict database constraints and secondary retry patterns to ensure both transactions get sequential, unique, non-overlapping numbers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 [Lot Reconciliation]**: The system MUST verify physical lot balances (`qtyOnHand` in lot records) against the sum of movements in the stock ledger for each active lot.
- **FR-002 [Integrity Metrics]**: The system MUST increment an operational Prometheus metric (`logirest_reconciliation_discrepancies_total`) whenever a reconciliation audit detects a discrepancy between physical balances and ledger summaries.
- **FR-003 [Database Uniqueness]**: The system MUST enforce strict composite uniqueness on document sequence records using `documentType`, `year`, and `branchId` to prevent duplicate numbers under concurrent pressure.
- **FR-004 [Batch WAC Calculation]**: The WAC Consistency Audit Job MUST process item costs in a batched, performance-optimized manner, reducing execution queries to a constant baseline (O(2)) to prevent out-of-memory errors on massive inventory databases.
- **FR-005 [Scanning Rate Limit Exemptions]**: The system MUST support per-endpoint rate limit overrides (e.g., allowing up to 100 requests per minute) on rapid scanning and multi-line item posting endpoints, while preserving tight rate limits on general browsing.
- **FR-006 [Visual Cost Reports]**: The Reports Hub MUST feature accessible links to "WAC Cost History" and "Lot Traceability" reports, providing details of unit costs and lot movements over time.
- **FR-007 [Branded Streaming Export]**: The system MUST progressive-stream large Excel report downloads (100,000+ records) without loading entire datasets into memory, prepending dynamic system naming and branch/restaurant branding.
- **FR-008 [Void Security]**: All document voiding operations (GRN, Transfer, Adjustment, Kitchen Request) MUST strictly enforce user role checks at the core service logic layer, rejecting actions from users other than System Administrators or Inventory Managers.
- **FR-009 [Manual Adjustment Cost Guard]**: The manual Adjustment IN process MUST automatically default the unit cost to the item's current warehouse WAC if no unit cost is provided, and reject the transaction with a validation error if no prior WAC history exists.

### Key Entities *(include if feature involves data)*

- **WarehouseItemLot**: Represents the physical balance of a specific batch of items in a warehouse. Critical attributes: `lotId`, `warehouseId`, `itemId`, `qtyOnHand`, `isFrozen`.
- **StockLedger**: Tracks every individual movement (IN, OUT) of inventory. Linked to `WarehouseItemLot` and used to compute historical ledger sums.
- **CostLedger**: Chronological log of cost changes (WAC calculations) for each item-warehouse combination.
- **DocumentSequence**: Generates sequential numbering for transactions. Unique on `(documentType, year, branchId)`.
- **SystemSetting**: Stores system-wide configuration, including the base currency, timezone, system name, and branding assets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Large-scale spreadsheet exports of 100,000+ stock movements must complete in under 15 seconds without causing out-of-memory errors or backend timeouts.
- **SC-002**: Warehouse keepers must be able to scan up to 60 items per minute without experiencing rate-limit blocks or request failures.
- **SC-003**: 100% of unauthorized document void attempts at the database/service layer must fail with a strict security access error.
- **SC-004**: Periodic WAC consistency audit execution time on 1,000+ items must be reduced from several minutes to under 5 seconds through N+1 query elimination.
- **SC-005**: Zero duplicate document numbers must be generated, even under concurrent loads of 20+ simultaneous document creation requests.

## Assumptions

- **Existing Analytics Infrastructure**: The system assumes standard Prometheus and Prometheus metrics exporter endpoints are wired up and running in the production environment.
- **ExcelJS Library**: The system assumes the ExcelJS library (or a functionally identical progressive spreadsheet streaming library) is available in the dependency tree.
- **Database Indexing**: It is assumed that database tables `StockLedger`, `WarehouseItemLot`, and `CostLedger` have correct compound indexes on `(warehouseId, itemId, lotId)` to support high-performance batch and range queries.
- **WAC Calculation Rules**: Average cost calculation relies on double-precision decimal arithmetic to avoid rounding discrepancies in multi-currency environments.

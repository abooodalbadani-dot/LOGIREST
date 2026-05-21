# Feature Specification: Prisma Database Models & Migration Setup

**Feature Branch**: `015-prisma-db-models`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "read this file PROJECT_MAP.md and creat a specification for the phase 2 only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database Schema Provisioning & Seeding (Priority: P1)

As a System Deployer, I want to provision the database schema and seed the initial lookup data, so that the application has a valid database structure and essential parameters (UoMs, currencies, roles) to start operations.

**Why this priority**: The database schema is the core foundation for all backend functionality. No API endpoints or services can function without the database tables.

**Independent Test**: Run database migration on a blank PostgreSQL instance and verify that all 30+ tables and enums are created. Then, run the seed script and verify that base records (currencies, standard UoMs, initial warehouses, and branches) are correctly populated.

**Acceptance Scenarios**:

1. **Given** a blank database and a valid Prisma schema, **When** migration is applied, **Then** the database creates all 30+ expected tables, including correct relations, constraints, and indexes.
2. **Given** the database schema is successfully migrated, **When** the seeding command is executed, **Then** default currencies (with base flag), default units of measure, default branch, default warehouse, and system roles are successfully inserted.

---

### User Story 2 - Database Integrity Constraints Enforcement (Priority: P2)

As a System Auditor, I want the database to enforce unique constraints, cascade deletion behaviors, and non-negativity rules at the schema level, so that data corruption and orphaned records are prevented.

**Why this priority**: Application-level validation can be bypassed or fail during concurrent requests. Schema-level constraints act as a bulletproof safety net for data integrity.

**Independent Test**: Attempt to insert duplicate barcodes for items, attempt to delete a warehouse that has active stock balances, and verify that the database rejects the operations and throws clean constraint violations.

**Acceptance Scenarios**:

1. **Given** a barcode uniqueness constraint, **When** a barcode record is inserted with a code that already exists in the system, **Then** the database rejects the insertion with a unique constraint error.
2. **Given** a warehouse scope relation, **When** a warehouse with active scopes is deleted, **Then** the database blocks the deletion or handles it deterministically via set-null/restrict constraints.
3. **Given** a warehouse has items in stock, **When** a deletion of the warehouse is attempted, **Then** the database blocks the deletion due to foreign key constraints.

---

### User Story 3 - Concurrency Safety Control Infrastructure (Priority: P3)

As a System Operator, I want the database schema to support optimistic versioning and transaction log tracking, so that double-posting, concurrent editing conflicts, and race conditions are mitigated.

**Why this priority**: In a multi-branch restaurant supply chain system, concurrent adjustments and approvals are common. Concurrency tracking prevents overwriting other users' changes.

**Independent Test**: Simulate two concurrent updates using the same initial version number and verify that the database/ORM layer detects the version mismatch and allows only one to succeed.

**Acceptance Scenarios**:

1. **Given** a document with an optimistic locking version, **When** two transactions attempt to update it simultaneously with the same version number, **Then** only one transaction updates the row and increments the version, while the other fails.
2. **Given** an action request, **When** a unique idempotency key is provided, **Then** the database ensures a single operation log is created to prevent double execution.

---

### Edge Cases

- **Stocktake Lock Contention**: What happens when a warehouse is under active stocktake (Locked status) and a background transaction attempts to post a shipment? The database schema must provide a `WarehouseLock` model that blocks all operational writes to that warehouse.
- **Negative Stock Prevention**: What happens if two issues for the same lot are processed in parallel? The database must use pessimistic row-level locking on `WarehouseItemLot` to sequence mutations and ensure stock balances never fall below zero.
- **WAC Calculation Integrity**: What happens if a GRN is posted while another GRN for the same item is being posted? Deterministic row-locking on `WarehouseItem` ensures that Weighted Average Cost is recalculated based on a consistent, locked sequence of entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The schema MUST support T1 Master Data models, including Users, User Warehouse Scopes, Branches, Warehouses, Departments, Categories, Units of Measure, Suppliers, Currencies, FX Rates, Items, and Barcode Mappings.
- **FR-002**: The schema MUST support T2 Transaction Document models, including Purchase Requests, Purchase Orders, Goods Received Notes, Inventory Issues, Transfers, Adjustments, Kitchen Requests, and their line items.
- **FR-003**: The schema MUST support T3/T4 Live Inventory Position models, including Warehouse Items, Warehouse Item Lots, and Lot Registry.
- **FR-004**: The schema MUST support T5 Immutable Ledger models, including Stock Ledger and Cost Ledger, which are append-only.
- **FR-005**: The schema MUST support T6 Control & Security models, including Warehouse Locks, Idempotency Logs, Audit Logs, and Approval Events.
- **FR-006**: The schema MUST enforce optimistic concurrency control via a `version` integer column on all master data models and transaction document models.
- **FR-007**: The schema MUST define composite primary keys on `WarehouseItem` (warehouseId, itemId) and `WarehouseItemLot` (warehouseId, itemId, lotId).
- **FR-008**: The schema MUST include index definitions on critical lookups: `WarehouseItemLot(warehouseId, itemId, expiryDate ASC)` for FEFO, `WarehouseItemLot(warehouseId, itemId, receivedDate ASC)` for FIFO, and `StockLedger(warehouseId, itemId, postedAt DESC)` for balance history queries.
- **FR-009**: The schema MUST support cascading delete operations on document line items when a document itself is deleted (only applicable to DRAFT documents).

### Key Entities *(include if feature involves data)*

- **User**: Represents system users with login credentials, roles (ADMIN, APPROVER, INV_MGR, etc.), and their authorized warehouse scopes.
- **Branch & Warehouse**: Represents organizational structure. Warehouses belong to branches and hold actual inventory balances.
- **Item & Lot**: Represents the products catalog. Items can be configured as batched and/or having expiry dates. Lots track batch-specific expirations.
- **WarehouseItem & WarehouseItemLot**: Represents the real-time stock balances of items per warehouse (and per lot for batched items).
- **StockLedger**: The authoritative, immutable log of all inventory movements.
- **CostLedger**: The historical log of Weighted Average Cost (WAC) changes.
- **ApprovalEvent**: Sequential log of status changes and approvals per document.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Prisma schema validation (`npx prisma validate`) passes with 0 errors or warnings.
- **SC-002**: Seeding script executes successfully in under 5 seconds on a fresh PostgreSQL instance.
- **SC-003**: 100% of defined database tables (approx. 30 tables) are correctly created in PostgreSQL after running migration.
- **SC-004**: Concurrency and unique constraints (e.g. barcode uniqueness, email uniqueness) reject invalid inserts 100% of the time.

## Assumptions

- PostgreSQL database is used as the storage backend and is accessible with full schema creation privileges.
- NestJS application (`apps/api`) will utilize Prisma Client to communicate with this database schema.
- Data types for money and quantities will use highly precise Decimal types (18, 4 or 18, 6 for FX rates) to prevent floating-point rounding errors.

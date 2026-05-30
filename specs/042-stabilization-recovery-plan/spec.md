# Feature Specification: LogiRest Engineering Recovery & Stabilization

**Feature Branch**: `042-stabilization-recovery-plan`  
**Created**: 2026-05-30  
**Status**: Implemented  
**Input**: User description: "read this file @[c:\Users\Qursan\.gemini\antigravity-ide\brain\a331d170-7cf4-4faa-8e1d-d8987e3212b4\logirest_recovery_plan.md] and creat a specification"

## Clarifications

### Session 2026-05-30

- Q: Which Sprint 5 / future roadmap items are explicitly out-of-scope for this stabilization phase? → A: All Sprint 5 roadmap features are out-of-scope: Advanced Procurement Analytics, Barcode Scanner Mobile UX, Email Template Management UI, and Multi-tenant branch isolation hardening.
- Q: What is the maximum backup age before the health check reports an unhealthy/degraded state? → A: 26 hours.
- Q: When a stock transaction requested quantity exceeds the quantity on hand, how should the system handle the failure? → A: Option A (Strict Block) - Immediately abort the transaction, rollback any database changes, and return a 400 Bad Request indicating insufficient stock.
- Q: What are the target Recovery Point Objective (RPO) and Recovery Time Objective (RTO) SLA targets for the database backup system? → A: Option A (24-Hour RPO / 4-Hour RTO) - Accept up to 24 hours of data loss (daily backups) and target under 4 hours to complete full database recovery.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Data Loading and Table Rendering (Priority: P1)

As a kitchen manager or inventory accountant, I want all listing tables in the application (including inventory balance, stock movements, lot tracking, purchase requests, purchase orders, goods receipt notes, stock transfers, inventory issues, adjustments, stocktakes, kitchen requests, branches, warehouses, departments, categories, suppliers, units of measure, barcodes, currencies, audit logs, and notification templates) to load and render successfully without crashing the interface, so that I can manage daily operations without interruption.

**Why this priority**: Crucial for application viability. Currently, the majority of data-fetching endpoints return shapes that do not conform to the frontend's standardized layout, preventing pages from loading.

**Independent Test**: Navigate through the various listing pages in the user interface. Verify that each page loads its corresponding table data, supports pagination, and renders without any user-facing error messages or blank screens.

**Acceptance Scenarios**:

1. **Given** a user is viewing any listing page, **When** the page retrieves records from the database, **Then** the data must load into the table and the pagination controls (total records, current page, page size, total pages) must display the correct values.
2. **Given** a user requests a specific page range of items (e.g., page 2 with a limit of 10 items), **When** the page loads, **Then** only the correct records for that range are displayed, and the pagination controls are updated.

---

### User Story 2 - Deterministic Warehouse Operations (Priority: P1)

As a warehouse worker, I want my warehouse-related actions (such as selecting a warehouse, editing attributes, locking inventories, or creating entries) to route deterministically to a single stable service endpoint, so that my work session is not interrupted by random routing errors.

**Why this priority**: Essential to resolve duplicate route definition conflicts in the system that make the routing of warehouse requests non-deterministic.

**Independent Test**: Switch active warehouses and edit warehouse details multiple times. Verify that every operation completes successfully and consistently routes to the correct database entity.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** a client sends any query or update for warehouses, **Then** the request must always resolve deterministically through a single, deconflicted path.

---

### User Story 3 - Secure Session Initialization (Priority: P1)

As a system administrator, I want the application to refuse to start up if mandatory security keys or configuration parameters are missing from the environment, so that the system never runs in a vulnerable, compromised state.

**Why this priority**: Avoids security vulnerabilities associated with silent fallback keys, protecting the application's authentication system from token forgery.

**Independent Test**: Attempt to launch the backend server with missing JWT access or refresh token configurations. Verify that the application fails to start and shuts down immediately.

**Acceptance Scenarios**:

1. **Given** the application is launching, **When** any required token configuration is missing, **Then** the server aborts initialization and logs a fatal error.

---

### User Story 4 - Scope Persistence and Reload Race Condition Resolution (Priority: P1)

As a multi-warehouse user, I want to edit my user profile or reload my browser tab without losing my active branch/warehouse scope, and without triggering invalid locking requests before my session scope is fully loaded.

**Why this priority**: Prevents user sessions from being cleared upon profile changes and avoids invalid background lock queries during page initialization.

**Independent Test**: Log in to a multi-warehouse user, change your active warehouse scope, and update your user profile. Verify that your active warehouse scope is preserved. Next, reload the browser tab and verify that the page displays a loading indicator until the active scope is restored, and that no background lock requests are sent with missing parameters.

**Acceptance Scenarios**:

1. **Given** a user is logged in with a specific active warehouse scope, **When** they update their user profile details, **Then** their scopes are preserved in the session, and their active branch/warehouse selection is not reset.
2. **Given** the user reloads a dashboard view, **When** the page initializes, **Then** the application prevents background lock status requests from firing with missing identifiers until the scope has been fully restored from storage.

---

### User Story 5 - Automatic Kitchen Requisition Setup (Priority: P1)

As a deployer, I want the initial system setup script to provision a default kitchen department automatically, so that users can create inventory issues and kitchen requests immediately without manual database overrides.

**Why this priority**: Operational documents require a department reference to be created. Without a default seeded department, a fresh install cannot be used for basic workflows.

**Independent Test**: Run the database initialization seed script on a fresh database, then log in and verify that a default kitchen department is selectable when creating an inventory issue.

**Acceptance Scenarios**:

1. **Given** a fresh database installation, **When** the database seed script is executed, **Then** a default kitchen department is created and linked to the primary branch.

---

### User Story 6 - High-Integrity Stock Deductions and Cost Recalculation (Priority: P2)

As an inventory accountant, I want all stock transactions (goods receipts, stock issues, kitchen fulfillment, warehouse transfers, variance adjustments) to execute under strict transaction locks and trigger average cost recalculation where appropriate, so that our warehouse stock counts and financial valuations remain accurate.

**Why this priority**: Stock valuation errors or negative stock counts could lead to financial losses or procurement errors.

**Independent Test**: Fulfill a kitchen request or submit an inventory transfer, then verify that the item quantity updates, a ledger entry is recorded, and the average cost is recalculated correctly.

**Acceptance Scenarios**:

1. **Given** a stock event is being processed, **When** the database is updated, **Then** it executes under a strict lock, preventing concurrent transactions from causing race conditions.
2. **Given** a warehouse transfer is received, **When** completed, **Then** the target warehouse updates its quantity on hand, and its weighted average cost is recalculated.

---

### User Story 7 - Automated Backup and Recovery (Priority: P2)

As a system administrator, I want the system database to be backed up daily to offsite storage (24-Hour RPO) and the backup status to be monitored, so that we can complete a full database restoration from offsite backups within 4 hours (4-Hour RTO) during a recovery event.

**Why this priority**: Critical operational safeguard. Without backups, any host failure would result in total data loss.

**Independent Test**: Configure the backup cron, run the manual backup script, and verify that the encrypted dump file is successfully stored in the offsite location. Perform a database restoration drill using the generated backup and confirm the system is restored to a consistent state within 4 hours. Check the system health endpoint to confirm it returns the correct backup age.

**Acceptance Scenarios**:

1. **Given** the application is deployed, **When** the automated backup scheduler runs daily, **Then** it creates an encrypted database backup and uploads it to secure offsite storage.
2. **Given** the application monitor checks the system status, **When** the health check is called, **Then** it returns the freshness of the latest backup.
3. **Given** the system experiences a data loss event, **When** a restoration is initiated using the latest offsite backup, **Then** the database must be successfully restored to a consistent state within 4 hours, losing no more than 24 hours of operational data.

---

### Edge Cases

- **Page reload timing**: When a user reloads the browser, the frontend state might request lock details before the active scope is read from storage. The system must guard these lock requests from being sent with missing parameters.
- **Concurrent stock transactions**: Multiple users might approve stock issues for the same item at the same time. The database must process these requests sequentially. If any transaction would cause the quantity on hand to drop below zero, the system MUST abort the transaction, rollback any changes, and return a 400 Bad Request indicating insufficient stock.
- **Configuration failure at boot**: If environment variables are missing during startup, the application must abort boot immediately rather than silently running in an insecure state.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST return all list responses wrapped in a standardized paginated envelope containing a `data` array and a `meta` block with `total`, `page`, `page_size`, and `total_pages` fields.
- **FR-002**: The system MUST use snake_case formatting for all API response metadata and document fields.
- **FR-003**: The backend server MUST asynchronously validate JWT secret configurations during startup and abort execution if the configurations are missing.
- **FR-004**: The system MUST consolidate all warehouse routing handlers into a single controller path to resolve path collisions.
- **FR-005**: The user profile update endpoint MUST return the user's authentic database scopes, preserving existing warehouse and branch permissions.
- **FR-006**: The seed script MUST populate at least one default kitchen department with a name and a code linked to the primary branch.
- **FR-007**: The frontend client MUST disable dependent warehouse lock requests from firing during reload initialization if the active warehouse identifier is not yet available.
- **FR-008**: The frontend client MUST use a centralized paginated schema factory for all listing views to ensure schema definition consistency.
- **FR-009**: The frontend authentication state MUST represent empty or cleared scopes as `null` instead of empty strings.
- **FR-010**: All inventory ledger writes MUST execute using database transaction-level locking to prevent race conditions.
- **FR-012**: The system MUST reject any stock deduction transaction that would result in a negative quantity on hand, aborting the operation, rolling back database changes, and returning a 400 Bad Request error.
- **FR-011**: The system MUST run daily automated database backups, encrypt them, upload them to offsite S3 storage, and report a degraded health status if the last successful backup exceeds 26 hours in age.

### Key Entities *(include if feature involves data)*

- **`Scope`**: Represents the user's active branch and warehouse permission context. Attributes: branch reference, warehouse reference.
- **`Department`**: Represents the culinary department requesting stock. Attributes: unique ID, name, code, active status, branch reference.
- **`Warehouse`**: Represents a storage location. Attributes: unique ID, name, code, active status, branch reference.
- **`PaginationMeta`**: Standardized pagination metadata. Attributes: total count, page number, page size, total pages.
- **`LedgerEntry`**: Immutable record of a stock movement. Attributes: transaction ID, item reference, quantity change, transaction cost, timestamp, warehouse reference.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of listing endpoints return a standardized paginated response containing `data` and `meta` blocks.
- **SC-002**: Zero validation errors on the client interface during navigation and listing actions.
- **SC-003**: The server fails to initialize if the access or refresh secrets are missing in the environment.
- **SC-004**: Zero invalid requests sent to `/inventory/warehouses/null/lock` when the dashboard reloads.
- **SC-005**: Active user scopes are preserved upon profile updates.
- **SC-006**: Daily database backups are generated, encrypted, and uploaded to offsite storage successfully, and the /health endpoint reports a degraded status if the last successful backup is older than 26 hours.
- **SC-007**: Database recovery drills successfully restore full data integrity from offsite backups in under 4 hours, validating the 4-hour RTO target.

---

## Assumptions

- The frontend application has already implemented a standardized validation structure for listings.
- No third-party API clients depend on the legacy API response formats.
- Basic database seeding is sufficient for initial department setup, and further tenant configuration will be handled post-deployment.
- Offsite storage endpoints for backups are available and authenticated during deployment.

## Out of Scope

The following items are explicitly excluded from this stabilization phase and deferred to the post-launch roadmap:

- **Advanced Procurement Analytics Dashboard**: Top-vendor reporting, procurement trend analysis, and spend visualisations.
- **Barcode Scanner Mobile UX**: Dedicated mobile workflow for kitchen staff using hardware barcode scanners.
- **Email Template Management UI**: In-app editor for managing outbound notification templates.
- **Multi-tenant Branch Isolation Hardening**: Going beyond the current scope-based isolation to enforce strict data-layer tenant boundaries.

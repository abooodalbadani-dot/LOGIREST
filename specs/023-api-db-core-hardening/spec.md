# Feature Specification: Database & API Core Hardening (Phase 1)

**Feature Branch**: `023-api-db-core-hardening`  
**Created**: 2026-05-23  
**Status**: Approved  
**Input**: User description: "read this file e:/kitchen-store-inventory-system/production_hardening_roadmap.md and creat a specification for the phase 1 only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Warehouse Operator Live Reports View (Priority: P1)

As a warehouse operator, I want to access live, accurate reports on inventory status and movements so that I can make informed inventory decisions.

**Why this priority**: Crucial business functionality. Currently, the Reports hub returns 404 errors as backend routes are missing.
**Independent Test**: Can be fully tested by hitting report endpoints (e.g., GET `/reports/available-inventory`) on a running backend and asserting that structured database data is returned.

**Acceptance Scenarios**:

1. **Given** a warehouse with items, **When** the user requests the Available Inventory report, **Then** the system returns the sum of `qtyOnHand` and `qtyAllocated` grouped by category, and calculates `qty_available = qtyOnHand - qtyAllocated`.
2. **Given** a user's active warehouse, **When** the user requests the Movements report, **Then** the system returns a paginated list of movements from the `StockLedger` sorted by posting date descending.
3. **Given** warehouse lots with items, **When** the user requests the Expiry report, **Then** the system returns active lots (where `qtyOnHand > 0`) that have non-null expiry dates, sorted by expiry date ascending.

---

### User Story 2 - System Administrator Safe Configuration Validation (Priority: P2)

As a system administrator, I want the application to validate its environment configuration immediately at startup so that invalid configurations do not cause silent runtime failures.

**Why this priority**: Prevents partial outages or unexpected crashes under load due to missing environment variables.
**Independent Test**: Can be tested by starting the NestJS application with a missing mandatory variable (e.g., `JWT_ACCESS_SECRET`) and asserting that the process exits with a validation error.

**Acceptance Scenarios**:

1. **Given** the environment configuration is missing a required variable, **When** the NestJS application starts, **Then** the startup validation halts execution and prints the validation schema failures.
2. **Given** a valid environment configuration, **When** the NestJS application starts, **Then** the application starts successfully and logs configuration readiness.

---

### User Story 3 - Database Drift Remediation & Transaction Safety (Priority: P3)

As a database administrator, I want to ensure the production database schema is fully aligned with the application schema models so that operations like locking warehouses and logging notifications succeed without SQL errors.

**Why this priority**: Block blocker for basic operations since the `warehouse_locks` table currently lacks required columns/indices, and `notification_logs` is missing entirely.
**Independent Test**: Can be tested by running the drift delta migrations and executing a warehouse lock mutation request to verify no SQL execution errors occur.

**Acceptance Scenarios**:

1. **Given** a PostgreSQL database with schema drift, **When** the drift delta migration is executed, **Then** the `status` and `isActive` columns and indexes are created in `warehouse_locks`, and the `notification_logs` table is successfully created.
2. **Given** the application starts, **When** it initializes the database connection, **Then** it verifies that all migrations have been successfully applied.

---

### Edge Cases

- **Database Connection Dropout**: How does the system validate schema migration status if the database is temporarily unreachable on startup?
- **Empty Reports Data**: When a report endpoint is queried but there is no matching data in the database, the API must return an empty list/dataset structure (e.g., `[]`) with HTTP 200 rather than throwing a 500 error.
- **Malformed Environment Variables**: When a configuration variable is provided but has an invalid format (e.g. an invalid URL for `DATABASE_URL`), the validation must catch it and reject startup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST apply a database migration containing the drift delta schema updates (adding `status` and `isActive` columns/indices to `warehouse_locks`, and creating the `notification_logs` table).
- **FR-002**: System MUST validate database schema migration status during NestJS module initialization and block application startup if out of sync across ALL environments (development, test, staging, and production). If a mismatch is detected, startup must throw a fatal error and exit immediately to prevent silent drift.
- **FR-003**: System MUST validate environment variables on startup using a Zod schema defined inside the `ConfigModule`. If Zod schema validation fails, the system MUST log the missing/invalid configuration keys via the structured JSON logger (omitting actual secret values) and immediately call `process.exit(1)` to allow container orchestrators to detect the explicit failure state securely without leaking secrets in standard exception traces.
- **FR-004**: System MUST implement NestJS controllers and database query services for the following reports under the `/reports` route: Available Inventory, Movements, Expiry, Stocktake Variance, Procurement Status, and Currency Summaries.
- **FR-005**: System MUST support GET `/reports/movements` with standard offset pagination (parameters: `page` and `limit`, defaulting to a limit of 50) and allow filtering by `itemId`, `startDate`, `endDate`, and `transactionType`. The `warehouseId` MUST NOT be accepted as a query parameter; it must be extracted securely from the user's active context via the `@ActiveScope()` decorator and `ScopeInterceptor` for Zero-Trust IDOR protection.
- **FR-006**: System MUST enforce type check, linting, and unit test execution for backend NestJS code inside the CI pipeline (GitHub Workflows).

### Key Entities *(include if feature involves data)*

- **WarehouseLock**: Represents physical mutation locks on warehouses. Key attributes include `id`, `warehouseId`, `status` (Enum), `isActive` (Boolean), and index on `warehouseId`.
- **NotificationLog**: Represents transactional workflow notifications. Attributes include `id`, `recipient`, `payload`, `status`, and `createdAt`.
- **StockLedger**: Represents historical movements of items. Attributes include `id`, `itemId`, `warehouseId`, `quantity`, `postedAt`, and composite index on `warehouseId`, `itemId`, `postedAt`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application startup validation runs and completes in under 1 second.
- **SC-002**: 100% of reports endpoints respond with live data in under 500ms for standard dataset sizes.
- **SC-003**: CI validation runs automatically on every pull request targeting the backend and completes execution within 5 minutes.
- **SC-004**: Zero database schema drift reported when running Prisma migration verification.

## Assumptions

- PostgreSQL database is the active data store.
- Prisma is used as the ORM client in NestJS.
- GitHub Actions is the active CI platform.
- Existing frontend reporting UI expects standard JSON response shapes matching the requested report metrics.

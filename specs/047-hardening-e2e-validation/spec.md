# Feature Specification: Hardening & E2E Validation (Sprint 4)

**Feature Branch**: `047-hardening-e2e-validation`  
**Created**: 2026-06-01  
**Status**: Approved  
**Input**: User description: "read this file and create a specification for the Sprint 4: Hardening & E2E Validation only"

## Clarifications

### Session 2026-06-01

- Q: If a staging load test or rollback drill encounters a deadlock, latency degradation (p95 > 500ms), or a data mismatch, how should the deployment pipeline respond? → A: Failures trigger a hard hold on the deployment pipeline, pausing the release and requiring a manual administrative approval bypass key to proceed.
- Q: When copy-seeding production ledger records to staging for transaction load testing, how should sensitive financial unit costs, WAC valuations, and supplier pricing be anonymized to prevent business cost leakage? → A: Option A (Multiplicative Jitter) with item-constant factors (Anonymized Cost = Original Cost * ItemFactor, where ItemFactor is randomly generated once per item and remains constant across all historical transactions). Also anonymize: Supplier/Customer names, Emails, Phone numbers, Tax IDs, Bank details. Do NOT anonymize: Quantities, Dates, Lot structures, Warehouse relationships, Workflow states.
- Q: If a scoped user manually enters a URL query parameter for an unauthorized warehouse, how should the Next.js client react? → A: The client blocks page rendering entirely and displays a full-screen, high-density '403 Access Denied' page matching the Operational Nocturne design system with a Back navigation CTA.
- Q: When viewing a historical posted document that contains a deactivated item or warehouse, how should the Next.js UI display the deactivated entity? → A: Resolve and render the entity normally, but append a subtle 'Inactive' or 'Deactivated' badge (e.g. gray/amber tag) next to the item SKU or warehouse code.
- Q: Which system roles should be authorized to query the secured detailed database backup metadata and recovery stats on the /health/backup endpoint? → A: Permits both system administrators (ADMIN) and security/compliance auditors (AUDITOR) to view operational backup logs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pilot Rollout & Database Rollback Drill (Priority: P0 - Release Blocker)

As a release manager or database administrator, I want to run concurrent transaction load tests and automated rollback drills on a staging environment, so that we can verify transactional consistency under load and guarantee safe disaster recovery.

**Why this priority**: Sprint 4 changes modify serializable locks and critical database schemas. Running these in production without staging load simulation and rollback verification poses a severe operational risk.

**Independent Test**: Can be tested by executing a script that fires 50 concurrent parallel issues and transfers on staging, simulating a deployment failure, executing the database restore scripts, and verifying the staging database re-reconciles perfectly with 0% ledger inconsistencies.

**Acceptance Scenarios**:

1. **Given** a staging environment populated with anonymized production data, **When** parallel transfers and issues are executed concurrently at a peak rate of 50 transactions per second, **Then** database `Serializable` isolation and pessimistic row locks prevent ghost stock or WAC valuation drifts.
2. **Given** a deployment failure simulation on staging, **When** the database rollback and disaster recovery script is executed, **Then** all tables are restored to the exact pre-migration state with zero data loss or ledger corruption.

---

### User Story 2 - Comprehensive E2E Test Suite for Kitchen Requests (Priority: P1)

As a QA lead or developer, I want to execute a comprehensive E2E automated test suite covering the entire kitchen request lifecycle, so that we can verify that no silent stock leaks or un-voided ledger issues occur in production.

**Why this priority**: Essential to guarantee that the kitchen request void bug (`ENG-0003`) is fully resolved and that no operational regressions can occur.

**Independent Test**: Can be tested by running the Playwright kitchen request suite: creating a draft, submitting it, fulfilling it (generating stock ledger drops), voiding the request, and verifying that stock lot levels and WAC revaluations are automatically reversed.

**Acceptance Scenarios**:

1. **Given** a submitted kitchen request, **When** the request is voided in the system, **Then** the linked `InventoryIssue` is automatically voided in the same database transaction, reversing all lot deductions and cost entries.
2. **Given** a kitchen request fulfillment process, **When** an error occurs mid-execution, **Then** the database rolls back the entire request state, leaving stock lots and ledger balances completely untouched.

---

### User Story 3 - Secure Public Diagnostics and Health Splitting (Priority: P1)

As a security engineer or system operator, I want `/metrics` and detailed diagnostic metrics to be restricted to authorized scrapers/administrators, while keeping basic binary `/health` check states public, so that internal system metadata is protected from disclosure.

**Why this priority**: Public metrics and diagnostic backup lists present a significant information-disclosure vector. Restricting them is critical for infrastructure hardening.

**Independent Test**: Can be tested by performing public HTTP queries to `/metrics` and `/health/backup` and verifying a `401 Unauthorized` or `403 Forbidden` response is returned, while `GET /health` continues to return a simple `200 OK` binary status.

**Acceptance Scenarios**:

1. **Given** an unauthenticated external load balancer, **When** querying `GET /health`, **Then** the API returns `200 OK` with a safe status payload: `{"status": "ok"}`.
2. **Given** a Prometheus scraper querying `GET /metrics`, **When** the request includes the authorized `X-Metrics-Token` header, **Then** system metrics are returned. When the header is missing, a `403 Forbidden` response is returned.
3. **Given** a diagnostic query to `GET /health/backup`, **When** the query is made by a user with the `ADMIN` or `AUDITOR` role, **Then** the system returns backup details. When queried by other roles or unauthenticated users, it returns `403 Forbidden` or `401 Unauthorized` respectively.

---

### User Story 4 - Selective Soft-Delete Query Filtering (Priority: P2)

As a warehouse keeper, I want inactive items, warehouses, and lots to be filtered out of active user selection dropdowns and searches, while allowing historical ledgers and cost revaluation runs to query these inactive items without relational errors.

**Why this priority**: Avoids application failures in cost recalculation jobs while maintaining a clean, clutter-free user experience in drafting screens.

**Independent Test**: Can be tested by deactivating a stock item, verifying that the item no longer appears when creating a new Purchase Request, and then executing a historical Cost Ledger query to verify that historical transactions linked to the inactive item still resolve relationships successfully.

**Acceptance Scenarios**:

1. **Given** a warehouse or item marked as inactive (`isActive: false`), **When** a user opens inventory search or creation forms, **Then** the inactive record is excluded from selection.
2. **Given** a cost revaluation job traversing historical ledger transactions involving deactivated items, **When** the background revaluation runs, **Then** it resolves relations to the inactive items and completes without errors.
3. **Given** a historical posted GRN containing a deactivated item, **When** an auditor opens the GRN detail view, **Then** the system resolves the item details successfully and displays an 'Inactive' badge next to the item SKU.

---

### User Story 5 - CSRF Handshake Integration Coverage (Priority: P2)

As a security auditor, I want integration tests to fully verify that our cross-site request forgery (CSRF) protection handshake is strictly enforced, ensuring session-hijack mutations are blocked.

**Why this priority**: Proves that the implemented `CsrfGuard` and Axios interceptors are robust and fully functional.

**Independent Test**: Run CSRF integration test suite and verify that state-changing requests (POST, PUT) are rejected with `403 Forbidden` when they provide session cookies but lack the matching `X-XSRF-TOKEN` header.

**Acceptance Scenarios**:

1. **Given** a state-changing API request (POST/PUT/DELETE) containing active authentication cookies, **When** the request lacks a valid `X-XSRF-TOKEN` header, **Then** the system rejects it with `403 Forbidden`.
2. **Given** a state-changing API request, **When** the request contains both session cookies and the valid `X-XSRF-TOKEN` header, **Then** the system authorizes and processes the request.

---

### Edge Cases

- **Load Test Failure Threshold**: The load test fails if database locks deadlock, p95 request latency exceeds 500ms, or a rollback data discrepancy occurs. Any failure triggers a hard hold on the deployment pipeline, requiring manual administrative approval to bypass and proceed.
- **Staging Data Anonymization**: All sensitive customer, supplier, and financial cost data copied to staging is anonymized using item-constant multiplicative jitter: Anonymized Cost = Original Cost * ItemFactor, where ItemFactor is randomly generated once per item and remains constant across all historical transactions. Also anonymized: Supplier/Customer names, Emails, Phone numbers, Tax IDs, and Bank details. System preserves quantities, dates, lot structures, warehouse relationships, and workflow states as-is.
- **Metrics Key Distribution**: The Prometheus metrics security token `X-Metrics-Token` will be provisioned as a static environment variable (`METRICS_TOKEN`) on the hosting container, and validated in memory for low-latency performance.
- **Load Test Scale**: The staging load test simulation will target up to 50 concurrent transactions per second (representing peak operational traffic for a large branch) to verify database serializable lock and pessimistic locking reliability.
- **Scoped User URL Manipulation**: If a user scoped to Warehouse A manually inputs a URL route or query parameter for Warehouse B, the frontend Next.js middleware or router blocks page rendering and displays a dedicated full-screen '403 Access Denied' view with a navigation return button, while the NestJS backend rejects any underlying API fetch requests with a standard 403 Forbidden status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system must split health diagnostic checks: public `/health` must only return binary state `{"status": "ok"}`, while detailed metrics (e.g., S3 backup logs) require valid JWT authentication.
- **FR-002**: The Prometheus metrics endpoint `/metrics` must require secret header validation by checking if the incoming `X-Metrics-Token` header matches the static `METRICS_TOKEN` environment variable configuration.
- **FR-003**: The database mapping layer must NOT inject active filters globally. Soft-delete exclusions must be explicitly declared in user-facing query lists only, allowing historical audits to traverse inactive records.
- **FR-004**: The system must include a fully automated E2E test suite in Playwright verifying the complete kitchen request lifecycle, including draft, submission, lot balance verification, and transaction rollback during voiding.
- **FR-005**: The system must include integration test suites that verify CSRF handshake verification, ensuring mutations without `X-XSRF-TOKEN` headers are rejected with `403 Forbidden`.
- **FR-006**: The release management suite must include database backup and recovery rollback scripts, alongside a parallel transaction load test simulating up to 50 concurrent transactions per second to verify serializable locks on staging.
- **FR-007**: The deployment pipeline must automatically pause and enter a 'HOLD' status if the staging load test or rollback verification fails, requiring a manual administrative approval bypass key to continue.
- **FR-008**: The database anonymization seeder must sanitize cost ledger and supplier transaction values using item-constant multiplicative factors, while generating mock replacements for names, emails, phones, tax IDs, and bank details, and leaving quantities, dates, and state transitions intact.
- **FR-009**: The frontend routing layer must intercept unauthorized warehouse scope parameters in the URL and mount a custom full-screen 403 Access Denied page, preventing page UI or data layouts from mounting.
- **FR-010**: When rendering historical posted transaction detail pages (GRN, Transfer, Issue, Adjustments), the Next.js client must display a subtle 'Inactive' or 'Deactivated' label next to any linked item, warehouse, or lot that has `isActive: false`, providing clear audit visibility.
- **FR-011**: Access to the detailed `/health/backup` endpoint (displaying S3 file paths and RPO delta metrics) must be restricted to users holding either the `ADMIN` or `AUDITOR` role.

### Key Entities *(include if feature involves data)*

- **AuditLog**: Existing database entity storing immutability logs. Attributes: beforeStateJson, afterStateJson, action, targetTable, targetId, userId, ipAddress.
- **BackupLog**: Represents db backup records. Attributes: fileKey, sizeBytes, backupTimestamp, isEncrypted, status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of state-changing endpoints reject mutations lacking `X-XSRF-TOKEN` headers with `403 Forbidden` under CSRF integration validation.
- **SC-002**: Public `/health` queries load in under 50ms with 0% system internals exposure.
- **SC-003**: Unauthorized queries to `/metrics` return `403 Forbidden` within a 1-handshake threshold.
- **SC-004**: Rollback drill successfully restores the database staging environment to pre-deployment baseline in under 3 minutes with 0% data discrepancies.

## Assumptions

- Staging environments are structurally identical to production nodes, running PostgreSQL with similar configurations.
- Prometheus scrapers support custom headers, allowing them to pass the required `X-Metrics-Token` key.
- Security-audited keys and JWT tokens are managed using standard configuration profiles without hardcoded constants.

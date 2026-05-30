# Feature Specification: LogiRest Risk Remediation Tasks

**Feature Branch**: `040-risk-remediation-tasks`  
**Created**: 2026-05-30  
**Status**: Draft  
**Input**: User description: "Implement LogiRest risk remediation tasks (TASK-001 through TASK-020) to address security vulnerability, data integrity, and observability concerns in Sprint 1 to 4."


## Clarifications

### Session 2026-05-30

- **Q**: Account Lockout Release Strategy (TASK-007) → **A**: Option A (Dual Release) - Account automatically unlocks after 15 minutes OR can be manually unlocked by an administrator immediately.
- **Q**: External Alerting Webhook Format (TASK-018) → **A**: Option A (Slack-Compatible Webhook Payload) - Webhook payload uses the standard Slack/Discord format for simple native integrations.
- **Q**: Database Backup Offsite Storage & Authentication (TASK-001) → **A**: Option A (Environment Variables) - S3 credentials are authentication access keys stored in environment variables, maintaining consistency with `.env` patterns.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Identity & Access Management Hardening (Priority: P1)

As a security auditor and a system user, I want the system's authentication and user profile endpoints to be hardened against brute-force login attacks, token forgery, session hijacking, and privilege escalation so that my account credentials and corporate data remain completely secure.

**Why this priority**: Directly resolves pre-launch security blockers (C2, C3, H1, H7, M6) which expose the system to high risks of data breaches, token forgery, and brute-force takeover.

**Independent Test**: Can be verified by trying to access the app with missing JWT env secrets (should fail to boot), performing 5 consecutive invalid logins on a user account (should lock the account for 15 minutes), and performing profile updates (should reject email/role changes and write successful audit logs with client IP addresses).

**Acceptance Scenarios**:

1. **Given** a user account with active credentials, **When** 5 consecutive failed login attempts occur within the lockout window, **Then** the account is locked for 15 minutes, and administrators are notified immediately.
2. **Given** a locked user account, **When** a login attempt is made during the lockout duration, **Then** a generic unauthorized exception is returned without disclosing the lock status.
3. **Given** a logged-in user, **When** they update their profile details, **Then** class-validator DTOs validate input, email and role fields are blocked from editing, and a successful audit log is written.

---

### User Story 2 - Operational Inventory Movement & Control Integration (Priority: P1)

As a kitchen manager and warehouse supervisor, I want fulfilling a Kitchen Request to automatically deduct real stock from inventory and lots past their expiration date to be frozen instantly so that inventory levels are always accurate and expired ingredients are never issued.

**Why this priority**: Eliminates "phantom inventory" discrepancies (C4) where kitchen request fulfillment did not deduct stock, and prevents the safety hazard of using expired stock (C6/H2).

**Independent Test**: Fulfilling a kitchen request for 5 units of an item must atomically create a posted `InventoryIssue` for 5 units, reducing physical stock. Lots that reach their expiry date must be auto-moved to `EXPIRED` status and frozen from future allocations.

**Acceptance Scenarios**:

1. **Given** a pending Kitchen Request for a specific quantity, **When** the request is transitioned to `FULFILLED`, **Then** an `InventoryIssue` in `SUBMITTED` status is atomically created and posted in the same transaction.
2. **Given** a Kitchen Request fulfillment where inventory quantities are insufficient, **When** fulfillment is initiated, **Then** the transaction is rejected, no stock is deducted, and a descriptive error is returned.
3. **Given** active stock lots in the system, **When** the scheduled daily lot alert job runs, **Then** all lots past their `expiryDate` are transitioned to `EXPIRED` and an audit entry is logged.

---

### User Story 3 - Financial Recalculation Accuracy & Running Balances (Priority: P2)

As a financial accountant, I want all stock ledger movements to calculate a real-time running balance and transfer receipts to use a single unified average cost calculator so that our asset value reports are correct and fast to retrieve.

**Why this priority**: Resolves duplicate formulas (M2), O(n) loop database performance issues (H3), and running balance reporting bugs (L2) that impact financial reconciliation.

**Independent Test**: Check that transfer receipt costs match equivalent goods receipt (GRN) receipts, and ensure the movements API response accurately renders running balance sequences.

**Acceptance Scenarios**:

1. **Given** a stock transfer between warehouses, **When** the transfer is received, **Then** the system uses the unified `WacService` to recalculate the Weighted Average Cost (WAC).
2. **Given** a history of stock movements for an item, **When** the movements API is queried, **Then** the system returns accurate running balances calculated via database window functions.
3. **Given** the cost-ledger reconciliation job is scheduled, **When** it executes, **Then** it identifies GRN cost orphans using a single set-based SQL query instead of querying in a loop.

---

### User Story 4 - Business Continuity, Observability & Webhook Alerts (Priority: P2)

As a system administrator, I want automatic daily database backups stored offsite, container metrics visualized in a dashboard, and critical system anomalies paged to our chat webhooks so that we have high uptime and rapid incident response.

**Why this priority**: Protects against permanent data loss (C1), ensures high-level application uptime monitoring (M5), and provides immediate visibility into critical issues (H8).

**Independent Test**: Running the docker-compose stack should spin up database backups and Grafana, and simulating a reconciliation mismatch should trigger an immediate webhook post.

**Acceptance Scenarios**:

1. **Given** a running production stack, **When** the scheduled backup time is reached, **Then** a compressed PostgreSQL dump is written to a mounted volume and uploaded to S3 storage.
2. **Given** a critical system anomaly (e.g. reconciliation discrepancy, replay attack), **When** the event occurs, **Then** the `AlertService` dispatches an outbox event that POSTs a Slack-compatible message to a webhook URL.
3. **Given** a development or staging environment, **When** accessing the Swagger API documentation, **Then** non-development instances require HTTP Basic Auth credentials.

---

### Edge Cases

- **What happens when a database backup fails due to network outage?**
  The health check endpoint MUST report a failure if the last successful backup is older than 26 hours, flagging the system as unhealthy to administrators.
- **What happens when multiple concurrent posts are made for the same inventory issue?**
  The system MUST validate the HTTP-level idempotency key to reject duplicate ledger postings and return the cached initial response.
- **What happens when a lot auto-expires but still has a positive stock balance?**
  The daily reconciliation job MUST issue a `CRITICAL` notification alert to trigger manual warehouse intervention.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST run scheduled daily automated PostgreSQL database backups, compress the dump files, write them to a mounted volume, upload them to S3-compatible storage authenticated via environment-provided access and secret keys, prune old files based on a 7-day retention policy, and provide a verified restore script.
- **FR-002**: The system MUST implement a secure, token-based, single-use password reset workflow using cryptographically random 32-byte tokens hashed with SHA-256 that expire in 1 hour, utilize outbox events for email dispatch, and include a cleanup task for expired tokens.
- **FR-003**: The system MUST automatically and atomically create and post an `InventoryIssue` in `SUBMITTED` status when a `KitchenRequest` is fulfilled, mapping the fulfilled quantities to issue lines and linking the records, rolling back the transaction if quantities are insufficient.
- **FR-004**: The system MUST persist yield and waste data in a relational database using a new `YieldBatch` schema rather than storing them in volatile server memory.
- **FR-005**: The system MUST fail to start up if required JWT access or refresh secret environment variables are not configured, eliminating default fallback keys.
- **FR-006**: The system MUST automatically run a daily cron job that transitions all active lots past their expiration date to `EXPIRED` status, freezing them from future inventory allocation, and writing an audit log.
- **FR-007**: The system MUST lock a user account for 15 minutes after 5 consecutive failed login attempts, write a critical notification log, support configurable limits via system settings, allow manual admin unlocking, and automatically release the lock after 15 minutes.
- **FR-008**: The system MUST strictly validate profile update payloads via class-validator DTOs, prevent clients from modifying their email, roles, or scopes directly, and log an audit entry for every change.
- **FR-009**: The system MUST write an audit log entry for every successful user login, including the client IP address extracted from the incoming request.
- **FR-010**: The system MUST protect stock ledger posting endpoints with idempotency keys, validating keys at the HTTP layer, caching the response, and preventing duplicate database postings on retries.
- **FR-011**: The database schema MUST enforce check constraints preventing negative inventory balances on `qty_on_hand` in items, lots, and kitchen request fulfillment quantities.
- **FR-012**: The transfer receiving post handler MUST recalculate Weighted Average Cost (WAC) using the central unified `WacService` to eliminate duplicate calculation logic.
- **FR-013**: The reconciliation job MUST retrieveGoods Received Note (GRN) cost orphans using a single set-based SQL query to eliminate O(n) database loops.
- **FR-014**: The kitchen request generation handler MUST use the unified `DocumentSequenceService` to allocate sequential, gapless document numbers instead of generating random values.
- **FR-015**: The stock movements list API MUST calculate physical running balances via database window functions and retrieve posting usernames via approval event joins.
- **FR-016**: The database schema MUST define indexes on high-frequency query columns including GRN statuses, stock ledger document IDs, cost ledger document IDs, and active warehouse locks.
- **FR-017**: The containerized docker stack MUST provision a Grafana metrics visualizer pre-configured with a Prometheus datasource connected to the API metrics endpoint.
- **FR-018**: The system MUST support external webhook notifications to a configurable web address using Slack-compatible payloads for high-priority alerts including reconciliation errors and token replay attacks.
- **FR-019**: The TypeScript compiler settings MUST enforce strict mode rules, removing ESLint suppression comments and replacing generic parameter types with strongly-typed schemas.
- **FR-020**: The Swagger documentation UI MUST require HTTP Basic Auth credentials in all environments except local development.

### Key Entities *(include if feature involves data)*

- **`PasswordResetToken`**: Tracks single-use password reset tokens. Attributes: `{ id, userId, tokenHash, expiresAt, usedAt? }`.
- **`YieldBatch`**: Persisted batch tracking operational yield data. Attributes: `{ id, recipeName, category, warehouseId?, inputQty, outputQty, wasteQty, yieldPct, standardYield, efficiency, createdAt }`.
- **`KitchenRequest`**: Represents a kitchen ingredient requisition, now atomically linked to an `InventoryIssue` via `{ issueId }` FK.
- **`InventoryIssue`**: Records stock deductions corresponding to kitchen request fulfillments.
- **`StockLedger` / `CostLedger`**: Stores historical transactions and valuation, indexed on `{ documentId }` and `{ documentId, documentType }` for efficient window functions and reconciliation queries.
- **`AuditLog`**: Stores security-sensitive events including logins, profile changes, and auto-expiries. Attributes: `{ action, userId, targetTable, targetId, ipAddress, beforeState, afterState, createdAt }`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of user profile updates and authentication endpoints are covered by strict validation DTOs and fail-fast configurations with zero fallback credentials.
- **SC-002**: Zero instances of phantom inventory occur, with every kitchen request fulfillment translating into a verified, posted inventory issue.
- **SC-003**: Backup restoration can be completed in under 5 minutes on a fresh container, and critical system anomalies trigger webhook alerts within 10 seconds of occurrence.
- **SC-004**: High-frequency database queries retrieve stock movement balances and GRN statuses in under 100ms, even under concurrent user loads of 1,000+ operations.

---

## Assumptions

- Standard PostgreSQL database is used, allowing raw SQL check constraints and window functions.
- The NestJS application is deployed as a containerized stack utilizing Docker Compose.
- S3-compatible storage (e.g. MinIO or S3) is available for storing database dumps.
- An existing SMTP outbox system is operational for dispatching email events.
- All modifications maintain strict separation of concerns, keeping backend services inside the API workspace and importing shared types from the shared package.

# Feature Specification: Phase 0 — Pre-Deploy Blockers

**Feature Branch**: `038-phase0-pre-deploy-blockers`  
**Created**: 2026-05-29  
**Status**: Draft  
**Source**: Enterprise Reliability & Operational Hardening Audit — TASK-01 through TASK-07  

---

## Overview

This specification covers the 7 mandatory hardening tasks (TASK-01 → TASK-07) that constitute Phase 0 of the LogiRest reliability remediation plan. Every task in this phase is classified **P0 (Deploy Blocker)** — the system MUST NOT reach production until all 7 are resolved. They collectively address auth session integrity, secret hygiene, infrastructure self-healing, container readiness, deployment idempotency, database locking behaviour, and disaster recovery.

---

## Clarifications

### Session 2026-05-29

- Q: Database Seeding Execution in Production Environment (TASK-05) → A: Option B (Manual runbook trigger only. Seeding is completely removed from the Docker startup command.)
- Q: Database Backup Storage & Destination Strategy (TASK-07) → A: Option A (Local host storage only. Backups are saved strictly to the host path /backups/logirest.)

---


## User Scenarios & Testing *(mandatory)*

### User Story 1 — Users Can Never Be Locked Out by a Crashed Token Rotation (Priority: P1)

A logged-in user's session remains valid even if the server crashes at the exact moment a refresh-token rotation is in progress. The user can always present their current refresh token and receive a new one, or continue with the original token if the rotation was not committed.

**Why this priority**: A non-atomic rotation is a silent session-killer. Any user mid-session during a deployment restart would be permanently logged out with no self-service recovery path.

**Independent Test**: Can be fully tested by simulating a server crash between the revocation and creation steps in the token rotation flow, then verifying the user can still authenticate.

**Acceptance Scenarios**:

1. **Given** a user holds a valid refresh token, **When** the server crashes after revoking the old token but before persisting the new one, **Then** the entire rotation is rolled back and the original token remains valid.
2. **Given** a server crash does not occur, **When** the user rotates their refresh token, **Then** the old token is revoked and a new token is persisted atomically in a single committed operation.
3. **Given** a successful rotation, **When** the user presents the old (now revoked) token, **Then** the system rejects it with an `UNAUTHORIZED` response.

---

### User Story 2 — Production Cannot Start with Insecure JWT Secrets (Priority: P1)

A system administrator deploying to a production environment is blocked at startup if any JWT secret is using a known development default value. The application refuses to start and emits a clear error message indicating which secret is unsafe.

**Why this priority**: Weak or well-known JWT secrets make every token in the system forgeable, rendering authentication meaningless. This is a silent misconfiguration that bypasses all security controls.

**Independent Test**: Can be fully tested by starting the API service in production mode with the default development secret and verifying it crashes with a descriptive validation error.

**Acceptance Scenarios**:

1. **Given** `NODE_ENV=production`, **When** the API starts with `JWT_ACCESS_SECRET` set to the known development default, **Then** startup fails immediately with an error naming the offending variable.
2. **Given** `NODE_ENV=production`, **When** the API starts with a cryptographically strong random secret (≥ 32 characters, not a known default), **Then** startup succeeds normally.
3. **Given** `NODE_ENV=development`, **When** the API starts with the development default secret, **Then** startup succeeds with no error (dev environment is not restricted).

---

### User Story 3 — Containers Recover Automatically from Crashes (Priority: P1)

When any service container (API, frontend, database, cache, reverse proxy) crashes due to an out-of-memory error, an unhandled exception, or any process failure, it restarts automatically without operator intervention within seconds.

**Why this priority**: Without restart policies, any container crash causes a permanent outage that requires a human to manually intervene. In a production environment, this turns minor transient failures into extended downtime.

**Independent Test**: Can be fully tested by forcibly stopping a single container and verifying it self-heals within 10 seconds.

**Acceptance Scenarios**:

1. **Given** all services are running, **When** the API container is forcibly stopped, **Then** Docker restarts it automatically within 10 seconds.
2. **Given** a container has restarted automatically, **When** the restart policy is inspected, **Then** it shows `unless-stopped` for all services.
3. **Given** the host machine reboots, **When** Docker daemon starts, **Then** all services with `unless-stopped` policy restart automatically.

---

### User Story 4 — Traffic Is Never Routed to a Starting or Unhealthy Container (Priority: P1)

The reverse proxy only routes incoming requests to the API and frontend when those services are fully initialised, database migrations have completed, and the application is ready to serve requests. An unhealthy or starting container receives no traffic.

**Why this priority**: Without health checks, Docker marks a container as "healthy" the moment the process starts — before database migrations finish and before the server binds to its port. Users receive 502 errors during every deployment.

**Independent Test**: Can be fully tested by starting the stack and immediately checking whether the API health endpoint returns `200` before the reverse proxy begins forwarding requests.

**Acceptance Scenarios**:

1. **Given** the API container has just started, **When** database migrations are still running, **Then** the API container reports `starting` or `unhealthy` status and the reverse proxy does not forward requests to it.
2. **Given** the API is fully initialised and responding on its health endpoint, **When** Docker checks its health, **Then** the container reports `healthy` and the reverse proxy routes traffic normally.
3. **Given** the database container becomes unavailable, **When** Docker checks the API health, **Then** the API container transitions to `unhealthy` within the configured check interval.

---

### User Story 5 — Re-Deploying the System Never Fails Due to Duplicate Seed Data (Priority: P2)

A system administrator can re-deploy or restart the API container any number of times on an existing database without encountering errors. The deployment process is idempotent — running the seeding step a second, third, or tenth time produces no errors and no duplicate data.

**Why this priority**: A failing seed on the second deployment requires direct database intervention to resolve — a manual, error-prone process that extends downtime.

**Independent Test**: Can be fully tested by deploying the API container twice in sequence against a non-empty database and verifying both deployments succeed without errors.

**Acceptance Scenarios**:

1. **Given** a freshly provisioned database, **When** the API container starts for the first time, **Then** seed data is created successfully.
2. **Given** a database that already contains seed data, **When** the API container is redeployed, **Then** startup completes without errors and no duplicate records are created.
3. Given the seeding execution is removed from the Dockerfile startup command, When the container starts, Then no seeding is attempted and the application starts normally.

---

### User Story 6 — Stuck Database Locks Fail Fast Instead of Blocking All Users (Priority: P2)

When two inventory operations compete for the same database row lock simultaneously, the second operation fails quickly with a clear error rather than waiting indefinitely, allowing the user to retry immediately.

**Why this priority**: An indefinite lock wait means a single stuck transaction can block all concurrent users accessing the same item for up to 30 seconds, making the system appear frozen.

**Independent Test**: Can be fully tested by submitting two simultaneous write requests to the same inventory record and measuring the time until the second request receives an error response.

**Acceptance Scenarios**:

1. **Given** a database row is locked by an active transaction, **When** a second concurrent request attempts to acquire the same lock, **Then** the second request fails with a lock timeout error within 5 seconds.
2. **Given** a lock timeout occurs, **When** the error is returned to the client, **Then** the response indicates a conflict that can be retried, not a permanent failure.
3. **Given** no lock contention exists, **When** a normal write request is made, **Then** it completes without the lock timeout affecting its duration.

---

### User Story 7 — The Database Can Be Restored After Data Loss (Priority: P2)

A system administrator can restore the full database to any point within the last 30 days using a documented, tested restore procedure. Daily automated backups are taken without human intervention.

**Why this priority**: Without a backup and restore procedure, any data loss event — hardware failure, accidental deletion, ransomware — is permanent. There is no recovery path.

**Independent Test**: Can be fully tested by running the backup script, deleting a test record, running the restore script, and verifying the record is restored.

**Acceptance Scenarios**:

1. **Given** the backup script is scheduled and runs, **When** a backup completes, **Then** a compressed database dump file is created in the designated backup directory with a timestamp in the filename.
2. **Given** a backup file exists, **When** the restore script is executed with that backup file, **Then** the database is restored to the state at backup time after explicit operator confirmation.
3. **Given** backups older than 30 days exist in the backup directory, **When** the backup script runs, **Then** backups older than 30 days are automatically pruned.
4. **Given** a restore is needed, **When** the operator follows the runbook, **Then** the system is back online within 30 minutes of starting the procedure.

---

### Edge Cases

- What happens when a token rotation fails inside the transaction due to a database constraint violation? — The transaction must roll back completely and the original token must remain valid.
- What happens when the JWT secret validation runs in a CI/CD environment (not truly "production")? — The validation must distinguish `NODE_ENV=production` from `NODE_ENV=test` or `NODE_ENV=staging` to avoid breaking test pipelines.
- What happens if Docker daemon restarts when a container is stopped intentionally by an operator? — The `unless-stopped` policy must NOT restart containers that were explicitly stopped before the daemon restarted.
- What happens if the database container is not yet ready when the API health check fires? — The `start_period` grace window must provide sufficient time for migrations to complete before health checks begin failing.
- What happens if the backup directory is full or the disk has insufficient space? — The backup script must fail with a clear error log entry rather than silently creating a corrupt or empty dump file.
- What happens if two backup processes run simultaneously (e.g., cron fires while a previous run is still active)? — The procedure must handle concurrent backup attempts gracefully.

---

## Requirements *(mandatory)*

### Functional Requirements

**TASK-01 · Token Rotation Atomicity**

- **FR-001**: The system MUST wrap refresh-token revocation and new-token creation in a single atomic operation so that either both succeed or both are rolled back together.
- **FR-002**: The atomic operation MUST use the existing optimistic locking mechanism (version field) to prevent concurrent rotation conflicts.
- **FR-003**: If the atomic operation fails for any reason, the user's original refresh token MUST remain valid and usable.

**TASK-02 · JWT Secret Security Validation**

- **FR-004**: The system MUST reject startup in production mode if any JWT secret matches a known development default value.
- **FR-005**: The validation MUST cover both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- **FR-006**: The validation MUST apply only in production mode; development and test modes MUST NOT be affected.
- **FR-007**: The environment configuration example file MUST include a comment instructing operators to generate secrets using a cryptographically secure method.

**TASK-03 · Docker Restart Policies**

- **FR-008**: All Docker Compose services (database, cache, API, frontend, reverse proxy) MUST be configured with an `unless-stopped` restart policy.
- **FR-009**: Services configured with `unless-stopped` MUST restart automatically within 10 seconds of an unplanned crash.
- **FR-010**: Services explicitly stopped by an operator MUST NOT restart automatically after a Docker daemon restart.

**TASK-04 · Docker Health Checks**

- **FR-011**: The API service MUST have a health check that probes its readiness endpoint at defined intervals.
- **FR-012**: The frontend service MUST have a health check that probes its readiness endpoint at defined intervals.
- **FR-013**: The reverse proxy service MUST only start routing traffic after the API and frontend services report a `healthy` status.
- **FR-014**: The API health check MUST allow sufficient startup time (grace period) for database migrations to complete before failing.
- **FR-015**: If the database becomes unavailable, the API service MUST transition to `unhealthy` status within the defined check interval.

**TASK-05 · Idempotent Database Seeding**

- **FR-016**: All seed operations MUST be idempotent — running the seed any number of times on an existing database MUST produce no errors and no duplicate records.
- **FR-017**: Seed operations using record creation MUST use an "upsert" pattern: create the record if it does not exist; skip or update if it already exists.
- **FR-018**: Database seeding MUST NOT run automatically on container startup in production deployments and MUST be completely removed from the Docker startup command.
- **FR-019**: The runbook or documentation MUST include a manual command for operators to run seeding intentionally on a fresh database.

**TASK-06 · PostgreSQL Lock Timeout**

- **FR-020**: The database connection MUST be configured with a maximum lock wait timeout so that lock acquisition failures occur within a bounded time (≤ 5 seconds) rather than waiting indefinitely.
- **FR-021**: When a lock timeout occurs, the system MUST return an error to the caller indicating a temporary conflict, distinct from permanent errors.
- **FR-022**: The environment configuration example file MUST include the lock timeout parameter in the database connection string example.

**TASK-07 · Backup & Restore Procedure**

- **FR-023**: A backup script MUST create a compressed, timestamped database dump in a designated directory on the local host filesystem without any operator interaction.
- **FR-024**: The backup script MUST automatically remove backup files older than 30 days from the backup directory.
- **FR-025**: A restore script MUST require explicit operator confirmation (typing a confirmation word) before dropping and recreating the database.
- **FR-026**: The restore script MUST accept the backup file path as a command-line argument.
- **FR-027**: The operational runbook MUST include: backup scheduling instructions, a step-by-step manual restore procedure, and a monthly restore test procedure.
- **FR-028**: The backup and restore scripts MUST be executable on the production host without additional software beyond what is already installed (Docker).

### Key Entities

- **RefreshToken**: Represents a user session token with fields for token hash, user association, session association, revocation status, expiry, and a version counter for optimistic locking.
- **EnvironmentConfig**: The validated set of environment variables required at API startup, including JWT secrets, database connection strings, and runtime mode.
- **DockerService**: A containerised process (API, frontend, database, cache, reverse proxy) with its restart policy, health check configuration, and inter-service dependency rules.
- **DatabaseBackup**: A compressed point-in-time snapshot of the production database, identified by a timestamp, stored in a designated directory, and subject to a 30-day retention policy.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A simulated server crash during token rotation leaves the original refresh token valid and the user can re-authenticate within 3 seconds of the crash resolving — with zero permanent session lockouts across 100 simulated crash events.
- **SC-002**: Starting the production API with a known development JWT secret results in startup failure 100% of the time, with a clear error message identifying the problematic variable.
- **SC-003**: Any single container crash results in automatic restart and return to `healthy` status within 30 seconds, with no operator intervention required.
- **SC-004**: During a fresh deployment, the reverse proxy begins routing traffic only after the API health endpoint has returned `200` at least once — users see zero 502 errors during normal deployments.
- **SC-005**: Re-deploying the API container against an existing database succeeds without errors 100% of the time across 10 consecutive deployments.
- **SC-006**: When two users simultaneously submit conflicting write requests to the same inventory record, the second request receives an error response within 5 seconds — not after a 30-second timeout.
- **SC-007**: Daily backups complete without human intervention, and a full database restore from a backup file can be executed and verified by a single operator within 30 minutes.

---

## Assumptions

- The system runs on Docker Compose (not Kubernetes or a managed container platform); restart policies and health checks are configured at the Compose level.
- The production host has the `curl` utility available inside the API and frontend containers for use in health check probes.
- Database migrations are managed by Prisma and run automatically as part of the API container startup command.
- The backup directory (`/backups/logirest`) is a volume mount on the production host with sufficient disk capacity for at least 30 days of compressed database dumps.
- The production host has a cron daemon available for scheduling the daily backup script.
- JWT secrets in production are generated by operators using a cryptographic random tool (e.g., `openssl rand -hex 32`) and stored as environment variables — not in source control.
- The existing optimistic locking mechanism (the `version` field on Prisma models) is already present in the database schema and is used correctly by existing services; TASK-01 only needs to wrap operations in a transaction.
- Seeding is a one-time setup operation for a fresh environment; production data is managed through the application workflows, not through the seed script.
- The lock timeout value (5 seconds) is appropriate for the expected transaction workload; it will not cause false positives for legitimate long-running transactions.
- The restore script targets the same Docker Compose environment as the backup — cross-environment restores are out of scope.

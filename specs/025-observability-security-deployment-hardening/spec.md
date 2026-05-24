# Feature Specification: Observability, Security & Deployment Hardening (Phase 3)

**Feature Branch**: `025-observability-security-deployment-hardening`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "read this file @[c:\Users\Qursan\.gemini\antigravity-ide\brain\095346a0-3262-4203-aadf-1684e17f34d6\production_hardening_roadmap.md] and creat a specification for the phase 3 only"

## Clarifications

### Session 2026-05-24

- Q: How should token refresh and cross-site request forgery (CSRF) protection be handled in secure cookies? → A: Both access and refresh tokens must be delivered via separate `HttpOnly`, `Secure` cookies with the `SameSite=Strict` attribute, relying on strict domain matching as the primary defense against CSRF. Refresh Token Rotation (RTR) and family revocation will be supported, pulling the refresh token directly from the cookie for token refresh.
- Q: What are the requirements for the local development message broker and event retention? → A: The local message broker (Redis) container must be defined in the container composition configuration for an out-of-the-box local development experience. Succeeded events in the transactional outbox must be retained for exactly 7 days for auditing before automated permanent deletion. Failed events must be retained indefinitely.
- Q: How should the client application handle missing API configurations? → A: The application must fail fast. If local mock interfaces are disabled and no API URL configuration is defined, the application must throw a fatal initialization error at startup, refusing to run or silently fallback.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Session Cookies (Priority: P1)

As an administrator, I want user session and refresh tokens to be secured against client-side script access, so that our credentials and API keys are protected from cross-site scripting (XSS) theft.

**Why this priority**: Crucial security requirement. Storing access tokens in standard local storage or accessible cookies exposes session credentials to theft via client-side scripts.

**Independent Test**: Can be tested by logging in via the web application, verifying that session tokens cannot be read via standard client-side scripts, and confirming that subsequent requests are automatically authenticated via cookies.

**Acceptance Scenarios**:

1. **Given** a user successfully logs in, **When** the session credentials are returned, **Then** the application issues the access and refresh tokens via separate cookies configured as `HttpOnly`, `Secure`, and `SameSite=Strict`.
2. **Given** an authenticated user session, **When** client-side script attempts to access the tokens via document cookie APIs, **Then** the tokens are completely inaccessible.
3. **Given** a user requests a session token refresh, **When** the refresh request is received, **Then** the application extracts the refresh token from the secure cookie, verifies it, executes the Refresh Token Rotation (RTR) logic, and updates both cookies with new tokens.

---

### User Story 2 - Fail-Fast API Configuration (Priority: P2)

As a deployer, I want the client application to fail fast during initialization if its API configuration is missing or invalid when mocks are disabled, so that configuration errors are caught immediately rather than causing silent runtime failures.

**Why this priority**: Prevents environment misconfigurations and phantom bugs by refusing to run under undefined API states.

**Independent Test**: Can be tested by starting the client application with local mock interfaces disabled and without configuring the API base URL, and verifying that the application immediately terminates or displays a fatal initialization error.

**Acceptance Scenarios**:

1. **Given** local mock interfaces are disabled and no API base URL is configured, **When** the client application starts up, **Then** it throws a fatal initialization error and halts execution.
2. **Given** local mock interfaces are disabled and a valid API base URL is configured, **When** the client application starts up, **Then** it initializes successfully and connects to the defined API URL.

---

### User Story 3 - Health Check Database Connectivity (Priority: P3)

As a systems administrator, I want the application health checkpoint to actively verify connection to the database, so that load balancers and container orchestrators do not route traffic to instances that cannot access data.

**Why this priority**: High operational stability requirement. A static health status masks database connectivity loss, preventing automatic container recovery.

**Independent Test**: Can be tested by querying the health checkpoint during a database outage and verifying that it returns a service unavailable status.

**Acceptance Scenarios**:

1. **Given** the database connection is active, **When** the health checkpoint is queried, **Then** it returns a success status (200 OK) confirming healthy database connectivity.
2. **Given** the database is offline or unreachable, **When** the health checkpoint is queried, **Then** it returns a service unavailable status (503 Service Unavailable) indicating database failure.

---

### User Story 4 - Asynchronous Notification Outbox Queue (Priority: P4)

As a store supervisor, I want system notifications to be processed asynchronously through a transactional outbox queue, so that core inventory workflow operations execute instantly without waiting for mail dispatches, and notifications are guaranteed to be delivered.

**Why this priority**: Prevents slow or failing external mail services from blocking or rolling back inventory database transactions.

**Independent Test**: Can be tested by triggering an event that dispatches a notification, verifying that the transaction completes instantly and logs the event to a database table, and confirming that a background runner dispatches the notification asynchronously while retrying on failure.

**Acceptance Scenarios**:

1. **Given** an inventory workflow action is executed, **When** the transaction is committed, **Then** the workflow state update and the outbox notification record are written to the database atomically in the same transaction.
2. **Given** a notification is written to the outbox table, **When** the background broker processes it, **Then** it dispatches the notification asynchronously and updates the outbox status to succeeded.
3. **Given** an outbox notification fails to send, **When** it is retried, **Then** it attempts delivery up to 5 times using an exponential backoff strategy before marking the record as failed.
4. **Given** succeeded outbox notification logs in the database, **When** they exceed the 7-day retention period, **Then** an automated clean-up job deletes them permanently. Failed logs are retained indefinitely.

---

### User Story 5 - Standalone Containerized Packaging (Priority: P5)

As a DevOps engineer, I want optimized container packaging and orchestration configurations, including a local message broker, so that local development and production deployments are fully identical and reproducible.

**Why this priority**: Eliminates environment differences and simplifies local developer onboarding by providing an out-of-the-box multi-service setup.

**Independent Test**: Can be tested by running the container orchestration setup locally and verifying that the client, API, and message broker containers start up and communicate successfully.

**Acceptance Scenarios**:

1. **Given** a clean development environment, **When** the container composition setup is launched, **Then** the client, API, and local message broker containers start and successfully establish network connectivity.
2. **Given** a production container build is executed, **When** the build completes, **Then** it produces a minimal, multi-stage production image containing only production assets.

---

### Edge Cases

- **Token Rotation Concurrency**: Managing race conditions when multiple concurrent client requests are made during a token refresh window, ensuring only one rotation is performed and others are allowed.
- **Outbox Processing Failure**: Ensuring that if the mail queue broker crashes, pending events are safely persisted in the database and picked up immediately upon recovery without duplication.
- **API URL Syntax validation**: Ensuring that the fail-fast check validates that the API base URL is a syntactically correct URL format, not just an arbitrary string.
- **Database Connection Re-establishment**: Ensuring the health check service correctly recovers and reports success once a database connection is restored after an outage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST deliver authentication access and refresh tokens via separate secure, HTTP-only cookies (`HttpOnly`, `Secure`, `SameSite=Strict`).
- **FR-002**: System MUST pull the refresh token directly from the incoming cookie for session refresh requests, validating it against the existing Refresh Token Rotation (RTR) and family revocation records.
- **FR-003**: Client application MUST validate that the API URL configuration is defined when local mocks are disabled, throwing a fatal initialization error at startup if undefined.
- **FR-004**: System MUST expose a health checkpoint route that actively checks database connectivity.
- **FR-005**: System MUST return a service unavailable status (503 Service Unavailable) from the health check if the database connection cannot be established.
- **FR-006**: System MUST utilize a Transactional Outbox pattern for notifications, committing both the workflow data changes and the outbox notification event in a single atomic database transaction.
- **FR-007**: System MUST process outbox events asynchronously using a background queue/broker, updating the outbox log status upon successful delivery.
- **FR-008**: System MUST retry failed outbox notification dispatches up to 5 times using an exponential backoff strategy.
- **FR-009**: System MUST run an automated clean-up job that deletes succeeded outbox notification events from the database after exactly 7 days.
- **FR-010**: System MUST retain failed outbox notification events in the database indefinitely for auditing and manual resolution.
- **FR-011**: System MUST provide container configuration files (`Dockerfile`) for both client and API services using multi-stage builds.
- **FR-012**: System MUST provide a container composition file (`docker-compose.yml`) defining client, API, and a local message broker (Redis) service for development.

### Key Entities *(include if feature involves data)*

- **OutboxEvent**: Represents a queued notification or event to be processed asynchronously. Key attributes: `id` (UUID), `eventType` (String), `payload` (JSON), `status` (Enum: PENDING, SENT, FAILED), `retryCount` (Int), `errorMessage` (String/Nullable), and `createdAt` (DateTime).
- **Session / Refresh Tokens**: State representation of active logins, mapped to secure HTTP cookies with Refresh Token Rotation tracking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Verification confirms zero session tokens are readable via client-side script contexts (XSS isolation).
- **SC-002**: Application startup halts in under 1 second when starting with mock interfaces disabled and no API URL configured.
- **SC-003**: Health checkpoint returns 503 within 500ms when database connectivity is severed.
- **SC-004**: Database transactions for workflow changes commit without latency degradation from notification dispatches.
- **SC-005**: Cleanup job successfully deletes expired outbox logs without impacting database transaction throughput.
- **SC-006**: Multi-stage container builds produce minimal runtime images excluding development tools and source files.

## Assumptions

- The production environment deploys both client and API applications under the same parent domain to support `SameSite=Strict` cookies.
- A local Redis service is sufficient as a message broker for development queue management.
- The mail sending capability is integrated with an external mail server, and communication failures will trigger outbox retry logic.

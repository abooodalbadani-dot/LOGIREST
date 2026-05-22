# Feature Specification: Authentication & Security

**Feature Branch**: `016-auth-and-security`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "Phase 3 only from PROJECT_MAP.md"

## Clarifications

### Session 2026-05-22

- Q: What is the target expiration lifespan for the JWT Access Token? → A: 15 minutes (Balanced standard: low risk, moderate refresh network overhead).
- Q: Should the secure refresh token be rotated upon every silent refresh attempt? → A: Enabled (Rotation) - Each refresh request invalidates the old refresh token and issues a new, single-use refresh token.
- Q: Should scope violations (unauthorized warehouse/branch requests) trigger a full system AuditLog entry in the database? → A: Log & Throw - Every scope violation (HTTP 403) must write a security event to the AuditLog table with user, scope, and IP details.
- Q: How should the system handle multiple concurrent sessions (different devices or browsers) for the same user account? → A: Concurrent Sessions Allowed - A user can log in from multiple devices/browsers simultaneously, maintaining separate refresh tokens for each session.
- Q: How should the authentication guard handle user active status verification for requests using a valid (unexpired) JWT access token? → A: Database Check on Every Request - The authentication guard queries the database to verify the user exists and is active (isActive === true) on every incoming request.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure User Authentication & JWT Protection (Priority: P1)

As a Store Manager or Warehouse Keeper, I want to securely log in to the inventory system using my credentials and have my active session securely managed, so that only authorized users can access the application's features and my data remains protected.

**Why this priority**: Core security foundation. All other system functionalities, document flows, and inventory mutations depend on having an authenticated user identity and active session context.

**Independent Test**: Can be tested independently by submitting correct credentials to the login endpoint, receiving an authentication session token, accessing a protected master data endpoint with that token, and verifying that attempts to access the same endpoint without a token are blocked with an appropriate authorization error (401 Unauthorized).

**Acceptance Scenarios**:

1. **Given** a user with registered credentials exists in the system, **When** they submit their correct email and password to the login interface, **Then** they are granted access, an authentication session token is generated, and a secure session cookie is established on their client.
2. **Given** an unauthenticated visitor or a client with an invalid/expired session token, **When** they attempt to access any secure inventory or master data endpoint, **Then** the system rejects the request immediately with a 401 Unauthorized response and does not execute the underlying action.
3. **Given** an authenticated user is currently logged in, **When** they submit a request to log out, **Then** their session is terminated, their secure session cookie is cleared from the client, and subsequent requests using that session are rejected.

---

### User Story 2 - Warehouse & Branch Scope Isolation / IDOR Prevention (Priority: P1)

As a Warehouse Keeper or Branch Manager, I want the system to restrict my data access and write operations to the specific warehouse and branch scope assigned to me, so that I cannot view or modify transactions belonging to other warehouses or branches that are outside my authorized boundaries.

**Why this priority**: Critical data integrity and operational safety. Prevents Insecure Direct Object Reference (IDOR) attacks where a user could manipulate IDs in request parameters to access unauthorized inventory locations.

**Independent Test**: Can be tested by logging in as a user authorized only for Warehouse A, attempting to retrieve data or post a document using the identifier of Warehouse B in the active scope headers, and verifying that the system rejects the request with a 403 Forbidden ("Scope not authorized") error.

**Acceptance Scenarios**:

1. **Given** a user authorized only for Warehouse A, **When** they submit a request containing an active scope header for Warehouse A, **Then** the system permits the request and processes the downstream logic scoped to Warehouse A.
2. **Given** a user authorized only for Warehouse A, **When** they submit a request containing an active scope header for Warehouse B, **Then** the system intercepts the request before execution and returns a 403 Forbidden error stating "Scope not authorized".
3. **Given** an administrator with global access scope, **When** they target any warehouse in their active scope headers, **Then** the system authorizes the request and processes it accordingly.

---

### User Story 3 - Session Persistence & Silent Refresh (Priority: P2)

As an active user of the inventory system, I want my session to remain active seamlessly while I am working, and automatically renew itself in the background without forcing me to re-enter my credentials, while still maintaining high security standards.

**Why this priority**: High user experience value. Prevents interruption of user workflows (e.g., in the middle of a stocktake count) due to token expiration, while maintaining short-lived access credentials for optimal security.

**Independent Test**: Can be tested by allowing the short-lived access token to expire, sending a request to the session refresh endpoint with the secure session cookie, and verifying that a new, valid access token is returned without prompting for a username and password.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an expired access token but a valid secure refresh session cookie, **When** the client requests a session refresh, **Then** the system verifies the cookie, issues a new active access token, and updates the session credentials.
2. **Given** a user with both an expired access token and an expired or invalid refresh cookie, **When** a refresh request is made, **Then** the system rejects the request, terminates the session, and redirects the client to the login interface.

---

### Edge Cases

- **Missing Active Scope Headers**: What happens when an authenticated user requests a warehouse-specific resource but omits the `x-warehouse-id` or `x-branch-id` headers? The system must reject the request with a 400 Bad Request or 403 Forbidden error indicating that the target scope is missing.
- **Scope Change Mid-Session**: If an administrator revokes a user's access to Warehouse A in the database while that user has an active session targeting Warehouse A, the system must immediately reject the user's next request to Warehouse A with a 403 Forbidden error because it performs database-level validation of scopes on every request.
- **User Deactivation Mid-Session**: If an administrator deactivates a user account (`isActive = false`) in the database, the system must immediately reject the user's next request with a 401 Unauthorized error because the authentication guard performs a database-level active status check on every request.
- **Malformed or Tampered Tokens**: If a client sends a token that has been altered or signed with an incorrect key, the authentication guard must catch the signature mismatch immediately and return a 401 Unauthorized response without decoding the payload for processing.
- **Exempted System Routes**: How does the system handle access control for routes that do not require scope validation (like basic user profile lookups or admin configuration)? The scope validation interceptor must support exclusion rules, allowing designated routes (e.g., `/auth/**` and `/admin/**`) to bypass scope checks while still validating authentication.
- **Refresh Token Replay**: If a client attempts to refresh a session using a previously invalidated refresh token (signaling potential theft), the system must immediately revoke the entire active session hierarchy for that user to prevent unauthorized access.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate users using their email address and a password, validating the password against a cryptographically secure hash stored in the database.
- **FR-002**: Upon successful login, the system MUST generate a cryptographically signed access token with an expiration lifespan of exactly 15 minutes, containing user identity details (user ID, role, and expiration), and set a secure, HttpOnly, SameSite, and Secure session cookie on the client for refresh purposes.
- **FR-003**: The system MUST enforce a global authentication guard on all API endpoints, requiring a valid, unexpired access token for all requests except designated public endpoints (e.g., login, public status checks).
- **FR-004**: The system MUST provide a secure session termination (logout) endpoint that invalidates the session and explicitly clears the secure refresh cookie from the client browser.
- **FR-005**: For all warehouse-scoped and branch-scoped operations, the system MUST validate that the target warehouse and branch identifiers provided in the request headers are explicitly mapped to the authenticated user's authorized scope list in the database.
- **FR-006**: If a user attempts to target a warehouse or branch ID that is not within their database-mapped authorized scopes, the system MUST immediately block the request, return a 403 Forbidden error with a clear access violation message, and record a security event in the `AuditLog` table containing user identity, targeted scope, and client details.
- **FR-007**: Upon successful scope validation, the system MUST inject the verified active scope identifiers (warehouse ID and branch ID) directly into the request context, ensuring that all downstream database queries use these values implicitly to prevent data leakage.
- **FR-008**: The system MUST implement Refresh Token Rotation, meaning every session refresh request invalidates the old refresh token and issues a new, single-use refresh token. If an invalidated refresh token is reused, the system MUST immediately revoke all active refresh tokens associated with that specific user session chain to prevent replay attacks.
- **FR-009**: The system MUST support concurrent sessions, allowing a single user account to maintain multiple active refresh token sessions across different devices or browsers simultaneously without cross-invalidating other sessions.
- **FR-010**: The authentication guard MUST query the database on every incoming request to verify that the user ID extracted from the access token exists and that the user's `isActive` flag is true.

### Key Entities *(include if feature involves data)*

- **User**: Represents a registered system operator or administrator. Key attributes include email address, encrypted password hash, assigned security role (e.g., Store Manager, Warehouse Keeper, Admin), and active status.
- **UserWarehouseScope**: Represents the authorized boundaries mapping a specific user to one or more warehouses and branches. Defines which organizational sectors a user is permitted to view or mutate.
- **AuditLog**: Represents a security and mutation history log. Captures security-related events such as successful logins, logouts, access violations, and scope changes with exact timestamps, user details, and client context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The authentication process (credential validation and token generation) MUST complete in under 500 milliseconds under normal network conditions.
- **SC-002**: 100% of secure API endpoints MUST block unauthenticated requests, returning a 401 Unauthorized status with zero leakage of sensitive data or route structures.
- **SC-003**: 100% of warehouse/branch-specific requests targeting unauthorized scopes MUST be intercepted and blocked with a 403 Forbidden error, achieving complete protection against IDOR vulnerabilities.
- **SC-004**: The scope validation interceptor MUST introduce negligible overhead, taking less than 5 milliseconds to validate the scope database mapping per request.

## Assumptions

- **Pre-Existing Data Models**: The database schema and models for `User` and `UserWarehouseScope` (defined in Phase 2) are already fully migrated and populated with test seeds (including user roles and scoped access mappings).
- **Secure Transport Layer**: The application operates over HTTPS in all environments except local development, ensuring that session cookies and headers are encrypted in transit.
- **Client Header Support**: The client applications (e.g., Next.js web app) are capable of sending the required `x-warehouse-id` and `x-branch-id` headers with every inventory-related request.
- **Cryptographic Configuration**: The secret keys and configuration parameters for token signing (such as algorithms and expiration durations) are securely managed via environment variables.

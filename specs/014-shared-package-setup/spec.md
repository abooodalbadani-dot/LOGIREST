# Feature Specification: Shared Package Setup & Scaffolding

**Feature Branch**: `014-shared-package-setup`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "read this file and creat a specification for the phase 1 only"

## Clarifications

### Session 2026-05-21
- Q: Under FR-004, the backend must return a standardized validation response when a request payload fails schema validation. What JSON schema structure should the validation error response use? → A: Structured API response: `{ success: false, errors: Array<{ field: string, message: string }> }`
- Q: Under FR-001 and FR-002, the monorepo workspace must share a single `packages/shared-types` package. How should this package compile and distribute its types/schemas to `apps/web` and `apps/api`? → A: Build-free referencing: Direct import of raw `.ts` files resolved via monorepo workspace resolution.
- Q: Under FR-005, the backend must support cookie-based authentication. What specific name and attributes should this authentication cookie use? → A: Cookie name: `logirest_token` (HTTP-only, Secure, SameSite=Lax, path `/`).
- Q: For validation of backend container health and containerization readiness, should the API gateway scaffold expose a standardized health check endpoint, and if so, at what path? → A: Yes, expose `/health` (outside `/api/v1` prefix) returning system status, database connection state, and uptime.
- Q: For the scaffolded backend API, what logging framework or formatting standard should be configured for observability from day one? → A: Built-in NestJS Logger (structured console logs with class context prefixes).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Monorepo Type and Workflow Invariants Sharing (Priority: P1)

As a development team / operator, I want all core workflow state rules and transaction schema validations to be shared dynamically between the web frontend and API backend, so that there is no risk of workflow validation drift, inconsistent role capability mappings, or duplicate validation definition records.

**Why this priority**: The monorepo requires absolute alignment on workflow status transitions (e.g. DRAFT -> SUBMITTED) and role permissions. If these rules drift between frontend and backend, invalid transactions, security bypasses, or client-server desynchronization can occur.

**Independent Test**: Verified by checking that a single schema change or status transition map update in the shared package is immediately and automatically enforced by both the frontend application build and backend scaffold compile without manual file duplication or copy-pasting.

**Acceptance Scenarios**:

1. **Given** the transition map and role capabilities exist in the shared package, **When** a developer runs the web application build, **Then** all imports resolve correctly from the shared package and the application builds successfully.
2. **Given** the shared package contains Zod definitions and workflow maps, **When** the backend imports them, **Then** the backend compilation successfully runs and references the exact same definitions.

---

### User Story 2 - Secure Monorepo Backend API Gateway Scaffolding (Priority: P2)

As a system operator, I want the backend API container to be initialized with core security defaults (global prefix routing, CORS protection, HttpOnly cookie support, and payload schema validation), so that the application has a secure gateway ready for business transactions.

**Why this priority**: Scaffolding the backend with these defaults sets the structural security guidelines. This is the foundation before any ledger or transactional database logic is built.

**Independent Test**: Verified by starting the backend container and executing a baseline check to confirm the API routes are structured under `/api/v1` and handle cookie/CORS headers correctly.

**Acceptance Scenarios**:

1. **Given** a scaffolded backend service, **When** it is started in the monorepo workspace, **Then** it exposes endpoints under `/api/v1` and rejects invalid inputs with standard structured validation responses.
2. **Given** the backend is running, **When** a request from the frontend domain is received, **Then** it applies the specified CORS policies and processes HttpOnly cookies.

### Edge Cases

- What happens if the shared package version or exports change?
  - The monorepo build pipeline (`turbo build`) must fail if any workspace application imports an invalid or mismatching export from the shared package, preventing out-of-sync builds from being deployed.
- How does the system handle circular references between workspace applications?
  - The shared package must remain a zero-dependency package relative to the applications; it must never import anything from the frontend or backend workspaces.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The monorepo workspace MUST share a single, authoritative, build-free package (`packages/shared-types`) containing all document status definitions, role capabilities, and state transition maps, imported directly as raw `.ts` files via monorepo workspace resolution.
- **FR-002**: The web frontend and API backend MUST import their workflow validation logic from the same shared package, rejecting any local duplication of these rules.
- **FR-003**: The backend service MUST expose all API business routes under a unified versioned base path (e.g., `/api/v1`), except for a root-level health check endpoint (`/health`) that returns system status, database connection state, and uptime.
- **FR-004**: The backend service MUST validate all incoming request payloads against the structural constraints defined in the shared schemas, returning a structured validation error response: `{ success: false, errors: Array<{ field: string, message: string }> }` with HTTP status `400 Bad Request`.
- **FR-005**: The backend service MUST support cookie-based authentication transport (using cookie name `logirest_token`, HTTP-only, SameSite=Lax, Secure in production) and enforce Cross-Origin Resource Sharing (CORS) rules to allow safe browser communication.

### Non-Functional Requirements

- **NFR-001**: The backend service MUST utilize the built-in NestJS Logger to produce standardized, prefixed console logs across all modules for development observability.

### Key Entities *(include if feature involves data)*

- **Shared Workflow State Map**: Represents the system's state machine (transitions, actions, and roles authorized for each transition).
- **Document Payload Validation Schema**: Represents the core structural constraints for all transaction documents (Purchase Requests, Purchase Orders, GRNs, Issues, Transfers, Adjustments, Stocktakes).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of document types share identical status and transition definitions between frontend and backend.
- **SC-002**: Project-wide build check executes with 0 errors across all workspaces.
- **SC-003**: All invalid API payloads are rejected with structured, human-readable error messages before executing any business logic.

## Assumptions

- The existing nextjs application runs on a workspace configuration that supports relative package imports.
- The shared package does not need to handle database persistence or auth token generation directly; it acts only as a type and schema registry.

# Feature Specification: Route & Navigation Integrity Audit

**Feature Branch**: `003-route-integrity-audit`  
**Created**: 2026-05-09  
**Status**: Draft  
**Input**: User description: "Phase 1: Route & Navigation Integrity Audit"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Audit Route Reachability (Priority: P1)

As a system auditor, I want to see a map of all routes on disk compared to how they are linked in the UI so that I can identify broken or orphaned pages and ensure a seamless navigation experience.

**Why this priority**: Reachability is the foundation of the frontend recovery. Orphaned or unreachable pages represent hidden tech debt and potential broken features.

**Independent Test**: Run the route extraction and cross-reference scripts; verify the audit table lists 100% of disk routes.

**Acceptance Scenarios**:

1. **Given** a set of `page.tsx` files in `apps/web/src/app`, **When** the audit tool runs, **Then** every file must be represented in the final audit table.
2. **Given** a page on disk, **When** no `Link` or `router.push` targets that route, **Then** it must be flagged as an "Orphan Page".

---

### User Story 2 - Security Guard Verification (Priority: P1)

As a security officer, I want to ensure that every accessible route is protected by an authentication guard so that sensitive inventory and financial data is never exposed to unauthenticated users.

**Why this priority**: Security is a non-negotiable enterprise requirement. A single unprotected route could lead to data exposure.

**Independent Test**: Scan all layout files and page components for authentication guard patterns; assert 100% coverage.

**Acceptance Scenarios**:

1. **Given** any route in the system, **When** accessed by an unauthenticated user, **Then** the system must redirect to the login page or show an access denied state.

---

### User Story 3 - Dynamic Route Entry Points (Priority: P2)

As a developer, I want to ensure that all dynamic routes (e.g., `[id]`, `[locale]`) have at least one valid navigational entry point in the UI so that users can actually reach the details of records they are working on.

**Why this priority**: Dynamic routes often host the core business logic (detail views, edit forms). If they aren't reachable via lists or buttons, they are effectively broken.

**Independent Test**: Verify that every dynamic route identified in the audit has at least one corresponding navigational link in a list or parent view.

**Acceptance Scenarios**:

1. **Given** a dynamic route like `issues/[id]`, **When** the audit tool runs, **Then** it must find at least one `Link` or `router.push` call that constructs a valid path to this route.


---

### User Story 4 - Internal Tooling Management (Priority: P2)

As a DevOps engineer, I want to classify internal/debug routes separately so that they are visible for development but strictly blocked in production environments to prevent accidental leakage of debug information.

**Why this priority**: Security through isolation. Internal tools are necessary for development but dangerous in production.

**Independent Test**: Verify that all routes flagged as `Internal` are included in the middleware's production blocklist.

**Acceptance Scenarios**:

1. **Given** a route in `/debug` or `/test`, **When** the audit tool runs, **Then** it must be flagged as `Internal Tooling`.
2. **Given** an `Internal Tooling` route, **When** accessed in `NODE_ENV=production`, **Then** the system must return a 404.


### Edge Cases

- **Dynamic Path Construction**: The tool will flag dynamic navigation patterns (e.g., `router.push('/' + path)`) as "Review Required" in the audit report for manual verification.
- **Localized Routes**: How does the system distinguish between a missing route and a localized route (e.g., `/ar/dashboard` vs `/dashboard`)?
- **Middleware Interception**: How do we detect routes that are redirected by middleware before reaching the component?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract all Next.js App Router pages from `apps/web/src/app` by searching for `page.tsx` files.
- **FR-002**: System MUST cross-reference extracted routes against all source code to find `href` properties in `Link` components and `router.push` method calls.
- **FR-003**: System MUST generate a formal audit table mapping disk routes to their corresponding navigational entry points (Sidebar, Header, List views, etc.).
- **FR-004**: System MUST detect and report all unlinked (orphan) pages that exist on disk but are not reachable through the UI.
- **FR-005**: System MUST verify that all routes are wrapped in layout-level or component-level authentication guards.
- **FR-006**: System MUST verify that 100% of dynamic routes (`[id]`, `[locale]`, etc.) have at least one navigational entry point in the UI.

### Key Entities *(include if feature involves data)*

- **Route Map**: A structured representation of the relationship between physical files on disk and their logical URL paths.
- **Navigation Graph**: A mapping of how users transition between different routes via UI elements.
- **Authentication Guard**: A logical boundary (Middleware or Higher-Order Component) that validates user sessions before rendering a route.
- **Route Classification Matrix**: A formal categorization of routes based on their lifecycle and accessibility:
    - **Active**: Linked in UI, protected by Auth.
    - **External**: Not linked in UI, used for callbacks/emails.
    - **Internal**: Debug/Dev tools, blocked in Prod.
    - **Feature-Gated**: Code exists but hidden behind a flag.
    - **Orphan**: Unlinked code that should be removed or linked.


## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of defined disk routes in `apps/web` are mapped and verified in a formal audit table.
- **SC-002**: Zero (0) Unlinked Orphan Pages remain in the codebase after the audit and subsequent cleanup.
- **SC-003**: 100% of routes are confirmed to be protected by authentication guards.
- **SC-004**: 100% of dynamic routes have at least one verified navigational entry point.

## Assumptions

- The project uses Next.js App Router conventions exclusively for routing.
- Localized routing is handled via a `[locale]` dynamic segment as seen in the file structure.
- Authentication status is verifiable through static analysis of layouts or common guard components.
- Programmatic navigation mostly uses the standard `next/navigation` `useRouter` hook.

## Clarifications

### Session 2026-05-09
- Q: Audit Tool Output Format → A: Markdown file in `specs/003-route-integrity-audit/audit-report.md`
- Q: Handling of Dynamic Path Construction → A: Flag as "Review Required" (Option B)
- Q: Authentication Guard Detection → A: Middleware Configuration Audit (Option A)


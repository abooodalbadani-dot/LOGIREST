# Feature Specification: Runtime Error Sweep

**Feature Branch**: `009-runtime-error-sweep`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Phase 6 of the Strict Frontend Recovery Master Plan"

## Clarifications

### Session 2026-05-10
- Q: Where should unhandled promise rejections be reported? → A: Console + Error Boundary (Standardize console.error reporting with a global catch-all).
- Q: Is 'suppressHydrationWarning' allowed? → A: Exception-based (Only for documented timestamps/random IDs; all structural mismatches must be fixed).
- Q: What is the scope of the navigation audit? → A: Universal (All reachable routes in `apps/web/src/app`).
- Q: How should concurrency conflicts be simulated? → A: Manual Multi-Tab (Verify manually using two browser tabs on a standard form).
- Q: How should memory leaks (state update on unmounted) be prevented? → A: AbortController (Standardize on AbortController for all API calls).


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Stability & Hydration (Priority: P1)

As a developer, I want to ensure the production build has zero hydration mismatches and React key warnings so that the application remains performant and bug-free in the browser.

**Why this priority**: Hydration mismatches can cause erratic UI behavior and full client-side re-renders, impacting performance and SEO. Missing keys lead to inefficient list rendering and potential state bugs.

**Independent Test**: Run `npm run build && npm run start`, navigate through all main modules (Inventory, Procurement, Operations), and verify the browser console is clean of React warnings and hydration errors.

**Acceptance Scenarios**:

1. **Given** a production build, **When** navigating between different localized routes, **Then** no "Expected server HTML to contain..." warnings appear.
2. **Given** any dynamic list (e.g., Inventory List, Request List), **When** items are rendered or filtered, **Then** no "Each child in a list should have a unique 'key' prop" warnings appear.

---

### User Story 2 - Concurrency & Conflict Verification (Priority: P1)

As a multi-branch user, I want to be alerted if I am about to overwrite someone else's changes so that data integrity is maintained across the store.

**Why this priority**: In a high-concurrency environment, silent overwrites are unacceptable and can lead to financial/stock discrepancies.

**Independent Test**: Open the same document in two separate browser tabs, save a change in Tab A, then attempt to save a change in Tab B. The system must trigger the Global Conflict Dialog.

**Acceptance Scenarios**:

1. **Given** a document with version `X`, **When** the server receives version `X-1` (simulated by Tab B), **Then** an HTTP 409 response is intercepted and the Conflict Dialog is displayed.

---

### User Story 3 - Memory Leak & Promise Safety (Priority: P2)

As a user navigating quickly through the app, I want the system to handle background operations safely without crashing or leaking memory.

**Why this priority**: Memory leaks (state updates on unmounted components) degrade browser performance over time and can cause crashes on lower-end devices (e.g., tablets in the kitchen).

**Independent Test**: Navigate rapidly between a List page and a Detail page while a slow network is simulated. Verify no "Can't perform a React state update on an unmounted component" warnings appear in the console.

**Acceptance Scenarios**:

1. **Given** a pending API request, **When** the user navigates away before the request completes, **Then** the component unmounts gracefully without attempting to update its internal state.
2. **Given** an asynchronous operation, **When** it fails, **Then** the error is caught by a global or local handler and no "Unhandled Promise Rejection" occurs.

---

### Edge Cases

- **Slow Network during Hydration**: How does the system handle hydration when JS chunks take long to load? (Should show consistent loading states).
- **Aborted Mutations**: What happens if a user closes a tab while a mutation is in progress? (Should not leave stale local states).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST resolve all React "key" property warnings in the console for all reachable routes in `apps/web/src/app`.
- **FR-002**: System MUST eliminate all React hydration mismatches; `suppressHydrationWarning` is strictly banned for structural changes and only permitted for documented dynamic leaf values (e.g., timestamps).
- **FR-003**: System MUST implement global error boundaries to catch unhandled promise rejections and report them via standardized `console.error` logs for audit tracking.
- **FR-004**: System MUST standardize on `AbortController` usage across all data-fetching hooks to automatically cancel pending requests and prevent state updates on unmounted components.
- **FR-005**: System MUST verify the end-to-end flow of the Conflict Resolution layer by simulating concurrent edits.

### Key Entities *(include if feature involves data)*

- **Conflict Interceptor**: A global Axios/Fetch interceptor that handles HTTP 409 and triggers the UI.
- **Versioned Document**: Any entity (Item, Request, Stocktake) that carries a `version` field for optimistic concurrency control.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 React Key warnings in the console during a universal navigation audit of all routes in `apps/web/src/app`.
- **SC-002**: 0 Hydration Mismatches detected in a production environment (`next start`).
- **SC-003**: 0 Unhandled promise rejections recorded during high-load concurrency testing.
- **SC-004**: 0 "state update on unmounted component" warnings in the console during rapid navigation.
- **SC-005**: 100% of manually simulated edit conflicts (via two-tab editing) successfully trigger the Conflict Resolution UI.

## Assumptions

- The underlying `apiClient` correctly reports 409 status codes.
- The `version` field is correctly included in the DTOs of all update endpoints as established in Phase 3.
- The developers have access to a production-like environment for hydration testing.

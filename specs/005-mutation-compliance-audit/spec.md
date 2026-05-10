# Feature Specification: Mutation & Redirect Compliance Audit

**Feature Branch**: `005-mutation-compliance-audit`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "read e:\Kitchen‑Store Inventory System\STRICT FRONTEND RECOVERY MASTER PLAN.md and creat a specification for the phase 3 only"

## Clarifications

### Session 2026-05-10
- Q: When a mutation is in progress, what is the mandatory UI feedback pattern? → A: Option A - Local Loading States (Buttons show spinners and become disabled).
- Q: If a user cancels or dismisses the 409 Conflict Dialog, what should be the final state of the form? → A: Option A - Stay & Disable (Form stays open, Save button disabled).
- Q: To achieve 100% compliance for mutation patterns, which enforcement strategy should we prioritize? → A: Option B - CI Enforcement (Automated scripts/linters).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standardizing Mutation Patterns (Priority: P1)

As a developer, I want to ensure that all data mutations follow a predictable, awaited execution pattern so that race conditions and unhandled UI states are eliminated during critical operations like Inventory Counting or Procurement Approvals.

**Why this priority**: Critical for data integrity and financial accuracy. Mixed or un-awaited mutations cause silent failures where the UI moves forward while the backend request is still pending or has failed.

**Independent Test**: Audit `apps/web/src` for all instances of `useMutation`. Verify that every call either uses `await mutateAsync()` OR contains `onSuccess`/`onError` blocks, and that no component mixes these two styles.

**Acceptance Scenarios**:

1. **Given** a component performing a data update, **When** the update is triggered, **Then** the system must wait for the API response before executing any subsequent logic.
2. **Given** a component with multiple mutations, **When** implemented, **Then** all mutations must use a consistent pattern (all `mutateAsync` or all `mutate` with callbacks).

---

### User Story 2 - Eliminating Eager Routing (Priority: P1)

As a user, I want to be certain that when I am redirected to a success page or list view, my changes have been successfully saved to the server, so that I don't experience "optimistic navigation" that hides a background failure.

**Why this priority**: Prevents "phantom saves" where the user thinks they succeeded but the data was actually rejected by the server.

**Independent Test**: Scan for `router.push` and `router.replace`. Verify that none are called synchronously after a `.mutate()` call, but are instead nested inside `onSuccess`.

**Acceptance Scenarios**:

1. **Given** a form submission, **When** the user clicks "Save", **Then** the URL must not change until an HTTP 200/201 status is confirmed.
2. **Given** a failed mutation, **When** an error occurs, **Then** the user must remain on the current page with a visible error state, and no redirect should occur.

---

### User Story 3 - Conflict Layer Enforcement (Priority: P1)

As a system architect, I want to ensure that every update mutation passes the object's `version` field so that the global HTTP 409 Conflict interceptor can protect users from overwriting each other's work.

**Why this priority**: Essential for concurrency control in a multi-user environment. Without the version field, the conflict resolution layer cannot detect stale data.

**Independent Test**: Verify API definitions in `apps/web/src/lib/api`. Check that all `update` or `edit` payloads include a `version: number` property.

**Acceptance Scenarios**:

1. **Given** two users editing the same record, **When** the second user submits, **Then** the request must include the version fetched at load time, triggering a 409 Conflict if the version has changed.
2. **Given** a standard update mutation, **When** inspected in the network tab, **Then** the `version` field must be present in the request body.

---

### Edge Cases

- **What happens when a network timeout occurs?** The system must not redirect (due to eager routing prevention) and must display a "Retry" option or a timeout error.
- **How does the system handle "Fire and Forget" mutations?** Even minor mutations (like toggling a secondary flag) must follow the `onSuccess` pattern for consistency, even if no redirect is involved, to ensure state synchronization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: **Mutation Pattern Enforcement**: Every mutation in `apps/web` MUST use `await mutation.mutateAsync()` within an `async` handler OR use `.mutate()` with explicit `onSuccess` and `onError` callbacks.
- **FR-002**: **No Mixed Patterns**: A single component MUST NOT mix `mutate` and `mutateAsync` implementations.
- **FR-003**: **Success-Gated Routing**: Programmatic navigation (`router.push`, `router.replace`) MUST ONLY occur inside `onSuccess` callbacks or after `await mutateAsync()` has resolved successfully.
- **FR-004**: **Version Payload Compliance**: 100% of "update" and "edit" API endpoints MUST receive and pass the `version` field from the UI state.
- **FR-005**: **Global Conflict Interceptor Verification**: The system MUST demonstrate functionality of the HTTP 409 global dialog when a version mismatch is detected.
- **FR-006**: **Local Loading Feedback**: Every mutation MUST implement local UI feedback by disabling the triggering action button and displaying a loading spinner during the `isPending` state.
- **FR-007**: **Conflict Dismissal Safety**: If the 409 Conflict Dialog is dismissed without a resolution choice, the system MUST keep the form open but disable the primary submission action until the data is manually reloaded.
- **FR-008**: **Automated Compliance Verification**: The system MUST include automated scripts or custom ESLint rules to detect and prevent un-awaited mutations or programmatic navigation outside of success callbacks.

### Key Entities *(include if feature involves data)*

- **Mutation Object**: Represents a stateful data-writing operation (via React Query).
- **Version Field**: A concurrency token (integer) used to detect stale data updates.
- **Conflict Dialog**: A global UI component triggered by 409 status codes to allow "Reload" or "Retry".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% compliance of mutation patterns across `apps/web/src`.
- **SC-002**: 0 instances of `router.push` calls occurring before HTTP confirmation in the entire codebase.
- **SC-003**: 100% of update endpoints in the `apiClient` layer pass the `version` property.
- **SC-004**: Zero race conditions detected during high-latency network simulations (simulated 2s delay on mutations).

## Assumptions

- **Existing Conflict Layer**: It is assumed the global Conflict Interceptor (handling 409s) is already partially or fully implemented and requires this audit to ensure it is actually triggered.
- **React Query Usage**: It is assumed the project consistently uses `@tanstack/react-query` for all data mutations.
- **Version Tracking**: It is assumed that the backend provides a `version` field on all entities and expects it back on updates.

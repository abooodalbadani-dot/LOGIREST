# Feature Specification: Guard Integrity Audit (Phase 4)

**Feature Branch**: `007-guard-integrity-audit`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Phase 4 of STRICT FRONTEND RECOVERY MASTER PLAN"

## Clarifications

### Session 2026-05-10
- Q: What are the primary actions allowed in the confirmation dialog? → A: Discard Changes (Proceed) and Stay on Page (Cancel)
- Q: Does the guard need to intercept programmatic navigation? → A: Intercept All (Link, Browser Back, and Programmatic router.push)
- Q: Should explicit discard/cancel buttons bypass the guard? → A: Yes (Explicit Discard Bypasses)
- Q: Should the warning message be standardized or form-specific? → A: Standardized Global Message
- Q: Should the confirmation dialog be a modal focus trap? → A: Yes (Modal Focus Trap)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prevent Accidental Data Loss (Priority: P1)

As a user filling out a complex inventory or procurement form, I want the system to warn me if I try to navigate away before saving my changes, so that I don't accidentally lose my progress and waste time re-entering data.

**Why this priority**: High risk of user frustration and business data loss if users accidentally close tabs or click links during heavy data entry.

**Independent Test**: Open any creation/edit form, modify a field, and click a sidebar link. A confirmation dialog should appear.

**Acceptance Scenarios**:

1. **Given** a form with modified data (`isDirty` is true), **When** a user clicks a Next.js `Link` or the browser's back button, **Then** the system MUST display a confirmation dialog with two options: **Discard Changes** (Proceed) and **Stay on Page** (Cancel).
2. **Given** a form that has been successfully submitted, **When** the user navigates away, **Then** the system MUST NOT display a warning (dirty state must be reset).
3. **Given** a form that has NOT been modified, **When** the user navigates away, **Then** the system MUST NOT display a warning.

---

### User Story 2 - Avoid "Trapped" Form States (Priority: P2)

As a user, I want the navigation guard to be accurate so that I am never stuck on a page that falsely claims it has unsaved changes, especially after a failed submission or when a screen uses autosave.

**Why this priority**: False positives cause "trapped" users and erratic UI behavior which harms system trust.

**Independent Test**: Trigger a validation error on a form, fix it, then navigate. The guard should only trigger if data actually differs from the initial state.

**Acceptance Scenarios**:

1. **Given** an autosave-enabled screen, **When** changes are successfully synchronized in the background, **Then** the `UnsavedChangesGuard` MUST NOT block navigation.
2. **Given** a form that failed to submit due to a server error (e.g., 500), **When** the user attempts to leave to find help, **Then** the guard MUST still protect the data (as it is still unsaved) UNLESS the user explicitly chooses to discard.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST identify all React components using `useForm` hook for data entry.
- **FR-002**: All creation and edit forms MUST implement the `UnsavedChangesGuard` component.
- **FR-003**: The `UnsavedChangesGuard` MUST strictly bind to the `isDirty` state of the `react-hook-form` instance.
- **FR-004**: System MUST ensure `isDirty` is reset to `false` (e.g., via `reset()` or `resetField()`) immediately upon successful HTTP 200/201 response.
- **FR-005**: The guard MUST intercept all navigation events, including Next.js client-side routing (Link/router.push), browser navigation (Back/Forward), and standard window navigation (`beforeunload`).
- **FR-006**: System MUST NOT trigger the guard for "read-only" views or forms that have not been interacted with.
- **FR-007**: Explicit "Discard", "Cancel", or "Delete" actions triggered from within the form UI SHOULD bypass the navigation guard to avoid redundant confirmations.
- **FR-008**: The confirmation dialog MUST use a standardized, global message (e.g., "You have unsaved changes. Are you sure you want to leave?") managed via the central i18n system.
- **FR-009**: The confirmation dialog MUST be implemented as a modal focus trap to ensure accessibility compliance and prevent background interaction.

### Key Entities *(include if feature involves data)*

- **Form State**: The internal tracking of field modifications relative to initial values.
- **Navigation Guard**: The UI component responsible for intercepting routing events based on form state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of detected creation and edit forms are wrapped with `UnsavedChangesGuard`.
- **SC-002**: Zero (0) reported instances of data loss due to accidental navigation in production-like tests.
- **SC-003**: Zero (0) reported instances of "infinite dirty loops" where a user cannot leave a page despite having no unsaved changes.
- **SC-004**: Form "isDirty" resets within 100ms of a successful mutation response.

## Assumptions

- The `UnsavedChangesGuard` component is already built and available in the UI library.
- Most forms use `react-hook-form` as the primary state manager.
- Browser-level `beforeunload` support varies but is acceptable as a secondary fallback to Next.js router events.
- Mobile browser "swipe to go back" is considered part of the browser navigation event.

# Feature Specification: Phase 1 — Critical Operational Safety

**Feature Branch**: `011-critical-operational-safety`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Phase 1: Critical Operational Safety from the implementation plan — guard negative stock, fix batch approve version locking, validate batch workflow eligibility, add session validation on auth mount"

## Clarifications

### Session 2026-05-21

- Q: When session validation endpoint is unreachable after 10s timeout, proceed optimistically or redirect to login? → A: Redirect to login with an error message stating session could not be verified.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prevent Negative Inventory from Adjustment Decreases (Priority: P1)

Warehouse keepers and inventory managers perform inventory adjustments (increases and decreases) on items. When a user enters a DECREASE quantity that exceeds the current available stock for a line item, the system currently displays the negative projected quantity in red but still allows the user to save or submit the adjustment. This can corrupt the inventory ledger by recording impossible negative stock levels.

**Why this priority**: This is the single most dangerous bug — it directly creates invalid inventory records that affect financial reporting, procurement decisions, and operational fulfillment. Every decrease adjustment is a potential ledger corruption event.

**Independent Test**: Can be fully tested by creating a DECREASE adjustment with quantity exceeding available stock and verifying the save/submit is blocked with a clear error message. Delivers immediate protection against ledger corruption.

**Acceptance Scenarios**:

1. **Given** a user is editing an adjustment with a DECREASE line where `qty_adjusted` is 10 and `qty_before` is 5, **When** the user clicks "Save Draft" or "Submit", **Then** the action is blocked with an error message stating the adjustment cannot be saved because it would create negative stock.
2. **Given** a user is editing an adjustment with at least one line that would produce negative stock, **When** the user views the form, **Then** the save and submit buttons are visually disabled and a per-line error indicator is shown on the offending row.
3. **Given** a user has corrected all DECREASE lines so no line produces negative stock, **When** the user clicks save or submit, **Then** the adjustment saves or submits normally.
4. **Given** an adjustment with negative projected stock is submitted via the API (bypassing client-side checks), **When** the backend receives the post request, **Then** the backend rejects it with an explicit error stating negative stock is not allowed.

---

### User Story 2 - Prevent Concurrent Overwrites During Batch Approve/Post (Priority: P1)

Inventory managers and approvers frequently select multiple adjustments and perform batch approve or batch post operations. Currently, the batch operation sends `version: 0` for every document, bypassing optimistic concurrency control. This means if any document was modified by another user between when the list was loaded and when the batch action is executed, those changes are silently overwritten.

**Why this priority**: Version bypass defeats the entire purpose of optimistic concurrency control, which was designed to prevent conflicting modifications in a multi-user operational environment. Silent overwrites can cause inventory discrepancies that are extremely difficult to trace.

**Independent Test**: Can be tested by loading the adjustment list, having another user modify one of the visible adjustments, then executing batch approve — the system must detect the version mismatch and report the conflict.

**Acceptance Scenarios**:

1. **Given** a user has selected 5 adjustments for batch approve, **When** the batch operation executes, **Then** each individual approve call sends the document's current version number fetched immediately before the action, not a hardcoded zero.
2. **Given** one of the selected adjustments has been modified by another user since the versions were pre-fetched (causing a 409 conflict), **When** the batch operation encounters this conflict, **Then** that specific item is skipped and included in the failure summary, while remaining eligible items are still processed.
3. **Given** a selected adjustment has been deleted between selection and batch execution, **When** the pre-fetch fails for that ID, **Then** that ID is skipped and reported in the failure summary without blocking the remaining batch.
4. **Given** a batch operation completes with mixed results, **When** the summary is displayed, **Then** the user sees which IDs succeeded, which failed, and the reason for each failure.

---

### User Story 3 - Enforce Workflow Rules During Batch Approve/Post (Priority: P1)

Users with appropriate roles can currently select adjustments of any status — including DRAFT, POSTED, CANCELLED, and REJECTED — and the batch approve/post operation will fire on all of them, bypassing workflow eligibility rules. This means a user could accidentally or intentionally approve a document that has not been submitted, or post a document that has been cancelled.

**Why this priority**: Bypassing workflow rules undermines the entire approval process and audit trail. Approving or posting documents that are not in the correct status creates invalid states that are both operationally dangerous and audibly indefensible.

**Independent Test**: Can be tested by selecting a mix of adjustments with different statuses (some DRAFT, some SUBMITTED, some already POSTED), clicking batch approve, and verifying that only SUBMITTED adjustments are processed while others are skipped with a warning.

**Acceptance Scenarios**:

1. **Given** a user selects 5 adjustments where 3 are SUBMITTED and 2 are already POSTED, **When** the user clicks "Batch Approve", **Then** only the 3 SUBMITTED adjustments are approved; the 2 POSTED adjustments are skipped with a toast explaining they were ineligible.
2. **Given** a user selects adjustments in DRAFT status, **When** batch approve is attempted, **Then** none are processed and the user is informed that DRAFT documents cannot be approved.
3. **Given** a user selects adjustments in CANCELLED or REJECTED status, **When** batch approve is attempted, **Then** those documents are excluded from processing with an appropriate explanation.
4. **Given** the batch operation uses the standard workflow mutation hooks (not raw API calls), **When** a 409 conflict occurs on any item, **Then** the `onConflict` callback fires correctly and the query cache is invalidated after the full batch completes.

---

### User Story 4 - Validate Active Session on Application Load (Priority: P2)

When a user opens the application or refreshes the page, the frontend currently decodes the stored JWT token to populate user state but never validates that session against the server. This means users can continue using the application with a token that has been revoked server-side, with a role that has changed, or with scope assignments that have been updated. They only discover the session is invalid when an API call unexpectedly returns a 401 error.

**Why this priority**: While not as immediately destructive as the stock and workflow bugs, this gap means role changes and session revocations are not enforced until an API call fails, creating a window where unauthorized users may access data or perform actions with stale permissions.

**Independent Test**: Can be tested by logging in, then revoking the session server-side, refreshing the page, and verifying the user is redirected to login rather than seeing a briefly loaded dashboard.

**Acceptance Scenarios**:

1. **Given** a user has a valid JWT token stored and opens the application, **When** the app mounts, **Then** a server-side session validation call (`GET /auth/me`) is made once to confirm the token is still valid and to retrieve the current user role and scope assignments.
2. **Given** the session validation returns a 401 (token revoked or expired), **When** this occurs during initial load, **Then** the user is redirected to the login page with a message indicating their session has expired.
3. **Given** the user's role or scope has changed server-side since the token was issued, **When** the session validation returns the updated user object, **Then** the frontend reflects the new role and scope within the same page load without requiring a manual refresh.
4. **Given** the session validation is in progress, **When** protected routes are loading, **Then** a loading skeleton is displayed (not dashboard content) until the validation resolves, preventing a flash of authenticated content for invalid sessions.

---

### Edge Cases

- What happens when a user edits an adjustment line to reduce the DECREASE quantity below the available stock, but another user simultaneously records a DISPATCH that further reduces available stock before this adjustment is saved? (Addressed by P1-02 version locking on save.)
- What happens if the session validation endpoint is unreachable or slow? The loading state should have a 10-second timeout; if the endpoint does not respond within that window, the system redirects to login with an error message indicating session verification failed.
- What happens when a batch operation is initiated on a very large selection (e.g., 200 adjustments)? The pre-fetch of versions should be bounded, and the batch should process incrementally without blocking the UI.
- How does the system handle DECREASE adjustments where `qty_before` is null or undefined (e.g., new item without stock record)? The system should treat null `qty_before` as 0 for the purpose of the negative stock check.
- What happens if the user's role changes between session validation and the first API call? The system should handle the role from the validated session, and any subsequent 403 from the API should be gracefully surfaced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST block saving or submitting any inventory adjustment where a DECREASE line would produce a negative quantity after adjustment (`qty_after < 0`).
- **FR-002**: System MUST disable save and submit buttons on the adjustment form when any line has a negative projected quantity.
- **FR-003**: System MUST display a per-line inline error on any DECREASE row whose adjusted quantity exceeds the quantity before adjustment.
- **FR-004**: Backend API MUST validate server-side that posting an adjustment does not create negative stock for any line item.
- **FR-005**: System MUST pre-fetch current document versions for all selected items immediately before executing a batch approve or batch post operation.
- **FR-006**: System MUST send the correct document version with each individual batch action call, never a hardcoded default.
- **FR-007**: System MUST handle 409 version conflict responses during batch operations by skipping the conflicted item, reporting it in the failure summary, and continuing with remaining items.
- **FR-008**: System MUST filter batch operation selections through workflow eligibility rules (`canPerformActionV2`) before executing any action.
- **FR-009**: System MUST skip ineligible items during batch operations and inform the user how many items were skipped and why.
- **FR-010**: System MUST use standard workflow mutation hooks (not raw API calls) for batch approve and batch post operations.
- **FR-011**: System MUST validate the user's active session against the server (`GET /auth/me`) on every application mount or page refresh.
- **FR-012**: System MUST redirect users to the login page if the session validation call returns an unauthorized (401) response.
- **FR-013**: System MUST maintain a loading state (`isLoading = true`) until the session validation call completes, preventing premature rendering of protected content.
- **FR-014**: System MUST update local user state (role, scopes, permissions) with the server-returned values from the session validation, reflecting changes made since the token was issued.

### Key Entities

- **Inventory Adjustment (DECREASE line)**: Represents a downward quantity correction for an inventory item. Key attributes: direction (INCREASE/DECREASE), quantity before adjustment, quantity adjusted, and resulting quantity after adjustment. The system must ensure `qty_after >= 0` for all DECREASE lines.
- **Document Version**: A concurrency token associated with each operational document (adjustment, transfer, stocktake) that increments on every modification. Batch operations must reference the current version to detect and prevent conflicting concurrent modifications.
- **Workflow Status**: The lifecycle state of an operational document (DRAFT, SUBMITTED, APPROVED, POSTED, REJECTED, CANCELLED). Only documents in specific states are eligible for certain actions (e.g., only SUBMITTED adjustments can be approved).
- **User Session**: The authenticated context validated server-side, containing the user's identity, assigned role(s), and operational scope (warehouse/branch assignments). Must be re-validated on mount to prevent stale permission usage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero adjustments with negative projected stock can be saved or submitted through the UI or API.
- **SC-002**: Batch approve/post operations correctly detect and report version conflicts on 100% of concurrently modified documents, with no silent overwrites.
- **SC-003**: Batch approve/post operations never execute an action on a document whose workflow status does not permit that action (zero bypass incidents).
- **SC-004**: Users with revoked or expired sessions are redirected to login within one page load of application mount, with no flash of authenticated content.
- **SC-005**: Warehouse staff can perform adjustment decreases with confidence — the error rate for invalid quantity entries drops to zero (blocked before submission, not after).

## Assumptions

- The backend API endpoints for posting adjustments (`POST /operations/adjustments/:id/post`) will be updated to include server-side negative stock validation as a prerequisite for this phase.
- The `canPerformActionV2` function correctly encodes all workflow transition rules and role permissions for adjustments. If it has gaps, they are addressed in Phase 2 (P2-03, P2-06).
- The `GET /auth/me` endpoint exists or will be created by the backend team as a prerequisite. It returns the current user's identity, role, and operational scope.
- The existing optimistic concurrency mechanism (version field + 409 response) is already implemented on the backend; the fix is purely in the frontend's usage of it during batch operations.
- Standard workflow mutation hooks (`useApproveAdjustment`, `usePostAdjustment`) correctly implement the individual approve/post logic including conflict handling — the batch wrapper just needs to use them instead of raw API calls.
- Session validation has a 10-second timeout; if unreachable, the system redirects to login with a "session could not be verified" error (no optimistic proceed).
- Users have stable internet connectivity; offline support is out of scope for this phase.
- This phase builds on the security hardening completed in Phase 0 (HttpOnly cookies, 401 interceptor, token refresh). If Phase 0 is incomplete, the session validation in P1-04 will still function with the existing localStorage-based token approach.

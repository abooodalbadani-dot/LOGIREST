# Feature Specification: Data Integrity & Scope Isolation

**Feature Branch**: `013-data-integrity-scope-isolation`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: Phase 3 of the Frontend Remediation Implementation Plan — "Data Integrity & Scope Isolation" covering 5 tasks: enforce active scope on operational API queries, replace page-slice KPI metrics with server-side aggregates, make overdue transfer threshold configurable, fix warehouse and item query cache invalidation, and unify PermissionGate and ActionGuard RBAC models.

## Clarifications

### Session 2026-05-21

- Q: How should the system respond when a user attempts to access a detail view for a document outside their warehouse scope? → A: Hard denial — show an access-denied error page with no document data loaded at all.
- Q: What should happen when a warehouse keeper logs in but has no active warehouse scope assigned? → A: Show the operational list page with an empty state and a message indicating no scope is selected (no documents unfiltered).
- Q: What should the user see on operational list screens during the brief window when data is refetching after a scope change? → A: Immediately clear the current list and show a table skeleton/placeholder while fetching; disable action buttons during the transition.
- Q: Should warehouse scope be enforced on mutation operations (approve, post, cancel, edit) in addition to list and detail queries? → A: Yes, scope must be enforced on all operational API calls including mutations; the backend must reject mutations on out-of-scope documents.
- Q: What is the expected maximum data scale this system must handle? → A: Up to 100,000 documents across 20 warehouses.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Warehouse Keeper Sees Only Their Scoped Warehouse Data (Priority: P1)

A warehouse keeper assigned to a single warehouse opens any operational list screen (adjustments, transfers, stocktakes, issues). The system must only show documents belonging to their assigned warehouse. When an administrator changes the active scope for the warehouse keeper, the lists immediately refresh to reflect the new scope boundaries. A warehouse keeper must never see documents belonging to warehouses outside their scope.

**Why this priority**: This is a data leakage and cross-warehouse confidentiality issue. Without scope enforcement, warehouse keepers can view and potentially act upon documents from warehouses they are not authorized for — violating security isolation and enabling unauthorized operational actions.

**Independent Test**: Log in as a warehouse keeper scoped to Warehouse A. Navigate to the adjustments list. Verify only adjustments belonging to Warehouse A are displayed. Switch the active scope (if permitted) to Warehouse B and confirm the list refetches showing only Warehouse B documents. Log in as an administrator with no warehouse restriction and verify all warehouses' documents are visible.

**Acceptance Scenarios**:

1. **Given** a WH_KEEPER scoped to Warehouse A, **When** they view the adjustments list, **Then** only adjustments linked to Warehouse A appear, and no adjustments from Warehouse B or other warehouses are visible.
2. **Given** a WH_KEEPER scoped to Warehouse A viewing the transfers list, **When** an admin changes the keeper's active scope to Warehouse B via the context selector, **Then** the transfers list automatically refetches and displays only Warehouse B transfers.
3. **Given** an ADMIN or INV_MGR with no warehouse restriction, **When** they view any operational list, **Then** documents from all warehouses are visible.
4. **Given** a WH_KEEPER scoped to Warehouse A, **When** they directly manipulate the URL to access a Warehouse B adjustment detail page, **Then** the system denies access with an access-denied error page and loads no document data.

---

### User Story 2 — Users See Accurate KPI Metrics Across All Documents (Priority: P2)

Users viewing any operational list screen (adjustments, stocktake sessions, transfers) see KPI summary cards (e.g., "Pending," "In Transit," "Overdue") that show accurate totals across all matching documents, not just the 10-25 items on the current page. When a user processes or creates a document, the KPI cards update automatically to reflect the new totals.

**Why this priority**: Page-slice metrics mislead operational staff about the true state of inventory. A staff member might think there are only 3 pending adjustments (what's visible on page 1) when there are actually 200 across all pages. This compromises situational awareness and decision-making.

**Independent Test**: Create 200 pending adjustments in the system. Navigate to the adjustments list with page size set to 10. Verify the "Pending" KPI card displays "200," not "10." Create a new adjustment and verify the pending count increments. Approve an adjustment and verify the pending count decrements.

**Acceptance Scenarios**:

1. **Given** 200 pending adjustments exist across 20 pages, **When** a user views page 1 of the adjustments list, **Then** the "Pending" KPI card shows "200."
2. **Given** a user is viewing the transfer list with 50 in-transit transfers and 15 overdue, **When** the page loads, **Then** the "In Transit" card shows "50" and "Overdue" card shows "15," regardless of which page they are on.
3. **Given** a user approves an adjustment on the current page, **When** the mutation completes, **Then** the pending KPI count decrements by 1 and the summary endpoint data is invalidated and refetched.
4. **Given** a user with a warehouse scope restriction (P3-01), **When** they view KPI cards, **Then** the totals reflect only documents within their scope, not all documents system-wide.

---

### User Story 3 — Users See Fresh Master Data Immediately After Creating or Editing (Priority: P2)

A user creates a new warehouse or edits an existing warehouse name. Without refreshing the page, all warehouse dropdowns and comboboxes throughout the application immediately display the new or updated warehouse name. The same applies to items: after creating or editing an item, all item selectors reflect the change instantly.

**Why this priority**: Stale master data in dropdowns causes operational friction — staff must manually refresh the page to see newly created entities, which interrupts workflows and can lead to data entry errors (selecting the wrong warehouse because the new one isn't visible yet).

**Independent Test**: Create a new warehouse via the warehouse management screen. Immediately navigate to the adjustment form and open the warehouse selector. Verify the new warehouse appears in the dropdown without a page refresh. Edit an existing warehouse name and verify all warehouse comboboxes on already-open pages show the updated name.

**Acceptance Scenarios**:

1. **Given** a user creates a new warehouse named "Warehouse C," **When** they immediately open any warehouse combobox (adjustment form, transfer form, filter), **Then** "Warehouse C" appears in the list without a manual page refresh.
2. **Given** a user edits warehouse "Warehouse A" to "Warehouse A-East," **When** they view any screen displaying warehouse names (list pages, detail pages), **Then** the updated name "Warehouse A-East" is shown.
3. **Given** a user creates a new inventory item, **When** they open an item selector in any form, **Then** the new item appears immediately.
4. **Given** cache invalidation is in place, **When** a second user on a different session creates a warehouse, **Then** the first user sees the new warehouse on their next query fetch (subject to normal cache TTL).

---

### User Story 4 — Administrators Can Configure the Overdue Transfer Threshold (Priority: P3)

The operations manager needs to adjust how many days before an in-transit transfer is considered "overdue." Instead of a hardcoded 3-day threshold, the system reads this value from an environment configuration, with a default of 3 days. The overdue transfers banner on the transfer list page reflects the configured threshold and shows the count of all overdue transfers (not just those on the current page).

**Why this priority**: Different warehouse operations have different transfer completion expectations. A fixed 3-day threshold may be too aggressive for remote warehouses or too lenient for same-city transfers. Making it configurable without code changes is an operational necessity, but it is lower priority than fixing data leakage and inaccurate metrics.

**Independent Test**: Set the transfer overdue threshold to 5 days. Create transfers with shipped dates of 4, 5, and 6 days ago. Verify only the 6-day-old transfer appears in the overdue count. Change the threshold to 2 days and verify all three appear as overdue.

**Acceptance Scenarios**:

1. **Given** the configured overdue threshold is 3 days, **When** a transfer was shipped 4 days ago and is still in transit, **Then** it appears in the overdue count.
2. **Given** an admin changes the threshold to 5 days via environment configuration, **When** the application loads, **Then** transfers shipped 4 days ago no longer appear as overdue; only transfers older than 5 days show as overdue.
3. **Given** no custom threshold is configured, **When** the application starts, **Then** the system defaults to 3 days for the overdue calculation.
4. **Given** the overdue count is moved to the server-side summary endpoint (P3-02), **When** the transfer list page loads, **Then** the overdue banner shows the total count of overdue in-transit transfers across all pages.

---

### User Story 5 — Permission Checks Are Consistently Enforced Across the Application (Priority: P3)

A user with a specific role (e.g., APPROVER) attempts to access a feature. The same permission model determines whether the action button appears on screen and whether the backend workflow action is allowed. There is never a case where a button is visible but the action fails due to permission mismatch, or vice versa.

**Why this priority**: Having two divergent RBAC models creates confusion and potential security gaps. It is an architectural cleanup that prevents future bugs, but existing functionality still works; the divergence mainly affects maintainability and the risk of introducing permission errors during future changes.

**Independent Test**: For each role-document-action combination defined in the unified capabilities contract, verify that:
1. The UI permission system returns the same allow/deny result as the workflow authorization system.
2. Action buttons on detail pages match the workflow actions permitted by the authorization engine.
3. Adding a new role to the capabilities contract automatically propagates to both permission systems without requiring separate changes.

**Acceptance Scenarios**:

1. **Given** a role is granted "approve" capability on adjustments in the unified capabilities contract, **When** that role views an adjustment detail page, **Then** the approve button is visible on the UI AND the approve workflow action is permitted by the authorization engine.
2. **Given** a role is NOT granted "post" capability on adjustments, **When** that role views a SUBMITTED adjustment, **Then** the post button is hidden from the UI AND the workflow authorization system denies the POST action.
3. **Given** a developer adds a new role to the system, **When** they add the role's capabilities to the unified contract, **Then** both the UI permission system and the workflow authorization engine reflect the new role's capabilities without additional manual synchronization.

---

### Edge Cases

- **No active scope set**: When a WH_KEEPER has no active scope configured, the system MUST show the operational list page with an empty state and a message indicating no scope is selected, not all documents unfiltered.
- **Scope mismatch with direct URL access**: A WH_KEEPER scoped to Warehouse A manually types the URL for a Warehouse B adjustment detail page. The system must display an access-denied error page with no document data exposed. The error must not reveal whether the document exists to avoid information leakage.
- **Summary endpoint unavailable**: If the backend summary endpoint is unavailable or returns an error, the KPI cards should show a fallback state (e.g., "-" or "Unavailable") rather than silently showing 0 or crashing.
- **Concurrent warehouse updates**: Two users edit the same warehouse name simultaneously. The last write should win, and both users should see the final value after cache invalidation.
- **Transfer overdue threshold invalid value**: If the environment variable is set to a non-numeric or negative value, the system should fall back to the default of 3 days.
- **PermissionGate shows button but user lacks scope**: A user with ADMIN role but scoped to a single warehouse should not see action buttons for documents outside their scope, even if their role has the capability.
- **Summary counts across scopes**: When a user with scope restriction views KPI cards, the summary endpoint must return counts filtered by the user's active scope, matching the same filter applied to the list query (P3-01).
- **Loading state during scope transition**: When the active scope changes, the list must immediately clear existing data and show a skeleton/placeholder while fetching new data. Action buttons must be disabled during the transition to prevent accidental operations on stale data.
- **Scope enforcement on mutations**: A WH_KEEPER must not be able to approve, post, cancel, or edit a document outside their warehouse scope, even if they manage to bypass the UI. The backend must validate scope on every mutation request and reject with an authorization error if the document is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST attach the active warehouse scope (`warehouse_id`) and branch scope (`branch_id`) to every operational API call — both list queries and mutations (approve, post, cancel, edit) — and the backend must validate scope on all requests.
- **FR-002**: The system MUST include warehouse and branch scope identifiers in all operational query keys to ensure the data fetching layer automatically refetches when the active scope changes.
- **FR-002a**: The system MUST immediately clear the current list data and display a table skeleton/placeholder when the active scope changes, and disable action buttons until the new data arrives, ensuring no out-of-scope data is visible during the transition.
- **FR-003**: The system MUST filter operational list responses by the requesting user's active scope, ensuring WH_KEEPER users only see documents from their assigned warehouse.
- **FR-003a**: The system MUST display an empty state with an informational message when a WH_KEEPER user has no active warehouse scope assigned, rather than defaulting to an unfiltered view of all documents.
- **FR-004**: The system MUST allow ADMIN and INV_MGR users with no warehouse restriction to see documents from all warehouses.
- **FR-004a**: The system MUST deny access with an access-denied error page when a user attempts to view a document detail page for a document outside their warehouse scope, loading no document data.
- **FR-005**: The system MUST provide server-side summary/aggregation endpoints for adjustments, stocktake sessions, and transfers that return document counts computed across all matching documents, not page-sliced.
- **FR-006**: The system MUST display KPI metric cards sourced from the server-side summary endpoints, ensuring counts reflect total documents, not just the current page.
- **FR-007**: The system MUST invalidate and refetch summary data whenever a mutation (create, approve, post, cancel, reject) invalidates the corresponding list query.
- **FR-008**: The system MUST read the transfer overdue threshold from an environment configuration value, defaulting to 3 days if not configured or if the value is invalid.
- **FR-009**: The system MUST calculate the overdue transfer count server-side (via the transfer summary endpoint) using the configured threshold, applying it across all in-transit transfers.
- **FR-010**: The system MUST invalidate the warehouses query cache after a successful warehouse create or update mutation.
- **FR-011**: The system MUST invalidate the items query cache after a successful item create or update mutation.
- **FR-012**: The system MUST define role capabilities in a single, centralized contract that serves as the source of truth for both the UI-level permission verification system and the document workflow authorization engine.
- **FR-013**: The system MUST ensure that for any given role, document type, and action, the UI permission check and the workflow authorization check return consistent allow/deny results derived from the same capability contract.

### Key Entities

- **Operational Scope**: Represents the currently active warehouse and branch context for a user session. Contains `warehouseId` and `branchId`. Used as a filter parameter across all operational queries.
- **Summary Metrics**: Pre-computed aggregate counts for a document type across the full dataset (not page-sliced). Examples: total adjustments, pending count, critical losses count; total transfers, in-transit count, overdue count.
- **Operational Configuration**: Runtime-configurable thresholds and parameters that affect operational behavior. Currently includes the transfer overdue threshold (in days).
- **Role Capability Contract**: A centralized mapping of roles to permitted capabilities per document type (create, submit, approve, post, cancel, edit, reject). Both the UI permission system and the workflow engine derive their authorization decisions from this single contract.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Warehouse keepers with a single-warehouse scope see zero documents from non-assigned warehouses in any operational list screen.
- **SC-002**: Changing the active scope via the context selector triggers a complete refetch of all displayed operational lists within 2 seconds.
- **SC-003**: KPI metric cards on all operational list screens display totals that match a direct database count for the same filter criteria, with zero discrepancy between the card value and the actual document count.
- **SC-004**: Newly created or renamed warehouses appear in all warehouse comboboxes across the application within 5 seconds of the mutation completing, without requiring a manual page refresh.
- **SC-005**: Operations managers can change the transfer overdue threshold via configuration without requiring a code change or redeployment (an environment variable update and application restart is acceptable).
- **SC-006**: For every role-document-action triple defined in the unified capabilities contract, the UI permission check result and the workflow authorization check result are identical (both allow or both deny), with zero cases of divergence across all 60+ role-document-action combinations.
- **SC-007**: Summary endpoint data refreshes within 3 seconds of a mutation that would affect the counts (e.g., approving an adjustment decrements the pending count in the KPI card).

## Assumptions

- The backend provides or will provide the required summary endpoints and supports `warehouse_id` and `branch_id` query parameters on all operational endpoints including mutations.
- The system is designed for a maximum operational scale of 100,000 documents across 20 warehouses, with summary aggregation performed server-side and expected to complete within the 3-second refresh window defined in SC-007.
- The `activeScope` data is already available via the existing `useAuth` hook and simply needs to be consumed by list query hooks.
- Environment variable configuration is an acceptable mechanism for configuring the overdue threshold; a database-backed settings system is out of scope for this phase.
- The existing UI permission verification system and workflow authorization function both already work correctly for currently-defined roles; this phase only unifies their source-of-truth without changing the underlying permission logic.
- Cache invalidation using the data fetching layer's built-in cache management is the primary mechanism for refreshing stale data; real-time push updates via WebSocket or server-sent events are out of scope.
- The mock API adapter used for frontend development will be updated to support scope filtering and summary endpoints, matching the real backend API contract.

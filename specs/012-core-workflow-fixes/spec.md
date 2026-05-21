# Feature Specification: Phase 2 — Core Workflow Fixes

**Feature Branch**: `012-core-workflow-fixes`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Phase 2: Core Workflow Fixes from the implementation plan — fix transfer search, warehouse names, REJECTED edit transition, stocktake audit trail, GRN expiry validation, KITCHEN_CHIEF/STORE_MGR roles"

## Clarifications

### Session 2026-05-21

- Q: What specific capabilities should STORE_MGR have? → A: WH_KEEPER equivalents for adjustments, transfers, stocktakes, and GRN receipt, plus APPROVE capability on adjustments within their store scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and Filter Transfers (Priority: P1)

Warehouse staff and inventory managers need to find specific transfer documents by document number or warehouse name. Currently, the search input field on the transfer list page is non-functional — typing does nothing. Users must scroll through pages manually to locate a transfer, wasting time in high-volume operations.

**Why this priority**: This is a completely broken core UI interaction. Every user who opens the transfer list is impacted. Search is the most basic filtering mechanism and its absence makes the transfer list unusable at scale.

**Independent Test**: Open the transfer list page, type a document number or warehouse name in the search field, and verify that the list filters to show only matching transfers. Clear the search field and verify the full list returns.

**Acceptance Scenarios**:

1. **Given** a user is viewing the transfer list with 50 transfers, **When** the user types a partial document number in the search field, **Then** the list filters to show only transfers whose document numbers match the search text, with results appearing after a brief debounce delay.
2. **Given** a user is viewing the transfer list, **When** the user types a warehouse name in the search field, **Then** the list filters to show only transfers involving that warehouse (as source or destination).
3. **Given** a user has applied a search filter and is viewing page 3 of results, **When** the user clears the search field, **Then** the full transfer list is restored and the page resets to page 1.
4. **Given** a user types quickly in the search field, **When** multiple keystrokes occur, **Then** the system waits for the user to stop typing (debounce) before sending a search request, avoiding excessive server calls.

---

### User Story 2 - Display Actual Warehouse Names Everywhere (Priority: P1)

Users across multiple screens (transfers, adjustments, stocktakes) see hardcoded or translation-key-based warehouse names instead of the actual warehouse names from the master data. When a new warehouse is created, its name does not appear — users see a fallback identifier or translation key text. This causes confusion in multi-warehouse operations where identifying the correct warehouse is critical.

**Why this priority**: Incorrect warehouse display directly impacts operational decision-making. Sending stock to the wrong warehouse because names are unreadable is a real risk. This affects every list screen in the operations module.

**Independent Test**: Create a new warehouse, then view the transfer list, adjustment list, and stocktake list — verify the new warehouse name appears correctly in all three lists without requiring a translation key entry.

**Acceptance Scenarios**:

1. **Given** a warehouse named "Cold Storage - Dammam" exists in master data, **When** a user views any operational list (transfers, adjustments, stocktakes), **Then** the warehouse column displays "Cold Storage - Dammam" (or the appropriate Arabic equivalent), not a translation key like `warehouses.cold_storage_dammam`.
2. **Given** a new warehouse is created by an admin, **When** a warehouse keeper refreshes the transfer list, **Then** the new warehouse name appears immediately without any translation file update.
3. **Given** a user switches the interface language from English to Arabic, **When** viewing any operational list, **Then** warehouse names display in the appropriate language as stored in the master data entity (not from translation files).
4. **Given** a warehouse is renamed in master data, **When** any operational list is refreshed, **Then** the updated name appears everywhere.

---

### User Story 3 - Edit Rejected Adjustments for Resubmission (Priority: P1)

When an approver rejects an inventory adjustment (e.g., for incorrect quantities or missing reason), the creator currently has no way to edit and resubmit it. The adjustment is stuck in REJECTED status — a dead-end workflow state. The only option is to create a brand new adjustment from scratch, duplicating all the line items and losing the context of the original rejection.

**Why this priority**: This is a workflow dead-end that wastes operational time. Rejected adjustments are common in normal operations (incorrect quantities, missing documentation). Without an edit path, every rejection forces a complete redo of the work.

**Independent Test**: Reject a submitted adjustment, then verify that an "Edit" or "Resubmit" button appears for the rejected document. Click it and verify the status resets to DRAFT and the form opens for editing with the rejection reason visible.

**Acceptance Scenarios**:

1. **Given** an adjustment is in REJECTED status and the user has ADMIN, INV_MGR, or WH_KEEPER role, **When** the user views the adjustment detail, **Then** an "Edit / Resubmit" action button is available.
2. **Given** a user clicks "Edit / Resubmit" on a rejected adjustment, **When** the edit action executes, **Then** the adjustment status transitions from REJECTED to DRAFT, the form opens for editing, and the rejection reason is displayed as a visible banner.
3. **Given** a user edits and resubmits a previously rejected adjustment, **When** the resubmission completes, **Then** the adjustment returns to SUBMITTED status in the normal approval workflow.
4. **Given** a user with VIEWER role views a rejected adjustment, **When** viewing the detail, **Then** no Edit button is available (role-based restriction).

---

### User Story 4 - View Complete Stocktake Audit Trail (Priority: P1)

During a physical inventory count (stocktake), the document goes through multiple status transitions: OPEN → COUNTING → COUNTING_COMPLETED → VARIANCE_SUBMITTED → POSTED. Currently, the stocktake detail page shows only the current status in the timeline — users cannot see who performed each transition or when. This makes it impossible to audit the stocktake process or identify bottlenecks.

**Why this priority**: Stocktakes are regulatory and financial events. A missing audit trail means no traceability for inventory adjustments, which is a compliance gap. Auditors need to see who counted, who submitted variances, and who posted.

**Independent Test**: Open a stocktake that has gone through multiple status changes, verify the timeline shows every transition with status, timestamp, and user name, in chronological order.

**Acceptance Scenarios**:

1. **Given** a stocktake session has transitioned from DRAFT → OPEN → COUNTING → COUNTING_COMPLETED, **When** a user views the stocktake detail, **Then** the status timeline displays all four transitions with their respective timestamps and user names, not just the current status.
2. **Given** a stocktake session has been posted, **When** the user views the detail, **Then** the timeline shows every status transition in chronological order (oldest first) including the final POSTED entry.
3. **Given** a newly created stocktake with no transitions yet, **When** viewing the detail, **Then** the timeline shows a single DRAFT entry as a fallback.
4. **Given** a stocktake viewer and the stocktake form, **When** both screens display the timeline, **Then** both show the same complete audit trail using the same data source.

---

### User Story 5 - Validate GRN Expiry Dates at Receipt (Priority: P2)

When receiving goods (GRN), warehouse keepers enter lot-specific expiry dates. These dates drive the FEFO (First-Expired, First-Out) allocation system. Currently, there is no validation preventing entry of expiry dates in the past, which could cause the system to issue already-expired items or corrupt FEFO calculations.

**Why this priority**: While important for food safety and FEFO accuracy, the impact is mitigated by the fact that expired items are blocked at issuance anyway. The validation adds a proactive guard at the point of data entry, which is a quality-of-life improvement rather than a critical safety fix.

**Independent Test**: During GRN receipt, attempt to enter an expiry date in the past — verify that warehouse keepers are blocked with an error and inventory managers see a warning with an override option.

**Acceptance Scenarios**:

1. **Given** a warehouse keeper (WH_KEEPER) enters an expiry date in the past during GRN lot entry, **When** they try to save the lot, **Then** the system blocks the entry with an error message stating the expiry date cannot be in the past.
2. **Given** an inventory manager (INV_MGR) or admin enters an expiry date in the past, **When** they try to save, **Then** the system shows a warning but allows override after providing a mandatory reason.
3. **Given** a lot has a valid future expiry date, **When** the GRN is received and posted, **Then** the FEFO allocation system correctly ranks the new lot by its expiry date alongside existing lots.
4. **Given** a user enters today's date as the expiry date, **When** saving, **Then** the system accepts it (today is not considered past).

---

### User Story 6 - Enable KITCHEN_CHIEF and STORE_MGR Roles (Priority: P1)

The system defines KITCHEN_CHIEF and STORE_MGR as user roles, but these roles are missing from the workflow transition rules. Users assigned these roles cannot submit kitchen requests, approve documents, or perform any workflow action — they are effectively locked out of the system despite having been provisioned.

**Why this priority**: These roles represent real operational positions in a kitchen-store environment. If kitchen chiefs cannot submit kitchen requests and store managers cannot manage their stores, the system is unusable for the staff it's designed for.

**Independent Test**: Log in as a KITCHEN_CHIEF user, navigate to kitchen requests, and verify the Submit action is available. Log in as STORE_MGR, verify the role can perform the operations appropriate to a store manager.

**Acceptance Scenarios**:

1. **Given** a user with KITCHEN_CHIEF role, **When** viewing a kitchen request in DRAFT status, **Then** the user can submit it (SUBMIT action is available) and cancel it (CANCEL action is available).
2. **Given** a user with KITCHEN_CHIEF role, **When** viewing a kitchen request in SUBMITTED status, **Then** the user can fulfill it (FULFILL action is available) and cancel it.
 3. **Given** a user with STORE_MGR role, **When** using the system, **Then** the user can create, edit, and submit adjustments, transfers, stocktakes, and GRN receipts (same as WH_KEEPER), plus approve adjustments within their store scope.
 4. **Given** a user with STORE_MGR role, **When** attempting to approve adjustments outside their assigned scope or post documents, **Then** those actions are restricted.
4. **Given** existing roles (ADMIN, INV_MGR, WH_KEEPER, APPROVER), **When** these roles are used after adding KITCHEN_CHIEF and STORE_MGR, **Then** all existing role permissions remain unchanged (no regression).

---

### Edge Cases

- What happens when a user searches for a transfer by document number but the format differs (e.g., leading zeros, dashes)? The search should match substrings — partial matches are acceptable.
- What happens if the warehouse master data endpoint fails while building the warehouse name map? The system should fall back gracefully, displaying the warehouse ID as a last resort rather than crashing the list.
- What happens if a rejected adjustment is edited and resubmitted, but another user has already created a new adjustment for the same correction? The system should allow both to exist independently — adjustments are ledger entries, not unique corrections.
- What happens if a stocktake has no audit log entries (legacy data from before this fix)? The timeline should gracefully show a single DRAFT entry as fallback.
- What happens if the KITCHEN_CHIEF tries to approve or post an adjustment? These actions should remain restricted — KITCHEN_CHIEF is for kitchen requests only, not inventory adjustments.
- What happens if a GRN has multiple lot lines and some have valid expiry dates while others are in the past? The system should flag only the offending lots, not block the entire GRN.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enable a search input on the transfer list page that filters transfers by document number and warehouse name.
- **FR-002**: System MUST debounce search input (wait for user to stop typing) before sending a filter request to avoid excessive server calls.
- **FR-003**: System MUST reset the transfer list to page 1 whenever the search query changes.
- **FR-004**: System MUST display warehouse names on all operational list screens (transfers, adjustments, stocktakes) using the actual entity name from master data, not translation keys.
- **FR-005**: System MUST reflect newly created or renamed warehouses in all warehouse name displays without requiring translation file updates.
- **FR-006**: System MUST display warehouse names in the user's current locale (Arabic or English) using the appropriate name field from the entity.
- **FR-007**: System MUST provide an EDIT transition from REJECTED status to DRAFT status for inventory adjustments.
- **FR-008**: System MUST display the rejection reason as a visible banner when editing a previously rejected adjustment.
- **FR-009**: System MUST make the EDIT action available to users with ADMIN, INV_MGR, or WH_KEEPER roles on REJECTED adjustments.
- **FR-010**: System MUST display a complete audit trail in the stocktake detail (form and viewer) showing every status transition with timestamp, user name, and status.
- **FR-011**: System MUST display stocktake audit trail entries in chronological order (oldest first).
- **FR-012**: System MUST fall back to displaying a single DRAFT timeline entry if no audit log data exists for a stocktake.
- **FR-013**: System MUST validate that GRN lot expiry dates are not in the past at the time of data entry.
- **FR-014**: System MUST block past expiry date entry for WH_KEEPER users with a hard error.
- **FR-015**: System MUST allow past expiry date override for INV_MGR and ADMIN users with a mandatory reason input.
- **FR-016**: System MUST accept today's date as a valid expiry date (not considered in the past).
- **FR-017**: System MUST add KITCHEN_CHIEF role to the SUBMIT, FULFILL, and CANCEL workflow transitions for kitchen requests.
- **FR-018**: System MUST add STORE_MGR role to workflow transitions for adjustments, transfers, stocktakes, and GRN receipt (same create/edit/submit capabilities as WH_KEEPER), plus APPROVE capability on adjustments within their assigned store scope.
- **FR-019**: System MUST preserve all existing role permissions unchanged when adding KITCHEN_CHIEF and STORE_MGR roles.

### Key Entities

- **Transfer**: Represents stock movement between warehouses. Key attributes: document number, source warehouse, destination warehouse, status. The search functionality enables filtering by document number and warehouse name.
- **Warehouse**: A physical or logical storage location. Key attributes: ID, name (English), name (Arabic), type, branch. Names must be displayed directly from entity data across all operational lists.
- **Adjustment (REJECTED state)**: An inventory correction that was rejected by an approver. Must support EDIT transition back to DRAFT so it can be corrected and resubmitted. Key attribute: rejection reason (displayed during edit).
- **Stocktake Audit Log Entry**: A record of a single status transition in a stocktake session. Key attributes: status, timestamp (created_at), user name. Multiple entries compose the complete audit trail displayed in the timeline.
- **GRN Lot**: A batch of received goods with a specific expiry date. Key attribute: expiry_date — must be validated against the current date at data entry with role-based enforcement.
- **Kitchen Request**: A requisition from a kitchen to a store. KITCHEN_CHIEF role must be able to submit and fulfill these documents.
- **Workflow Transition Rule**: Defines which roles can execute which actions from which document status. Must include KITCHEN_CHIEF for kitchen requests (SUBMIT, FULFILL, CANCEL) and STORE_MGR for adjustments, transfers, stocktakes, and GRN receipt (create/edit/submit as WH_KEEPER plus APPROVE on adjustments within store scope).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find a specific transfer by document number or warehouse name in under 5 seconds using the search field.
- **SC-002**: Warehouse names on all operational lists match the master data entity names with 100% accuracy — zero instances of translation key fallback text appearing in place of a real warehouse name.
- **SC-003**: 100% of rejected adjustments can be edited and resubmitted (zero dead-end REJECTED states) by authorized users.
- **SC-004**: The stocktake audit trail shows 100% of status transitions that occurred — every status change is recorded and visible in the timeline.
- **SC-005**: Zero GRN lots are received with a past expiry date by warehouse keepers; inventory manager overrides are logged with a mandatory reason.
- **SC-006**: KITCHEN_CHIEF users can submit and fulfill kitchen requests, and STORE_MGR users can perform store-level operations, without any permission errors.

## Assumptions

- The backend API for transfers (`GET /operations/transfers`) already supports a `?search=` query parameter, or will be updated to support it as part of this phase.
- The backend stocktake endpoint (`GET /stocktake/sessions/:id`) will be updated to include the `audit_log[]` array with all status transitions as a prerequisite for this phase.
- The `canPerformActionV2` function and `transitionMapV2` in the workflow engine are the single source of truth for workflow permissions and will be updated to include KITCHEN_CHIEF and STORE_MGR.
- Warehouse master data is accessible via the existing `useWarehouses` hook across all list screens.
- The GRN lot entry form exists in the goods-received module and can be extended with expiry date validation.
- The FEFO allocation system correctly handles newly received lots once their expiry dates are validated.
- All new UI text (error messages, button labels, warning messages) will be properly localized in both English and Arabic via next-intl translation keys.
- The system has Arabic-first, RTL layout requirements, and dark mode (Nocturne theme) as standard — no visual redesign is implied by these fixes.

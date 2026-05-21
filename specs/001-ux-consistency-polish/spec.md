# Feature Specification: UX Consistency & Polish (Phase 4)

**Feature Branch**: `001-ux-consistency-polish`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Create a specification for Phase 4 (UX Consistency & Polish) from the frontend remediation implementation plan — 9 tasks covering list filtering, date ranges, warehouse filters, print layout, localization, component unification, column sorting, loading indicators, and in-manifest search."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter, Search, and Sort Across Operational Lists (Priority: P1)

Warehouse operators, inventory managers, and administrators need to quickly find relevant documents across adjustment, transfer, stocktake, and issue lists. Currently, filter buttons on these screens are non-functional, there is no date range filtering, no warehouse filtering, and no column sorting — forcing users to scroll through large paginated lists manually.

**Why this priority**: List screens are the primary entry point for daily operational work. Ineffective filtering directly impacts operational efficiency — users waste time scanning pages instead of locating documents instantly.

**Independent Test**: Can be fully tested by opening any operational list screen (adjustments, transfers, stocktake), applying filters and sorts, and verifying the displayed results match the filter criteria. Delivers immediate productivity gains for all user roles.

**Acceptance Scenarios**:

1. **Given** a user is on the Adjustments list screen, **When** they click the "Filter" button, **Then** the filter controls toggle visibility (show/hide) without clearing active filter values, and the button label shows the count of active filters (e.g., "Filters (2)").

2. **Given** a user sets a date range filter (from date and to date) on the Adjustments list, **When** the list refreshes, **Then** only documents created within that date range are displayed.

3. **Given** an ADMIN user is on the Adjustments list with a warehouse filter combobox visible, **When** they select a specific warehouse, **Then** only adjustments belonging to that warehouse are shown. **Given** a WH_KEEPER with an active scope, **When** they view the list, **Then** the warehouse filter is pre-selected to their scope and is not user-changeable.

4. **Given** warehouse filter comboboxes display warehouse names, **When** a dynamically created warehouse exists, **Then** its real entity name appears (not a translation key fallback).

5. **Given** a user is viewing a large list of transfers, **When** they type into the search field, **Then** the list filters by document number or warehouse name with a debounced search (no API call per keystroke), the page resets to 1, and clearing the search restores the full list.

6. **Given** a user clicks a sortable column header (e.g., "Created At"), **When** the list refreshes, **Then** rows are sorted by that column in ascending order, and a second click toggles to descending order, with a visible arrow icon indicating sort direction.

7. **Given** a user is viewing a stocktake session with many items, **When** they type a partial item name or barcode into the manifest search field, **Then** only matching items are displayed with a count showing "X of Y items", unmatched items are hidden (not deleted), and clearing the search restores all items.

---

### User Story 2 - Consistent Print Experience (Priority: P2)

Users need to print adjustment vouchers and stocktake reports. Currently, print CSS is duplicated across three separate files, and print headers contain hardcoded English text that does not translate when the UI is in Arabic. This creates maintenance burden and a broken bilingual experience.

**Why this priority**: Print documents are often required for physical sign-off and regulatory records. Non-localized headers undermine the bilingual system and duplicated CSS creates drift risk.

**Independent Test**: Can be tested by printing an adjustment voucher and a stocktake report from both English and Arabic UI modes, verifying header translations and print layout consistency.

**Acceptance Scenarios**:

1. **Given** three screens (adjustment form, adjustment viewer, stocktake viewer) previously had duplicate `@media print` CSS blocks, **When** print styles are centralized, **Then** print behavior is identical to before on all screens, no component contains inline print CSS, and there is a single shared location to adjust print layout.

2. **Given** a user prints an adjustment voucher while using the Arabic UI, **When** the print preview renders, **Then** the header displays "قسيمة تسوية المستودع" (Arabic). **Given** the English UI, **Then** the header displays "Warehouse Adjustment Voucher".

3. **Given** a user prints a stocktake report, **When** the print preview renders, **Then** the report title is displayed in the user's active language with no hardcoded English strings in any print-only section.

---

### User Story 3 - UI Component Consistency and Loading Feedback (Priority: P3)

Multiple screens use inconsistent implementations of sticky headers, and the stock level refresh on warehouse change has no visual loading indicator, leaving users uncertain whether the system is responding to their input. Standardizing shared components reduces maintenance and provides a uniform user experience.

**Why this priority**: Component inconsistencies create maintenance debt and confusion for users moving between screens. Missing loading indicators cause user uncertainty and potential duplicate actions.

**Independent Test**: Can be tested by navigating between the adjustment form and stocktake form, verifying identical sticky header behavior, and by changing the warehouse on an adjustment form to observe the loading indicator.

**Acceptance Scenarios**:

1. **Given** an adjustment form and stocktake form previously used inline sticky header divs, **When** the shared `StickyGlassHeader` component is used across all document screens (both viewer and form modes), **Then** sticky headers have identical backdrop-blur, border, and z-index values, and no duplicate sticky header code exists in form components.

2. **Given** a user changes the warehouse selection on an adjustment form, **When** stock levels are being re-fetched, **Then** a visible loading indicator appears above the line items table, and the "Add Item" and "Save Draft" buttons are disabled during the refresh.

---

### Edge Cases

- What happens when a user applies multiple filters simultaneously (e.g., date range + warehouse + status) and the combination returns zero results? The list should show an empty state message, not a blank screen or error.
- What happens when a user with no active scope (ADMIN with no restriction) views a list? All documents across all warehouses should be visible.
- What happens when a browser's print dialog is cancelled? No permanent state change should occur; the user returns to the screen as-is.
- What happens when debounced search input changes rapidly? Only the final value after the debounce period triggers an API call; intermediate keystrokes are discarded.
- What happens when sort is applied on a column with null/empty values? Null values should sort consistently (either always first or always last) regardless of sort direction.
- What happens when the manifest search in a stocktake matches no items? Display "0 of N items" with a message indicating no matches found.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide functional filter toggle buttons on all operational list screens (adjustments, transfers, stocktake) that show/hide filter controls without clearing active filter selections.
- **FR-002**: System MUST display the count of currently active filters on the filter toggle button (e.g., "Filters (2)").
- **FR-003**: System MUST provide date range filters (from date and to date) on adjustment, stocktake, and transfer list screens that filter documents by their relevant date field.
- **FR-004**: System MUST provide a warehouse filter on adjustment and issue list screens using a warehouse selection combobox populated with entity names from the warehouse master data.
- **FR-005**: System MUST restrict warehouse filter options for WH_KEEPER users to their assigned scope warehouse only, making the filter pre-selected and non-editable.
- **FR-006**: System MUST provide a search input on the transfer list that filters by document number and warehouse name with debounced input handling (no API call per keystroke).
- **FR-007**: System MUST reset pagination to page 1 whenever search or filter criteria change.
- **FR-008**: System MUST provide sortable column headers on all list screens, with toggling sort direction (ascending/descending) and a visual indicator (arrow icon) showing the current sort state.
- **FR-009**: System MUST support client-side search within the stocktake manifest (form and viewer) by item name and barcode, with a count display showing "X of Y items" matching.
- **FR-010**: System MUST centralize all `@media print` CSS rules into a single shared location, removing inline print styles from individual components.
- **FR-011**: System MUST localize print voucher and report headers using the active locale, displaying the appropriate language (Arabic or English) with no hardcoded English strings.
- **FR-012**: System MUST use the shared `StickyGlassHeader` component across all document screens (adjustment form/viewer and stocktake form/viewer) with consistent visual properties.
- **FR-013**: System MUST display a loading indicator when stock levels are being re-fetched after a warehouse selection change on the adjustment form.
- **FR-014**: System MUST disable modification actions ("Add Item", "Save Draft") during the stock refresh loading period.

### Key Entities

- **Filter State**: Represents the active filter criteria on a list screen — includes date range (from/to), warehouse selection, status selection, and search text. Persisted as URL query parameters and React state.
- **Sort State**: Represents the current sort column and direction on a list screen — includes the column identifier and sort order (ascending/descending). Persisted as URL query parameters.
- **Print Configuration**: Centralized print style rules shared across all document screens — defines visibility, layout, margins, and header/footer content for printed output.
- **Manifest Search State**: Represents the client-side search term within a stocktake session's item manifest — filters displayed items without modifying underlying data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a specific document on any operational list screen in under 10 seconds using combined filters and sort (down from an estimated 30+ seconds of manual page scanning).
- **SC-002**: 100% of operational list screens (adjustments, transfers, stocktake, issues) have functional filter controls — zero screens with non-functional "Filter" buttons.
- **SC-003**: Warehouse names displayed in filter comboboxes and list columns match the actual entity names from master data with zero reliance on translation key fallbacks.
- **SC-004**: Print output displays correctly in both English and Arabic locales with appropriate translated headers — zero hardcoded English strings remain in print sections.
- **SC-005**: All filtered and sorted list views return results within 3 seconds after applying new criteria (debounced searches excluded from per-keystroke timing).
- **SC-006**: User confusion from missing loading feedback during warehouse-change stock refresh is eliminated — a visible indicator appears within 200ms of warehouse selection change.

## Assumptions

- The existing `DataTable` component supports or can be extended to support column sorting via the TanStack Table `getSortedRowModel` API.
- The existing `StickyGlassHeader` component can be extended with minimal prop additions (e.g., `isEditing` flag) to accommodate form-specific styling needs.
- Warehouse entity data is available through an existing `useWarehouses()` hook that returns display names in both Arabic and English.
- The backend list endpoints either already accept or can be extended to accept `date_from`, `date_to`, and `sort_by`/`sort_dir` query parameters.
- Locale files (`messages/ar.json`, `messages/en.json`) follow the project's existing `next-intl` structure and can be extended with new translation keys.
- The debounce utility (`useDebounce`) is available in the project's shared hooks or a standard library (e.g., `usehooks-ts`).
- The application's `globals.css` or a dedicated `styles/print.css` is the agreed location for centralized print styles.

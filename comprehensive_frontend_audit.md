# Enterprise Frontend Repository Audit Report
## Deep Frontend System Analysis, Operational Review, UX Governance, and Backend Requirement Extraction

This audit covers the operational, architectural, workflow, and production-readiness state of the Kitchen-Store Inventory System (LogiRest). It is structured systematically to analyze every screen, modal, and workflow component individually.

---

# SECTION A: OPERATIONS & WORKFLOW MODULES

---

# SCREEN: Adjustments List (`/adjustments`)
## Purpose
Provides a tabular dashboard of all inventory adjustments (increases, decreases, damage write-offs) across branches and warehouses, allowing managers to monitor historical and pending adjustments.

## UI Structure
*   **Header**: Page title, "New Adjustment" button, and multi-select filters (warehouse, status, date range, adjustment reason).
*   **Main Grid**: Table listing document number, warehouse, status (DRAFT, SUBMITTED, APPROVED, POSTED, CANCELLED), total items, adjustment reason category, creator, and date.
*   **Actions**: Inline row view button, status-based action triggers (e.g., Post, Approve, Cancel), and search bar.

## Components
*   `SmartCombobox` for warehouse and status filtering.
*   `StatusBadge` for rendering localized status tags (color-coded).
*   `Table` with pagination and sorting headers.
*   `Breadcrumb` for path navigation.

## Data Flow
*   Queries `/operations/adjustments` via TanStack Query (`useAdjustments`).
*   Triggers `/operations/adjustments/:id/post` or `cancel` mutations inline based on permissions.
*   Pagination and search parameters synchronized with the browser URL query string.

## Workflows
1.  User enters search query or selects warehouse filter -> React-Query refetches list.
2.  User clicks on a row -> navigates to `/adjustments/[id]`.
3.  User clicks "New Adjustment" -> navigates to `/adjustments/new`.
4.  Authorized manager clicks "Approve" or "Post" directly from row menu -> performs mutation, triggers toast, invalidates adjustments cache.

## Validations
*   Filter validations (date range end must be after start).
*   Permission checks for inline actions (e.g., POST requires `INV_MGR` or `ADMIN` roles).

## Operational Safety
*   Inline destructive actions (like CANCEL) require confirmation dialogues.
*   State timeline and posted information must be visible to maintain an audit trail.

## UX Efficiency
*   Filter options are responsive but lacks an instant reset button.
*   Search query is debounced to prevent API overloading.

## Production Gaps
*   Missing bulk action selection (e.g., approving multiple draft adjustments at once).
*   Export to PDF/Excel button exists in layout but relies on mock triggers.

## Missing Features
*   Visual charts for adjustment reasons (e.g., showing that 40% of adjustments are due to damage).
*   Advanced history logs (who modified the draft before submission).

## Inventory Risks
*   No protection against modifying filters during active row mutations, which could cause state mismatches in the UI layout.

## Backend Requirements
*   GET `/operations/adjustments` with support for pagination (`page`, `limit`), search (`q`), and filters (`warehouse_id`, `status`, `reason_category`).
*   Permissions: `view` access on `operations_adjustments` resource.

## Recommendations
*   Add a single-click "Clear All Filters" button.
*   Introduce bulk selection and execution of status transitions.

## Priority Level
High

---

# SCREEN: Adjustment Detail/Viewer (`/adjustments/[id]`)
## Purpose
Provides a read-only viewer for existing adjustments. Shows the final state of adjustments, and displays action triggers (Approve, Post, Cancel) if the document is not locked.

## UI Structure
*   **Header**: Sticky glass header showing the document number, status badge, creator metadata, and operational back button.
*   **Metadata section**: Warehouse name, linking documents, general notes, and date created/posted.
*   **Line Items Table**: Read-only table showing item code, name, UOM, lot number, expiry date, adjusted qty, and adjustment direction (INCREASE/DECREASE).
*   **Status Timeline**: Visual step-timeline representing the document lifecyle (Created -> Submitted -> Approved -> Posted).

## Components
*   `DocumentLockBanner` (renders warnings if locked).
*   `StatusBadge` and `StatusTimeline`.
*   `DocumentLineItemTable` (configured in read-only mode).
*   `ActionGuard` (wraps workflow button transitions).

## Data Flow
*   Queries `/operations/adjustments/:id` via TanStack Query (`useAdjustment`).
*   Uses `canPerformActionV2` to evaluate workflow permissions based on document status and user role.

## Workflows
1.  Manager opens adjustment -> views lines.
2.  If status is `SUBMITTED`, manager clicks "Approve" -> executes `/approve` mutation -> status transitions to `APPROVED`.
3.  If status is `APPROVED`, manager clicks "Post" -> executes `/post` mutation -> stock is manifest, status transitions to `POSTED`, document locks.

## Validations
*   Verify that only authorized roles can view action buttons.
*   Ledger Immutability check: all input controls are disabled.

## Operational Safety
*   Once status is `POSTED`, the form is visually and functionally locked. No editing is allowed.
*   Conflict handler active to prevent concurrent status updates (e.g., two managers trying to post simultaneously).

## UX Efficiency
*   Highly readable structure, but print layout lacks specific CSS formatting (columns wrap awkwardly).

## Production Gaps
*   Printing/PDF generation is missing.

## Missing Features
*   Direct link to the related lot inventory card or item card.

## Inventory Risks
*   If the backend doesn't enforce the lock, a malicious actor could send a PUT request to update items in a POSTED adjustment.

## Backend Requirements
*   GET `/operations/adjustments/:id` returning detailed adjustment data.
*   POST `/operations/adjustments/:id/approve` and POST `/operations/adjustments/:id/post`.
*   Strict RBAC enforcement at the API gateway layer.

## Recommendations
*   Implement clean CSS print stylesheets (`@media print`) to print adjustments as official vouchers.

## Priority Level
Critical

---

# SCREEN: Adjustment Create (`/adjustments/new`)
## Purpose
Allows warehouse operators and inventory managers to log warehouse inventory adjustments, scanning items, adjusting quantities, and selecting lots.

## UI Structure
*   **Metadata Form**: Warehouse selector (`SmartCombobox`), adjustment category selector, reference number, and general notes.
*   **Scanner Bar**: Wide scanning panel (`ScanInput`) with status indicators.
*   **Line Items Grid**: Dynamic table showing added items, UOM selection, lot selector (dropdown of available lots for the selected item), direction toggle (INCREASE/DECREASE), adjust quantity input, and new quantity calculation.

## Components
*   `SmartCombobox` for warehouse, category, and items.
*   `ScanInput` for barcode wedge scanning.
*   `DocumentLineItemTable` with inline controls.
*   `useWarehouseLock` check hook.
*   `UnsavedChangesGuard`.

## Data Flow
*   Queries items database to search scanned barcodes.
*   Submits form data to `POST /operations/adjustments` via `useCreateAdjustment` mutation.
*   Listens to warehouse selector changes to verify if a warehouse is locked by an active stocktake.

## Workflows
1.  User selects warehouse -> App checks lock state. If locked, form locks and warns user.
2.  User scans barcode or types item name -> App appends item to fields array.
3.  User selects direction (Increase/Decrease) -> Enters quantity.
4.  User selects Lot (compulsory for lot-tracked items).
5.  User clicks "Submit" -> validation triggers -> sends API payload -> redirects to detail view.

## Validations
*   Warehouse ID and Reason category are mandatory.
*   Line items count must be >= 1.
*   Quantity must be > 0.
*   If direction is DECREASE, the adjust quantity cannot exceed the available quantity in the selected lot.
*   If item is lot-tracked, Lot must be selected.

## Operational Safety
*   Warehouse Lock Banner blocks input if there is an active stocktake session in the selected warehouse.
*   Unsaved changes guard prevents browser back/close from discarding written items.
*   Wedge scanner auto-refocuses to prevent scanner input from leaking into text inputs.

## UX Efficiency
*   Auto-focusing on scanner allows rapid barcode scanning.
*   *Degradation*: Refocusing is done via `setTimeout` in `ScanInput`, which sometimes lags when the DOM is re-rendering heavily.

## Production Gaps
*   Missing Success Redirect: current code does not redirect to `/adjustments/[id]` upon successful submission, causing operators to remain on an empty form.
*   No warning when decreasing quantity below warning levels.

## Missing Features
*   Bulk CSV item import.
*   Lot creation dialog inline for INCREASES (currently user must select an existing lot, which makes it impossible to adjust new lot-tracked items in).

## Inventory Risks
*   Operators might create adjustments with inaccurate lot details if lot creation is not available.
*   Double submission if the button is not disabled during mutation execution.

## Backend Requirements
*   POST `/operations/adjustments` receiving `AdjustmentCreateDTO`.
*   API must validate that the warehouse is not locked by a stocktake.
*   API must validate that lots chosen for DECREASE have sufficient quantity.

## Recommendations
*   Fix success redirect to push router path to the newly created adjustment.
*   Add inline lot creation modal for INCREASE adjustments.

## Priority Level
Critical

---

# SCREEN: Create Custom Item Dialog
## Purpose
Allows users to create a new item directly from creation forms (Adjustments, POs, etc.) when the scanned barcode or item code is not found in the master database.

## UI Structure
*   **Dialog Overlay**: Modal containing fields: Item Code, Barcode, English Name, Arabic Name, Primary UOM, Category, and default purchase price.
*   **Footer**: Cancel button and Create Item action button.

## Components
*   `Dialog` (headless UI or UI library).
*   `Form` fields with Zod validation.
*   `SmartCombobox` for primary UOM and category.

## Data Flow
*   Sends POST payload to `/master-data/items`.
*   On success, appends the newly created item into the parent form's line items array and closes the dialog.

## Workflows
1.  Operator scans a barcode -> Item not found.
2.  System shows "Item not found. Create custom item?" trigger -> Operator clicks it.
3.  Modal opens -> Operator fills details -> Click "Create".
4.  Item is saved to DB -> Automatically selected in the form's line.

## Validations
*   Item Code and Name (AR & EN) are mandatory.
*   Primary UOM is mandatory.
*   Barcode must be unique.

## Operational Safety
*   Requires specific permissions (`create` on `master_data_items`) to show the trigger. Otherwise, fails gracefully.

## UX Efficiency
*   Saves the operator from leaving the active adjustment form to go to the master data page.

## Production Gaps
*   Currently doesn't auto-fill the barcode field in the modal with the scanned barcode that triggered the modal.

## Missing Features
*   Image upload inside the quick create dialog.

## Inventory Risks
*   Risk of duplicates: operators might quickly create a custom item with typos, causing duplicates of existing items in the database.

## Backend Requirements
*   POST `/master-data/items` matching item schema.

## Recommendations
*   Auto-fill the barcode field in the modal with the scanned string.
*   Enforce a duplicate check (e.g., sound-alike or code check) before saving.

## Priority Level
Medium

---

# SCREEN: Stocktake Sessions List (`/stocktake`)
## Purpose
Serves as the control panel for inventory audits, listing active and upcoming stocktake (physical inventory count) sessions.

## UI Structure
*   **Header**: Page title, "Start New Session" button.
*   **Filters**: Warehouse selector, session status filters (DRAFT, STARTED, COUNTING, REVIEW, APPROVED, POSTED, CLOSED, CANCELLED).
*   **List Card/Table**: Shows Session Number, Session Name, Warehouse, Status Badge, Snapshot Date, and creator details.

## Components
*   `StatusBadge` with `STOCKTAKE_STATUS_UI` colors.
*   `SmartCombobox` and `Button` controls.
*   `Table` layout.

## Data Flow
*   Queries `/stocktake/sessions` via `useStocktakes`.
*   Retrieves active/draft sessions and filters locally or via query params.

## Workflows
1.  User filters by warehouse -> fetches sessions.
2.  User clicks a session -> navigates to `/stocktake/[id]`.
3.  User clicks "Start New Session" -> navigates to `/stocktake/new`.

## Validations
*   URL query params formatting.

## Operational Safety
*   Clearly distinguishes completed audits from active audits to prevent confusion.

## UX Efficiency
*   Responsive layout, clean list cards.

## Production Gaps
*   Lacks progress metrics directly on the list (e.g., "50% of items counted").

## Missing Features
*   Visual progress indicator bars for active counts.

## Inventory Risks
*   Operators starting concurrent audits in the same warehouse (should be prevented by the backend/frontend lock).

## Backend Requirements
*   GET `/stocktake/sessions` with pagination and sorting.

## Recommendations
*   Add a progress percentage column to the table.

## Priority Level
High

---

# SCREEN: Stocktake Historical/Archive (`/stocktake/archive`)
## Purpose
Lists finalized, posted, and closed stocktakes, separating historical records from active, high-priority audits.

## UI Structure
*   Similar to `/stocktake` list page but restricted to status = POSTED, CLOSED, or CANCELLED.
*   Highlights variances and stock adjustment valuations for audit review.

## Components
*   `Table`, `StatusBadge`, search filters.

## Data Flow
*   Fetches `/stocktake/sessions?archive=true` or filters status.

## Workflows
*   User reviews old audits -> clicks to view detail -> navigates to read-only view.

## Validations
*   None.

## Operational Safety
*   Read-only views prevent any post-audit modifications.

## UX Efficiency
*   Easy access to historic variance reports.

## Production Gaps
*   Search filter by date range missing.

## Missing Features
*   Direct download of CSV/Excel summaries for external auditors.

## Inventory Risks
*   None.

## Backend Requirements
*   Filter parameters on `/stocktake/sessions` to support status bounds.

## Recommendations
*   Add an audit export button for historic variance sheets.

## Priority Level
Medium

---

# SCREEN: Stocktake Session Setup (`/stocktake/new`)
## Purpose
Allows managers to initialize a stocktake session for a specific warehouse, freezing the inventory snapshot at that point in time.

## UI Structure
*   **Setup Form**: Session Name input, Warehouse selector, notes.
*   **Scope filters**: Category selector (to audit specific categories instead of the whole warehouse).
*   **Footer**: Cancel and "Freeze Snapshot & Create" action buttons.

## Components
*   `SmartCombobox` for warehouse.
*   `Input` and `Form` components.

## Data Flow
*   Calls `POST /stocktake/sessions` with warehouse ID and categories.
*   Returns warehouse lock state and details on conflict.

## Workflows
1.  Manager enters name and selects Warehouse.
2.  App checks if warehouse already has an active stocktake.
3.  If yes, shows warning: "Warehouse locked by Session X". Disables button.
4.  If no, manager clicks "Freeze Snapshot" -> API captures all lot quantities -> session created.
5.  Redirects to `/stocktake/[id]`.

## Validations
*   Warehouse ID and Session Name are mandatory.
*   Category filter is optional.

## Operational Safety
*   Strict check against active sessions in the same warehouse is executed.
*   Snapshot Freeze: captures the current theoretical inventory levels, which are critical for calculating variance later.

## UX Efficiency
*   Simple, single-focused form.

## Production Gaps
*   Missing Success Redirect: currently doesn't automatically route to the detail page on success.
*   Doesn't show the size of the inventory to be snapshotted (number of items, lots).

## Missing Features
*   Estimation of items included in the snapshot.

## Inventory Risks
*   Double creation of snapshots if network request is retried. Must have idempotency controls.

## Backend Requirements
*   POST `/stocktake/sessions` with snapshot freezing logic.
*   Validation: check for active audits in the warehouse and return WAREHOUSE_LOCKED error.

## Recommendations
*   Fix success redirect.
*   Show a count of items that will be snapshotted based on the selected warehouse and category.

## Priority Level
Critical

---

# SCREEN: Stocktake Master View (`/stocktake/[id]`)
## Purpose
Serves as the main monitoring and action dashboard for an individual stocktake session.

## UI Structure
*   **Header**: Session Name, Warehouse location, and current Status Badge.
*   **Metadata Grid**: Cards showing Warehouse, Owner, Items Count, and Last Updated.
*   **Inventory Manifest**: Table listing item details, counted qty, snapshot qty, variance, and status.
*   **Audit Trail**: Vertical timeline of status changes.
*   **Form Footer**: Contextual buttons depending on status (e.g., "Start Counting", "Enter Count Mode", "Post to Ledger").

## Components
*   `DocumentLockBanner`, `LockBanner`.
*   `StatusBadge`, `StatusTimeline`.
*   `DocumentLineItemTable`.
*   `FormFooter`.

## Data Flow
*   Queries `/stocktake/sessions/:id` (`useStocktake`).
*   Uses status guards (`isStocktakeCounting`, `isStocktakeInReview`) to structure columns.

## Workflows
*   If status = DRAFT -> Footer shows "Start Session". Clicking executes `/start` transition.
*   If status = STARTED -> Footer shows "Enter Count Mode" (routes to `/count`).
*   If status = REVIEW -> Footer shows "Variance Review" (routes to `/variance`) and "Approve".
*   If status = APPROVED -> Footer shows "Post to Ledger" (routes to `/post`).

## Validations
*   Check that snapshot values are HIDDEN if status is STARTED or COUNTING.
*   Ledger Guard: fields disabled if status is locked.

## Operational Safety
*   **Ledger Guard**: During STARTED and COUNTING states, the snapshot quantity and variance columns are hidden from the UI. This prevents operators from performing "paper counts" (just copying numbers instead of physically counting).

## UX Efficiency
*   Highly readable layout with status timeline.

## Production Gaps
*   No auto-refreshing list (if another operator is counting, the dashboard doesn't reflect counts unless reloaded).

## Missing Features
*   WebSockets or SSE for real-time progress update dashboard.

## Inventory Risks
*   Paper counting risk if operators bypass screens or read snapshot values from API directly (backend must also hide snapshot values in response during counting states).

## Backend Requirements
*   GET `/stocktake/sessions/:id`. Must redact `snapshot_qty` and `variance` fields if status is STARTED or COUNTING.

## Recommendations
*   Introduce background polling (e.g., refetchInterval: 10000) during counting.

## Priority Level
High

---

# SCREEN: Stocktake Pre-Audit Start (`/stocktake/[id]/start`)
## Purpose
Confirmational screen before starting the audit, explaining that the warehouse will be locked and operations halted.

## UI Structure
*   Large alert icon, warning copy detailing lock conditions, lists active operations in the warehouse.
*   "Confirm & Lock Warehouse" button.

## Components
*   Alert cards, action buttons.

## Data Flow
*   POST `/stocktake/sessions/:id/start` mutation.

## Workflows
*   Operator reads warning -> Clicks confirm -> Session transitions to STARTED -> Warehouse locks -> Redirects back to Master View.

## Validations
*   None.

## Operational Safety
*   Explicit confirmation prevents accidental locks.

## UX Efficiency
*   High visual warning contrast (red/amber alerts).

## Production Gaps
*   Does not show if there are open adjustments or pending transfers for this warehouse that should be posted first.

## Missing Features
*   Checklist validator (checks if pending GRNs or issues are not posted).

## Inventory Risks
*   If pending transactions are posted *during* the audit, the snapshot will be out of sync.

## Backend Requirements
*   POST `/stocktake/sessions/:id/start`.

## Recommendations
*   Add a backend check that blocks starting if there are unposted documents (GRNs, Issues) for the target warehouse.

## Priority Level
High

---

# SCREEN: Stocktake Count Interface (`/stocktake/[id]/count`)
## Purpose
The primary data-entry screen for operators counting items physically in the warehouse.

## UI Structure
*   **Scanner Bar**: Wide `ScanInput` for barcode wedge scanners.
*   **Autosave status bar**: Shows if saving is successful.
*   **Counting Grid**: Table of all items in the session. Renders name, barcode, UOM, lot number, and a numerical Input for the counted quantity.
*   **Actions**: "Finish Counting" button in the header.

## Components
*   `ScanInput` with sound alert triggers.
*   `DocumentLineItemTable` with virtualization enabled (`enableVirtualization: true`).
*   Keyboard navigation listener.

## Data Flow
*   `useUpdateItemCount` mutation triggered on input changes (debounced by 800ms).
*   Scanned barcodes increment quantities and trigger `audioAlerts.playSuccess()`.
*   Includes `X-Idempotency-Key` and `AbortController` in queries.

## Workflows
1.  User enters barcode in ScanInput -> Increments counted quantity of matching item -> Plays sound.
2.  User manually enters quantity in table input -> Autosaves after 800ms debounce.
3.  User uses Arrow keys (Up/Down) to navigate rows -> Input is auto-focused.
4.  Operator clicks "Finish Counting" -> Executes `/submit` -> Redirects to `/variance`.

## Validations
*   Counted quantity must be non-negative.
*   Must have counted at least 1 item to finish.

## Operational Safety
*   Virtualization keeps memory footprints low when handling 10,000+ rows.
*   LockBanner displays if warehouse state is locked.
*   Autosave prevents data loss on network drops.

## UX Efficiency
*   *Autosave*: Debounced updates prevent spamming the database.
*   *Accessibility*: Arrow key navigation and Enter key support make it easy to count without using a mouse.

## Production Gaps
*   Refocusing wedge scanner: occasionally after manual input edit, focus does not return to scanner automatically.

## Missing Features
*   Manual lot details addition for unexpected items found during counting.

## Inventory Risks
*   Network drop: if the network drops, the user might continue scanning without realizing counts aren't saving. Must have offline indicators.

## Backend Requirements
*   PUT `/stocktake/sessions/:id/items/:lineId` updating counted qty.
*   POST `/stocktake/sessions/:id/submit` to complete counting.
*   Must support idempotency keys to prevent duplicate count increments on retry.

## Recommendations
*   Add a prominent "Offline/Connected" banner that blocks input if connection is lost.
*   Implement automatic wedge scanner re-focusing after input blur.

## Priority Level
Critical

---

# SCREEN: Stocktake Variance Grid (`/stocktake/[id]/variance`)
## Purpose
Allows inventory managers to review discrepancies between the snapshot (theoretical) quantity and counted quantity before approving.

## UI Structure
*   Table listing items with Counted Qty, Snapshot Qty, Variance (color-coded red/green), and a Reason Code dropdown (e.g., Spoiled, Stolen, Mismatched Lot).
*   Header showing total variance valuation.
*   Footer: "Request Recount" and "Submit Review" buttons.

## Components
*   `DocumentLineItemTable`.
*   `SmartCombobox` for variance reason codes.
*   Valuation calculator displays.

## Data Flow
*   Fetches variance details.
*   Submits reviewed variances via `useSubmitVariance` mutation.

## Workflows
1.  Manager reviews red rows (discrepancies).
2.  Selects variance reason for each discrepancy.
3.  Clicks "Submit Review" -> status transitions to REVIEW.

## Validations
*   All items with variance must have a reason code selected.

## Operational Safety
*   High-contrast color indicators for high-value variances.
*   Locks editing of quantities during variance review.

## UX Efficiency
*   Filtering by "Discrepancy Only" allows managers to ignore matching items.

## Production Gaps
*   Reason codes are currently hardcoded in the frontend.

## Missing Features
*   "Trigger Recount for Item" button which creates a partial stocktake for failed lines.

## Inventory Risks
*   Posting without review can result in balance discrepancies.

## Backend Requirements
*   POST `/stocktake/sessions/:id/review_variance` with reason code payloads.

## Recommendations
*   Add "Filter by Discrepancy" toggle.
*   Add partial recount feature.

## Priority Level
High

---

# SCREEN: Stocktake Approval Detail (`/stocktake/[id]/approve`)
## Purpose
Where high-level managers approve the audit findings and variance calculations.

## UI Structure
*   Summary cards showing total counted value, total variance value (positive/negative), and items count.
*   Comments textarea.
*   "Approve Audit" and "Reject" buttons.

## Components
*   `Card`, `Form` controls, confirmation modals.

## Data Flow
*   Calls `useApproveStocktake` or `useRejectStocktake`.

## Workflows
1.  Manager opens approval view -> Writes review comments.
2.  Clicks "Approve" -> status transitions to APPROVED.
3.  If clicks "Reject" -> session goes back to COUNTING.

## Validations
*   Comments are mandatory on rejection.

## Operational Safety
*   Requires specific RBAC permissions (`approve` on `operations_stocktake`).

## UX Efficiency
*   Clean, aggregate view of financial impacts.

## Production Gaps
*   None.

## Missing Features
*   Approval routing logic (e.g., if variance is > 10,000 SAR, require regional manager approval).

## Inventory Risks
*   None.

## Backend Requirements
*   POST `/stocktake/sessions/:id/approve` and `/reject`.

## Recommendations
*   Implement variance-based approval thresholds.

## Priority Level
High

---

# SCREEN: Stocktake Posting & Release (`/stocktake/[id]/post`)
## Purpose
Finalizes the audit, posting count numbers to the inventory ledger and unlocking the warehouse.

## UI Structure
*   Visual summary: "Ready to Post".
*   Alert banner warning that this action is irreversible and will override current stock records.
*   "Post to Ledger & Unlock" button.

## Components
*   `DocumentLockBanner`, warning cards.

## Data Flow
*   POST `/stocktake/sessions/:id/post` mutation.

## Workflows
1.  Operator reviews summary -> clicks "Post".
2.  API updates item lot quantities -> releases warehouse lock -> session status becomes POSTED.

## Validations
*   Verify that only ADMIN or authorized INV_MGR can execute.

## Operational Safety
*   **Irreversible Action**: Warning banner forces double confirmation.
*   Releases the warehouse lock so other transactions (issues, transfers) can resume.

## UX Efficiency
*   Clean, clear action layout.

## Production Gaps
*   None.

## Missing Features
*   Background processing progress indicator (for posting databases with large inventory sizes).

## Inventory Risks
*   If posting fails halfway, it could leave the warehouse in a partially updated state. Must be wrapped in a database transaction.

## Backend Requirements
*   POST `/stocktake/sessions/:id/post`. Must execute inside a single transactional block: update lots, write movements, delete locks, transition status.

## Recommendations
*   Ensure the backend transaction is fully isolated.

## Priority Level
Critical

---

# SCREEN: Goods Received Note List (`/goods-received`)
## Purpose
Lists Goods Received Notes (GRN) that record incoming supplier shipments, linking them to purchase orders.

## UI Structure
*   Table showing GRN number, linked PO number, Supplier, Target Warehouse, Status (DRAFT, RECEIVED, POSTED, CANCELLED), total received items, and date.
*   "New GRN" button, search, and filters.

## Components
*   `Table`, `StatusBadge`, `SmartCombobox`.

## Data Flow
*   Queries `/procurement/grns` (`useGRNs`).

## Workflows
*   User filters list -> Clicks row -> Navigates to detail page `/goods-received/[id]`.
*   Clicks "New GRN" -> Navigates to `/goods-received/new`.

## Validations
*   Filters validation.

## Operational Safety
*   Allows monitoring of unposted receipts to prevent unrecorded inventory.

## UX Efficiency
*   Standard list layout.

## Production Gaps
*   Search filter by PO number is not fully indexed in local search options.

## Missing Features
*   Exporting GRNs list.

## Inventory Risks
*   None.

## Backend Requirements
*   GET `/procurement/grns`.

## Recommendations
*   Support sorting by date and supplier code.

## Priority Level
High

---

# SCREEN: Goods Received Note Creation (`/goods-received/new`)
## Purpose
Creates a GRN from a selected Purchase Order, logging incoming stock, lot numbers, and expiry dates.

## UI Structure
*   **PO Selector**: Dropdown to select approved POs.
*   **Metadata**: Supplier Name (read-only from PO), target warehouse, receiving date, invoice number.
*   **Lines Grid**: Table of PO items. Shows PO Qty, Prev Received Qty, Counted/Received Qty Input, Lot Details form (Lot Number, Expiry Date), Unit Cost (foreign & base), and line notes.

## Components
*   `SmartCombobox` for PO search.
*   `DocumentLineItemTable` with lot entry sub-components.
*   `ScanInput` for barcode verification.

## Data Flow
*   Fetches PO details upon selection.
*   Submits GRN to `POST /procurement/grns` via `useCreateGRN`.

## Workflows
1.  Operator selects PO -> form pre-fills with PO lines.
2.  Operator verifies target warehouse -> enters supplier invoice reference.
3.  Operator scans or inputs received quantities -> inputs Lot Numbers and Expiry Dates for lot-tracked items.
4.  Clicks "Submit" -> saves draft GRN.

## Validations
*   PO selection is required.
*   Target warehouse and invoice number are mandatory.
*   Received quantity must be > 0 and cannot exceed the remaining PO quantity (unless over-receiving tolerance is active).
*   Lot numbers and expiry dates are mandatory for lot-tracked items.

## Operational Safety
*   **Supplier Mismatch Protection**: If PO is chosen, the supplier field is locked to prevent mixing shipments.
*   **Currency and Exchange Rate Locking**: Inherited from PO to ensure landed cost calculations remain accurate.

## UX Efficiency
*   Pre-filling saves manual entry.
*   *Degradation*: Creating lots manually for multiple lines is tedious.

## Production Gaps
*   Missing Success Redirect: operator stays on form after saving.
*   No warning for near-expiry items during intake.

## Missing Features
*   Over-receipt tolerance controls (e.g., allow receiving up to 5% over PO quantity for bulk food items like beef).
*   Automatic lot number generator based on date.

## Inventory Risks
*   Receiving items without lots or with incorrect expiry dates, leading to expired stock going unnoticed.

## Backend Requirements
*   POST `/procurement/grns`.
*   Validate received quantities against the source PO.
*   Validate lot expiry dates are in the future.

## Recommendations
*   Add auto-increment lot generation helper.
*   Ensure redirect to detail view on success.

## Priority Level
Critical

---

# SCREEN: Goods Received Note Detail/Viewer (`/goods-received/[id]`)
## Purpose
Read-only viewer for GRNs showing received items and active lots.

## UI Structure
*   Summary metadata, lines table displaying received quantities, lot numbers, unit costs, and final totals.
*   Footer action: "Post to Ledger".

## Components
*   `DocumentLockBanner`, `StatusBadge`, `DocumentLineItemTable`.

## Data Flow
*   Queries `/procurement/grns/:id` (`useGRN`).

## Workflows
*   Manager views received lines -> clicks "Post to Ledger" -> executes `/post` mutation -> stock is added to available inventory, status becomes POSTED.

## Validations
*   Ledger Guard: fields disabled.

## Operational Safety
*   Blocks adjustments to lot numbers or quantities after posting.

## UX Efficiency
*   Clear presentation of lot allocations.

## Production Gaps
*   None.

## Missing Features
*   Barcode label printing trigger (to print stickers for the received lots).

## Inventory Risks
*   None.

## Backend Requirements
*   POST `/procurement/grns/:id/post`.

## Recommendations
*   Add "Print Barcode Labels" button that hooks into barcode printing service.

## Priority Level
High

---

# SCREEN: Goods Received Note Posting (`/goods-received/[id]/post`)
## Purpose
Confirms the GRN posting and records items into physical stock.

## UI Structure
*   Summary of target warehouse, total lines, lot numbers, and landed cost valuation.
*   Confirmation warning message.

## Components
*   `LockBanner`, warning panel.

## Data Flow
*   POST `/procurement/grns/:id/post`.

## Workflows
*   Operator clicks "Confirm Post" -> stock added -> status becomes POSTED.

## Validations
*   User permissions verify.

## Operational Safety
*   Updates the lot records (`qty_available` is incremented) and logs IN movements.

## UX Efficiency
*   Simple, double-confirmed action.

## Production Gaps
*   None.

## Missing Features
*   Automatic calculation of landed cost variance (if freight/duty costs differ from PO).

## Inventory Risks
*   Concurrency conflict: another transaction modifying the same lots during posting.

## Backend Requirements
*   POST `/procurement/grns/:id/post` wrapping the stock increase and movement logging in a database transaction.

## Recommendations
*   Enforce serializable transaction isolation on the database for posting.

## Priority Level
Critical

---

# SCREEN: Goods Received Note Wedge Scan Mode (`/goods-received/[id]/scan-mode`)
## Purpose
Optimized full-screen interface for receiving large shipments using barcode scanners.

## UI Structure
*   Large scan bar at the top, count display showing: Scanned / Total PO Items.
*   Minimalist grid showing last scanned item, quantity increment, and warnings.

## Components
*   `ScanInput` (wedge mode), virtualized summary table.

## Data Flow
*   Increments count in local state, calls autosave on line items.

## Workflows
*   Operator scans barcode -> matches item in PO -> increments quantity by 1 -> sounds success -> focus remains on scan input.

## Validations
*   Barcode must match PO items.

## Operational Safety
*   Locks input focus strictly to prevent keyboard leak.

## UX Efficiency
*   High speed, zero mouse clicks needed.

## Production Gaps
*   Hydration mismatches if scanner injects characters before page is fully loaded.

## Missing Features
*   Voice confirmation (reads out item name on success).

## Inventory Risks
*   Accidentally scanning the same item twice, over-counting.

## Backend Requirements
*   Autosave support for scan entries.

## Recommendations
*   Provide a visual/audible discrepancy warning if scanned quantity exceeds PO quantity.

## Priority Level
Medium

---

# SCREEN: Purchase Order List (`/purchase-orders`)
## Purpose
Lists all purchase orders (POs) sent to suppliers.

## UI Structure
*   PO grid: PO number, supplier, expected date, total amount (foreign & base), status (DRAFT, SUBMITTED, APPROVED, FULFILLED, PARTIAL, CANCELLED).
*   "New PO" button, filters by supplier and target warehouse.

## Components
*   `Table`, `StatusBadge`, `SmartCombobox`.

## Data Flow
*   Queries `/procurement/purchase-orders` (`usePOs`).

## Workflows
*   User navigates list -> Clicks row -> opens `/purchase-orders/[id]`.

## Validations
*   None.

## Operational Safety
*   Status filtering prevents operators from missing overdue orders.

## UX Efficiency
*   Standard list layout.

## Production Gaps
*   No quick filter for "Overdue Orders" (expected date in the past and status is not fulfilled).

## Missing Features
*   Export list as PDF/CSV.

## Inventory Risks
*   None.

## Backend Requirements
*   GET `/procurement/purchase-orders`.

## Recommendations
*   Add a visual indicator (red date text) for overdue orders.

## Priority Level
High

---

# SCREEN: Purchase Order Setup/Create (`/purchase-orders/new`)
## Purpose
Initializes POs, specifying supplier, target warehouse, items, quantities, pricing, and supplier currency details.

## UI Structure
*   **Metadata section**: Supplier selection, target warehouse selector, expected date, Linked PR (optional).
*   **Currency section**: Supplier currency dropdown, exchange rate input, base currency display.
*   **Line Items Grid**: ScanInput box, table of items (item search, quantity, unit price, UOM, notes).
*   **Totals**: Calculated Supplier total amount (foreign currency) and Base total amount (base currency e.g., SAR).

## Components
*   `SmartCombobox` for supplier, warehouse, currency.
*   `ScanInput` for barcode search.
*   `PurchaseOrderLineItems` field array grid.
*   `FormFooter`.

## Data Flow
*   Queries `/master-data/items` for barcode scanning.
*   Queries `/currencies/fx-rates` to fetch current conversion rates on currency select.
*   POST payload to `/procurement/purchase-orders`.

## Workflows
1.  Operator selects Supplier -> Supplier currency pre-fills.
2.  Operator selects target warehouse -> inputs expected date.
3.  Operator inputs currency -> exchange rate is fetched from FX rates API and pre-filled (editable).
4.  User scans items or adds them manually -> inputs price and quantity.
5.  Calculates totals dynamically -> clicks "Submit" -> PO created in DRAFT state.

## Validations
*   Supplier, Warehouse, Currency are mandatory.
*   Expected date must be in the future.
*   Exchange rate must be > 0.0001.
*   Quantity must be positive, Price must be non-negative.
*   At least 1 line item.

## Operational Safety
*   **Exchange Rate Locking**: Freezing exchange rate at creation ensures financial consistency.
*   Unsaved changes guard protects form state.

## UX Efficiency
*   Dynamically calculates and shows foreign and base currency totals.

## Production Gaps
*   Exchange rate update doesn't trigger recalculation of line totals if base unit prices are entered (should recalculate base total).
*   Missing Success Redirect: Operator remains on form.

## Missing Features
*   Import items from approved Purchase Request (PR) directly.

## Inventory Risks
*   Purchasing wrong items or quantities if no validation against historical consumption is provided.

## Backend Requirements
*   POST `/procurement/purchase-orders`.
*   Validate supplier and warehouse existence.

## Recommendations
*   Ensure redirect to detail page on success.
*   Provide a list of approved PR lines to easily pull items from.

## Priority Level
High

---

# SCREEN: Purchase Order Detail/Viewer (`/purchase-orders/[id]`)
## Purpose
Detailed viewer of PO documents, allowing status transitions.

## UI Structure
*   Metadata cards, lines table, calculations.
*   Footer actions: "Go to Approval" (redirects to `/approve` subpage).

## Components
*   `DocumentLockBanner`, `StatusBadge`, `ActionGuard`.

## Data Flow
*   Queries `/procurement/purchase-orders/:id` (`usePO`).

## Workflows
*   Manager views PO details -> if status is `DRAFT`, edits form -> if status is `SUBMITTED`, navigates to approval subpage.

## Validations
*   Check transition rules via `canPerformActionV2`.

## Operational Safety
*   Locks editing if document status is locked (submitted, approved, fulfilled, cancelled).

## UX Efficiency
*   Clean, structured layout.

## Production Gaps
*   None.

## Missing Features
*   Direct email button (to send the approved PO PDF to the supplier).

## Inventory Risks
*   None.

## Backend Requirements
*   GET `/procurement/purchase-orders/:id`.

## Recommendations
*   Add email PO button (sends email to supplier contact).

## Priority Level
High

---

# SCREEN: Purchase Order Approval Detail (`/purchase-orders/[id]/approve`)
## Purpose
Allows designated approvers (e.g., Procurement Manager, CFO) to review the purchase order details and sign off.

## UI Structure
*   Detail breakdown of costs, comments box, Approve/Reject buttons.

## Components
*   Form controls, approval banners.

## Data Flow
*   POST `/purchase-orders/:id/approve` or `reject` mutation.

## Workflows
*   User reviews PO -> enters comments -> clicks Approve -> status becomes APPROVED -> PO is ready for fulfillment.

## Validations
*   Comment required on rejection.

## Operational Safety
*   Specific role check: requires `APPROVER` or `ADMIN`.

## UX Efficiency
*   Simple, action-oriented.

## Production Gaps
*   No details on vendor credit limits or current budget status shown.

## Missing Features
*   Budget threshold warnings.

## Inventory Risks
*   None.

## Backend Requirements
*   POST `/procurement/purchase-orders/:id/approve`.

## Recommendations
*   Show department budget usage metrics on screen.

## Priority Level
High

---

# SCREEN: Purchase Request List (`/purchase-requests`)
## Purpose
Lists internal department purchase requests (PR) for stock ordering.

## UI Structure
*   Table of PR number, requesting department, target warehouse, status (DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED), items count, and expected date.
*   "New Request" button, filters by department and status.

## Components
*   `Table`, `StatusBadge`, filtering controls.

## Data Flow
*   Queries `/procurement/purchase-requests` (`usePRs`).

## Workflows
*   User opens PR -> navigates to `/purchase-requests/[id]`.
*   Clicks "New Request" -> navigates to `/purchase-requests/new`.

## Validations
*   None.

## Operational Safety
*   Monitors department demand.

## UX Efficiency
*   Standard list layout.

## Production Gaps
*   None.

## Missing Features
*   None.

## Inventory Risks
*   None.

## Backend Requirements
*   GET `/procurement/purchase-requests`.

## Recommendations
*   None.

## Priority Level
Medium

---

# SCREEN: Purchase Request Setup/Create (`/purchase-requests/new`)
## Purpose
Allows department heads or inventory managers to log purchase requests for warehouse items.

## UI Structure
*   **Metadata**: Requesting Department selector, target warehouse, expected date, priority level (LOW, NORMAL, HIGH), and notes.
*   **Lines Grid**: ScanInput box, table of items (item selection, request qty, UOM, line notes).

## Components
*   `SmartCombobox` for department, warehouse.
*   `ScanInput` for barcode search.
*   `DocumentLineItemTable`.

## Data Flow
*   POST payload to `/procurement/purchase-requests` (`useCreatePR`).

## Workflows
1.  Operator selects requesting department and warehouse.
2.  Inputs expected date.
3.  Scans items or selects them manually.
4.  Inputs requested quantities -> Clicks "Submit" -> PR is created.

## Validations
*   Requesting department and warehouse are mandatory.
*   Request qty must be > 0.
*   At least 1 line item.

## Operational Safety
*   Unsaved changes guard active.

## UX Efficiency
*   Simple, intuitive design.

## Production Gaps
*   Missing Success Redirect.
*   UOM defaults to primary UOM, cannot select alternative receiving UOMs easily.

## Missing Features
*   Import from inventory shortage lists (automatically pull items below minimum stock level).

## Inventory Risks
*   Over-requesting items, leading to excessive cash flow block.

## Backend Requirements
*   POST `/procurement/purchase-requests`.

## Recommendations
*   Ensure redirect to detail view on success.
*   Highlight item min/max levels during entry to prevent over-ordering.

## Priority Level
High

---

# SCREEN: Purchase Request Detail/Viewer (`/purchase-requests/[id]`)
## Purpose
Detailed view of PRs, displaying line counts and approval statuses.

## UI Structure
*   Metadata list, item lines table, action buttons (Edit, Submit, Go to Approval).

## Components
*   `DocumentLockBanner`, `StatusBadge`, `ActionGuard`.

## Data Flow
*   Queries `/procurement/purchase-requests/:id`.

## Workflows
*   Owner submits draft PR -> status transitions to SUBMITTED.
*   Authorized manager approves/rejects.

## Validations
*   Transition validation via `canPerformActionV2`.

## Operational Safety
*   Locks modifications if status is not DRAFT or REJECTED.

## UX Efficiency
*   Clean layouts.

## Production Gaps
*   None.

## Missing Features
*   Print PR view.

## Inventory Risks
*   None.

## Backend Requirements
*   GET `/procurement/purchase-requests/:id`.

## Recommendations
*   Add print/PDF support.

## Priority Level
Medium

---

# SCREEN: Purchase Request Edit (`/purchase-requests/[id]/edit`)
## Purpose
Allows editing of draft or rejected purchase requests.

## UI Structure
*   Same as PR creation page but populated with existing request details.

## Components
*   `Form` fields, dynamic line item arrays.

## Data Flow
*   Queries PR details.
*   Submits PUT `/procurement/purchase-requests/:id` (`useUpdatePR`).

## Workflows
1.  Operator edits quantities, adds or deletes lines.
2.  Clicks Save -> updates document.

## Validations
*   Same as creation validation.

## Operational Safety
*   **Version check**: must submit `version` field from initialData to prevent concurrency conflict (409).

## UX Efficiency
*   Maintains dirty state checking.

## Production Gaps
*   None.

## Missing Features
*   None.

## Inventory Risks
*   None.

## Backend Requirements
*   PUT `/procurement/purchase-requests/:id` verifying version field matches current DB version.

## Recommendations
*   Ensure version conflict (409) dialog behaves correctly.

## Priority Level
High

---

# SCREEN: Purchase Request Approval Detail (`/purchase-requests/[id]/approve`)
## Purpose
Allows managers to approve or reject internal purchase requests.

## UI Structure
*   Review panel showing requested items, comment text area, Approve and Reject buttons.

## Components
*   Form text fields, alert notifications.

## Data Flow
*   POST `/procurement/purchase-requests/:id/approve` or `reject`.

## Workflows
*   User enters comment -> clicks Approve -> status changes to APPROVED.

## Validations
*   Comments mandatory on rejection.

## Operational Safety
*   Access restricted to `INV_MGR` or `ADMIN`.

## UX Efficiency
*   Simple workflow page.

## Production Gaps
*   None.

## Missing Features
*   Direct link to PO generation (allow generating a PO from the approved PR instantly).

## Inventory Risks
*   None.

## Backend Requirements
*   POST `/procurement/purchase-requests/:id/approve`.

## Recommendations
*   Provide a single-button flow to generate PO from approved PR.

## Priority Level
Medium

---

# SCREEN: Kitchen Requests Demand Queue (`/kitchen-requests`)
## Purpose
Lists requests sent by restaurant kitchens for food items and supplies from the main central warehouse.

## UI Structure
*   Grid showing Kitchen Request number, requesting department, target warehouse, status (DRAFT, SUBMITTED, FULFILLED, CANCELLED), and created date.
*   Filters by kitchen/department and status.

## Components
*   `Table`, `StatusBadge`.

## Data Flow
*   Queries `/operations/kitchen-requests` (`useKitchenRequests`).

## Workflows
*   User filters list -> clicks row -> opens detail page `/kitchen-requests/[id]`.
*   Clicks "New Request" -> opens `/kitchen-requests/new`.

## Validations
*   None.

## Operational Safety
*   Monitors active demand from operations, preventing shortages.

## UX Efficiency
*   Standard dashboard queue.

## Production Gaps
*   No audio or visual alerts when a new kitchen request is received in the warehouse dashboard.

## Missing Features
*   Sound notifications for new incoming requests.

## Inventory Risks
*   Failing to fulfill kitchen requests in time leads to restaurant operational halts.

## Backend Requirements
*   GET `/operations/kitchen-requests`.

## Recommendations
*   Implement real-time list updates or a chime sound when a new request is submitted.

## Priority Level
High

---

# SCREEN: Kitchen Request Setup/Create (`/kitchen-requests/new`)
## Purpose
Allows kitchen chefs or branch managers to request ingredients (veggies, meat, spices) from the central storage.

## UI Structure
*   Form: Requesting kitchen (dept), target central warehouse, expected delivery date, priority.
*   Items list: search box, quantity requested, notes.

## Components
*   `SmartCombobox` for departments, warehouse.
*   `DocumentLineItemTable` for requested items.

## Data Flow
*   POST payload to `/operations/kitchen-requests` (`useCreateKitchenRequest`).

## Workflows
1.  Chef selects kitchen department -> Central warehouse selection.
2.  Scans or adds ingredients -> specifies quantities.
3.  Clicks Submit -> request is logged.

## Validations
*   Department, warehouse, items, quantities are required.
*   Requested quantities must be positive.

## Operational Safety
*   Prevents chefs from selecting warehouses they are not assigned to (needs frontend/backend restriction validation).

## UX Efficiency
*   Simple, touch-friendly UI since chefs might use tablets in the kitchen.

## Production Gaps
*   No auto-suggest for items based on historical daily consumption.
*   Missing Success Redirect.

## Missing Features
*   "Recipe template load" (allows chefs to request ingredients for a specific recipe like "100 portions of Biryani" at once).

## Inventory Risks
*   Chefs requesting excess quantities, leading to waste (spoilage of perishables).

## Backend Requirements
*   POST `/operations/kitchen-requests`.

## Recommendations
*   Fix success redirect.
*   Add templates support (request by recipe).

## Priority Level
High

---

# SCREEN: Kitchen Request Detail & Fulfillment Gate (`/kitchen-requests/[id]`)
## Purpose
The中央 central warehouse fulfillment screen where storekeepers select lots, allocate items, and fulfill kitchen requests.

## UI Structure
*   **Header**: Document details, status badge, expected delivery date.
*   **Lines table**: Requested Item, Requested Qty, Flipped Fulfilled Qty Input, Lot selection list, and notes.
*   **Footer**: "Fulfill Request" and "Cancel Request" buttons.

## Components
*   `DocumentLockBanner`, `StatusBadge`, `DocumentLineItemTable`.

## Data Flow
*   Queries `/operations/kitchen-requests/:id`.
*   Submits POST `/operations/kitchen-requests/:id/fulfill` to execute.

## Workflows
1.  Storekeeper opens request -> views items needed by the kitchen.
2.  Storekeeper goes to shelves -> picks items.
3.  Inputs actual fulfilled quantities -> selects Lot details (compulsory to track ingredient batches).
4.  Clicks "Fulfill" -> stock decreases, status changes to FULFILLED.

## Validations
*   Fulfilled quantity cannot exceed requested quantity.
*   Lot number is required.
*   Central warehouse must have sufficient stock in the selected lots.

## Operational Safety
*   **Lot tracking enforcement**: central to tracing food poisoning or quality issues back to specific suppliers.

## UX Efficiency
*   Fulfillment quantities can be auto-filled with requested quantities to save typing.

## Production Gaps
*   No warning if lot selected is near expiry (should display alert to prioritize first-in-first-out/FIFO).

## Missing Features
*   FIFO automatic lot allocation button (auto-picks the lot that expires first).

## Inventory Risks
*   Not tracking lot numbers properly during kitchen issuance bypasses quality control boundaries.

## Backend Requirements
*   POST `/operations/kitchen-requests/:id/fulfill`.
*   Decrease allocated lots stock.
*   Record movements.

## Recommendations
*   Implement automatic FIFO lot selection picker on the frontend.

## Priority Level
Critical

---

# SCREEN: Inter-Warehouse Transfers List (`/transfers`)
## Purpose
Monitors logistical movements of inventory moving from one warehouse to another (e.g., Central Warehouse -> Branch A WH).

## UI Structure
*   Table showing Transfer number, Source Warehouse, Destination Warehouse, Status (DRAFT, IN_TRANSIT, RECEIVED, CANCELLED), total items, dispatch date, receipt date.
*   Filters by source/destination and status.

## Components
*   `Table`, `StatusBadge`, filters.

## Data Flow
*   Queries `/operations/transfers` (`useTransfers`).

## Workflows
*   Operator views active shipments -> clicks transfer -> opens detail view `/transfers/[id]`.
*   Clicks "New Transfer" -> opens `/transfers/new`.

## Validations
*   None.

## Operational Safety
*   Ensures visibility of stock in-transit so it's not forgotten.

## UX Efficiency
*   Standard list layout.

## Production Gaps
*   None.

## Missing Features
*   Print shipping manifesto.

## Inventory Risks
*   Stock lost in transit if received states are not checked regularly.

## Backend Requirements
*   GET `/operations/transfers`.

## Recommendations
*   Add a warning highlighting transfers that have been "In Transit" for longer than 3 days.

## Priority Level
High

---

# SCREEN: Inter-Warehouse Transfer Setup/Create (`/transfers/new`)
## Purpose
Initializes transfers between two inventory storage sites.

## UI Structure
*   **Form**: Source Warehouse selector, Destination Warehouse selector, Transfer date, priority, notes.
*   **Lines table**: ScanInput, table showing item, quantity, UOM, lot number selector.

## Components
*   `SmartCombobox`, `ScanInput`, `DocumentLineItemTable`.

## Data Flow
*   POST payload to `/operations/transfers` (`useCreateTransfer`).

## Workflows
1.  User selects Source and Destination warehouses.
2.  Checks: Source and Destination cannot be the same.
3.  User scans items -> selects the source warehouse Lot number they are transferring from.
4.  Inputs quantities -> clicks Submit -> draft transfer created.

## Validations
*   Source and Destination must be different.
*   Items, quantities, lot allocations are mandatory.
*   Transfer quantities cannot exceed available stock in selected lots.

## Operational Safety
*   Checks warehouse lock states.
*   Unsaved changes guard active.

## UX Efficiency
*   *Degradation*: Operator must select lots for every single transfer line. High friction for bulk transfers.

## Production Gaps
*   No auto-validation of destination warehouse capacity.
*   Missing Success Redirect.

## Missing Features
*   Auto-allocate lot based on FIFO.
*   Bulk Excel import.

## Inventory Risks
*   Bypassing lot checks, causing stock location mismatch.

## Backend Requirements
*   POST `/operations/transfers`.
*   Validate source lot quantity.

## Recommendations
*   Ensure success redirect.
*   Add automatic FIFO lot picking option.

## Priority Level
High

---

# SCREEN: Inter-Warehouse Transfer Detail/Viewer (`/transfers/[id]`)
## Purpose
Read-only or status-transition view of transfers.

## UI Structure
*   Metadata cards, lines table, calculations.
*   Footer actions: "Ship Dispatch" (transitions to IN_TRANSIT), "Receive Stock" (transitions to RECEIVED).

## Components
*   `DocumentLockBanner`, `StatusBadge`, `ActionGuard`.

## Data Flow
*   Queries `/operations/transfers/:id` (`useTransfer`).

## Workflows
*   Manager views transfer -> if status is `DRAFT` and user clicks "Ship", transitions status -> if status is `IN_TRANSIT` and user clicks "Receive", opens receiving subpage.

## Validations
*   Role checks via `canPerformActionV2`.

## Operational Safety
*   Once transfer is shipped, its source quantities are locked.

## UX Efficiency
*   Clean layout.

## Production Gaps
*   None.

## Missing Features
*   Direct barcode print for transfer boxes.

## Inventory Risks
*   None.

## Backend Requirements
*   GET `/operations/transfers/:id`.

## Recommendations
*   None.

## Priority Level
High

---

# SCREEN: Inter-Warehouse Transfer Dispatch/Ship (`/transfers/[id]/ship`)
## Purpose
Confirms dispatch of items from the source warehouse.

## UI Structure
*   Alert confirming shipment details, items overview, "Confirm Shipment" action button.

## Components
*   Action banners.

## Data Flow
*   POST `/operations/transfers/:id/ship` -> transitions status to IN_TRANSIT, decrements source warehouse lot stock.

## Workflows
*   Storekeeper verifies boxes -> clicks Ship -> items transit.

## Validations
*   Source stock validation.

## Operational Safety
*   Decreases source stock immediately to reflect that the stock is physically gone.

## UX Efficiency
*   Simple confirm interface.

## Production Gaps
*   None.

## Missing Features
*   None.

## Inventory Risks
*   None.

## Backend Requirements
*   POST `/operations/transfers/:id/ship` matching validation rules.

## Recommendations
*   None.

## Priority Level
High

---

# SCREEN: Inter-Warehouse Transfer Receive (`/transfers/[id]/receive`)
## Purpose
The receiving gate where destination storekeepers count incoming stock and check for discrepancies.

## UI Structure
*   **Metadata**: Source, Destination, Shipped Date.
*   **Lines table**: Item, Lot Number, Expiry, Shipped Qty (read-only), Received Qty Input, and notes.
*   **Calculations**: Auto-calculates discrepancies inline.

## Components
*   `DocumentLineItemTable` with editable received field.

## Data Flow
*   Submits POST `/operations/transfers/:id/receive` with received quantities (`useReceiveTransfer`).

## Workflows
1.  Storekeeper counts boxes -> inputs actually received quantities in table.
2.  If Received Qty < Shipped Qty -> system highlights line in yellow -> prompts operator to enter a discrepancy note.
3.  Operator clicks "Confirm Receipt" -> items are added to destination warehouse lots -> status changes to RECEIVED.
4.  If discrepancies exist -> options to dispute open.

## Validations
*   Received quantity must be non-negative.
*   Discrepancy requires notes.

## Operational Safety
*   **Discrepancy Ledger**: Captures inventory losses during transit.
*   Updates destination lot balances.

## UX Efficiency
*   "Receive All" button pre-fills received quantities to match shipped quantities, saving time.

## Production Gaps
*   Missing Success Redirect.

## Missing Features
*   Direct dispute ticket opening on receipt mismatch.

## Inventory Risks
*   Receiving short shipments without documenting discrepancies, leading to unaccounted inventory shrinkage.

## Backend Requirements
*   POST `/operations/transfers/:id/receive`.
*   Adds stock to destination lots.
*   Writes movements (IN for destination).

## Recommendations
*   Ensure success redirect.
*   Add auto-fill "Receive All" helper.

## Priority Level
Critical

---

# SCREEN: Inter-Warehouse Transfer Dispute (`/transfers/[id]/dispute`)
## Purpose
Resolves discrepancies when received quantities do not match shipped quantities.

## UI Structure
*   Discrepant items list, shipment notes, dispute justification selector, comments box, Submit Dispute button.

## Components
*   Form panels, tables.

## Data Flow
*   POST `/operations/transfers/:id/dispute` mutation.

## Workflows
*   Manager reviews mismatches -> selects reason -> clicks Submit -> logs dispute.

## Validations
*   Comment is required.

## Operational Safety
*   Logs financial and stock disputes for management audit.

## UX Efficiency
*   Straightforward form.

## Production Gaps
*   None.

## Missing Features
*   Upload proof photos of damaged shipment.

## Inventory Risks
*   Unresolved disputes leave inventory balances in limbo.

## Backend Requirements
*   POST `/operations/transfers/:id/dispute`.

## Recommendations
*   Allow photo uploads.

## Priority Level
Medium

---

# SCREEN: Transit Hub Dashboard (`/transfers/hub`)
## Purpose
Aggregated logistical dashboard showing all active transfer shipments in transit across the supply chain.

## UI Structure
*   KPI cards: Active Shipments, Delayed Shipments, Discrepant Received, Total Valuation in Transit.
*   List of active transfers with shipment progress indicator bars.

## Components
*   Charts, metrics grids.

## Data Flow
*   Queries `/operations/transfers?in_transit=true`.

## Workflows
*   Manager views maps/progress -> clicks a row to open the transfer.

## Validations
*   None.

## Operational Safety
*   Ensures logistics transparency.

## UX Efficiency
*   Highly visual dashboard.

## Production Gaps
*   Map integration or carrier tracking details are missing (stubbed).

## Missing Features
*   Delivery estimation calculator.

## Inventory Risks
*   None.

## Backend Requirements
*   Logistics stats endpoints.

## Recommendations
*   None.

## Priority Level
Medium

---

# SECTION B: MASTER DATA & ADMIN CONFIGURE MODULES

---

# SCREEN: Items Catalogue (`/master-data/items` & `/new` & `/edit`)
## Purpose
Manages the master catalog of items, ingredients, food supplies, and packaging materials.

## UI Structure
*   **List view**: Table of item code, name, barcode, category, primary UOM, current global stock, min stock level, and lot-tracked status.
*   **Form view (Create/Edit)**: Details: Code, barcode, English/Arabic names, Category selector, UOM selector, lot-tracking toggle, min stock level, last purchase price.

## Components
*   `Form`, `SmartCombobox`, `Table`.

## Data Flow
*   Queries `/master-data/items` (`useMasterDataList`).
*   Submits POST/PUT to `/master-data/items` (`useMasterDataCRUD`).

## Workflows
1.  User enters item details.
2.  Toggles lot tracking if items require batch monitoring (e.g., dairy, poultry).
3.  Inputs min stock level to trigger automated shortages warnings.
4.  Saves item -> updates catalog.

## Validations
*   Code, Barcode, Names, Category, and UOM are mandatory.
*   Barcode must be unique.
*   Min stock level must be positive.

## Operational Safety
*   **Lot-tracked toggle lock**: once an item is created and transactions exist, changing the lot-tracked toggle should be blocked (needs strict backend enforcement) to prevent ledger corruption.

## UX Efficiency
*   *Conflict Handler*: simulated conflict (409) check triggers if editing concurrently.

## Production Gaps
*   Frontend does not disable the lot-tracked toggle for items that have historic transaction lines, risking schema errors.

## Missing Features
*   Multi-UOM conversion definition per item (e.g., 1 Box = 12 Bottles).

## Inventory Risks
*   Disabling lot-tracking on a lot-tracked item can break ledger reports.

## Backend Requirements
*   CRUD endpoints for items.
*   Strict database check preventing alteration of `is_lot_tracked` if item exists in transaction tables.

## Recommendations
*   Disable the lot-tracked toggle in edit mode if item has existing inventory.

## Priority Level
Critical

---

# SCREEN: Units of Measure & Conversion (`/master-data/units-of-measure` & `/new` & `/edit`)
## Purpose
Defines units of measure (e.g., KG, LTR, BOX, PCS) and conversion rules between them.

## UI Structure
*   List table of UOMs.
*   Form: UOM Code, UOM Name, Base Unit check, Conversion Factor (e.g., if UOM is BOX and base is PCS, conversion is 12).

## Components
*   Form fields, tables.

## Data Flow
*   GET/POST/PUT `/units-of-measure` via useMasterDataCRUD.

## Workflows
*   User creates UOM -> defines conversion factor relative to base unit.

## Validations
*   Code and Name are mandatory.
*   Conversion factor must be positive.

## Operational Safety
*   A simulated conflict (409) is implemented for `uom-kg` to verify concurrency dialog rendering.

## UX Efficiency
*   Standard CRUD layout.

## Production Gaps
*   No visual UOM conversion builder grid (which makes setting up complex recipes hard).

## Missing Features
*   UOM group categories (e.g., Mass, Volume, Count) to prevent converting KGs to Liters.

## Inventory Risks
*   Mismatched conversions cause calculation errors.

## Backend Requirements
*   UOM CRUD endpoints. Enforce UOM category matching on conversions.

## Recommendations
*   Implement UOM Group boundaries (Mass vs Volume vs Units).

## Priority Level
High

---

# SCREEN: Multi-Barcode Mapping (`/master-data/barcodes` & `/mapping` & `/new` & `/edit`)
## Purpose
Maps multiple supplier barcodes or retail codes to a single internal item record (SKU), allowing operators to scan various incoming packaging barcodes to receive the correct item.

## UI Structure
*   Table showing mapping: Scanned Barcode, Linked SKU, Supplier, UOM, and active toggle.
*   Form to map a barcode string to an item SKU.

## Components
*   `SmartCombobox` for SKU selection, forms.

## Data Flow
*   POST/PUT to `/master-data/barcodes`.

## Workflows
*   Operator inputs supplier barcode -> selects SKU -> selects UOM -> saves mapping.

## Validations
*   Barcode must be unique.
*   SKU link is mandatory.

## Operational Safety
*   Validates that barcode doesn't already exist on another item.

## UX Efficiency
*   Reduces checkout/receiving bottlenecks.

## Production Gaps
*   Missing validation showing if barcode is already linked elsewhere.

## Missing Features
*   Batch import of barcode list.

## Inventory Risks
*   Wrong mapping results in scanning poultry and adding beef to stock.

## Backend Requirements
*   Validation of barcode uniqueness across items and mappings.

## Recommendations
*   Add scanning validation inline during barcode mapping.

## Priority Level
High

---

# SCREEN: Suppliers Catalogue (`/master-data/suppliers` & `/profile` & `/new` & `/edit`)
## Purpose
Manages supplier records, contact details, payment terms, and currency defaults.

## UI Structure
*   List view of suppliers, row menu to edit or view profile.
*   Form: Code, English/Arabic Name, Contact Person, Phone, Email, Tax ID, Default Currency, Payment Terms.

## Components
*   Form components, table list.

## Data Flow
*   Supplier CRUD endpoints.

## Workflows
*   Create supplier -> default values inherited by PO and GRN screens.

## Validations
*   Name and Code are mandatory.
*   Tax ID format checks.

## Operational Safety
*   Ensures financial tracking details are correct.

## UX Efficiency
*   Currencies selector pre-fills from master currency list.

## Production Gaps
*   None.

## Missing Features
*   Supplier Performance Tracking tab (scoring on-time delivery percentages).

## Inventory Risks
*   None.

## Backend Requirements
*   Suppliers endpoints.

## Recommendations
*   None.

## Priority Level
Medium

---

# SCREEN: Warehouses Config (`/master-data/warehouses` & `/new` & `/edit`)
## Purpose
Defines inventory storage warehouses, central cold storages, kitchen pantries, and transit locations.

## UI Structure
*   Table listing warehouses, code, address, branch, and status (Active/Inactive).
*   Form: Warehouse code, names (AR/EN), branch, and address details.

## Components
*   `Form`, table, branch selector.

## Data Flow
*   Warehouse endpoints.

## Workflows
*   Define warehouse -> binds permissions -> user can select in transaction forms.

## Validations
*   Code and Name are mandatory.

## Operational Safety
*   Deleting a warehouse should be blocked if it holds any lot stock balances.

## UX Efficiency
*   Standard configurations layout.

## Production Gaps
*   Allowing warehouse deletion in UI without checking if stock is zero.

## Missing Features
*   Storage Zone mapping (Aisle, Row, Shelf).

## Inventory Risks
*   Deleting active warehouses leads to orphaned lot transactions.

## Backend Requirements
*   Prevent warehouse DELETE API calls if lot quantities exist.

## Recommendations
*   Enforce non-zero stock checks on delete actions.

## Priority Level
High

---

# SCREEN: RBAC Access Control Matrix (`/admin/roles` & `/matrix` & `/edit`)
## Purpose
Configures roles and permissions. Displays a matrix grid where columns are roles and rows are resources.

## UI Structure
*   Matrix grid: columns = roles (e.g., ADMIN, INV_MGR, WH_KEEPER, APPROVER, PROC_OFFICER). Rows = resources (e.g., procurement_po, operations_stocktake, operations_adjustments).
*   Cells contain checkboxes representing actions: view, create, edit, approve, delete, post.

## Components
*   Matrix Table grid with checkbox cells.

## Data Flow
*   GET `/admin/roles/matrix` and PUT to update permission mappings.

## Workflows
*   Admin updates permission matrix -> saves -> permissions change dynamically.

## Validations
*   Checkboxes inputs.

## Operational Safety
*   **Security Gate**: Determines ActionGuard evaluation rules globally.

## UX Efficiency
*   Highly visual grid, but can be overwhelming on small screens.

## Production Gaps
*   Checkbox states change immediately on click but saving is done via a single "Save Matrix" button which lacks unsaved changes warning.

## Missing Features
*   Direct user list per role hover detail.

## Inventory Risks
*   Misconfiguring permissions can lock storekeepers out of posting or give operators unauthorized approval powers.

## Recommendations
*   Add unsaved changes warning.

## Priority Level
Critical

---

# SCREEN: User Accounts management (`/admin/users` & `/new` & `/edit`)
## Purpose
Manages internal user credentials, roles, and warehouse assignments.

## UI Structure
*   User table, search, filters.
*   Form: Username, email, password (new), assigned role, and Warehouse restriction selector.

## Components
*   Standard form controls.

## Data Flow
*   User management endpoints.

## Workflows
*   Admin creates user -> assigns role -> selects allowed warehouse.

## Validations
*   Email format check, role assignment required.

## Operational Safety
*   **Warehouse restriction binding**: ensures users can only see and execute transactions in their assigned warehouses.

## UX Efficiency
*   Clean layouts.

## Production Gaps
*   Warehouse restriction selector does not support multi-select.

## Missing Features
*   Password expiration control.

## Inventory Risks
*   User executing transactions in wrong warehouses if restrictions are bypassed.

## Recommendations
*   Ensure warehouse bounds are strictly validated on the backend.

## Priority Level
High

---

# SCREEN: Global Settings Panel (`/admin/settings` & `/restaurant-profile` & `/mail-settings`)
## Purpose
Manages global parameters like default base currency, tenant metadata, SMTP email options.

## UI Structure
*   Sections: General details, Currency settings, Mail settings.
*   Inputs: default currency (e.g., SAR), system name, replies email.

## Components
*   `Form` blocks, select dropdowns.

## Data Flow
*   GET/PUT `/admin/settings` (`useAdminSettings`).

## Workflows
*   Update base currency -> affects currency exchange rate mappings.

## Validations
*   Base currency selection is required.

## Operational Safety
*   Changing the base currency in a live system with transaction records is highly dangerous and should be blocked.

## UX Efficiency
*   Tabs structure to group details.

## Production Gaps
*   No warning on how base currency changes affect historical reports.

## Missing Features
*   Landed cost allocation rules options.

## Inventory Risks
*   Modifying base currency values can disrupt financial ledger valuations.

## Backend Requirements
*   Block base currency updates if transaction records exist in database.

## Recommendations
*   Add a lock on base currency field in settings.

## Priority Level
High

---

# SCREEN: Operations Dashboard (`/` & `/dashboard`)
## Purpose
The analytical landing page for warehouse managers and procurement officers, presenting alerts, metrics, and queues.

## UI Structure
*   **KPI Metrics Grid**: Cards showing Total Inventory Value, Pending Fulfillment Requests, Active Stocktakes, Expiring Lots, and Low Stock Warnings.
*   **Expiring Lots Alert Queue**: List of lots expiring within 30 days.
*   **Pending Actions Queue**: List of documents needing approval (POs, PRs, Adjustments).
*   **Fulfillment Queue**: Active Central Warehouse requests from kitchens.

## Components
*   KPI cards, quick alert queues.

## Data Flow
*   Queries `/dashboard/stats` via React-Query.

## Workflows
*   Manager opens dashboard -> views red warning cards -> clicks an alert -> navigates to target document/list.

## Validations
*   None.

## Operational Safety
*   Flags expiring items to enforce FIFO and minimize spoilage.

## UX Efficiency
*   *Wow factor*: Vibrant indicator cards with micro-animations on hover.
*   *Degradation*: Static layouts, no customization of metrics order.

## Production Gaps
*   No real-time SSE updates, counts only update on page reload.

## Missing Features
*   Exportable KPI summary widget.

## Inventory Risks
*   Delays in processing low stock alerts can lead to restaurant operational halts.

## Recommendations
*   Add automatic query refetch intervals to ensure dashboard stays up to date.

## Priority Level
High

---

# SYSTEM-WIDE ANALYSIS

---

## 1. SYSTEM UI OVERVIEW
The frontend architecture demonstrates a solid, modern operational framework tailored for logistics and inventory management. The layout prioritizes data density (tables, lists, metrics) while utilizing contemporary UX components (glassmorphism headers, subtle micro-animations). However, there are significant gaps in production readiness—specifically missing loading/error boundaries, real-time update mechanisms, and cross-module success redirects. The UX is generally mature for data entry, but operational maturity falls short where critical safety locks (e.g., preventing base currency changes or lot-tracking toggles) are unenforced or absent.

## 2. DOMAIN MAP
- **Operations Module**: Adjustments, Kitchen Requests, Inter-Warehouse Transfers, Stocktake Sessions, Dashboard.
- **Procurement Module**: Purchase Orders, Goods Received Notes (GRNs).
- **Master Data**: Items Catalogue, Units of Measure, Multi-Barcode Mapping, Suppliers, Warehouses.
- **Admin & Security**: RBAC Access Control Matrix, User Accounts, Global Settings.

## 3. WORKFLOW MAP
- **Procurement to Receiving**: Purchase Order (Approved) -> GRN (Received) -> Inventory (Increase).
- **Audit Cycle**: Stocktake Session (Freeze Snapshot) -> Count -> Variance Review -> Approve -> Post -> Update Ledger.
- **Fulfillment Cycle**: Kitchen Request (Submitted) -> Central WH (Allocate Lots & Fulfill) -> Issue (Decrease Inventory).
- **Logistics**: Transfer (Draft) -> Dispatch (In Transit) -> Receive (Validate Discrepancies) -> Finalize.

## 4. API DEPENDENCY MAP
- `/operations/*`: Adjustments, kitchen-requests, transfers, stocktake.
- `/procurement/*`: POs, GRNs.
- `/master-data/*`: Items, UOM, barcodes, suppliers, warehouses.
- `/admin/*`: Roles, users, settings.
- `/dashboard/stats`: KPI aggregations.

## 5. STATE MANAGEMENT ANALYSIS
- **Global State**: TanStack React-Query is heavily utilized for server state caching.
- **Risks**: Stale state risks are prevalent. For example, dashboard counts and stocktake count arrays lack background polling or SSE/WebSockets. This could result in operators working off outdated inventory numbers.
- **Duplicated State**: Several form inputs maintain local state while mirroring React-Query cache without clear hydration strategies.

## 6. PERMISSION ANALYSIS
- **Enforcement**: Good foundational RBAC matrix implemented.
- **Risks**: Frontend UI hides buttons based on permissions (`canPerformActionV2`), but it is critical that the backend gateways explicitly enforce these rules to prevent direct API manipulation.
- **Warehouse Binding**: Present but lacks multi-warehouse selection, which limits regional managers' capabilities.

## 7. VALIDATION CONSISTENCY ANALYSIS
- **Inconsistencies**: 
  - Some forms (Adjustments) correctly block submission when inventory levels drop below zero, while others (Kitchen Requests) rely on backend rejections.
  - Success redirects after document creation are missing in Transfers, Stocktake, and Adjustments.
  - Barcode uniqueness checks are inconsistent across the system.

## 8. UX CONSISTENCY REPORT
- **Strengths**: Shared components (`SmartCombobox`, `DocumentLineItemTable`, `StatusBadge`) ensure visual uniformity.
- **Weaknesses**: Scanner refocusing relies on `setTimeout` hacks which degrade performance under heavy DOM loads. Warning banners for irreversible actions vary in design language across modules.

## 9. OPERATIONAL RISK REPORT
### Critical
- Missing lock enforcement when modifying fundamental master data (e.g., base currency, lot-tracked toggles on active items).
- Wedge scanner focus loss causing counts to be typed into wrong fields or dropped entirely.
- Lack of offline detection and transaction recovery mechanisms during physical counting.

### High
- Stale dashboard and stocktake data due to lack of real-time subscriptions.
- Missing success redirects leading to potential duplicate submissions by confused operators.
- Unhandled concurrent mutations on filter inputs during API executions.

### Medium
- Barcode mapping UI lacks inline uniqueness validation.
- Missing export/print functionality for official vouchers.

### Low
- Hardcoded reason codes in variance grids.

## 10. PRODUCTION READINESS REPORT
The system is **NOT** fully production-ready. The application requires stabilization of scanner focus reliability, completion of navigation redirects on success, and robust offline or connection-loss safeguards.

## 11. FRONTEND TECHNICAL QUALITY REPORT
- **Maintainability**: Good abstraction with shared table and combobox components.
- **Scalability**: Virtualization on tables is a strong point.
- **Tech Debt**: Substantial reliance on simulated API mocks (e.g., exports, print actions) that need backend wiring.

## 12. PRIORITIZED IMPROVEMENT PLAN
1. **Critical**: Fix missing success redirects across all creation workflows to prevent duplicate postings. Implement strictly enforced API blocks for master data modifications. Resolve wedge scanner focus reliability.
2. **High**: Introduce SSE or polling to dashboard and active stocktake counts. Implement unsaved changes guards globally.
3. **Medium**: Replace all mock endpoints with real API calls. Add print and export functionalities.
4. **Low**: Refactor reason codes to be dynamic from the backend. Improve UI responsiveness on complex filter layouts.

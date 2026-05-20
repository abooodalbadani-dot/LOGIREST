# Engineering Execution Plan

Generated from `audit/enterprise-frontend-repository-audit.md` (836 lines, 17 sections)
Covers all operational, architectural, and production-readiness findings translated into granular, dependency-ordered work units.

---

## Phase 1 — Critical Production Blockers
*Go live cannot happen without these. Fix in order.*

### 1.1 Fix Stocktake START→COUNTING Transition
**Why:** START transitions to `STARTED`. Count page guard checks for `COUNTING` and redirects to detail. User never gets to count.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/start/StocktakeStartClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/count/StocktakeCountClient.tsx`
- `apps/web/src/features/operations/hooks/useStartStocktake.ts`
- `apps/web/src/features/operations/hooks/useUpdateCount.ts`
- `apps/web/src/features/operations/hooks/useStocktakeSession.ts`

**Tasks:**
- [x] Option A: After successful `startMutation`, call `useUpdateCount` (or a new `useBeginCounting` mutation) to advance status to `COUNTING`
- [x] Option B: Widen count page guard to accept both `STARTED` and `COUNTING`
- [x] Verify: create stocktake → start → redirect to count page — must show count form (not redirect to detail)

### 1.2 Wire Issue Create to Real Hook
**Why:** `issue-form.tsx` in route tree imports from `api/useIssues.ts` which is a mock file. Issue creation is entirely fake.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/issues/new/issue-form.tsx`
- `apps/web/src/features/operations/api/useIssues.ts` (mock — migration target: delete)
- `apps/web/src/features/operations/hooks/useCreateIssue.ts` (real hook — migration source)

**Tasks:**
- [x] Replace `import { useIssues } from '@/features/operations/api/useIssues'` with `import { useCreateIssue } from '@/features/operations/hooks/useCreateIssue'`
- [x] Match the schema: ensure `useCreateIssue` returns `{ mutateAsync, isPending }` to match the form's `handleSubmit` signature
- [x] Remove `api/useIssues.ts` if no other consumers exist
- [x] Check `issue-form.tsx` lock check — if it calls a mock lock API, replace that too
- [x] Verify: submit issue form → must result in API call to backend (not mock)

### 1.3 Wire Transfer Ship Scan Data to Backend
**Why:** `TransferShipClient` collects `scannedLines` in state but only sends `{ id, version }` on ship.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/[id]/ship/TransferShipClient.tsx`
- `apps/web/src/features/operations/hooks/useShipTransfer.ts`

**Tasks:**
- [x] Update mutation payload schema in `useShipTransfer.ts` to accept `lines: Array<{ line_id: string; scanned_qty: number }>`
- [x] Update `TransferShipClient.tsx` to pass `scannedLines` to `shipMutation.mutateAsync()`
- [x] Match each `scannedLine.lineId` to the API's expected `line_id` (check `DocumentLineItem` type)
- [x] Verify: ship transfer with 3 lines, scan 2 → backend must receive 2 scanned quantities

### 1.4 Implement Real GRN Scan Backend Endpoint or Remove Scan Mode
**Why:** `GRNScanClient.tsx` + `LotEntryModal.tsx` use entirely mock API layer. No real backend endpoint exists.

**Files:**
- Scan mode pages (find via glob: `**/GRNScanClient*`)
- `apps/web/src/features/operations/hooks/*GRN*`

**Tasks:**
- [ ] Create backend endpoint: `PUT /procurement/grns/:id/items/:lineId` accepting `{ lot_number, expiry_date, qty }` (backend work, out of scope for frontend)
- [x] OR: Remove scan mode from production routing and gate behind `isDev` flag
- [x] Update `useUpdateGRNLine` (or equivalent) in hooks to call real endpoint instead of mock adapter route
- [x] Verify: scan barcode in GRN scan mode → must update backend DB

### 1.5 Replace Mock Data in 8 Production Components
**Why:** These 8 components display fake data as their primary source in production routes.

**Files (in dependency order):**
1. `apps/web/src/app/[locale]/(app)/admin/users/[id]/UserFormClient.tsx` — MOCK_BRANCHES, MOCK_WAREHOUSES, MOCK_DEPARTMENTS
2. `apps/web/src/app/[locale]/(app)/inventory/lots/LotBalanceClient.tsx` — MOCK_MOVEMENTS
3. `apps/web/src/app/[locale]/(app)/inventory/expired-override/ExpiredOverrideClient.tsx` — MOCK_OVERRIDES
4. `apps/web/src/app/[locale]/(app)/(operations)/yield-management/YieldManagementClient.tsx` — MOCK_YIELD_DATA
5. `apps/web/src/app/[locale]/(app)/(procurement)/landed-cost/LandedCostClient.tsx` — MOCK_ITEMS
6. `apps/web/src/app/[locale]/(app)/inventory/transfers/hub/TransferHubClient.tsx` — MOCK_TRANSFERS (duplicate copy)
7. `apps/web/src/app/[locale]/(app)/(operations)/transfers/hub/TransferHubClient.tsx` — MOCK_TRANSFERS (duplicate copy)
8. `apps/web/src/components/shared/FEFOLotAllocator/FEFOLotAllocator.tsx` — MOCK_AVAILABLE_LOTS

**Tasks:**
- [x] **UserFormClient:** Replace MOCK_BRANCHES with `useBranches()` hook; MOCK_WAREHOUSES with `useWarehouses()`; MOCK_DEPARTMENTS with `useDepartments()`
- [x] **LotBalanceClient:** Connect `MOCK_MOVEMENTS` to real `useLotsByItem()` or `useLotList()` API hook (gated behind dev flag pending real hook)
- [x] **ExpiredOverrideClient:** Implement real backend feature or add feature gate flag + proper "Coming Soon" placeholder
- [x] **YieldManagementClient:** Connect to `useCreateYieldBatch` / `useYieldList` hooks already in codebase
- [x] **LandedCostClient:** Implement real API hook or remove production routing (gated behind dev flag)
- [x] **TransferHubClient (both copies):** Connect to `useTransferList()` hook for real data; decide which copy to keep, remove the duplicate
- [x] **FEFOLotAllocator:** Replace MOCK_AVAILABLE_LOTS with `useLotsByItem()` API call; wire `itemId` prop to fetch real lots

### 1.6 Fix Hardcoded Warehouses in Adjustment Workflow
**Why:** `AdjustmentForm.tsx` uses `['wh-1', 'wh-2']` as hardcoded arrays.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentViewer.tsx` (may also hardcode)

**Tasks:**
- [x] Replace `const warehouseItems = [ ... ]` ternary with `const { data: warehouses } = useWarehouses()`
- [x] Use `warehouses` to build the dropdown / display labels
- [x] Verify: adjustment form loads warehouses dynamically when a new warehouse is added to master data

### 1.7 Remove `'Current User'` from Optimistic Updates
**Why:** 4+ mutation hooks hardcode `'Current User'` in timeline entries, corrupting audit logs.

**Files:** (need to grep for `'Current User'` in `features/operations/hooks/*`)
Likely in: `useCreateAdjustment.ts`, `useShipTransfer.ts`, `useCreateIssue.ts`, `usePostStocktake.ts`

**Tasks:**
- [x] Grep all hook files for `'Current User'` string literal
- [x] Replace with `sessionStorage.getItem('user_name')` or `user?.name` from auth context
- [x] Verify: optimistic update timeline shows actual logged-in user name

---

## Phase 2 — High-Priority Architecture & Data Integrity
*Workflow gaps, data corruption risks, and permission bypasses. Fix after Phase 1.*

### 2.1 Unify Frontend Type System
**Why:** Three conflicting type systems (`types/documents.ts`, `features/*/types/`, inline Zod) use different field names for the same concepts (e.g., `department_id` vs `requested_by_dept`, `currency_code` vs `currency_id`, `unit_cost` vs `unit_price`).

**Files:**
- `apps/web/src/types/documents.ts`
- `apps/web/src/features/purchasing/types/`
- `apps/web/src/features/operations/hooks/useTransfer.ts` (inline Zod)

**Tasks:**
- [ ] Choose canonical source: prefer `types/master-data.ts`-style Zod schemas with `z.infer<>` for TypeScript types
- [ ] Create migration: `types/documents.ts` → adopt canonical field names named after API snake_case responses
- [ ] Update `features/purchasing/types/` to import from canonical types instead of duplicating
- [ ] Fix inline Zod schemas in hooks (especially `useTransfer.ts` line 31 `lot: z.null()` → `lot: z.object({...}).nullable()`)
- [ ] Remove `as unknown as` casts across all files that mix type systems
- [ ] Verify: all field names match between API response, Zod validation, and TypeScript ViewModel

### 2.2 Implement Cancel Action on All Document Types
**Why:** CANCEL action exists in the document engine but zero UI implements it. Users cannot abort documents.

**Files:**
- All detail pages: stocktake, adjustment, transfer, issue, PR, PO, GRN
- `apps/web/src/core/workflow/document-engine.ts` (engine already supports CANCEL)

**Tasks:**
- [ ] Add CANCEL action to each document detail page's action toolbar
- [ ] Wire to existing cancel mutation (or create if missing)
- [ ] Add confirmation dialog (match existing Post/Approve patterns)
- [ ] Add `CancelDialog` component if needed
- [ ] Verify: document in DRAFT/PENDING status → Cancel button → confirmation → status changes to CANCELLED

### 2.3 Fix `lot: z.null()` in Transfer Schema
**Why:** `useTransfer.ts` defines `lot` as `z.null()`. If the backend ever returns lot data (which it should), the entire fetch crashes with Zod validation error.

**Files:**
- `apps/web/src/features/operations/hooks/useTransfer.ts` (around line 31)

**Tasks:**
- [ ] Change `lot: z.null()` to `lot: z.object({ id: z.string(), lot_number: z.string(), ... }).nullable()`
- [ ] Update all downstream components that consume `transfer.lot` to handle null
- [ ] Verify: transfer detail page loads even when lot data is present in API response

### 2.4 Fix Issue Viewer Hardcoded `isPosted={true}`
**Why:** `IssueViewer.tsx` hardcodes `isPosted={true}` causing all issues to appear posted/read-only regardless of actual status.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/issues/[id]/IssueViewer.tsx`

**Tasks:**
- [ ] Find the hardcoded `isPosted={true}` prop or variable
- [ ] Replace with `status === 'POSTED'` comparison
- [ ] Verify: DRAFT issue appears with editable fields; POSTED issue appears with read-only overlay

### 2.5 Add `created_by` to PR Schema / `currency_code` to PO Schema
**Why:** PR list renders `created_by` column but it's missing from the Zod schema. PO list renders `currency_code` similarly undefined.

**Files:**
- `apps/web/src/app/[locale]/(app)/(procurement)/prs/PRListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(procurement)/pos/POListClient.tsx`
- `apps/web/src/features/purchasing/hooks/*` (PR/PO schemas)

**Tasks:**
- [ ] Add `created_by: z.string().nullable()` to PR summary Zod schema
- [ ] Add `currency_code: z.string()` to PO summary Zod schema
- [ ] Verify: PR list shows user name; PO list shows currency code (not undefined)

### 2.6 Gate StocktakeApproveClient Reject Action via Permission Engine
**Why:** Approve page shows REJECT button but doesn't gate it via `canPerformActionV2` or `PermissionGate`. Any user with page access can reject.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/approve/StocktakeApproveClient.tsx`

**Tasks:**
- [ ] Add `<ActionGuard documentType="stocktake" action="REJECT">` wrapper around the reject button
- [ ] Verify: user without REJECT permission on stocktake cannot see/use reject button

### 2.7 Fix `ActionGuard` Default Role — Deny Instead of Grant
**Why:** Every `ActionGuard` usage passes `user?.role || 'WH_KEEPER'`. When `user.role` is null, it defaults to a permissive role instead of denying access.

**Files:**
- `apps/web/src/components/shared/ActionGuard.tsx` (the pattern usage)

**Tasks:**
- [ ] Change fallback from `'WH_KEEPER'` to a sentinel like `'NONE'` or `undefined`
- [ ] Update the engine's role check to reject unknown/undefined roles
- [ ] Grep all 59 usages of `ActionGuard` and verify role fallback
- [ ] Verify: unauthenticated user (null role) cannot perform any action through ActionGuard

---

## Phase 3 — Medium-Priority UX, State Sync & Refactoring
*Transactional correctness, user-facing bugs, and code quality. Fix after Phase 2.*

### 3.1 Wire Search Inputs on List Pages
**Why:** PR, PO, Adjustment, and Stocktake list pages have search inputs that are decorative — typing does nothing.

**Files:**
- `apps/web/src/app/[locale]/(app)/(procurement)/prs/PRListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(procurement)/pos/POListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`

**Tasks:**
- [ ] For each list: wire search input value to query's `search` param (or use `useDebounce`)
- [ ] Add `search` parameter to each list hook's fetch function
- [ ] Follow `GRNListClient.tsx` pattern (best-implemented list with working search)
- [ ] Verify: typing in search filters the list (client or server side)

### 3.2 Add `keepPreviousData` to All List Queries
**Why:** List pages show flash loading states when changing filters/pages because `keepPreviousData` is not enabled.

**Files:**
All list hooks under:
- `apps/web/src/features/operations/hooks/use*List.ts`
- `apps/web/src/features/purchasing/hooks/`

**Tasks:**
- [ ] Add `placeholderData: keepPreviousData` to every list query hook
- [ ] Import `keepPreviousData` from `@tanstack/react-query`
- [ ] Verify: list page keeps showing previous data while next page loads

### 3.3 Add Detail Key Invalidation After Mutations
**Why:** After mutations, many hooks only invalidate list keys (`['purchase-orders']`) without detail keys (`['purchase-order', id]`). Open detail pages show stale data.

**Files:**
All mutation hooks in:
- `apps/web/src/features/operations/hooks/useCreate*`, `useUpdate*`, `usePost*`, `useApprove*`
- `apps/web/src/features/purchasing/hooks/`

**Tasks:**
- [ ] Audit each mutation hook's `onSuccess`/`onSettled` callback
- [ ] Add `queryClient.invalidateQueries({ queryKey: [detailKey, id] })` alongside list invalidation
- [ ] Verify: after updating a record, the detail page for that record shows updated data immediately

### 3.4 Fix Offline Edit Warning in StocktakeCountClient
**Why:** Count page inputs are enabled when offline but autosave is disabled. No warning shown. User loses edits.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/count/StocktakeCountClient.tsx`

**Tasks:**
- [ ] Add online/offline detection (use `navigator.onLine` or existing hook)
- [ ] When offline: show warning banner + disable quantity inputs
- [ ] When reconnecting: show "Reconnected — saving..." indicator
- [ ] Verify: disconnect network → count inputs disabled with banner → reconnect → inputs re-enabled

### 3.5 Fix AdjustmentForm Lot Allocations Stripped from Update
**Why:** Adjustment update payload doesn't include `lot_allocations`, causing allocations to be lost on edit.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`
- `apps/web/src/features/operations/hooks/useUpdateAdjustment.ts`

**Tasks:**
- [ ] Ensure `lot_allocations` are included in the update mutation payload `data` parameter
- [ ] Verify: edit adjustment with lot allocations → save → allocations persist on reload

### 3.6 Add Stocktake All-Items-Counted Validation Before Submit
**Why:** Stocktake can be submitted even if some items have null `counted_qty`.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/count/StocktakeCountClient.tsx`

**Tasks:**
- [ ] Before allowing submit: check all items have `counted_qty !== null`
- [ ] Disable submit button with tooltip "Count all items before submitting" if incomplete
- [ ] Show warning: "X of Y items not yet counted"
- [ ] Verify: submit disabled until all items have counted quantities

### 3.7 Add `handleApprove` with Comment Support to All Approve Screens
**Why:** Approve screens accept/reject without capturing an approval comment.

**Files:**
- StocktakeApproveClient, PRApprovalClient, POApproveClient, AdjustmentApproveClient

**Tasks:**
- [ ] Add `comment` text field to approve/reject dialogs across all screens
- [ ] Include `comment` in the mutation payload
- [ ] Character counter (min 10 chars for reject, optional for approve)
- [ ] Verify: approve/reject on any document requires/accepts comment

### 3.8 Fix StocktakeVarianceClient Back-Navigation Dead-End
**Why:** Variance page `backHref` navigates to a URL that doesn't exist or goes to the wrong place.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/variance/StocktakeVarianceClient.tsx`

**Tasks:**
- [ ] Update `backHref` to point to the correct stocktake detail page
- [ ] Verify: click back from variance → lands on stocktake detail page

### 3.9 Fix Partial Recount Button — Wire to Real Recount Mutation
**Why:** "Partial Recount" button in StocktakeVarianceClient shows a dialog but only shows a toast on confirm.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/variance/StocktakeVarianceClient.tsx`

**Tasks:**
- [ ] Create `useRecountItems` mutation or implement recount logic
- [ ] Wire confirm button to reset `counted_qty = null` for selected items and set status back to COUNTING
- [ ] Verify: select 3 items → "Partial Recount" → items reset → count page shows them as uncounted

### 3.10 Fix StocktakeApproveClient Hardcoded SAR Currency
**Why:** Stocktake approve page hardcodes `'SAR'` instead of using configurable base currency.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/approve/StocktakeApproveClient.tsx`

**Tasks:**
- [ ] Replace `'SAR'` string with value from settings endpoint or `useSettings()` hook
- [ ] Add fallback: `'SAR'` if settings not loaded
- [ ] Verify: stocktake approve page shows the configured base currency

### 3.11 Add Version/Optimistic Locking to All Master Data Mutations
**Why:** Some master data mutations don't send `version` for conflict detection. Last write wins silently.

**Files:**
`apps/web/src/features/items/hooks/*`, `apps/web/src/features/warehouses/hooks/*`, etc.

**Tasks:**
- [ ] Audit all master data mutation hooks for `version` field in payload
- [ ] Add `version` field where missing
- [ ] Verify: two users editing same record → second edit receives 409 conflict

### 3.12 Remove `INITIAL_*` Fallback Cache Seeding
**Why:** 5+ feature hooks seed `setQueryData` with hardcoded arrays when API fetch fails.

**Files:**
(grep for `INITIAL_` in `apps/web/src/features/*`)

**Tasks:**
- [ ] Identify all hooks with `INITIAL_CATEGORIES`, `INITIAL_FX_RATES`, `INITIAL_UOMS`, etc.
- [ ] Replace fallback patterns with proper `placeholderData` or empty arrays
- [ ] Ensure components handle empty data gracefully (`EmptyState` component)
- [ ] Verify: API offline → feature pages show empty state with retry, not fake data

### 3.13 Consolidate Duplicated Form Components
**Why:** PRForm, POForm, GRNForm, TransferHubClient are each duplicated in `features/` and `app/` route trees.

**Files:**
- `apps/web/src/features/purchasing/components/purchase-request-form.tsx` + `apps/web/src/app/[...]/PRForm.tsx`
- `apps/web/src/features/purchasing/components/purchase-order-form.tsx` + `apps/web/src/app/[...]/POForm.tsx`
- `apps/web/src/features/purchasing/components/grn-form.tsx` + (inline in GRN route page)
- `apps/web/src/app/[locale]/(app)/inventory/transfers/hub/TransferHubClient.tsx` + `apps/web/src/app/[locale]/(app)/(operations)/transfers/hub/TransferHubClient.tsx`

**Tasks:**
- [ ] Choose canonical location (prefer `features/*/components/`)
- [ ] Delete duplicate copy
- [ ] Update imports in route pages to point to canonical component
- [ ] Verify: both routes render same component with no functional regression

### 3.14 Add Error Toast Handlers to Mutations That Silently Swallow Errors
**Why:** Many `useSafeMutation` calls have no `onError` handler. Errors are silently discarded.

**Files:**
Grep for `useSafeMutation` in `apps/web/src/features/*/hooks/*`

**Tasks:**
- [ ] Audit all `useSafeMutation` usage
- [ ] Add `onError: (error) => { toast.error(error.message || t('error.default')) }` to every mutation
- [ ] Ensure `t()` is available in hook scope (may need `useTranslations()`)
- [ ] Verify: failed mutation shows an error toast to the user

### 3.15 Wire Batch Action Buttons in AdjustmentListClient
**Why:** Adjustment list has selectable rows but batch action buttons are not functional.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`

**Tasks:**
- [ ] Wire batch submit/adjust buttons to process selected rows
- [ ] Show confirmation dialog with count of selected items
- [ ] Follow existing batch patterns if any

### 3.16 Fix TransferReceiveClient Render Anti-Pattern
**Why:** State is set during render (not in useEffect), causing potential infinite re-renders.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/[id]/receive/TransferReceiveClient.tsx`

**Tasks:**
- [ ] Move state-initialization logic into `useEffect` with proper dependency array
- [ ] Verify: receive page renders consistently without re-render loops

### 3.17 Add Lot-Level Receive Granularity to Transfer Receive
**Why:** Transfer receive currently bulk-receives all quantities instead of allowing per-lot scan/receive.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/[id]/receive/TransferReceiveClient.tsx`

**Tasks:**
- [ ] For lines with lot allocations: show lot-level sub-rows
- [ ] Allow individual lot receipt quantities
- [ ] Follow pattern from GRN's LotEntryModal

---

## Phase 4 — Low-Priority Technical Debt & Polish
*Cleanup, optimization, and minor fixes. Execute after Phase 3.*

### 4.1 Remove Dead Code
**Files to clean up:**
- `Can` component (zero usages) — grep for `<Can` to confirm
- `useNetworkStatus` hook (zero usages)
- Legacy `ConflictDialog` in `core/concurrency/`
- `api/usePurchaseRequests.ts` and `api/usePurchaseOrders.ts` (mock files, not imported)
- Remove any dead mock files in `lib/api/mocks/`

**Tasks:**
- [ ] Delete each dead file after confirming zero imports
- [ ] Remove any re-exports in index.ts/barrel files
- [ ] Verify: `tsc --noEmit` passes after removals

### 4.2 Fix Whitespace-Only Rejection Prevention
**Why:** `"          "` passes `.length` checks.

**Files:**
All approve/reject screens that validate rejection reasons

**Tasks:**
- [ ] Add `.trim()` before `.length` comparison in all rejection reason validators
- [ ] Verify: whitespace-only input shows validation error

### 4.3 Replace `as unknown as` Type Casts with Proper Types
**Why:** These casts bypass type checking entirely and can mask runtime errors.

**Files:**
Grep for `as unknown as` in `apps/web/src/**/*.ts` and `apps/web/src/**/*.tsx`

**Tasks:**
- [ ] Identify each cast and determine the true TypeScript type
- [ ] Replace with proper type assertion or Zod validation
- [ ] Priority: casts in data-flow paths (API response → component props)

### 4.4 Standardize Query Key Naming Convention
**Why:** Inconsistent singular/plural pairs (`['transfers']` list vs `['transfer', id]` detail) cause invalidation to miss.

**Files:**
All hooks in `apps/web/src/features/*/hooks/`

**Tasks:**
- [ ] Adopt convention: `['entity-name']` for lists, `['entity-name', id]` for details (plural)
- [ ] Fix: `['transfers']` → `['transfers', id]`, `['adjustments']` → `['adjustments', id]`
- [ ] Verify: list invalidation also invalidates corresponding detail query

### 4.5 Standardize Pagination URL State Across All List Pages
**Why:** Different list pages handle page/limit in different ways (URL params vs local state).

**Files:**
All list client components

**Tasks:**
- [ ] Standardize on URL search params (`?page=2&limit=20`) for pagination state
- [ ] Follow `GRNListClient.tsx` as the best-practice reference
- [ ] Ensure back/forward browser navigation preserves pagination state

### 4.6 Consolidate `useItems` and `useWarehouses` Dual Implementations
**Why:** Each has two implementations: one in `features/*/api/` and one in `features/*/hooks/`.

**Files:**
- `apps/web/src/features/items/api/useItems.ts` + `apps/web/src/features/items/hooks/`
- `apps/web/src/features/warehouses/api/` + `apps/web/src/features/warehouses/hooks/`

**Tasks:**
- [ ] Determine canonical location (prefer `hooks/` with `api/` as internal)
- [ ] Delete duplicate; update all imports
- [ ] Verify: no broken imports across codebase

### 4.7 Add Character Counter to Variance Reason Textareas
**Why:** Stocktake variance reason textareas have no character limit feedback.

**Files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/variance/StocktakeVarianceClient.tsx`

**Tasks:**
- [ ] Add `maxLength={500}` and show `{current}/{max}` counter
- [ ] Follow existing pattern from approve/rejection dialogs if they have counters

### 4.8 Add `StatusTimeline` with Full Audit Log to Operation Viewers
**Why:** Operations viewers (stocktake, adjustment, transfer, issue) show a single status entry; GRN viewer shows full timeline.

**Files:**
All operation detail viewer pages

**Tasks:**
- [ ] Add `StatusTimeline` component to each viewer
- [ ] Pass full `timeline[]` array (already part of API response schema)
- [ ] Follow GRNViewer timeline pattern

### 4.9 Add `is_custom` Flag Support to Adjustment Update Payload
**Why:** Adjustment create supports custom (ad-hoc) items, but update payload doesn't include `is_custom`.

**Files:**
- `apps/web/src/features/operations/hooks/useUpdateAdjustment.ts`
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`

### 4.10 Narrow Status Enums from `ALL_DOCUMENT_STATUSES` to Domain-Specific
**Why:** Stocktake schemas use the global `ALL_DOCUMENT_STATUSES` instead of `STOCKTAKE_STATUSES`.

**Files:**
Multiple Zod schema files

**Tasks:**
- [ ] Create domain-specific status enums: `STOCKTAKE_STATUSES`, `ADJUSTMENT_STATUSES`, `TRANSFER_STATUSES`
- [ ] Update each Zod schema to use its specific enum
- [ ] Verify: validation rejects invalid status transitions

### 4.11 Add `ALL_STOCKTAKE_STATUSES` Enum and Use in Schemas
**Why:** Stocktake-specific status enum is missing; code uses `ALL_DOCUMENT_STATUSES` which includes irrelevant statuses.

**Files:**
- `apps/web/src/types/documents.ts`
- Stocktake Zod schemas

### 4.12 Normalize Mutation Hook ID Patterns
**Why:** Some hooks take `id` as a closure parameter (`useTransfer(id)`), others as a mutation argument (`mutate({ id, data })`). This inconsistency is confusing.

**Tasks:**
- [ ] Adopt convention: detail hooks take `id` as parameter; mutation hooks receive `id` in mutate argument
- [ ] Update inconsistent hooks to match

### 4.13 Replace Hardcoded SAR Currency with Configurable Base Currency
**Why:** 3+ components hardcode `'SAR'`.

**Files:**
Grepped in Phase 3; applies to remaining non-threshold components

### 4.14 Add Confirmation Keyword Fallback for Post Screens
**Why:** Post confirmation keywords come from translations only. If translation is missing, keyword check fails.

**Files:**
All post screens (stocktake, adjustment, issue, transfer)

**Tasks:**
- [ ] Add hardcoded fallback: `keyword || 'POST'`
- [ ] Verify: post works even if translation key is missing

### 4.15 Remove `PaginatedResponse` Inconsistencies
**Why:** `useIssueList` and `useTransferList` have slightly different pagination shapes.

**Files:**
- `apps/web/src/features/operations/hooks/useIssueList.ts`
- `apps/web/src/features/operations/hooks/useTransferList.ts`

**Tasks:**
- [ ] Standardize on `paginatedSchema` helper pattern
- [ ] Verify: both return `{ data: T[], meta: { page, page_size, total, total_pages } }`

### 4.16 Fix Duplicate `ConflictDialog` Implementations
**Why:** Two implementations: one in `core/concurrency/` (dead) and one in `components/shared/` (active).

**Tasks:**
- [ ] Delete dead copy in `core/concurrency/`
- [ ] Verify: conflict dialog still works

---

## Summary

| Phase | Focus | Tasks | Effort Estimate |
|-------|-------|-------|-----------------|
| 1 | Critical Production Blockers | 7 priority groups | ~30h | ✅ **Phase 1 Complete** |
| 2 | High-Priority Architecture | 7 priority groups | ~25h |
| 3 | Medium-Priority UX, State, Refactoring | 17 priority groups | ~40h |
| 4 | Low-Priority Cleanup & Polish | 16 priority groups | ~20h |
| **Total** | | **47 areas** | **~115h** |

*Each task must be verified before marking complete. Use `npm run lint`, `npm run typecheck`, and manual workflow tests after each phase.*

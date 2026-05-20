# Implementation Plan
## LogiRest Kitchen-Store Inventory System — Frontend Remediation
**Source:** Enterprise Frontend Repository Audit (`audit/frontend-full-audit.md`)  
**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · TanStack Query · Zod · next-intl  
**Last Updated:** 2026-05-21

---

## Overview

This plan converts all findings from the frontend audit into concrete, phased engineering tasks. Each task references the audit finding that produced it, lists the exact files to change, provides implementation guidance, and defines measurable acceptance criteria.

Tasks are ordered by **operational safety first**, then workflow correctness, then consistency and polish.

---

## Phases

| Phase | Theme | Risk Level | Tasks |
|-------|-------|-----------|-------|
| [Phase 0](#phase-0-security-hardening) | Security Hardening | 🔴 Critical | 4 |
| [Phase 1](#phase-1-critical-operational-safety) | Critical Operational Safety | 🔴 Critical | 4 |
| [Phase 2](#phase-2-core-workflow-fixes) | Core Workflow Fixes | 🟠 High | 6 |
| [Phase 3](#phase-3-data-integrity--scope-isolation) | Data Integrity & Scope Isolation | 🟠 High | 5 |
| [Phase 4](#phase-4-ux-consistency--polish) | UX Consistency & Polish | 🟡🟢 Medium/Low | 9 |

**Total: 28 tasks**

---

## Phase 0: Security Hardening

> Prerequisite for any production deployment. Must be completed before any user-facing release.

---

### P0-01 · Remove `console.log` from API Client

**Audit ref:** §17 API Layer Analysis — "console.log on every API request/response — must be removed; leaks auth tokens"

**Affected files:**
- `apps/web/src/lib/api/client.ts`

**Implementation:**
1. Remove line 42: `console.log('[API Request]'...)`
2. Remove line 57: `console.log('[API Response]'...)`
3. Replace any remaining debug logging with a conditional `process.env.NODE_ENV === 'development'` guard
4. Use a structured logger (e.g., `pino`) or a `logger.debug()` abstraction if tracing is needed in development

**Acceptance criteria:**
- No `console.log` call exists in `client.ts` in production build
- All API calls remain functionally identical
- Development mode may retain opt-in debug logging behind `NEXT_PUBLIC_DEBUG_API=true`

---

### P0-02 · Migrate Auth Token to HttpOnly Cookie

**Audit ref:** §17 API Layer Analysis — "Token in localStorage (XSS vulnerability)"; §22 Production Readiness Report — blocker #5

**Affected files:**
- `apps/web/src/providers/AuthProvider.tsx`
- `apps/web/src/lib/api/client.ts`
- `apps/web/src/middleware.ts` (if exists)
- Backend: `/auth/login` and `/auth/logout` endpoints

**Implementation:**
1. On login response, set token via `Set-Cookie: logirest_token=...; HttpOnly; Secure; SameSite=Lax; Path=/` from the backend
2. Remove all `localStorage.setItem('logirest_token', ...)` and `localStorage.getItem('logirest_token')` calls from `AuthProvider`
3. Remove manual cookie sync in `AuthProvider` (`document.cookie = ...`)
4. In `apiClient.request()`, remove the `localStorage.getItem('logirest_token')` call — browser sends the cookie automatically
5. Preserve the `logirest_user_overrides` pattern in localStorage (non-sensitive user preference data only)
6. Update logout to call `POST /auth/logout` so backend clears the cookie server-side

**Acceptance criteria:**
- Auth token does NOT appear in `localStorage` or `sessionStorage`
- Token IS set as httpOnly cookie (not visible to JavaScript)
- Login/logout flows work end-to-end
- Middleware can read the cookie from request headers for SSR route protection

---

### P0-03 · Add 401 Interceptor with Automatic Redirect

**Audit ref:** §17 API Layer Analysis — "No 401 interceptor to redirect to login"

**Affected files:**
- `apps/web/src/lib/api/client.ts`

**Implementation:**
1. In the `request()` function, after `if (!res.ok)`, add a 401 handler before the generic error throw:
   ```ts
   if (res.status === 401) {
     if (typeof window !== 'undefined') {
       localStorage.removeItem('logirest_user_overrides');
       localStorage.removeItem('logirest_active_scope');
       window.dispatchEvent(new CustomEvent('auth:expired'));
     }
     throw new Error('SESSION_EXPIRED');
   }
   ```
2. In `AuthProvider`: listen for `auth:expired` event → call `logout()` → `router.replace('/login?reason=expired')`
3. Show a toast: "Your session has expired. Please log in again." (not a generic error)

**Acceptance criteria:**
- When backend returns 401, user is redirected to `/login`
- No infinite loop if `/login` itself returns 401
- Current route is saved as `?redirect=` query param for post-login restoration
- Expiry-specific message is shown instead of a generic error toast

---

### P0-04 · Add Token Refresh / Silent Renewal

**Audit ref:** §17 API Layer Analysis — "No token refresh / silent refresh mechanism — 24hr expiry; session dies mid-operation"

**Affected files:**
- `apps/web/src/lib/api/client.ts`
- `apps/web/src/providers/AuthProvider.tsx`
- Backend: `POST /auth/refresh` endpoint required

**Implementation:**
1. In `AuthProvider` on mount, decode `payload.exp` and schedule a proactive refresh 5 minutes before expiry
2. In `apiClient`, on 401 response, attempt ONE silent refresh before redirecting:
   ```ts
   if (res.status === 401 && !isRetry) {
     await refreshToken(); // calls POST /auth/refresh
     return request(method, path, schema, body, options, true); // retry once
   }
   ```
3. Use a singleton Promise for the refresh call to prevent parallel refresh storms

**Acceptance criteria:**
- User session persists across a full working day without manual re-login
- Parallel API calls during refresh wait for the single refresh Promise to resolve
- If refresh itself returns 401, user is redirected to `/login`

---

## Phase 1: Critical Operational Safety

> These bugs directly risk inventory ledger corruption. Must be fixed before operational use.

---

### P1-01 · Guard Against Negative Stock on DECREASE Adjustments

**Audit ref:** §6 Adjustment Form — "DECREASE adjustments with qty_adjusted > qty_before produce negative qty_after; UI shows it red but does NOT block save"; §21 Operational Risk Report — CRITICAL

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`

**Implementation:**
1. Add computed `hasNegativeStock`:
   ```ts
   const hasNegativeStock = lines.some(
     line => line.direction === 'DECREASE' && line.qty_adjusted > (line.qty_before ?? 0)
   );
   ```
2. Block `handleSaveDraft` with early return + `toast.error(t('errors.negative_stock_not_allowed'))` if `hasNegativeStock`
3. Disable save/submit buttons: `disabled={hasNegativeStock}`
4. Render per-line inline error below the qty field when `qty_after < 0`: `t('errors.exceeds_available_stock')`
5. Add translation keys in all locale files

**Backend requirement:**
- `POST /operations/adjustments/:id/post` must validate no line creates negative stock server-side

**Acceptance criteria:**
- Saving a DECREASE where `qty_adjusted > qty_before` is blocked with a clear error
- Submit/save buttons are disabled while any line has negative projected quantity
- Per-line error indicator shows inline on the offending row
- Backend rejects posting with explicit error if stock would go negative

---

### P1-02 · Fix Batch Approve/Post Version Locking

**Audit ref:** §5 Adjustment List — "Batch operations use `version: 0` — bypasses optimistic concurrency"; §21 Operational Risk Report — CRITICAL

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`

**Implementation:**
1. Before the batch loop, fetch current versions for all selected IDs:
   ```ts
   const docs = await Promise.all(
     selectedIds.map(id => apiClient.get(`/operations/adjustments/${id}`, AdjustmentDetailSchema))
   );
   const versionMap = new Map(docs.map(d => [d.id, d.version]));
   ```
2. In the batch loop, use `{ id, version: versionMap.get(id) ?? 0 }`
3. If any pre-fetch fails (deleted document), skip that ID and include it in the failure summary

**Acceptance criteria:**
- Each batch approve/post call sends the correct document version fetched immediately before the action
- A 409 conflict on any item is caught, displayed, and remaining items are still processed
- Final summary shows which IDs succeeded and which failed with reason

---

### P1-03 · Fix Batch Approve to Validate Per-Item Workflow Eligibility

**Audit ref:** §5 Adjustment List — "Batch approve fires raw `apiClient.post`, bypassing ActionGuard and workflow rules — can approve any document regardless of status"; §21 Operational Risk Report — CRITICAL

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`

**Implementation:**
1. Before the batch loop, filter `selectedIds` using `canPerformActionV2`:
   ```ts
   const eligible = selectedItems.filter(item =>
     canPerformActionV2('ADJUSTMENT', item.status, 'APPROVE', user.role)
   );
   const skipped = selectedItems.length - eligible.length;
   if (skipped > 0) toast.warning(t('batch.skipped_n_ineligible', { count: skipped }));
   ```
2. Replace the raw `apiClient.post(...)` call with `useApproveAdjustment` hook's `mutateAsync`
3. Apply the same fix to batch post — use `usePostAdjustment` hook

**Acceptance criteria:**
- Batch approve never fires on DRAFT, POSTED, CANCELLED, or REJECTED adjustments
- Selecting 5 adjustments where 3 are eligible and 2 already posted: only 3 are processed; toast explains the 2 were skipped
- `onConflict` callback fires correctly if a 409 is returned
- `queryClient.invalidateQueries` triggers after the full batch completes

---

### P1-04 · Add Session Validation on Auth Mount

**Audit ref:** §16 State Management — "No server-side session validation on mount (no /auth/me call)"; §22 Production Readiness — blocker

**Affected files:**
- `apps/web/src/providers/AuthProvider.tsx`
- Backend: `GET /auth/me` endpoint required

**Implementation:**
1. After decoding the JWT on mount, call `GET /auth/me` to validate the session server-side
2. If 200: update local user state with the fresh server-returned user object
3. If 401: clear local state and redirect to `/login`
4. Keep `isLoading = true` until the check resolves so protected routes show a loading skeleton

**Acceptance criteria:**
- On page mount with a valid token, `GET /auth/me` is called once
- If role/scope has changed server-side, the frontend reflects it within one page load
- `isLoading` is `true` until the auth check resolves
- No race condition between the auth check and initial data fetches

---

## Phase 2: Core Workflow Fixes

> These fix broken or missing workflow behavior that operators will encounter immediately.

---

### P2-01 · Fix Transfer List Search Input

**Audit ref:** §11 Transfer List — "Search input has no `onChange` handler — users cannot search transfers"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- `apps/web/src/features/operations/hooks/useTransferList.ts`

**Implementation:**
1. Add `const [search, setSearch] = useState('')` to `TransferListClient`
2. Add `const debouncedSearch = useDebounce(search, 400)`
3. Bind to the `<Input>`:
   ```tsx
   <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search_placeholder')} />
   ```
4. Pass `debouncedSearch` to `useTransferList({ status, search: debouncedSearch, page })`
5. Propagate as query param: `?search=${search}`
6. Reset page to 1 on search change: `useEffect(() => setPage(1), [debouncedSearch])`

**Acceptance criteria:**
- Typing in search field filters transfers by document number / warehouse name
- Search is debounced (no API call per keystroke)
- Clearing search restores full list
- Page resets to 1 on every new search

---

### P2-02 · Resolve Warehouse Names via Entity Join (Not Translation Keys)

**Audit ref:** §11 Transfer List, §5 Adjustment List — "Warehouse names via `tCommon('warehouses.{id}')` — breaks for dynamic warehouses"; §20 UX Consistency Report

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`

**Implementation:**
1. In each list screen, add warehouse lookup map:
   ```ts
   const { data: warehousesData } = useWarehouses();
   const warehouseMap = useMemo(() =>
     new Map((warehousesData?.data ?? []).map(w => [w.id, locale === 'ar' ? w.name_ar : w.name_en])),
     [warehousesData, locale]
   );
   ```
2. Replace `tCommon('warehouses.' + id.toLowerCase())` with `warehouseMap.get(id) ?? id`
3. Remove all `warehouses.*` translation keys from locale files

**Acceptance criteria:**
- Warehouse names in all list screens match master data entity names
- Dynamically created warehouses show their real name immediately
- No translation key fallback is used for warehouse display names

---

### P2-03 · Add EDIT Transition from REJECTED to DRAFT in Adjustment Workflow

**Audit ref:** §4 Workflow Map — "REJECTED adjustment has no EDIT transition back to DRAFT"; §21 Operational Risk Report — HIGH

**Affected files:**
- `apps/web/src/core/workflow/document-engine.ts`
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx`

**Implementation:**
1. In `document-engine.ts`, add the REJECTED → EDIT transition for ADJUSTMENT:
   ```ts
   [ADJUSTMENT_STATUS.REJECTED]: {
     'EDIT': { targetStatus: ADJUSTMENT_STATUS.DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
   },
   ```
2. In `AdjustmentDetailClient.tsx`, render an "Edit / Resubmit" button via `ActionGuard` when status is REJECTED
3. Show a rejection reason banner in the form: "Editing a rejected adjustment — reason: {rejection_comment}"

**Acceptance criteria:**
- ADMIN, INV_MGR, WH_KEEPER users see an "Edit" button on REJECTED adjustments
- Clicking "Edit" resets status to DRAFT via API and loads the form
- The rejection reason is visible as a banner while editing
- After re-submitting, the adjustment returns to SUBMITTED status

---

### P2-04 · Implement Real Audit Trail in Stocktake Form and Viewer

**Audit ref:** §9 Stocktake Form, §10 Stocktake Viewer — "StatusTimeline rendered with single hardcoded entry (current status only)"; §21 Operational Risk Report — HIGH

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx`
- `apps/web/src/features/operations/types/stocktake.ts`
- Backend: `GET /stocktake/sessions/:id` must return `audit_log[]`

**Implementation:**
1. Add `audit_log` to `StocktakeSessionSchema`:
   ```ts
   audit_log: z.array(z.object({
     status: z.string(),
     created_at: z.string(),
     user_name: z.string().nullable().optional(),
     comment: z.string().nullable().optional(),
   })).optional(),
   ```
2. Replace the single-entry timeline construction in both `StocktakeForm` and `StocktakeViewer`:
   ```ts
   const timeline = (session.audit_log ?? []).map(log => ({
     status: log.status.toLowerCase() as Status,
     at: log.created_at,
     by: log.user_name || common('system_user'),
   }));
   ```
3. Update mock adapter to append audit log entries on every stocktake status transition

**Acceptance criteria:**
- Stocktake audit trail shows one entry per status transition
- Each entry shows `status`, `at` (formatted datetime), and `by` (user name)
- Timeline renders in chronological order (oldest first)
- Fallback to a single DRAFT entry if no audit_log exists yet

---

### P2-05 · Add GRN Expiry Date Validation at Receipt

**Audit ref:** §13 GRN Viewer — "Expiry date capture at GRN — critical for FEFO — needs validation that date is not in the past"; §21 Operational Risk Report — HIGH

**Affected files:**
- GRN form component (in `goods-received/new/` or `goods-received/[id]/`)
- `apps/web/src/utils/fefo.ts`

**Implementation:**
1. In the GRN lot capture field, validate:
   ```ts
   const isExpiryInPast = (date: string) => new Date(date) < new Date();
   ```
2. For WH_KEEPER role: hard block on past expiry date with error message
3. For INV_MGR/ADMIN: soft warning with mandatory override reason input
4. Add translation keys: `grn.expiry_date_in_past_warning`, `grn.expiry_date_required`

**Acceptance criteria:**
- GRN lot entry with past expiry date is blocked for WH_KEEPER
- INV_MGR sees a warning and can override with a reason
- FEFO ordering in `FEFOLotAllocator` correctly handles newly received lots

---

### P2-06 · Add KITCHEN_CHIEF and STORE_MGR to Workflow Transition Roles

**Audit ref:** §18 Permission & RBAC Analysis — "KITCHEN_CHIEF and STORE_MGR roles defined but absent from transitionMapV2 — cannot execute any workflow action"

**Affected files:**
- `apps/web/src/core/workflow/document-engine.ts`

**Implementation:**
1. Add `KITCHEN_CHIEF` to `KITCHEN_REQUEST` transitions:
   - DRAFT → `SUBMIT`, `CANCEL`
   - SUBMITTED → `FULFILL`, `CANCEL`
2. Add `KITCHEN_CHIEF` to `ISSUE` DRAFT → `SUBMIT` (if kitchen chiefs create issues)
3. Evaluate `STORE_MGR` capabilities and add to appropriate document type allowed roles
4. Update `usePermission` hook's resource/action map to match

**Acceptance criteria:**
- KITCHEN_CHIEF can submit, fulfill, and cancel kitchen requests
- STORE_MGR can perform all operations their role implies
- No regression — existing role permissions unchanged
- `canPerformActionV2` unit tests cover KITCHEN_CHIEF and STORE_MGR

---

## Phase 3: Data Integrity & Scope Isolation

> These items prevent cross-warehouse data leakage and fix misleading operational metrics.

---

### P3-01 · Enforce Active Scope on All Operational API Queries

**Audit ref:** §16 State Management — "activeScope stored but never passed to any API query as a filter"; §18 RBAC — "WH_KEEPER can see all warehouse data, not just their assigned scope"

**Affected files:**
- `apps/web/src/features/operations/hooks/useAdjustmentList.ts`
- `apps/web/src/features/operations/hooks/useIssueList.ts`
- `apps/web/src/features/operations/hooks/useTransferList.ts`
- `apps/web/src/features/operations/hooks/useStocktakeList.ts`
- All other operational list hooks

**Implementation:**
1. Create `apps/web/src/hooks/useOperationalScope.ts`:
   ```ts
   export function useOperationalScope() {
     const { activeScope } = useAuth();
     return { warehouseId: activeScope.warehouseId, branchId: activeScope.branchId };
   }
   ```
2. In each list hook, append scope params to the API query and include in the query key:
   ```ts
   const { warehouseId, branchId } = useOperationalScope();
   queryKey: ['adjustments', { status, search, page, warehouseId, branchId }]
   queryFn: ({ signal }) => apiClient.get(
     `/operations/adjustments?warehouse_id=${warehouseId ?? ''}&branch_id=${branchId ?? ''}`,
     AdjustmentListSchema, { signal }
   )
   ```
3. Update mock adapter to filter by `warehouse_id` and `branch_id` query params

**Acceptance criteria:**
- Changing active scope in the context selector triggers refetch of all operational lists
- WH_KEEPER scoped to Warehouse A does not see Warehouse B documents
- ADMIN and INV_MGR with no restriction see all documents

---

### P3-02 · Replace Page-Slice KPI Metrics with Server-Side Aggregates

**Audit ref:** §5 Adjustment List, §8 Stocktake List, §11 Transfer List — "Metrics computed from current page data only — misleadingly incorrect"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- Backend: `/operations/adjustments/summary`, `/stocktake/sessions/summary`, `/operations/transfers/summary`

**Implementation:**
1. Create `useAdjustmentSummary()` hook:
   ```ts
   export function useAdjustmentSummary() {
     return useQuery({
       queryKey: ['adjustments', 'summary'],
       queryFn: ({ signal }) => apiClient.get('/operations/adjustments/summary', AdjustmentSummarySchema, { signal }),
     });
   }
   ```
   Schema: `{ total: number; pending: number; critical_losses: number }`
2. Replace all in-component `data?.data?.filter(...)` metric computations with data from the summary hook
3. Apply same pattern for Stocktake and Transfer
4. Invalidate `['adjustments', 'summary']` whenever the list is invalidated

**Acceptance criteria:**
- KPI cards show totals across ALL documents, not just the current page
- If there are 200 pending adjustments and 10 are on the current page, "Pending" card shows `200`
- Summary updates whenever a mutation invalidates the list

---

### P3-03 · Make Overdue Transfer Threshold Configurable

**Audit ref:** §11 Transfer List — "Hardcoded 3-day overdue threshold"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- `apps/web/src/contracts/operational-config.ts` (new file)

**Implementation:**
1. Create `apps/web/src/contracts/operational-config.ts`:
   ```ts
   export const OPERATIONAL_CONFIG = {
     TRANSFER_OVERDUE_DAYS: Number(process.env.NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS ?? 3),
   } as const;
   ```
2. Replace hardcoded `- 3` with `- OPERATIONAL_CONFIG.TRANSFER_OVERDUE_DAYS`
3. Move overdue count to the server-side summary endpoint so it reflects all in-transit transfers, not just the current page

**Acceptance criteria:**
- Overdue threshold is read from environment config; default is 3 days
- Overdue banner count reflects ALL in-transit transfers, not just the current page

---

### P3-04 · Fix Warehouse and Item Query Cache Invalidation

**Audit ref:** §16 State Management — "Warehouses list not invalidated after create/edit — stale for new warehouses in same session"

**Affected files:**
- `apps/web/src/features/warehouses/hooks/useCreateWarehouse.ts`
- `apps/web/src/features/warehouses/hooks/useUpdateWarehouse.ts`
- Item create/update hooks

**Implementation:**
1. In `useCreateWarehouse().onSuccess`: `queryClient.invalidateQueries({ queryKey: ['warehouses'] })`
2. In `useUpdateWarehouse().onSuccess`: same
3. In `useCreateItem().onSuccess`: `queryClient.invalidateQueries({ queryKey: ['items'] })`

**Acceptance criteria:**
- Creating a new warehouse immediately shows it in all warehouse comboboxes without page refresh
- Updating a warehouse name immediately reflects in all forms
- Same for items

---

### P3-05 · Unify PermissionGate and ActionGuard RBAC Models

**Audit ref:** §18 Permission & RBAC Analysis — "Two separate RBAC models (resource/action vs workflow engine) must stay synchronized"

**Affected files:**
- `apps/web/src/hooks/usePermission.ts`
- `apps/web/src/contracts/role-capabilities.ts` (new file)
- `apps/web/src/core/workflow/document-engine.ts`

**Implementation:**
1. Create `apps/web/src/contracts/role-capabilities.ts` as the single source of truth:
   ```ts
   export const ROLE_CAPABILITIES = {
     adjustment: {
       create: ['ADMIN', 'INV_MGR', 'WH_KEEPER'],
       approve: ['ADMIN', 'APPROVER', 'INV_MGR'],
       post: ['ADMIN', 'INV_MGR'],
     },
     // ... per document type
   } as const;
   ```
2. Both `transitionMapV2` and `usePermission` derive `allowedRoles` from this file
3. Adding a new role requires one change, not two

**Acceptance criteria:**
- The same role that passes `ActionGuard` also passes `usePermission` for the equivalent action
- No divergence between the two permission models for the same document type and action

---

## Phase 4: UX Consistency & Polish

> These items improve operational efficiency and eliminate inconsistencies across screens.

---

### P4-01 · Wire "Filter" Buttons Across All List Screens

**Audit ref:** §5, §8, §11 — "Filter button is decorative — pressing it does nothing"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`

**Implementation:**
1. Add `const [showFilters, setShowFilters] = useState(true)` to each list screen
2. Wrap filter controls in a collapsible container: `{showFilters && <div>...filters...</div>}`
3. Wire Filter button: `onClick={() => setShowFilters(v => !v)}`
4. Show active filter count in button label: `Filters (2)` when filters are applied

**Acceptance criteria:**
- Clicking the Filter button has a visible, consistent effect on every list screen
- Active filter count shown when filters are applied
- Collapsing filters does NOT clear them

---

### P4-02 · Add Date Range Filter to Adjustment, Stocktake, and Transfer Lists

**Audit ref:** §5, §8, §11 — "No date range filter"

**Affected files:**
- All three list screen components
- Corresponding list hooks

**Implementation:**
1. Add `dateFrom` and `dateTo` state (ISO date strings) to each list screen
2. Add two date inputs in the filter bar
3. Pass to query hooks and API call: `?date_from=&date_to=`
4. Include in query key to trigger refetch on change

**Acceptance criteria:**
- Setting a date range filters documents to those created/posted within the range
- Clearing date range restores the full filtered list

---

### P4-03 · Add Warehouse Filter to Adjustment and Issue Lists

**Audit ref:** §5 Adjustment List — "No warehouse filter — multi-warehouse operations need scope isolation"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx`

**Implementation:**
1. Add `warehouseId` filter state to each list screen
2. Populate a warehouse `SmartCombobox` using `useWarehouses()` (entity names, not translation keys)
3. For ADMIN/INV_MGR: show the warehouse filter
4. For WH_KEEPER with active scope: auto-apply scope and hide the filter

**Acceptance criteria:**
- ADMIN can filter by any warehouse
- WH_KEEPER's warehouse filter is pre-selected and not user-changeable
- Warehouse filter uses entity names (see P2-02)

---

### P4-04 · Centralize Print CSS into a Shared Print Layout

**Audit ref:** §14 Component Audit, §23 Technical Quality — "3 files duplicate identical `@media print` CSS blocks"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentViewer.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx`
- `apps/web/src/app/globals.css`

**Implementation:**
1. Extract all `@media print` rules from the three files into `globals.css` or a new `styles/print.css`
2. Remove all inline `<style jsx global>` blocks from components
3. Standardize shared print-hidden utility class

**Acceptance criteria:**
- Print behavior identical to before on all three screens
- No component contains inline print CSS
- Single place to adjust print layout

---

### P4-05 · Localize Print Voucher Headers

**Audit ref:** §7 Adjustment Viewer — "Print header has hardcoded English text — not translated"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentViewer.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx`
- `messages/ar.json`, `messages/en.json`

**Implementation:**
1. Replace hardcoded `"Warehouse Adjustment Voucher"` with `t('print.adjustment_voucher_title')`
2. Add to locale files:
   - `en.json`: `"print": { "adjustment_voucher_title": "Warehouse Adjustment Voucher", "stocktake_report_title": "Physical Inventory Report" }`
   - `ar.json`: `"print": { "adjustment_voucher_title": "قسيمة تسوية المستودع", "stocktake_report_title": "تقرير الجرد المادي" }`

**Acceptance criteria:**
- Printing in Arabic UI shows Arabic header; in English UI shows English header
- No hardcoded English strings in any print-only section

---

### P4-06 · Unify Sticky Header Implementation

**Audit ref:** §20 UX Consistency Report — "Two implementations of sticky header: StickyGlassHeader component vs inline div in forms"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx`
- `apps/web/src/components/shared/StickyGlassHeader.tsx`

**Implementation:**
1. Extend `StickyGlassHeader` props: add `isEditing?: boolean` for any edit-mode-specific styling
2. Replace inline sticky `<div>` in both form components with `<StickyGlassHeader>`
3. Ensure same backdrop-blur, border, and z-index values

**Acceptance criteria:**
- All document screens (viewer AND form) use `StickyGlassHeader`
- No duplicate sticky header code in form components

---

### P4-07 · Add Column Sort to DataTable Instances

**Audit ref:** §5 Adjustment List — "No sort controls on table columns"

**Affected files:**
- `apps/web/src/components/shared/DataTable/DataTable.tsx`
- All list screen `columns` definitions

**Implementation:**
1. Enable `getSortedRowModel` in TanStack Table configuration
2. For server-side sorting, pass `sortBy` and `sortDir` to list hooks: `?sort_by=created_at&sort_dir=desc`
3. Minimum sortable columns:
   - Adjustments: `created_at`, `status`, `warehouse`
   - Transfers: `created_at`, `status`, `shipped_at`
   - Stocktake: `created_at`, `status`

**Acceptance criteria:**
- Clicking a sortable column header sorts the table
- Sort direction toggles (ASC → DESC) on repeated clicks
- Sort state is visually indicated with an arrow icon

---

### P4-08 · Add Loading Indicator for Warehouse-Change Stock Refresh

**Audit ref:** §22 Production Readiness — "No loading indicator while re-fetching stock levels on warehouse change"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`

**Implementation:**
1. Add `const [isRefreshingStock, setIsRefreshingStock] = useState(false)`
2. Wrap warehouse-change stock refresh:
   ```ts
   setIsRefreshingStock(true);
   try { await Promise.all(lines.map(async (line) => { /* fetch qty_before */ })); }
   finally { setIsRefreshingStock(false); }
   ```
3. Show `InlineLoader` above line items table while `isRefreshingStock === true`
4. Disable "Add Item" and "Save Draft" buttons during refresh

**Acceptance criteria:**
- Visible loading indicator appears on warehouse change while stock levels are fetched
- Add/save actions blocked during the refresh

---

### P4-09 · Add Item Search Within Stocktake Manifest

**Audit ref:** §10 Stocktake Viewer — "No filter/search within the manifest for large SKU counts"

**Affected files:**
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx`
- `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx`

**Implementation:**
1. Add search input above the manifest table
2. Filter displayed items client-side:
   ```ts
   const filteredItems = useMemo(() =>
     session.items.filter(item =>
       item.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
       item.barcode?.includes(itemSearch)
     ),
     [session.items, itemSearch]
   );
   ```
3. Show count: `{filteredItems.length} of {session.items.length} items`

**Acceptance criteria:**
- Users can search by item name or barcode within the manifest
- Unmatched items are hidden, not deleted
- Clearing search restores all items

---

## Appendix A: File Change Index

| File | Phases |
|------|--------|
| `lib/api/client.ts` | P0-01, P0-02, P0-03, P0-04 |
| `providers/AuthProvider.tsx` | P0-02, P0-04, P1-04 |
| `adjustments/AdjustmentListClient.tsx` | P1-02, P1-03, P3-02, P4-01, P4-02, P4-03 |
| `adjustments/[id]/AdjustmentForm.tsx` | P1-01, P4-08 |
| `adjustments/[id]/AdjustmentViewer.tsx` | P4-04, P4-05 |
| `adjustments/[id]/AdjustmentDetailClient.tsx` | P2-03 |
| `transfers/TransferListClient.tsx` | P2-01, P2-02, P3-02, P3-03, P4-01, P4-02 |
| `stocktake/StocktakeListClient.tsx` | P3-02, P4-01, P4-02 |
| `stocktake/[id]/StocktakeForm.tsx` | P2-04, P4-06, P4-09 |
| `stocktake/[id]/StocktakeViewer.tsx` | P2-04, P4-04, P4-05, P4-09 |
| `goods-received/[id]/GRNViewer.tsx` | P2-05 |
| `core/workflow/document-engine.ts` | P2-03, P2-06, P3-05 |
| `features/operations/hooks/useTransferList.ts` | P2-01, P3-01 |
| `features/operations/hooks/useAdjustmentList.ts` | P3-01, P3-02 |
| `features/operations/hooks/useStocktakeList.ts` | P3-01, P3-02 |
| `features/operations/types/stocktake.ts` | P2-04 |
| `features/warehouses/hooks/useCreateWarehouse.ts` | P3-04 |
| `components/shared/StickyGlassHeader.tsx` | P4-06 |
| `components/shared/DataTable/DataTable.tsx` | P4-07 |
| `hooks/usePermission.ts` | P3-05 |
| `contracts/operational-config.ts` | P3-03 (new) |
| `contracts/role-capabilities.ts` | P3-05 (new) |
| `hooks/useOperationalScope.ts` | P3-01 (new) |
| `styles/print.css` | P4-04 (new) |
| `messages/ar.json`, `messages/en.json` | P4-05 |

---

## Appendix B: Backend API Requirements

All backend endpoints required by this plan (must be available before the specified phase):

| Phase | Endpoint | Method | Contract |
|-------|---------|--------|---------|
| P0-02 | `/auth/login` | POST | Must set `HttpOnly` cookie, not just return token |
| P0-02 | `/auth/logout` | POST | Must clear the `HttpOnly` cookie server-side |
| P0-04 | `/auth/refresh` | POST | Returns new token; invalidates old one |
| P1-04 | `/auth/me` | GET | Validates session; returns current user with role/scopes |
| P1-01 | `/operations/adjustments/:id/post` | POST | Must validate no negative stock server-side |
| P2-04 | `/stocktake/sessions/:id` | GET | Must include `audit_log[]` array with all transitions |
| P2-01 | `/operations/transfers` | GET | Must accept `?search=` query param |
| P3-02 | `/operations/adjustments/summary` | GET | Returns `{ total, pending, critical_losses }` |
| P3-02 | `/stocktake/sessions/summary` | GET | Returns `{ total, in_progress, posted }` |
| P3-02 | `/operations/transfers/summary` | GET | Returns `{ total, in_transit, overdue_count }` |
| P3-01 | All operational list endpoints | GET | Must accept `?warehouse_id=&branch_id=` scope params |
| P2-05 | `/goods-received/:id/lines/:lineId` | PUT | Should reject past expiry dates for WH_KEEPER |

---

## Appendix C: Critical Path

Tasks must be completed in this order to unblock downstream work:

```
P0-01 → P0-02 → P0-03 → P0-04
              ↓
P1-01 → P1-02 → P1-03 → P1-04
              ↓
P2-01 → P2-02 → P2-03 → P2-04 → P2-05 → P2-06
              ↓
P3-01 → P3-02 → P3-03 → P3-04 → P3-05
              ↓
P4-01 → P4-02 → P4-03 → P4-04 → P4-05 → P4-06 → P4-07 → P4-08 → P4-09
```

**P0 must be completed before any production deployment.**  
**P1 must be completed before operational use by warehouse staff.**  
**P2 must be completed before multi-warehouse rollout.**  
**P3 and P4 can be parallelized once P2 is done.**

---

*End of Implementation Plan — 28 tasks across 5 phases*

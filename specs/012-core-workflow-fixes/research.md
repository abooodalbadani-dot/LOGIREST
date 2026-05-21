# Research: Phase 2 — Core Workflow Fixes

**Date**: 2026-05-21  
**Feature**: [spec.md](./spec.md)

## Research Scope

All technology choices are predetermined. Research focuses on implementation patterns within the existing codebase.

---

## Decision 1: Transfer Search Implementation (P2-01)

**Decision**: Add `search` state, `useDebounce(search, 400)`, wire to `useTransferList({ search: debouncedSearch })`, reset page to 1 on search change. The backend must accept `?search=` query parameter.

**Rationale**:
- The `useDebounce` hook already exists at `@/hooks/useDebounce` and is used in `AdjustmentListClient` with a 500ms delay — transfer search uses 400ms for slightly faster responsiveness
- The `useTransferList` hook currently accepts `{ status, page }` — adding `search` parameter matches the pattern from `useAdjustmentList`
- Page reset on search change prevents "no results on page 3" UX issues
- The `Input` component on the transfer list page already exists but has no `onChange` handler

**Alternatives considered**:
- Client-side filtering of already-loaded data: Rejected — transfers list may span many pages; server-side search is more scalable
- Instant search (no debounce): Rejected — would cause excessive API calls during typing

**Implementation notes**:
```ts
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 400);
useEffect(() => setPage(1), [debouncedSearch]);
```

---

## Decision 2: Warehouse Name Lookup (P2-02)

**Decision**: On each list screen (transfers, adjustments, stocktakes), fetch all warehouses via `useWarehouses()`, build a `Map<string, { name_en, name_ar }>`, use `warehouseMap.get(id)?.[locale === 'ar' ? 'name_ar' : 'name_en'] ?? id`.

**Rationale**:
- `useWarehouses` already exists and provides `{ data: { data: Warehouse[] } }` with `name_en` and `name_ar` fields
- Using a `useMemo` Map provides O(1) lookup in table cell renderers
- Fallback to warehouse ID ensures the UI never breaks if a warehouse is missing from the cache
- All three list screens currently use `tCommon('warehouses.' + id.toLowerCase())` which is the broken pattern — replacing with entity lookup fixes all at once

**Alternatives considered**:
- Adding warehouse names to each list's API response (backend join): Requires backend changes across 3+ endpoints; frontend-only fix is immediate and simpler
- Prefetching only visible warehouses: Adds complexity; warehouse count is typically small (<50) so fetching all is efficient

**Implementation notes**:
```ts
const { data: warehousesData } = useWarehouses();
const warehouseMap = useMemo(() =>
  new Map((warehousesData?.data ?? []).map(w => [w.id, { name_en: w.name_en, name_ar: w.name_ar }])),
  [warehousesData]
);
// In cell renderer:
const name = warehouseMap.get(id);
const display = name ? (locale === 'ar' ? name.name_ar : name.name_en) : id;
```

---

## Decision 3: REJECTED→DRAFT Workflow Transition (P2-03)

**Decision**: Add `REJECTED: { 'EDIT': { targetStatus: DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] } }` to the ADJUSTMENT transition map in `document-engine.ts`. In `AdjustmentDetailClient.tsx`, render an "Edit / Resubmit" button via `ActionGuard` when status is REJECTED.

**Rationale**:
- `transitionMapV2` already defines transitions for DRAFT and SUBMITTED statuses — REJECTED simply has no entries
- The EDIT action name follows the pattern of existing actions (SUBMIT, APPROVE, POST, REJECT, CANCEL)
- Allowing WH_KEEPER to edit their own rejected adjustments is appropriate — they created it, they should fix it
- The rejection reason (`document.reject` or `document.rejection_comment`) is already in the document data — displaying it as a banner is a UI addition

**Alternatives considered**:
- Re-submit without editing (REJECTED → SUBMITTED directly): Rejected — the whole point is to allow edits before resubmission
- Only ADMIN can edit rejected: Too restrictive — defeats the purpose for WH_KEEPER who created the document

**Implementation notes**:
```ts
// document-engine.ts — add to ADJUSTMENT transitions:
[ADJUSTMENT_STATUS.REJECTED]: {
  'EDIT': { targetStatus: ADJUSTMENT_STATUS.DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
},
```

---

## Decision 4: Stocktake Audit Trail (P2-04)

**Decision**: The backend must return `audit_log[]` in the stocktake session response. The frontend maps it to timeline entries: `{ status, at: created_at, by: user_name }`. Fallback to a single DRAFT entry if `audit_log` is empty or missing.

**Rationale**:
- The `StatusTimeline` component already renders `{ status, at, by }[]` — no component changes needed
- Both `StocktakeForm` and `StocktakeViewer` currently construct a single-entry timeline from `session.status` — replacing with `audit_log.map()` is minimal
- Adding `audit_log` to the `StocktakeSessionSchema` ensures type safety
- Fallback preserves backward compatibility with legacy sessions that lack audit data

**Alternatives considered**:
- Computing timeline from a single `transitions[]` array: This IS the audit_log approach — no alternative needed
- Client-side reconstruction from snapshots: Unreliable — can't know who performed transitions without server data

**Implementation notes**:
```ts
const timeline = (session.audit_log ?? []).map(log => ({
  status: log.status.toLowerCase() as Status,
  at: log.created_at,
  by: log.user_name || tCommon('system_user'),
}));
if (timeline.length === 0) {
  timeline.push({ status: 'draft' as Status, at: session.created_at, by: session.created_by || tCommon('system_user') });
}
```

---

## Decision 5: GRN Expiry Date Validation (P2-05)

**Decision**: Compute `isExpiryInPast = new Date(expiryDate) < new Date()`. For WH_KEEPER: reject with error. For INV_MGR/ADMIN: show warning + require override reason. Today's date is accepted (not considered past).

**Rationale**:
- Role-based enforcement: WH_KEEPER is data-entry and should not override; INV_MGR/ADMIN have authority to accept near-expired goods with justification
- Date comparison uses `new Date()` which includes time — "today" expiry is valid because the item expires at end of day
- Override reason is logged for audit purposes per Principle II (Auditability)

**Alternatives considered**:
- Blocking all past dates for all roles: Too restrictive — INV_MGR may need to receive goods with short shelf life
- No validation at all (current behavior): Already rejected by the spec — this is the bug being fixed

**Implementation notes**:
```ts
const isExpiryInPast = (date: string) => new Date(date) < new Date(new Date().toDateString());
// toDateString() normalizes to midnight, so today's date is never past
```

---

## Decision 6: KITCHEN_CHIEF and STORE_MGR Roles (P2-06)

**Decision**: Add KITCHEN_CHIEF to KITCHEN_REQUEST transitions (DRAFT→SUBMIT, SUBMITTED→FULFILL, SUBMITTED→CANCEL, DRAFT→CANCEL). Add STORE_MGR to ADJUSTMENT, TRANSFER, STOCKTAKE, and GRN transitions with WH_KEEPER-equivalent capabilities plus APPROVE on adjustments within store scope.

**Rationale**:
- KITCHEN_CHIEF scope is well-defined per the spec: submit, fulfill, and cancel kitchen requests only
- STORE_MGR scope per clarification: WH_KEEPER-equivalent operational access plus adjustment approval
- Both roles are already defined in the `UserRole` type and `AuthUserSchema` — only the workflow rules are missing
- Adding roles to `allowedRoles` arrays in `transitionMapV2` is the minimal change

**Alternatives considered**:
- Giving STORE_MGR full INV_MGR privileges: Rejected — violates least privilege; store managers should not manage inventory across all branches
- KITCHEN_CHIEF having issue creation: Per the implementation plan reference, this is evaluated but scoped to kitchen requests for now

**Implementation notes**:
```ts
// KITCHEN_REQUEST transitions (add KITCHEN_CHIEF to existing entries):
[KR_STATUS.DRAFT]: {
  'SUBMIT': { targetStatus: KR_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'KITCHEN_CHIEF', 'STORE_MGR'] },
  'CANCEL': { targetStatus: KR_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'KITCHEN_CHIEF'] },
},
[KR_STATUS.SUBMITTED]: {
  'FULFILL': { targetStatus: KR_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
  'CANCEL': { targetStatus: KR_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'KITCHEN_CHIEF'] },
},
// STORE_MGR added to ADJUSTMENT, TRANSFER, STOCKTAKE, GRN transitions alongside WH_KEEPER
```

---

## Summary

| Decision | Pattern Used | Risk |
|----------|-------------|------|
| Transfer search | `useDebounce` + query param + page reset | Low — follows existing AdjustmentList pattern |
| Warehouse names | `useWarehouses` → `Map<id, name>` with locale | Low — O(1) lookup, small dataset |
| REJECTED→DRAFT | Add transition rule to `transitionMapV2` | Low — follows existing transition pattern |
| Stocktake audit trail | Map `audit_log[]` → timeline entries | Medium — depends on backend data |
| GRN expiry validation | Role-based block/warn with date comparison | Low — simple date check, existing roles |
| KITCHEN_CHIEF/STORE_MGR | Add to `allowedRoles` arrays | Low — only expands existing role sets |

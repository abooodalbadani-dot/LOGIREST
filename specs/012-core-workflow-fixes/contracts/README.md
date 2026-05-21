# Behavioral Contracts: Phase 2 — Core Workflow Fixes

Internal frontend behavioral contracts for the components modified in this phase.

---

## Contract 1: Transfer List Search

**File**: `TransferListClient.tsx` + `useTransferList.ts`

### Behavior
1. `search` state bound to `<Input value={search} onChange={setSearch}>`
2. Debounced via `useDebounce(search, 400)`
3. Passed to `useTransferList({ status, search: debouncedSearch, page })` and appended as `?search=` query param
4. Page resets to 1 on search change: `useEffect(() => setPage(1), [debouncedSearch])`

### Error States
- Empty search → full list restored
- Server returns no results → standard empty state message
- Rapid typing → only final debounced value triggers API call

---

## Contract 2: Warehouse Name Display

**Files**: `TransferListClient.tsx`, `AdjustmentListClient.tsx`, `StocktakeListClient.tsx`

### Behavior
1. Fetch warehouses: `const { data } = useWarehouses()`
2. Build lookup: `new Map(warehouses.map(w => [w.id, { name_en, name_ar }]))` (memoized)
3. Display: `map.get(id)?.[locale === 'ar' ? 'name_ar' : 'name_en'] ?? id`
4. Remove all `tCommon('warehouses.*')` translation key usages

### Error States
- `useWarehouses` fetch fails → fallback to warehouse ID
- Warehouse deleted after cache → falls through to ID
- No locale match → show ID as last resort

---

## Contract 3: REJECTED→DRAFT Edit Transition

**Files**: `document-engine.ts`, `AdjustmentDetailClient.tsx`

### Behavior
1. `transitionMapV2['ADJUSTMENT'][REJECTED] = { EDIT: { targetStatus: DRAFT, allowedRoles: [...] } }`
2. `ActionGuard` renders Edit button when status is REJECTED and role is eligible
3. On click: show rejection reason banner, call API to reset status to DRAFT, load form
4. After resubmit: status returns to SUBMITTED via normal workflow

### Error States
- API call fails → show error toast, keep current state
- Document locked by another user → show conflict message

---

## Contract 4: Stocktake Audit Trail

**Files**: `StocktakeForm.tsx`, `StocktakeViewer.tsx`, `stocktake.ts`

### Behavior
1. Add `audit_log` to `StocktakeSessionSchema` as optional array
2. Map: `(session.audit_log ?? []).map(log => ({ status, at: log.created_at, by: log.user_name || 'System' }))`
3. Fallback: if empty, create single DRAFT entry from `session.created_at` / `session.created_by`
4. Both Form and Viewer use the same mapping logic

### Error States
- `audit_log` missing (legacy) → fallback to single DRAFT entry
- `user_name` null → display "System" or localized equivalent
- Empty log + no `created_at` → display "Unknown" timeline entry

---

## Contract 5: GRN Expiry Date Validation

**File**: GRN lot entry component (goods-received)

### Behavior
1. `isExpiryInPast = new Date(date) < new Date(new Date().toDateString())`
2. WH_KEEPER: BLOCK — prevent save, show error "Expiry date cannot be in the past"
3. INV_MGR / ADMIN: WARN — show warning + require mandatory override reason text input
4. Today's date: ACCEPT (normalized to midnight for comparison)

### Error States
- Invalid date format → standard date input validation error
- Empty date → "Expiry date is required"
- INV_MGR override reason empty → disable save until reason entered

---

## Contract 6: KITCHEN_CHIEF and STORE_MGR Roles

**File**: `document-engine.ts`

### KITCHEN_CHIEF
| Document | Status | Actions Added |
|----------|--------|---------------|
| KITCHEN_REQUEST | DRAFT | SUBMIT, CANCEL |
| KITCHEN_REQUEST | SUBMITTED | FULFILL, CANCEL |

### STORE_MGR
| Document | Status | Actions Added |
|----------|--------|---------------|
| ADJUSTMENT | DRAFT | SUBMIT, CANCEL |
| ADJUSTMENT | SUBMITTED | APPROVE (within store scope) |
| TRANSFER | DRAFT | SUBMIT, CANCEL |
| STOCKTAKE | DRAFT | START (same as WH_KEEPER) |
| GRN | DRAFT | SUBMIT (same as WH_KEEPER) |

### Error States
- Role not in allowedRoles → `canPerformActionV2` returns false → ActionGuard hides button
- Regression check: all existing role permissions must be unchanged

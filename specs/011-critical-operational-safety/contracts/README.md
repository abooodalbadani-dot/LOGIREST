# Behavioral Contracts: Phase 1 — Critical Operational Safety

These are internal frontend behavioral contracts — the expected input/output and error handling guarantees for the components modified in this phase. No new external API contracts are introduced; backend API changes are listed as prerequisites in the spec's Assumptions section.

---

## Contract 1: Adjustment Form — Negative Stock Guard

**Component**: `AdjustmentForm.tsx`  
**Modifies**: `handleSaveDraft`, save/submit button states

### Input
- `lines: AdjustmentLine[]` — the current adjustment lines state

### Behavior
1. On every render, compute `hasNegativeStock`:
   - Iterate all `lines`
   - For each line where `direction === 'DECREASE'` AND `qty_adjusted > (qty_before ?? 0)`, flag as negative
   - `hasNegativeStock = true` if ANY line is negative

2. When `hasNegativeStock === true`:
   - Save and Submit buttons are `disabled`
   - Each offending line row shows an inline error: "Exceeds available stock"
   - `handleSaveDraft` returns early with `toast.error("Cannot save adjustment with negative stock")`

3. When `hasNegativeStock === false`:
   - Save and Submit buttons are enabled (subject to other guards)
   - No inline errors shown for stock
   - Form behaves exactly as before

### Output
- No API call is made when negative stock exists (client-side gate)
- Error toast is shown to user with localized message

### Error States
- `qty_before` is null/undefined → treated as 0 (cannot decrease below zero)
- `qty_adjusted` is negative → unexpected input; the guard still works (qty_adjusted > 0 check)

---

## Contract 2: Batch Approve/Post — Version-Locked Execution

**Component**: `AdjustmentListClient.tsx`  
**Modifies**: `handleBatchApprove`, `handleBatchPost`

### Input
- `selectedIds: Set<string>` — user-selected adjustment IDs
- `user.role: string` — current user's role

### Behavior

#### Phase 1: Workflow Eligibility Filter (P1-03)
1. Map `selectedIds` to `selectedItems` from current page data
2. For each item, call `canPerformActionV2('ADJUSTMENT', item.status, action, user.role)`
3. Split into `eligible` (pass) and `skipped` (fail)
4. If `skipped > 0`: show toast `"N adjustments skipped (not eligible)"`
5. Proceed with `eligible` items only

#### Phase 2: Version Pre-fetch (P1-02)
1. For each eligible ID, fetch `GET /operations/adjustments/${id}` 
2. Build `Map<string, number>` → `id → version`
3. IDs that fail pre-fetch are added to failure summary

#### Phase 3: Mutation Loop
1. For each ID in versionMap, call either:
   - `approveAdjustment.mutateAsync({ id, version: versionMap.get(id)! })` 
   - `postAdjustment.mutateAsync({ id, version: versionMap.get(id)! })`
2. Successful mutations → add to success count
3. Failed mutations (409 or other) → add to failure summary with reason

#### Phase 4: Completion
1. `queryClient.invalidateQueries({ queryKey: ['adjustments'] })`
2. Display summary: success count, failure count, and per-item failure reasons

### Output
- Summary displayed to user via a dedicated result dialog or toast
- Cache invalidated so list reflects new state

### Error States
| Condition | Handling |
|-----------|----------|
| Document deleted between selection and pre-fetch | Skip ID, report as "deleted" |
| 409 version conflict during mutation | Skip ID, report as "modified by another user" |
| 401 during any step | Session expired — redirect to login (Phase 0 handler) |
| Network error during pre-fetch | Retry once, then skip with "unavailable" reason |
| All items are ineligible | Show toast "No eligible adjustments selected" |
| No items selected | Button should be disabled (existing guard, unchanged) |

---

## Contract 3: Auth Provider — Session Validation on Mount

**Component**: `AuthProvider.tsx`  
**Modifies**: init `useEffect`

### Input
- Token from HttpOnly cookie (read via existing `getTokenCookie()`)
- Or no token (unauthenticated state)

### Behavior (new, inserted into existing init flow)

```
1. Read token from cookie (existing)
2. If token exists:
   a. Decode JWT payload for preliminary user data (existing)
   b. Call GET /auth/me with 10s AbortSignal timeout (NEW)
      - 200: Parse response with AuthUserSchema, update user state with server data
      - 401: Clear local state, redirect to /login?reason=expired, RETURN (skip step 3)
      - Timeout/network error: Clear local state, redirect to /login?reason=verification_failed, RETURN
   c. Restore activeScope from localStorage (existing)
   d. setUser(finalUser) (existing, but with server-validated data)
   e. setIsLoading(false) (existing)
3. If no token:
   a. setIsLoading(false) (existing, unchanged)
```

### Output
- `isLoading = true` until `/auth/me` resolves or fails
- User state reflects server-verified role and scopes
- If validation fails, user is on /login page (no flash of protected content)

### Error States
| Condition | Handling |
|-----------|----------|
| `/auth/me` returns 401 | Clear all state, redirect to `/login?reason=expired` |
| `/auth/me` timeout (10s) | Clear all state, redirect to `/login?reason=verification_failed` |
| `/auth/me` returns other 4xx/5xx | Clear all state, redirect to `/login?reason=verification_failed` |
| AbortController fires before timeout | Clean abort; no redirect; proceed as normal (only aborted by component unmount) |

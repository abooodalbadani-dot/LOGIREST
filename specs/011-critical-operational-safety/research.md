# Research: Phase 1 — Critical Operational Safety

**Date**: 2026-05-21  
**Feature**: [spec.md](./spec.md)

## Research Scope

All technology choices are predetermined (Next.js 16, React 19, TanStack Query 5, Zod 4, next-intl 4). Research focuses on implementation patterns within the existing codebase.

---

## Decision 1: Negative Stock Guard (P1-01)

**Decision**: Compute `hasNegativeStock` via `useMemo` on lines state. Block save with early return + toast. Disable buttons. Show per-line inline error using existing `cn()` and `text-red-500` pattern.

**Rationale**:
- `qty_after` is already computed at render time in `extraColumns` (line 588-603 of `AdjustmentForm.tsx`), including the red highlight for negative values
- `qty_before` is fetched per-item from `/inventory/balance` on scan (line 299-304) and warehouse change (line 153-158)
- Adding a `useMemo` that checks `direction === 'DECREASE' && qty_adjusted > (qty_before ?? 0)` is the simplest approach — no need to store `qty_after` in state since it's derived data
- Existing UI already has the visual indicator (`after < 0 ? "text-red-500"`); we add the blocking logic
- `handleSaveDraft` is the save handler; early return before the API call is the ideal intercept point

**Alternatives considered**:
- Storing `qty_after` in state: Adds synchronization burden; `qty_after` is derived from `qty_before` and `qty_adjusted`, so computing inline is more reliable
- Server-side only validation: Insufficient — users would waste time filling forms that fail at post; client-side guard provides immediate feedback
- Form-level validation via react-hook-form `setError`: More complex integration with the existing inline `extraColumns` cell rendering pattern; `useMemo` + button disable is simpler and achieves the same outcome

**Implementation notes**:
```ts
const hasNegativeStock = useMemo(
  () => lines.some(line => line.direction === 'DECREASE' && line.qty_adjusted > (line.qty_before ?? 0)),
  [lines]
);
```
- `qty_before` defaults to 0 when null/undefined (nullish coalescing `?? 0`)
- Per-line inline error: `{line.direction === 'DECREASE' && line.qty_adjusted > (line.qty_before ?? 0) && <span className="text-red-500 text-sm">{t('errors.exceeds_available_stock')}</span>}`

---

## Decision 2: Batch Version Locking (P1-02)

**Decision**: Pre-fetch full adjustment documents for all selected IDs immediately before the batch loop. Build a `Map<string, number>` mapping `id → version`. Use `versionMap.get(id) ?? 0` in each mutation call. Handle fetch failures by skipping the ID.

**Rationale**:
- The hardcoded `version: 0` is at lines 84 and 101 of `AdjustmentListClient.tsx`
- Pre-fetching documents gives us both the version AND validates the document still exists (fetch failure = deleted)
- `useApproveAdjustment` and `usePostAdjustment` already accept `{ id, version, signal }` — no API change needed
- Using a `Map` for O(1) lookup in the batch loop is efficient even for large selections

**Alternatives considered**:
- Fetching a light endpoint returning only `{ id, version }`: Would require a new backend endpoint; using the existing detail endpoint avoids backend work for this frontend phase
- Including version in list query response: The list already returns version per item, but by the time the user clicks batch approve, minutes may have passed — the list data is stale. Pre-fetching just-in-time is correct.
- Batching all version pre-fetches in parallel `Promise.all`: Could overwhelm the server for large selections (>100). Sequential fetch is simpler and acceptable for typical batch sizes (5-50).
- Using `Promise.allSettled` with a concurrency limit: Over-engineering for this scope; `Promise.all` with individual `.catch()` is sufficient.

**Implementation notes**:
```ts
const docs = await Promise.all(
  [...selectedIds].map(id => 
    apiClient.get(`/operations/adjustments/${id}`, AdjustmentDetailSchema)
      .catch(() => null) // deleted or inaccessible
  )
);
const versionMap = new Map(
  docs.filter(Boolean).map(d => [d.id, d.version])
);
```
- IDs that fail pre-fetch (null) are excluded from the versionMap and reported as failures
- The batch loop iterates only over IDs present in the versionMap

---

## Decision 3: Batch Workflow Eligibility (P1-03)

**Decision**: Filter selected items through `canPerformActionV2(documentType, item.status, action, user.role)` before the batch loop. Use existing mutation hooks (`useApproveAdjustment`, `usePostAdjustment`) instead of raw `apiClient.post`.

**Rationale**:
- `canPerformActionV2` is already imported and used via `ActionGuard` component — calling it directly for batch filtering is consistent with the single-document workflow
- The mutation hooks implement `useSafeMutation` with proper `onConflict` handling, optimistic cache updates, and `queryClient.invalidateQueries` — raw `apiClient.post` bypasses all of this
- The current batch approve uses `apiClient.post(...)` raw (line 84); batch post uses `postAdjustment.mutateAsync(...)` (line 101) but with `version: 0` — both need fixing
- After filtering, only eligible items enter the version-locked batch loop from P1-02

**Alternatives considered**:
- Using `ActionGuard` for each item: Not viable — `ActionGuard` is a UI component that renders/doesn't render children; batch needs programmatic filtering
- Skipping workflow check entirely and relying on backend 400/403: Violates the goal of informing users which items were skipped BEFORE firing API calls; wastes API calls on guaranteed failures

**Implementation notes**:
```ts
const action = 'APPROVE'; // or 'POST'
const eligible = selectedItems.filter(item =>
  canPerformActionV2('ADJUSTMENT', item.status, action, user.role)
);
const skipped = selectedItems.length - eligible.length;
if (skipped > 0) toast.warning(t('batch.skipped_n_ineligible', { count: skipped }));
```
- `selectedItems` is derived from `selectedIds` filtered through the page data
- After filtering, `eligible` items proceed through the version-locked batch loop from P1-02

---

## Decision 4: Session Validation on Mount (P1-04)

**Decision**: Insert a `GET /auth/me` call in `AuthProvider`'s init `useEffect` after reading the stored token and before setting `isLoading = false`. On 401: clear local state + redirect to `/login?reason=expired`. On 200: update user state with server-returned data.

**Rationale**:
- Current flow (line 75-120 of `AuthProvider.tsx`): reads token → decodes JWT → validates with Zod schema → sets user → `setIsLoading(false)`. No server verification.
- The `/auth/me` call fits naturally between JWT decode (line 83) and setting user state (line 95)
- By keeping `isLoading = true` until the call resolves, protected routes show a loading skeleton instead of dashboard content
- Existing `login()`, `logout()`, `setUser()`, `deleteTokenCookie()` are already available in the component

**Alternatives considered**:
- Making the `/auth/me` call in middleware instead: Middleware can't update React state, so the frontend would still need a mechanism to reflect role changes. An API call in the component is more direct.
- Calling `/auth/me` on every route change: Wasteful — once per mount is sufficient for session validation; role changes between pages are unlikely within a single session.
- Proceeding optimistically on timeout (rejected per clarification): Security-first posture requires redirect to login on verification failure.

**Implementation notes**:
```ts
// After JWT decode, before setUser/setIsLoading:
try {
  const meResponse = await apiClient.get('/auth/me', AuthUserSchema);
  setUser(meResponse);
} catch (err) {
  if (err.response?.status === 401) {
    deleteTokenCookie();
    localStorage.removeItem('logirest_user_overrides');
    localStorage.removeItem('logirest_active_scope');
    router.replace('/login?reason=expired');
    return; // don't set isLoading(false)
  }
  // For non-401 errors (network, timeout), redirect to login per clarification
  deleteTokenCookie();
  localStorage.removeItem('logirest_user_overrides');
  localStorage.removeItem('logirest_active_scope');
  router.replace('/login?reason=verification_failed');
  return;
}
```
- 10-second timeout via `AbortController` + `setTimeout`
- Must not `setIsLoading(false)` or `setUser()` after a failed validation to prevent flash of authenticated content

---

## Decision 5: Translation Key Convention

**Decision**: Add new keys following the existing `{namespace}.errors.{error_code}` pattern. Place in both `messages/en.json` and `messages/ar.json` with 1:1 structural parity.

**New keys required**:

| Key | English | Arabic |
|-----|---------|--------|
| `operations.adjustment.errors.negative_stock_not_allowed` | "Cannot save adjustment with negative stock" | "لا يمكن حفظ التسوية بمخزون سالب" |
| `operations.adjustment.errors.exceeds_available_stock` | "Exceeds available stock" | "يتجاوز المخزون المتاح" |
| `batch.skipped_n_ineligible` | "{count} adjustments skipped (not eligible)" | "تم تخطي {count} تسوية (غير مؤهلة)" |
| `auth.session_verification_failed` | "Unable to verify your session. Please log in again." | "تعذر التحقق من جلستك. يرجى تسجيل الدخول مرة أخرى." |

**Rationale**: 
- `operations.adjustment.errors.*` namespace already exists with keys like `insufficient_stock`, `approve_failed`
- `batch.*` follows the convention seen in other lists
- `auth.*` is a new namespace but consistent with the domain-based key structure

---

## Summary

| Decision | Pattern Used | Risk |
|----------|-------------|------|
| Negative stock guard | `useMemo` + early return + button disable | Low — derived data, no new state |
| Batch version locking | Pre-fetch detail docs → `Map<id, version>` | Low — uses existing API endpoint |
| Batch workflow filter | `canPerformActionV2` + mutation hooks | Low — uses existing functions/hooks |
| Session validation | `apiClient.get('/auth/me')` in init effect | Medium — depends on backend endpoint |
| Translation keys | `{namespace}.errors.{key}` convention | Low — follows existing patterns |

# Research: Phase 3 — Data Integrity & Scope Isolation

**Date**: 2026-05-21
**Feature**: [spec.md](./spec.md)

## Research Scope

All technology choices are predetermined (Next.js 16, React 19, TanStack Query 5, Zod 4, next-intl 4). Research focuses on implementation patterns within the existing codebase.

---

## Decision 1: Enforce Active Scope on All Operational Queries (P3-01)

**Decision**: Create a `useOperationalScope()` hook that reads `warehouseId` and `branchId` from `useAuth().activeScope`. Modify every operational list hook to (a) include scope params in the query key array, (b) attach scope params as query string parameters in the API call, and (c) filter mutation API calls by scope. Apply the same scope params to mutation hooks.

**Rationale**:
- `activeScope` already exists in `AuthProvider` with `warehouseId`, `branchId`, `departmentId` — it is set by the context selector UI and persisted to localStorage
- `useContextScope()` already wraps `useAuth().activeScope` for UI chrome — a separate `useOperationalScope()` hook avoids pulling master-data entity lookup into list hooks
- Adding `warehouseId` to the query key (`['adjustments', { status, warehouseId, branchId }]`) ensures TanStack Query automatically refetches when scope changes — no manual invalidation needed
- The existing `useStocktakeList` already supports `warehouse_id` as a filter and is the pattern to follow for the other three hooks
- Per clarification Q4, scope enforcement extends to mutations (approve, post, cancel, edit) — mutation hooks must also pass scope params
- Per clarification Q1/Q2, UI-level guards (FR-002a, FR-003a, FR-004a) handle the UX: empty state on no scope, skeleton on scope change, access-denied on detail view scope violation

**Alternatives considered**:
- **Middleware-based scope enforcement**: Adding a Next.js server component or proxy.ts check. Rejected: would require server-side session awareness and would break mock adapter development mode. Client-side query parameter filtering is sufficient given backend also validates.
- **Single `useOperationalQuery` wrapper**: Creating a generic hook that auto-injects scope. Rejected: existing hooks are already typed to their specific schemas; a wrapper would add unnecessary abstraction.
- **Query key as `['adjustments', warehouseId, ...]`**: Using warehouseId as a separate query key segment. Rejected: the existing pattern spreads `filters` as a single object; keeping warehouseId inside the filters object is more consistent.

**Implementation notes**:
```ts
// hooks/useOperationalScope.ts
export function useOperationalScope() {
  const { activeScope } = useAuth();
  return { warehouseId: activeScope.warehouseId, branchId: activeScope.branchId };
}

// Modified list hook pattern:
export function useAdjustmentList(filters: AdjustmentListFilters = {}) {
  const { warehouseId, branchId } = useOperationalScope();
  return useQuery({
    queryKey: ['adjustments', { ...filters, warehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(
      `/operations/adjustments?warehouse_id=${warehouseId ?? ''}&branch_id=${branchId ?? ''}&...`,
      paginatedSchema(AdjustmentSummarySchema), { signal }
    ),
  });
}
```

---

## Decision 2: Server-Side Summary KPI Endpoints (P3-02)

**Decision**: Create three new custom hooks (`useAdjustmentSummary`, `useTransferSummary`, `useStocktakeSummary`) that call dedicated backend summary endpoints. Replace all client-side `data?.data?.filter(...)` metric computations in list client components with data from these hooks. Invalidate summary query keys on all relevant mutations.

**Rationale**:
- Current metrics are computed from `data?.data?.filter(...)` on the paginated page response (typically 10 items) — status-specific counts are page-local, not global
- The existing pattern of `useQuery` with typed Zod schemas is well established across the codebase
- Separate hooks keep the summary data independent from the paginated list — summary can be cached differently (e.g., longer staleTime) than the list
- `invalidateQueries({ queryKey: ['adjustments', 'summary'] })` can be added to existing mutation hooks' `onSuccess` callbacks
- The stocktake list already has a 10s `refetchInterval` pattern; this can be preserved on the summary hook for stocktake where counts change frequently

**Alternatives considered**:
- **Embed summary in list response**: Adding `_summary` field to the paginated list response. Rejected: couples summary to pagination params; summary should be cacheable independently; the list query may be stale while summary is fresh.
- **Polling for all summaries**: Using `refetchInterval` like stocktake. Rejected: adjustment/transfer summaries don't need polling; invalidation-on-mutation is sufficient and reduces network load.
- **WebSocket push**: Real-time summary updates. Rejected: explicitly out of scope per spec assumptions.

**Backend contract needed**:
- `GET /operations/adjustments/summary?warehouse_id=&branch_id=` → `{ total: number; pending: number; critical_losses: number }`
- `GET /operations/transfers/summary?warehouse_id=&branch_id=` → `{ total: number; in_transit: number; overdue_count: number }`
- `GET /stocktake/sessions/summary?warehouse_id=&branch_id=` → `{ total: number; in_progress: number; posted: number }`

---

## Decision 3: Configurable Overdue Threshold via Environment Variable (P3-03)

**Decision**: Create `apps/web/src/contracts/operational-config.ts` that reads `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS` with a fallback to 3. The overdue count is computed server-side in the transfer summary endpoint using this threshold. The client reads the threshold for display purposes (overdue banner threshold text) but does not compute overdue counts client-side.

**Rationale**:
- Environment variables are the established mechanism for Next.js client-side configuration (prefix `NEXT_PUBLIC_`)
- Default of 3 days preserves backward compatibility
- Moving overdue computation server-side aligns with P3-02 (server-side aggregation) and eliminates the client-side `filter(i => shippedBefore > 3 days)` pattern
- Fallback to 3 on invalid/non-numeric values (per edge case requirement)

**Alternatives considered**:
- **Per-warehouse threshold**: Different overdue days per warehouse. Rejected: adds complexity not justified by current requirements; can be added later.
- **Database-stored configuration**: Settings table with admin UI. Rejected: out of scope for this phase per spec assumptions.

---

## Decision 4: Cache Invalidation on Warehouse/Item Mutations (P3-04)

**Decision**: Add `queryClient.invalidateQueries({ queryKey: ['warehouses'] })` to `useCreateWarehouse` and `useUpdateWarehouse` `onSuccess` callbacks. Same pattern for items. The existing fuzzy invalidation already exists in some hooks — verify and ensure consistency across all four mutation hooks.

**Rationale**:
- The `onSuccess` callback is the established pattern in the codebase (already used in `useCreateTransfer`, `useCreateAdjustment`)
- Fuzzy invalidation (`['warehouses']` without filters) ensures all warehouse comboboxes across the app refresh, regardless of what branch/search filters they were fetched with
- This is a bug fix: the hooks may already have invalidation but it was confirmed ineffective in some cases; the fix ensures the invalidation is present and correctly keyed
- No cross-domain invalidation is needed in this phase (e.g., deleting a warehouse does not need to invalidate adjustment lists — adjustment list data comes from a different API that returns warehouse names server-side per P2-02)

**Alternatives considered**:
- **Optimistic cache update via `setQueryData`**: Manually inserting the new warehouse into the cache. Rejected: `invalidateQueries` is simpler and ensures consistency with the server; the 5-second SC-004 window allows for a refetch.
- **Cross-domain invalidation**: Invalidating `['adjustments']` etc. when warehouse is renamed. Rejected: P2-02 already made warehouse names come from entity joins server-side; client-side list data doesn't contain stale warehouse names.

---

## Decision 5: Unified RBAC via Role Capabilities Contract (P3-05)

**Decision**: Create `apps/web/src/contracts/role-capabilities.ts` as the single source of truth for per-document-type role capabilities. Refactor both `usePermission` (via `PERMISSION_MATRIX`) and `document-engine.ts` (via `transitionMapV2.allowedRoles`) to derive their role checks from this contract. The contract defines capabilities at the granularity of `{ documentType: { action: Role[] } }`.

**Rationale**:
- The current codebase has two separate permission models: `PERMISSION_MATRIX` in `types/rbac.ts` (resource/action matrix) and `transitionMapV2.allowedRoles` in `document-engine.ts` (per-transition role lists)
- These models are manually kept in sync — adding a role requires changing both, creating divergence risk
- A centralized contract eliminates the synchronization problem
- The contract uses the `as const` pattern for type safety, allowing TypeScript to infer exact role sets
- Both `usePermission` and `canPerformActionV2` become thin wrappers that read from the same data

**Alternatives considered**:
- **Merge into types/rbac.ts**: Extending the existing PERMISSION_MATRIX. Rejected: the matrix maps `ResourceType -> ActionType[]` which is too coarse for workflow transitions (APPROVE needs to know the document type AND current status). The capability contract needs to be document-type-aware, not resource-type-aware.
- **Server-driven permissions**: Fetching capabilities from an API endpoint. Rejected: adds network latency for every permission check; permissions are static per role and can be bundled client-side.
- **Keep both models and add cross-validation tests**: Unit tests that verify consistency. Rejected: tests catch divergence but don't prevent it; a single source of truth is a stronger guarantee.

**Capability contract structure**:
```ts
export const ROLE_CAPABILITIES = {
  adjustment: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
    submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
    approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
    post: ['ADMIN', 'INV_MGR'],
    cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
    edit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
    reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
  },
  transfer: { /* ... */ },
  issue: { /* ... */ },
  stocktake: { /* ... */ },
  // ... all document types
} as const;
```

---

## Summary of Key Decisions

| # | Task | Decision | Key Rationale |
|---|------|----------|---------------|
| 1 | P3-01 | `useOperationalScope()` hook + scope in queryKey/queryFn | Reuses existing `activeScope`; auto-refetches via TanStack Query on scope change |
| 2 | P3-02 | Dedicated summary hooks with server endpoints | Separate cache; correct cross-dataset counts; independent staleness |
| 3 | P3-03 | `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS` env var + server-side overdue count | Existing Next.js pattern; backward compatible; aligns with P3-02 |
| 4 | P3-04 | `invalidateQueries` in `onSuccess` callbacks | Established TanStack Query pattern; fuzzy invalidation covers all filtered queries |
| 5 | P3-05 | Centralized `role-capabilities.ts` contract | Single source of truth eliminates dual-maintenance of permission models |

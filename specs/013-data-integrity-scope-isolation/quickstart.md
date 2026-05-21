# Quickstart: Phase 3 — Data Integrity & Scope Isolation

**Date**: 2026-05-21
**Feature**: [spec.md](./spec.md)

## Overview

Phase 3 fixes five data integrity issues in the LogiRest frontend. This guide helps developers understand the changes and verify them.

## Prerequisites

- Backend provides the three summary endpoints (see [contracts/README.md](contracts/README.md))
- Backend supports `warehouse_id` and `branch_id` query parameters on all operational list endpoints and mutations
- `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS` environment variable set (optional, defaults to 3)

## Key Files Changed

| File | Change |
|------|--------|
| `hooks/useOperationalScope.ts` | **NEW** — extracts warehouseId/branchId from AuthProvider |
| `contracts/role-capabilities.ts` | **NEW** — single source of truth for role permissions |
| `contracts/operational-config.ts` | **NEW** — TRANSFER_OVERDUE_DAYS from env |
| `features/operations/hooks/useAdjustmentList.ts` | P3-01: Add scope to queryKey/queryFn |
| `features/operations/hooks/useTransferList.ts` | P3-01: Add scope to queryKey/queryFn |
| `features/operations/hooks/useIssueList.ts` | P3-01: Add scope to queryKey/queryFn |
| `features/operations/hooks/useStocktakeList.ts` | P3-01: Normalize scope consumption |
| `features/operations/hooks/useAdjustmentSummary.ts` | **NEW** — P3-02 summary hook |
| `features/operations/hooks/useTransferSummary.ts` | **NEW** — P3-02 summary hook |
| `features/operations/hooks/useStocktakeSummary.ts` | **NEW** — P3-02 summary hook |
| `app/.../adjustments/AdjustmentListClient.tsx` | P3-02: Replace metrics with summary hook |
| `app/.../transfers/TransferListClient.tsx` | P3-02, P3-03: Replace metrics; configurable threshold |
| `app/.../stocktake/StocktakeListClient.tsx` | P3-02: Replace metrics with summary hook |
| `features/warehouses/hooks/useCreateWarehouse.ts` | P3-04: Add invalidateQueries |
| `features/warehouses/hooks/useUpdateWarehouse.ts` | P3-04: Add invalidateQueries |
| `features/items/hooks/useCreateItem.ts` | P3-04: Add invalidateQueries |
| `features/items/hooks/useUpdateItem.ts` | P3-04: Add invalidateQueries |
| `hooks/usePermission.ts` | P3-05: Refactor to derive from role-capabilities |
| `core/workflow/document-engine.ts` | P3-05: Refactor to derive from role-capabilities |
| `infrastructure/mock/mock-api.adapter.ts` | P3-01, P3-02: Add scope filtering + summary handlers |

## Verification Flow

### 1. Scope Isolation (P3-01)

1. Log in as `WH_KEEPER` with scope set to Warehouse A
2. Navigate to Adjustments list → only Warehouse A adjustments visible
3. Switch scope to Warehouse B → skeleton appears → list refetches with Warehouse B data
4. Manually navigate to a Warehouse A adjustment detail URL → access-denied page shown
5. Log in as `ADMIN` → all warehouses visible; no scope restriction applied

### 2. KPI Metrics (P3-02)

1. Seed 200 pending adjustments (via mock adapter)
2. Navigate to Adjustments list (page size 10) → "Pending" card shows 200, not 10
3. Approve one adjustment → "Pending" card decrements to 199 within 3 seconds
4. Apply warehouse filter → KPI cards show counts scoped to that warehouse only

### 3. Configurable Threshold (P3-03)

1. Set `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS=5` in `.env.local`
2. Restart dev server → overdue banner uses 5-day threshold
3. Verify transfers shipped 4 days ago are NOT flagged as overdue
4. Set invalid value (`NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS=abc`) → falls back to 3

### 4. Cache Invalidation (P3-04)

1. Navigate to a form with a warehouse combobox (e.g., new adjustment)
2. In another tab, create a new warehouse
3. Return to the adjustment form → open warehouse combobox → new warehouse appears
4. Repeat with item creation → item appears in item selector

### 5. Unified RBAC (P3-05)

1. For each role-documentType-action combination: verify `usePermission` and `canPerformActionV2` agree
2. Add a new role to `ROLE_CAPABILITIES` → verify both systems reflect the change
3. Verify no divergence: button visible = action permitted; button hidden = action denied

## Running Tests

```bash
# Type check
npx tsc --noEmit

# Unit tests (RBAC, API)
npx vitest run src/tests/unit/

# E2E: Scope isolation happy path
npx playwright test tests/e2e/ --grep "scope"
```

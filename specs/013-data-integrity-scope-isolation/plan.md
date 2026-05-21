# Implementation Plan: Phase 3 — Data Integrity & Scope Isolation

**Branch**: `013-data-integrity-scope-isolation` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/013-data-integrity-scope-isolation/spec.md`

## Summary

Fix five data integrity and scope isolation issues in the LogiRest frontend: (1) enforce warehouse scope on all operational API queries and mutations, (2) replace page-slice KPI metrics with server-side summary endpoints, (3) make the transfer overdue threshold configurable via environment variable, (4) fix warehouse and item query cache invalidation after create/update, and (5) unify the two divergent RBAC models (usePermission/PermissionGate vs workflow engine/canPerformActionV2) into a single source of truth. All changes are frontend-side with prerequisite backend API endpoints.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ESM)
**Primary Dependencies**: Next.js 16.2.4, React 19.2.4, TanStack Query 5.99, TanStack Table 8.21, react-hook-form 7.72, Zod 4.3, next-intl 4.9, Tailwind CSS 4, shadcn/ui 4.3.0
**Storage**: N/A (frontend only; backend provides REST API with PostgreSQL)
**Testing**: Vitest 4.1.4 (jsdom, `src/tests/unit/`), Playwright 1.59.1 (`tests/e2e/`), `tsc --noEmit`
**Target Platform**: Web browser (desktop, tablet for warehouse/kitchen environments)
**Project Type**: Frontend web application (monorepo `apps/web` + `packages/contracts`)
**Performance Goals**: Scope change refetch <2s; summary endpoint response <3s post-mutation; warehouse/item cache refresh <5s
**Constraints**: RTL-first (Arabic default), Nocturne dark theme, all strings via next-intl, zero `any` types
**Scale/Scope**: ~15 operational screens, 100K documents across 20 warehouses, 10 user roles, single-region deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Active Phase Alignment

| Constitution Requirement | Status | Evidence |
|---|---|---|
| Work is stabilization, not new feature | ✅ PASS | All 5 tasks fix existing bugs/deficiencies: missing scope enforcement, incorrect metrics, hardcoded threshold, stale cache, divergent RBAC models |
| No UI redesign | ✅ PASS | Zero visual changes beyond functional additions: skeleton loaders, access-denied page, empty-state messages |
| No backend work | ✅ PASS | Backend summary endpoints and scope query params are external prerequisites; only frontend consumption code is in scope |
| No architectural experimentation | ✅ PASS | Uses existing patterns: TanStack Query hooks, Zod schemas, next-intl translations, environment variable config |

### Stabilization Step Alignment

| Step | Requirement | Covered By |
|---|---|---|
| Step 2: Mutation & Redirect Compliance | No mutation without version; no bypass of Conflict Layer | P3-01 (scope on mutations enforces ownership); P3-04 (cache invalidation prevents stale data conflicts) |
| Step 3: Guard Integrity | Prevent data corruption | P3-03 (configurable threshold prevents false overdue flags); P3-04 (stale cache correction) |
| Step 5: UX Completeness | No dead-end workflow states | P3-01 (empty state on no-scope, access-denied on scope violation); P3-02 (accurate KPI cards) |
| Step 6: Runtime Cleanliness | No silent data corruption; Conflict Layer verified | P3-02 (server-side aggregation ensures metric accuracy); P3-05 (unified RBAC prevents permission gaps) |

### Principle Gates

| Principle | Status | Notes |
|---|---|---|
| I. Safety-first: high-stakes actions require explicit confirmation | ✅ PASS | Scope enforcement on mutations (FR-001) prevents unauthorized posting/approval |
| II. Auditability: all corrections require audit reason | ✅ PASS | Not modified; scope enforcement adds additional audit trail context |
| II. Security: Least Privilege (users only see scoped data) | ✅ PASS | P3-01 directly implements this principle |
| III. Data/Workflow: State Management — TanStack Query for server state | ✅ PASS | P3-02 adds server-side aggregation; P3-04 fixes cache invalidation |
| IV. Permissions: use PermissionGate/usePermission to gate UI | ✅ PASS | P3-05 unifies the two RBAC models under one contract |

### Verification Checklist (from Constitution §How to verify compliance)

| Check | Status |
|---|---|
| Does it work in RTL? | ✅ All additions use next-intl translations; no hardcoded layout |
| Is it readable in Dark Mode (Nocturne)? | ✅ Skeleton loaders and access-denied page use Nocturne tokens |
| Is every string translated? | ✅ Adding new i18n keys for empty-scope message, access-denied, skeleton aria-labels |
| Is the document POST state handled correctly? | ✅ Scope enforced on mutations; stale data cleared before transition |
| Are numeric values LTR? | ✅ KPI card numbers remain `dir="ltr"` |
| Does the change strictly align with Stabilization Phase? | ✅ All tasks are bug fixes / data integrity hardening |

**GATE RESULT: ✅ ALL CHECKS PASSED — Proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/013-data-integrity-scope-isolation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── README.md
│   ├── summary-endpoints.md
│   └── role-capabilities.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/src/
├── hooks/
│   ├── usePermission.ts              # P3-05: Refactor to derive from role-capabilities contract
│   └── useOperationalScope.ts        # P3-01: NEW — returns { warehouseId, branchId } from AuthProvider
├── core/workflow/
│   └── document-engine.ts            # P3-05: Refactor to derive allowedRoles from role-capabilities contract
├── contracts/
│   ├── role-capabilities.ts          # P3-05: NEW — single source of truth for role → capability mapping
│   └── operational-config.ts         # P3-03: NEW — TRANSFER_OVERDUE_DAYS from env
├── features/
│   ├── operations/hooks/
│   │   ├── useAdjustmentList.ts      # P3-01: Add warehouseId/branchId to queryKey + queryFn
│   │   ├── useTransferList.ts        # P3-01: Add warehouseId/branchId to queryKey + queryFn
│   │   ├── useIssueList.ts           # P3-01: Add warehouseId/branchId to queryKey + queryFn
│   │   ├── useStocktakeList.ts       # P3-01: Add warehouseId/branchId to queryKey + queryFn
│   │   ├── useAdjustmentSummary.ts   # P3-02: NEW — server-side KPI aggregation hook
│   │   ├── useTransferSummary.ts     # P3-02: NEW — server-side KPI aggregation hook
│   │   └── useStocktakeSummary.ts    # P3-02: NEW — server-side KPI aggregation hook
│   ├── warehouses/hooks/
│   │   ├── useCreateWarehouse.ts     # P3-04: Add invalidateQueries onSuccess
│   │   └── useUpdateWarehouse.ts     # P3-04: Add invalidateQueries onSuccess
│   └── items/hooks/
│       ├── useCreateItem.ts          # P3-04: Add invalidateQueries onSuccess
│       └── useUpdateItem.ts          # P3-04: Add invalidateQueries onSuccess
├── app/[locale]/(app)/(operations)/
│   ├── adjustments/
│   │   └── AdjustmentListClient.tsx  # P3-02: Replace page-slice metrics with summary hook; P3-01: wire scope
│   ├── transfers/
│   │   └── TransferListClient.tsx    # P3-02: Replace page-slice metrics; P3-01: wire scope; P3-03: use configurable threshold
│   ├── stocktake/
│   │   └── StocktakeListClient.tsx   # P3-02: Replace page-slice metrics; P3-01: wire scope
│   └── issues/
│       └── IssueListClient.tsx       # P3-01: Wire scope
└── infrastructure/mock/
    └── mock-api.adapter.ts           # P3-01, P3-02: Add scope filtering + summary endpoint handlers
```

**Structure Decision**: Uses existing monorepo structure (`apps/web/`). New files are created only where no existing pattern exists (`useOperationalScope.ts`, `role-capabilities.ts`, `operational-config.ts`, `use*Summary.ts` hooks). All other changes modify existing files.

## Complexity Tracking

> No constitution violations. This section intentionally empty.

# Implementation Plan: Phase 2 — Core Workflow Fixes

**Branch**: `012-core-workflow-fixes` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/012-core-workflow-fixes/spec.md`

## Summary

Fix six core workflow issues: broken transfer search, warehouse names using translation keys instead of entity data, missing REJECTED→DRAFT edit transition for adjustments, stocktake audit trail showing only current status, missing GRN expiry date validation, and locked-out KITCHEN_CHIEF/STORE_MGR roles. All changes are frontend-side on the existing Next.js 16 App Router codebase.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ESM)  
**Primary Dependencies**: Next.js 16.2.4, React 19.2.4, TanStack Query 5.99, TanStack Table 8.21, react-hook-form 7.72, Zod 4.3, next-intl 4.9, Tailwind CSS 4, shadcn/ui 4.3.0  
**Storage**: N/A (frontend only; backend provides REST API)  
**Testing**: Vitest 4.1.4 (jsdom, `src/tests/unit/`), Playwright 1.59.1 (`tests/e2e/`), `tsc --noEmit`  
**Target Platform**: Web browser (desktop, tablet for warehouse/kitchen environments)  
**Project Type**: Frontend web application (monorepo apps/web + packages/contracts)  
**Performance Goals**: Transfer search debounce ~400ms; warehouse name lookup synchronous from cached data; stocktake audit trail rendering <200ms for up to 20 entries  
**Constraints**: RTL-first (Arabic default), Nocturne dark theme, all strings via next-intl, zero `any` types  
**Scale/Scope**: ~15 operational screens, 7 user roles (adding STORE_MGR and KITCHEN_CHIEF to workflow), multi-warehouse (dynamic)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Active Phase Alignment

| Constitution Requirement | Status | Evidence |
|---|---|---|
| Work is stabilization, not new feature | ✅ PASS | All 6 tasks fix existing broken behavior — search, display, workflow gaps, missing validation |
| No UI redesign | ✅ PASS | Functional fixes only; visual changes limited to error messages and button additions |
| No backend work | ✅ PASS | Backend audit_log array and search query param are external prerequisites |
| No architectural experimentation | ✅ PASS | Uses existing patterns: TanStack Query, react-hook-form, workflow engine, entity hooks |

### Stabilization Step Alignment

| Step | Requirement | Covered By |
|---|---|---|
| Step 2: Mutation & Redirect Compliance | Workflow transitions complete | P2-03 (REJECTED→DRAFT edit), P2-06 (role enablement) |
| Step 5: UX Completeness | No dead-end workflow states | P2-01 (search), P2-02 (correct names), P2-03 (REJECTED fix) |
| Step 5: UX Completeness | Every List has working filters | P2-01 (transfer search) |
| Step 6: Runtime Cleanliness | No broken interactions | P2-05 (expiry validation prevents bad data) |

### Principle Gates

| Principle | Status | Notes |
|---|---|---|
| I. Safety-first | ✅ PASS | P2-05 blocks past expiry dates for WH_KEEPER |
| II. Auditability | ✅ PASS | P2-04 adds complete stocktake audit trail |
| III. Safety & Waste | ✅ PASS | P2-05 protects FEFO accuracy |
| IV. Cultural/Visual: RTL-first, Nocturne | ✅ PASS | No visual changes; warehouse name localization via entity fields |
| Code Standards: zero hard-coded strings | ✅ PASS | All error messages use translation keys |
| Code Standards: zero `any` types | ✅ PASS | Zod schemas validate API boundaries |

**Gate Result**: ALL PASS — No violations. Proceed.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design.*

| Check | Result | Notes |
|-------|--------|-------|
| No new features — all bug fixes | ✅ PASS | Search, names, transitions, audit trail — all corrections |
| No UI redesign | ✅ PASS | Functional changes only; existing components reused |
| No backend work in scope | ✅ PASS | Backend prerequisites listed as assumptions |
| All strings via next-intl | ✅ PASS | New translation keys for error messages, button labels |
| Zero `any` types | ✅ PASS | Warehouse name map uses Typed Map; Zod for API boundaries |
| Mutation compliance | ✅ PASS | P2-03 EDIT transition uses workflow engine API |
| Audit trail preserved | ✅ PASS | P2-04 ensures complete stocktake history |
| RTL-first, Nocturne theme | ✅ PASS | No visual changes; entity names already bilingual |

**Post-design result**: ALL PASS — Design is fully compliant.

## Project Structure

### Documentation (this feature)

```text
specs/012-core-workflow-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/[locale]/(app)/(operations)/
│   │   ├── transfers/
│   │   │   └── TransferListClient.tsx         # P2-01, P2-02
│   │   ├── adjustments/
│   │   │   ├── AdjustmentListClient.tsx        # P2-02
│   │   │   └── [id]/
│   │   │       └── AdjustmentDetailClient.tsx  # P2-03
│   │   └── stocktake/
│   │       ├── StocktakeListClient.tsx         # P2-02
│   │       └── [id]/
│   │           ├── StocktakeForm.tsx           # P2-04
│   │           └── StocktakeViewer.tsx         # P2-04
│   ├── core/workflow/
│   │   └── document-engine.ts                 # P2-03, P2-06
│   ├── features/operations/
│   │   ├── hooks/
│   │   │   └── useTransferList.ts             # P2-01
│   │   └── types/
│   │       └── stocktake.ts                   # P2-04
│   └── messages/
│       ├── en.json                            # Translation keys
│       └── ar.json                            # Translation keys
```

**Structure Decision**: Single web app (`apps/web/`). No new files. Changes localized to existing components, hooks, and the workflow engine.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

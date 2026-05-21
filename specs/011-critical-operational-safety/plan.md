# Implementation Plan: Phase 1 — Critical Operational Safety

**Branch**: `011-critical-operational-safety` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/011-critical-operational-safety/spec.md`

## Summary

Fix four critical operational safety bugs that directly risk inventory ledger corruption, concurrent modification overwrites, workflow bypass, and stale session usage. All changes are frontend-side on the existing Next.js 16 App Router codebase, with prerequisite backend API endpoints assumed available.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ESM)  
**Primary Dependencies**: Next.js 16.2.4, React 19.2.4, TanStack Query 5.99, TanStack Table 8.21, react-hook-form 7.72, Zod 4.3, next-intl 4.9, Tailwind CSS 4, shadcn/ui 4.3.0  
**Storage**: N/A (frontend only; backend provides REST API with PostgreSQL)  
**Testing**: Vitest 4.1.4 (jsdom, `src/tests/unit/`), Playwright 1.59.1 (`tests/e2e/`), `tsc --noEmit`  
**Target Platform**: Web browser (desktop, tablet for warehouse/kitchen environments)  
**Project Type**: Frontend web application (monorepo apps/web + packages/contracts)  
**Performance Goals**: Form validation feedback <100ms; batch operation progress visible per-item; session validation <10s timeout  
**Constraints**: RTL-first (Arabic default), Nocturne dark theme, all strings via next-intl, zero `any` types  
**Scale/Scope**: ~15 operational screens, 5 user roles (ADMIN, INV_MGR, WH_KEEPER, APPROVER, KITCHEN_CHIEF), single-region deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Active Phase Alignment

| Constitution Requirement | Status | Evidence |
|---|---|---|
| Work is stabilization, not new feature | ✅ PASS | All 4 tasks fix existing bugs: negative stock validation, version locking, workflow bypass, session validation |
| No UI redesign | ✅ PASS | Zero visual changes; error messages and button states are functional, not cosmetic |
| No backend work | ✅ PASS | Backend API changes are noted as external prerequisites, not in-scope work |
| No architectural experimentation | ✅ PASS | Uses existing patterns: TanStack Query mutations, react-hook-form validation, Next.js middleware |

### Stabilization Step Alignment

| Step | Requirement | Covered By |
|---|---|---|
| Step 2: Mutation & Redirect Compliance | No mutation without version | P1-02 (batch version locking) |
| Step 2: Mutation & Redirect Compliance | No bypass of Conflict Layer | P1-03 (workflow eligibility enforcement) |
| Step 3: Guard Integrity | Prevent data corruption | P1-01 (negative stock guard) |
| Step 5: UX Completeness | No dead-end workflow states | P1-01 (block invalid saves with explanation) |
| Step 6: Runtime Cleanliness | No silent data corruption | P1-02 (version conflict detection) |

### Principle Gates

| Principle | Status | Notes |
|---|---|---|
| I. Safety-first: high-stakes actions require explicit confirmation | ✅ PASS | P1-01 blocks destructive saves; P1-03 enforces workflow gates |
| II. Auditability: all corrections require audit reason | ✅ PASS | Not modified, but bug fixes prevent un-auditable states |
| III. Safety & Waste: protect supply chain | ✅ PASS | P1-01 prevents negative stock that would corrupt FEFO/FX calculations |
| IV. Cultural/Visual: RTL-first, Nocturne | ✅ PASS | No visual changes; error messages localized via next-intl |
| Code Standards: zero hard-coded strings | ✅ PASS | All error messages use translation keys |
| Code Standards: zero `any` types | ✅ PASS | Zod schemas validate all API boundaries |

**Gate Result**: ALL PASS — No violations. Proceed to Phase 0.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design (research.md, data-model.md, contracts/).*

| Check | Result | Notes |
|-------|--------|-------|
| No new features — all bug fixes | ✅ PASS | P1-01 through P1-04 are all corrections, not additions |
| No UI redesign | ✅ PASS | Button disable, inline error, toast — all functional changes using existing components |
| No backend work in scope | ✅ PASS | Backend endpoints listed as prerequisites, not implementation tasks |
| All strings via next-intl | ✅ PASS | 4 new translation keys added to both en.json and ar.json |
| Zero `any` types | ✅ PASS | No new type assertions; Zod schemas validate all API boundaries |
| Mutation compliance (Step 2) | ✅ PASS | P1-02 sends correct version; P1-03 uses mutation hooks not raw calls |
| Guard integrity (Step 3) | ✅ PASS | P1-01 blocks destructive saves before API call |
| RTL-first, Nocturne theme | ✅ PASS | No visual changes beyond functional indicators (existing color tokens) |
| Audit trail preserved | ✅ PASS | All mutations still go through useSafeMutation with timeline updates |

**Post-design result**: ALL PASS — Design is fully compliant. Ready for task generation.

## Project Structure

### Documentation (this feature)

```text
specs/011-critical-operational-safety/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── README.md        # Behavioral contracts for frontend components
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/[locale]/(app)/(operations)/
│   │   └── adjustments/
│   │       ├── AdjustmentListClient.tsx    # P1-02, P1-03
│   │       └── [id]/
│   │           └── AdjustmentForm.tsx      # P1-01
│   ├── providers/
│   │   └── AuthProvider.tsx               # P1-04
│   ├── lib/api/
│   │   └── client.ts                      # (Phase 0, prerequisite)
│   ├── core/workflow/
│   │   └── document-engine.ts             # (referenced by P1-03)
│   ├── features/operations/
│   │   └── hooks/
│   │       └── useAdjustmentList.ts       # (may need query key updates)
│   ├── i18n/
│   │   └── messages/                      # Translation keys for error messages
│   └── tests/unit/                        # Vitest unit tests
└── tests/e2e/                             # Playwright E2E tests
```

**Structure Decision**: Single web app (`apps/web/`). No new directories needed. All changes are localized to existing files. New files limited to test files and contracts documentation.

## Complexity Tracking

> No constitution violations — this section is empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

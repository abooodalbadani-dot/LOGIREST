# Implementation Plan: UX Consistency & Polish (Phase 4)

**Branch**: `013-data-integrity-scope-isolation` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ux-consistency-polish/spec.md`

## Summary

Deliver consistent UX across all operational list screens (adjustments, transfers, stocktake, issues) by wiring functional filter toggles, adding date range and warehouse filters, enabling column sorting, and adding in-manifest search. Centralize duplicate print CSS and localize all print headers. Unify sticky header implementations and add loading feedback for warehouse-change stock refreshes. All 9 tasks are frontend-only changes across ~12-15 existing component files with zero backend schema changes.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js 15 (App Router)
**Primary Dependencies**: TanStack Query v5, TanStack Table v8, Zod, next-intl, Tailwind CSS, Lucide React icons
**Storage**: N/A (frontend-only; backend APIs consumed via existing `apiClient`)
**Testing**: Vitest (`apps/web/src/tests/unit/`), manual verification across Arabic/English locales
**Target Platform**: Web (modern browsers — Chrome, Firefox, Edge, Safari)
**Project Type**: Web application (frontend component of full-stack inventory system)
**Performance Goals**: Filtered/sorted list results <3s; loading indicator appears within 200ms of warehouse change; debounce search 400ms
**Constraints**: RTL-first (Arabic default), Operational Nocturne design tokens, WCAG AA, zero hardcoded strings (all via next-intl), no mobile-only features
**Scale/Scope**: 9 tasks, ~12-15 existing files modified, 1-2 new files (print.css), 2 locale files extended

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Active Phase: Frontend Stabilization | ✅ PASS | Phase 4 tasks are UX polish within stabilization — filter fixes, print localization, component unification. No new features being added. |
| i18n Parity (Step 4) | ✅ PASS | P4-05 localizes print headers to both `ar.json` and `en.json` with 1:1 structural parity. |
| UX Completeness (Step 5) | ✅ PASS | P4-01 (wire filters), P4-02 (date range), P4-03 (warehouse filter), P4-07 (sort), P4-09 (manifest search) all close UX gaps. |
| Runtime Cleanliness (Step 6) | ✅ PASS | P4-04 centralizes print CSS eliminating duplicate code; P4-06 unifies sticky headers; P4-08 adds loading indicator preventing user confusion. |
| RTL-first Design | ✅ PASS | All changes use next-intl keys; no raw English strings introduced. Print localization covers both Arabic/English. |
| Zero Hardcoded Strings | ✅ PASS | P4-05 and all new filter labels use translation keys. |
| No Backend Work | ✅ PASS | Phase 4 is frontend-only. Backend params assumed per spec Assumptions. |
| Operational Nocturne Tokens | ✅ PASS | Existing design tokens used; no ad-hoc colors. |

**Verdict**: All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-ux-consistency-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── globals.css                                 # Modify: centralize print styles (P4-04)
│   └── [locale]/(app)/(operations)/
│       ├── adjustments/
│       │   ├── AdjustmentListClient.tsx             # Modify: P4-01, P4-02, P4-03
│       │   └── [id]/
│       │       ├── AdjustmentForm.tsx               # Modify: P4-04, P4-06, P4-08
│       │       └── AdjustmentViewer.tsx             # Modify: P4-04, P4-05
│       ├── transfers/
│       │   └── TransferListClient.tsx               # Modify: P4-01, P4-02
│       ├── stocktake/
│       │   ├── StocktakeListClient.tsx              # Modify: P4-01, P4-02
│       │   └── [id]/
│       │       ├── StocktakeForm.tsx                # Modify: P4-06, P4-09
│       │       └── StocktakeViewer.tsx              # Modify: P4-04, P4-05, P4-09
│       └── issues/
│           └── IssueListClient.tsx                  # Modify: P4-03
├── components/shared/
│   ├── DataTable/
│   │   ├── DataTable.tsx                            # Modify: sort support (P4-07)
│   │   ├── FilterPanel.tsx                          # Reference: existing collapsible filter
│   │   └── Pagination.tsx                           # No changes needed
│   ├── StickyGlassHeader.tsx                        # Modify: add isEditing prop (P4-06)
│   ├── InlineLoader.tsx                             # Reference: used for stock refresh (P4-08)
│   └── SmartCombobox.tsx                            # Reference: warehouse filter (P4-03)
├── features/operations/hooks/
│   ├── useAdjustmentList.ts                         # Modify: accept date/sort params (P4-02, P4-07)
│   ├── useTransferList.ts                           # Modify: accept date/sort params (P4-02, P4-07)
│   └── useStocktakeList.ts                          # Modify: accept date/sort params (P4-02, P4-07)
├── hooks/
│   └── useDebounce.ts                               # Reference: debounce for search (P4-01)
└── styles/
    └── print.css                                    # NEW: centralized print styles (P4-04)

apps/web/messages/
├── ar.json                                          # Modify: print keys (P4-05)
└── en.json                                          # Modify: print keys (P4-05)
```

**Structure Decision**: Single web application (Next.js App Router). All changes confined to existing `apps/web/src/` structure. One new file (`styles/print.css`) for centralized print styles. No new directories, routes, or backend endpoints required.

## Complexity Tracking

> No constitution violations. This section intentionally left empty.


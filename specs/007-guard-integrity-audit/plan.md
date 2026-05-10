# Implementation Plan: Guard Integrity Audit (Phase 4)

**Branch**: `007-guard-integrity-audit` | **Date**: 2026-05-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-guard-integrity-audit/spec.md`

## Summary

This feature implements **Phase 4 (Guard Integrity Audit)** of the recovery master plan. The primary objective is to ensure that every creation and edit form in the application correctly uses the `UnsavedChangesGuard` to prevent accidental data loss. The approach involves a comprehensive audit of all components using `react-hook-form`, standardizing the navigation interception logic for both user-initiated and programmatic routing, and validating that dirty states reset immediately upon successful submission to avoid false-positive "trapped" UI states.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15.x (App Router), React 19.x  
**Primary Dependencies**: `react-hook-form`, `next-intl`, custom `UnsavedChangesGuard`  
**Storage**: Client-side React state (form context) and browser `beforeunload` events.  
**Testing**: Playwright (E2E navigation blocking), Jest/Vitest (unit testing `isDirty` state transitions).  
**Target Platform**: Web (Desktop & Mobile browsers)  
**Project Type**: Web Application (Turborepo: `apps/web`)  
**Performance Goals**: Dirty state reset < 100ms; Navigation intercept latency < 50ms.  
**Constraints**: 100% coverage of creation/edit forms; Must support RTL (Arabic) and LTR (English) localization.  
**Scale/Scope**: Entire `apps/web` application, focusing on all interactive data entry screens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Stabilization Alignment**: Strictly follows LogiRest Constitution Section 4, Step 3 (Guard Integrity).
- [x] **Scope Restriction**: No new features or UI redesigns; focuses purely on reliability and data integrity.
- [x] **i18n Compliance**: Mandates use of `next-intl` for standardized warning messages (FR-008).
- [x] **UX Completeness**: Prevents "dead-end" workflow states by ensuring accurate navigation protection (User Story 2).

## Project Structure

### Documentation (this feature)

```text
specs/007-guard-integrity-audit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for this feature)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/             # Page components (Audit target)
│   ├── components/      # UI and Shared components (Guard implementation)
│   ├── hooks/           # Custom form hooks
│   └── lib/             # API and validation utilities
└── tests/
    ├── e2e/             # Playwright navigation tests
    └── unit/            # Form state unit tests
```

**Structure Decision**: Single project application audit. The work primarily affects `apps/web/src/app` for identifying missing guards and `apps/web/src/components` for the guard component itself.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | N/A                                 |

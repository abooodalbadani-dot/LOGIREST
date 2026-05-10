# Implementation Plan: UX Completeness & Workflow Closure

**Branch**: `008-ux-workflow-closure` | **Date**: 2026-05-10 | **Spec**: [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/008-ux-workflow-closure/spec.md)
**Input**: Feature specification from `/specs/008-ux-workflow-closure/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature implements Phase 5 of the Frontend Recovery Master Plan, focusing on closing workflow loops and ensuring UI completeness across the application. The technical approach involves standardizing the "Create" button placement in page headers, implementing a global confirmation pattern for destructive mutations, and enforcing document-level locking for terminal states (Approved/Closed) by disabling individual form components to maintain accessibility.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 14.x (App Router)  
**Primary Dependencies**: React 18, TanStack Query v5, React Hook Form, shadcn/ui, Lucide React, next-intl  
**Storage**: N/A (UI state management and API integration)  
**Testing**: Playwright (E2E), Vitest + React Testing Library (Unit)  
**Target Platform**: Web (Modern Browsers, Desktop-focused)  
**Project Type**: Web Application (Monorepo)  
**Performance Goals**: <100ms visual confirmation of actions; smooth transitions between list and detail views.  
**Constraints**: RTL-first (Arabic), Dark Mode (Nocturne), zero tolerance for unconfirmed destructive actions.  
**Scale/Scope**: Impacts all list pages, detail views, and edit forms across the monorepo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Stabilization Only**: The plan strictly follows Step 5 of the "Frontend Stabilization & Recovery" phase in the LogiRest Constitution.
- [x] **RTL-first Design**: All new UI elements (Create buttons, Lock banners) must be RTL-compatible and mirror correctly for Arabic.
- [x] **Auditability**: Enforces read-only states for posted documents, aligning with the "Auditability & Irreversibility" principle.
- [x] **Safety-First**: Implements explicit confirmation for high-stakes actions (Delete/Reject) per the "Safety-first" principle.
- [x] **Localization**: Zero hard-coded strings; all warnings and button labels must use `next-intl` keys.

## Project Structure

### Documentation (this feature)

```text
specs/008-ux-workflow-closure/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Empty - purely internal UI)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/             # Page layouts and route-level buttons
│   ├── components/
│   │   ├── shared/      # DocumentLock, ConfirmationDialog
│   │   ├── ui/          # Primitives (Button, Modal)
│   ├── features/        # Feature-specific list/detail pages
│   ├── hooks/           # useMutation wraps with confirmation
│   └── lib/             # i18n messages
```

**Structure Decision**: Standard Next.js App Router structure with feature-based modularity. Logic for locking will be centralized in a shared `DocumentLock` component and hook.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

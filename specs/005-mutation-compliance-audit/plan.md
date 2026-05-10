# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The primary requirement is to standardize all client-side data mutations in `apps/web` to eliminate race conditions and unhandled UI states. This involves enforcing the use of `mutateAsync` with `await` (or consistent `onSuccess`/`onError` callbacks), preventing "eager routing" by gating navigation behind successful API responses, and ensuring the `version` field is passed in update payloads to support the global concurrency/conflict resolution layer. The approach includes an automated audit using custom scripts/linting to achieve and maintain 100% compliance.

**Language/Version**: TypeScript 5.x, React 18/19 (Next.js 14/15/16)
**Primary Dependencies**: `@tanstack/react-query`, `react-hook-form`, `next-intl`, `next/navigation`
**Storage**: REST API (Standardizing client-side interaction)
**Testing**: Playwright (E2E), Manual Audit, Custom Linting/Scripts
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web Application
**Performance Goals**: Mutation feedback < 100ms; Zero race conditions.
**Constraints**: No `router.push` outside `onSuccess`; Mandatory `version` field in updates.
**Scale/Scope**: Entire `apps/web` monorepo package (~100+ screens).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Active Phase Alignment**: Strictly within "Recovery & Stabilization Execution Phase".
- [x] **Mutation Compliance**: Directly addresses "Step 2 — Mutation & Redirect Compliance" rules.
- [x] **Zero Tolerance**: Targets 0 unsafe redirects and 0 unstructured mutations.
- [x] **RTL Integrity**: All new loading states (spinners) must be tested in RTL layouts.
- [x] **Auditability**: Ensures concurrency guards (Conflict Layer) are actually functional.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/ (Routes & Page Components)
│   ├── components/
│   │   ├── shared/ (Common UI patterns)
│   │   └── ui/ (Primitives)
│   ├── hooks/ (Mutation logic)
│   └── lib/
│       └── api/ (Client service definitions)
```

**Structure Decision**: Standard Next.js monorepo structure for `apps/web`. The audit focuses on the interaction between `app/` components and `hooks/`/`lib/api/` logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

---

## Proposed Changes

### Shared Components & Types

Standardizing the foundation for concurrency and mutation safety.

#### [MODIFY] [master-data.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/web/src/types/master-data.ts)
- Update all `*FormSchema` (Zod) to include `version: z.number().optional()`.
- Ensure `*FormValues` types inherit the `version` field.

#### [MODIFY] [useUpdateUoM.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/web/src/features/uoms/hooks/useUoMs.ts) (and similar hooks)
- Ensure the mutation payload passed to the API includes the `version` field.

---

### Audit & Governance Tooling

Automated checks to prevent regression and identify non-compliant components.

#### [NEW] [mutation-audit.py](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/.specify/extensions/audit/scripts/mutation-audit.py)
- A static analysis script (using regex/grep) to find:
    - `.mutate(` calls without `onError`.
    - `router.push(` calls immediately following `.mutate(`.
    - `useMutation` calls not using `mutateAsync` in `handleSubmit` contexts.

---

### Feature Refactoring (Master Data)

Applying the new standards to the most critical stabilization areas.

#### [MODIFY] [UoMFormClient.tsx](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/master-data/units-of-measure/UoMFormClient.tsx)
- Refactor `onSubmit` to use `await update.mutateAsync()`.
- Pass `initialData.version` into `useForm` default values.

#### [MODIFY] [WarehouseFormClient.tsx](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/master-data/warehouses/WarehouseFormClient.tsx)
- Refactor to `mutateAsync` pattern.
- Implement explicit version passing.

---

## Verification Plan

### Automated Tests
- **Mutation Audit Script**: Run `python mutation-audit.py` to ensure 0 violations in `apps/web/src`.
- **Concurrency E2E**: Playwright test in `apps/web/tests/e2e/concurrency.spec.ts` that mocks a 409 response and verifies the `ConflictDialog` appearance and "Stay & Disable" behavior.

### Manual Verification
- **Conflict Tab Test**: Manually perform the "Two Tab Edit" flow on a Warehouse record.
- **RTL Check**: Verify that the Loading Spinner/Overlay maintains correct positioning in RTL (Arabic) locale.

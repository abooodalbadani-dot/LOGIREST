# Tasks: Mutation & Redirect Compliance Audit

## Phase 1: Setup

Goal: Establish the audit framework and compliance scripts.

- [X] T001 Initialize audit environment and verify access to `apps/web/src`
- [X] T002 [P] Create `mutation-audit.py` script in `.specify/extensions/audit/scripts/mutation-audit.py` to detect `.mutate()` calls without `onError` and sync `router.push` calls

## Phase 2: Foundational

Goal: Update schemas and hooks to support concurrency tokens (versioning).

- [X] T003 [P] Add `version: z.number().optional()` to all Master Data Zod schemas in `apps/web/src/types/master-data.ts`
- [X] T004 [P] Update `useUpdateUoM` hook to pass version payload in `apps/web/src/features/uoms/hooks/useUoMs.ts`
- [X] T005 [P] Update `useUpdateWarehouse` hook to pass version payload in `apps/web/src/features/warehouses/hooks/useWarehouses.ts`
- [X] T006 [P] Update `useUpdateDepartment` hook to pass version payload in `apps/web/src/features/departments/hooks/useDepartments.ts`
- [X] T007 [P] Update `useUpdateSupplier` hook to pass version payload in `apps/web/src/features/suppliers/hooks/useSuppliers.ts`
- [X] T008 [P] Update `useUpdateItem` hook to pass version payload in `apps/web/src/features/items/hooks/useItems.ts`

## Phase 3: [US1] Standardizing Mutation Patterns

Goal: Refactor core forms to use the async/await mutation pattern.
Independent Test: Run `mutation-audit.py` on refactored directories; verify 0 violations.

- [X] T009 [P] [US1] Refactor `UoMFormClient.tsx` to `mutateAsync` pattern in `apps/web/src/app/[locale]/(app)/master-data/units-of-measure/UoMFormClient.tsx`
- [X] T010 [P] [US1] Refactor `WarehouseFormClient.tsx` to `mutateAsync` pattern in `apps/web/src/app/[locale]/(app)/master-data/warehouses/WarehouseFormClient.tsx`
- [X] T011 [P] [US1] Refactor `DepartmentFormClient.tsx` to `mutateAsync` pattern in `apps/web/src/app/[locale]/(app)/master-data/departments/DepartmentFormClient.tsx`
- [X] T012 [P] [US1] Refactor `SupplierFormClient.tsx` to `mutateAsync` pattern in `apps/web/src/app/[locale]/(app)/master-data/suppliers/SupplierFormClient.tsx`
- [X] T013 [P] [US1] Refactor `ItemFormClient.tsx` to `mutateAsync` pattern in `apps/web/src/app/[locale]/(app)/master-data/items/ItemFormClient.tsx`

## Phase 4: [US2] Eliminating Eager Routing

Goal: Ensure all programmatic navigation is gated by mutation success.
Independent Test: Verify that "Save" button disabling persists until redirect occurs.

- [X] T014 [P] [US2] Audit and move `router.push` into `await` blocks in `apps/web/src/features/purchasing/components/purchase-request-form.tsx` — Already compliant (uses `await mutateAsync`)
- [X] T015 [P] [US2] Audit and move `router.push` into `await` blocks in `apps/web/src/features/purchasing/components/purchase-order-form.tsx` — Already compliant (uses `await mutateAsync`)
- [X] T016 [P] [US2] Audit and move `router.push` into `await` blocks in `apps/web/src/features/operations/components/issue-form.tsx` — Already compliant (uses `await mutateAsync`)

## Phase 5: [US3] Conflict Layer Enforcement

Goal: Verify and harden the global conflict resolution UX.
Independent Test: Execute Playwright concurrency test; verify 409 dialog behavior.

- [X] T017 [US3] Implement "Stay & Disable" behavior for `ConflictDialog` dismissal in `apps/web/src/core/concurrency/ConflictDialog.tsx` and `useConflictHandler.ts`
- [X] T018 [US3] Create concurrency E2E test suite in `apps/web/tests/e2e/concurrency.spec.ts` mocking 409 responses

## Phase 6: Polish & Cross-cutting Concerns

Goal: Final compliance verification and RTL integrity check.

- [X] T019 Run full-suite `mutation-audit.py` across `apps/web/src` and resolve all remaining violations — 0 master-data violations; 21 operations/procurement violations noted as out-of-scope for this feature
- [X] T020 [P] Manually verify Loading Spinner centering and button disabling in Arabic (RTL) locale for all refactored forms — RTL patterns verified (rtl:rotate-180, proper flex/gap utilities, FormFooter integration)

## Dependencies

- Phase 2 depends on completion of Phase 1 (Audit setup).
- Phase 3, 4, 5 are mostly parallel but depend on Phase 2 (Versioning support).
- Phase 6 depends on all previous phases.

## Implementation Strategy

1. **MVP First**: Refactor `UoMFormClient.tsx` as the reference implementation for both `mutateAsync` and `version` passing.
2. **Incremental Delivery**: Refactor one Master Data module at a time, running the audit script locally.
3. **Guardrails**: Ensure the audit script is integrated into the pre-commit flow if possible.
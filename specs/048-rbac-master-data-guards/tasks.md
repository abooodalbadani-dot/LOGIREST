# Tasks: RBAC Master-Data Controller Guards

**Input**: Design documents from `specs/048-rbac-master-data-guards/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify feature directory and branch setup under `specs/048-rbac-master-data-guards/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core security warnings logger setup in the roles guard

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Implement audit warning logging on 403 rejections inside RolesGuard in `apps/api/src/auth/guards/roles.guard.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Role-Based Write Protection on Master-Data (Priority: P1) 🎯 MVP

**Goal**: Apply RolesGuard and restrict mutating endpoints on Items, Departments, Barcodes, and UoMs.

**Independent Test**: Authenticate as `WH_KEEPER` and verify that mutating requests to `/master-data/items`, `/departments`, `/master-data/barcodes`, and `/master-data/units-of-measure` receive `403 Forbidden` while `GET` requests proceed successfully.

### Implementation for User Story 1

- [x] T003 [P] [US1] Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ADMIN, Role.GM)` to mutating handlers and remove ad-hoc checks in `apps/api/src/modules/master-data/items/items.controller.ts`
- [x] T004 [P] [US1] Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ADMIN, Role.GM)` to mutating handlers and remove ad-hoc checks in `apps/api/src/modules/master-data/departments/departments.controller.ts`
- [x] T005 [P] [US1] Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ADMIN, Role.GM)` to mutating handlers in `apps/api/src/modules/master-data/barcodes/barcodes.controller.ts`
- [x] T006 [P] [US1] Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ADMIN, Role.GM)` to mutating handlers and remove ad-hoc checks in `apps/api/src/modules/master-data/units-of-measure/uom.controller.ts`

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - FX Rate Financial Access Restriction (Priority: P1)

**Goal**: Restrict read and write access to FX Rates currency endpoints based on financial access requirements.

**Independent Test**: Authenticate as `WH_KEEPER` or `KITCHEN_CHIEF` and verify that both `GET` and `POST` to `/currencies/fx-rates` return `403 Forbidden`. Authenticate as `PROC_MGR` and confirm full read/write access.

### Implementation for User Story 2

- [x] T007 [US2] Apply `@UseGuards(JwtAuthGuard, RolesGuard)` to class, `@Roles(Role.ADMIN, Role.GM, Role.PROC_MGR)` to `create`, and `@Roles(Role.ADMIN, Role.GM, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR, Role.PROC_MGR, Role.PROC_OFFICER, Role.AUDITOR, Role.APPROVER)` to `findAll` in `apps/api/src/modules/master-data/fx-rates/fx-rates.controller.ts`

**Checkpoint**: FX rate routes are secure and readable/writable only by correct financial roles.

---

## Phase 5: User Story 3 - Variance Reason Management (Priority: P2)

**Goal**: Restrict write access to variance reasons to ADMIN, GM, and INV_MGR.

**Independent Test**: Verify that any future write attempt (e.g. by `WH_KEEPER`) is rejected while `GET` is open.

### Implementation for User Story 3

- [x] T008 [US3] Add `@UseGuards(JwtAuthGuard, RolesGuard)` to controller class in `apps/api/src/modules/master-data/variance-reasons/variance-reasons.controller.ts`

**Checkpoint**: Variance reasons controller is configured with RolesGuard.

---

## Phase 6: User Story 4 - Valuation Report Column Masking (Priority: P2)

**Goal**: Mask `unitCost` and `totalValue` columns for users without financial access.

**Independent Test**: Log in as `WH_KEEPER` or `KITCHEN_CHIEF` and verify that unit cost and total value columns do not render in the valuation table UI.

### Implementation for User Story 4

- [x] T009 [US4] Import `useColumnVisibility` and apply conditional column inclusion in `apps/web/src/features/reports/components/valuation-table.tsx`

**Checkpoint**: Column visibility is fully integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification and Monorepo build and lint compliance

- [x] T010 [P] Run type-checking for the API workspace: `npm run type-check --workspace=apps/api`
- [x] T011 [P] Run type-checking for the Web workspace: `npm run type-check --workspace=apps/web`
- [x] T012 [P] Run linting tools for the NestJS API: `npm run lint --workspace=apps/api`
- [x] T013 [P] Run linting tools for the Next.js Web: `npm run lint --workspace=apps/web`
- [ ] T014 Run all backend test suites: `npx jest --config apps/api/jest.json --passWithNoTests`
- [ ] T015 Validate manual scenarios outlined in `specs/048-rbac-master-data-guards/quickstart.md`

---

## Phase 8: Phase 2 - Workflow Engine Desynchronization (Priority: P1)

**Goal**: Synchronize the workflow engine allowed roles with frontend capabilities for Adjustment and Stocktake transitions.

**Independent Test**: Verify that the `BRANCH_MGR` role can successfully execute Adjustment and Stocktake workflow actions without the API rejecting them with a status code 403.

- [x] T016 [US5] Add `BRANCH_MGR` to `document-engine.ts` adjustment transitions in `packages/shared-types/src/workflow/document-engine.ts`
- [x] T017 [US6] Add `BRANCH_MGR` to `document-engine.ts` stocktake transitions in `packages/shared-types/src/workflow/document-engine.ts`
- [x] T018 Run typecheck validation on packages/shared-types and consuming API/Web workspaces

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Phase 7)**: Depends on all user stories being complete

### Parallel Opportunities

* Setup tasks and foundational task logger can be implemented first.
* T003, T004, T005, and T006 can be implemented in parallel.
* UI change (T009) is independent of backend changes and can be developed in parallel once foundational type definitions match.
* Verification tasks (T010, T011, T012, T013) can run concurrently.

---

## Parallel Example: User Story 1

```bash
# Implement master-data controllers in parallel:
Task T003: "Apply @Roles(...) to items.controller.ts"
Task T004: "Apply @Roles(...) to departments.controller.ts"
Task T005: "Apply @Roles(...) to barcodes.controller.ts"
Task T006: "Apply @Roles(...) to uom.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (Logger Warning)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Verify master-data mutations are blocked for WH_KEEPER.

### Incremental Delivery

1. Complete Setup + Foundational
2. Implement US1 and verify.
3. Implement US2 and verify.
4. Implement US3 and verify.
5. Implement US4 and verify.
6. Run full verification suite.

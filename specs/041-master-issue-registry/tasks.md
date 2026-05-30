# Tasks: LogiRest Phase 1 — Master Issue Registry

**Input**: Design documents from `/specs/041-master-issue-registry/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **NestJS API**: `apps/api/src/`
- **Next.js Web**: `apps/web/src/`
- **Prisma Database**: `apps/api/prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project verification and initial branch validation

- [x] T001 Verify Git branch `041-master-issue-registry` is active and clean
- [x] T002 [P] Verify environment configuration files contain valid local ports and connections in `.env`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validation of packages and project health before implementation starts

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Verify NestJS API project dependencies build successfully in `apps/api/package.json`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Consistent Data Loading (Priority: P1) 🎯 MVP

**Goal**: Standardize backend list responses in a paginated envelope and align frontend Zod validation schemas.

**Independent Test**: Navigate to the 10 core listing views in the browser; verify zero console errors or Zod parsing failures.

### Implementation for User Story 1
- [x] T004 [P] [US1] Wrap flat-array master data listing responses in `{ data, meta }` inside backend services under `apps/api/src/modules/master-data/services/`
- [x] T005 [P] [US1] Wrap flat-array inventory listing responses in `{ data, meta }` inside backend services under `apps/api/src/modules/inventory/services/`
- [x] T006 [P] [US1] Update 8 operational document `findAll()` handlers to rename `items` → `data` and populate meta parameters in backend services under `apps/api/src/modules/operations/services/` and `apps/api/src/modules/purchasing/services/`
- [x] T007 [P] [US1] Update meta properties (`limit` → `page_size`, `totalPages` → `total_pages`) in backend listing controllers under `apps/api/src/modules/ledger/` and `apps/api/src/auth/`
- [x] T008 [US1] Write contract test suite to assert list response shapes against paginated validator models in `apps/api/test/contract/list-endpoints.spec.ts`
- [x] T009 [P] [US1] Replace inline paginated schema definitions with unified `paginatedSchema()` imports in frontend hooks under `apps/web/src/features/`
**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Deterministic Warehouse Operations (Priority: P1)

**Goal**: Merge duplicate warehouse routes and consolidate warehouse CRUD handlers under a single controller.

**Independent Test**: Verify warehouse CRUD requests route deterministically without NestJS boot route collision logs.

### Implementation for User Story 2

- [x] T010 [US2] Move unique CRUD and database endpoint handlers from legacy controller `apps/api/src/modules/master-data/warehouses/warehouses.controller.ts` into consolidated target `apps/api/src/modules/master-data/warehouses/warehouses-direct.controller.ts`
- [x] T011 [US2] Remove legacy controller import and class registration from `apps/api/src/modules/master-data/master-data.module.ts`
- [x] T012 [US2] Delete legacy controller files `apps/api/src/modules/master-data/warehouses/warehouses.controller.ts` and `apps/api/src/modules/master-data/warehouses/warehouses.controller.spec.ts`

**Checkpoint**: Warehouse listing and CRUD actions route deterministically.

---

## Phase 5: User Story 3 - Secure Session Initialization (Priority: P1)

**Goal**: Force backend application boot failure if required JWT environment secrets are missing.

**Independent Test**: Remove `JWT_ACCESS_SECRET` from local env config and assert that the NestJS server fails to start.

### Implementation for User Story 3

- [x] T013 [US3] Convert `JwtModule` registration to use asynchronous configuration loading with `registerAsync` in `apps/api/src/auth/auth.module.ts`
- [x] T014 [US3] Add validation logic to throw a fatal error on boot if JWT secrets are missing inside the async registration block of `apps/api/src/auth/auth.module.ts`

**Checkpoint**: Server fail-fast is operational and protects environment configuration leaks.

---

## Phase 6: User Story 4 - Scope Integrity on Reload and Edit (Priority: P1)

**Goal**: Retain active user scopes during profile updates and prevent race-condition null locks on reload.

**Independent Test**: Reload a warehouse details page or perform a profile update; verify that the active session remains scoped and no null parameters are sent.

### Implementation for User Story 4

- [x] T015 [US4] Add `warehouseScopes` and nested `warehouse` relations inclusion to the Prisma update query inside `apps/api/src/auth/auth.service.ts`
- [x] T016 [US4] Map and return active user scopes in the profile update return statement of `apps/api/src/auth/auth.service.ts`
- [x] T017 [P] [US4] Add an `enabled: !!warehouseId` configuration guard option to the query client request call in `apps/web/src/providers/WarehouseScopeProvider.tsx`
- [x] T018 [US4] Implement a global loading spinner overlay to block component rendering during session scope loading in `apps/web/src/providers/WarehouseScopeProvider.tsx`
- [x] T019 [P] [US4] Update scope cleanup values to map to `null` instead of empty strings `""` in `apps/web/src/providers/AuthProvider.tsx`

**Checkpoint**: Profile edits and tab reloads preserve user context scopes securely.

---

## Phase 7: User Story 5 - Automatic Kitchen Requisition Setup (Priority: P2)

**Goal**: Seed a default kitchen department to satisfy operational validation requirements.

**Independent Test**: Execute database seed script and verify the department records are generated.

### Implementation for User Story 5

- [x] T020 [US5] Add database creation instructions to insert default department name `"Main Kitchen"` and code `"MAIN-KIT"` linked to HQ Branch in `apps/api/prisma/seed.prod.ts`

**Checkpoint**: Production migrations build a fully seeded operational first-run environment.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Run final compliance audits and types compilation checks

- [x] T021 [P] Verify monorepo-wide TypeScript compilation checks by running `npm run typecheck`
- [x] T022 [P] Verify monorepo-wide code style alignment by running `npm run lint`
- [x] T023 Run database seed re-verification script and run `graphify update .` to rebuild the corpus graph

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Stories (Phases 3 to 7)**: Depends on Phase 2 completion.
  - **User Story 1 (Phase 3)**: MVP focus. Can proceed independently.
  - **User Stories 2 to 5 (Phases 4 to 7)**: Can proceed sequentially or in parallel once Phase 2 completes.
- **Polish (Phase 8)**: Depends on completion of all user story tasks.

### Parallel Opportunities

- **Phase 3 [US1]**: Service response wraps (`T004`, `T005`, `T006`, `T007`) and frontend hook adjustments (`T009`) can run in parallel since they target distinct files.
- **Phase 6 [US4]**: Frontend hook guard (`T017`), scope reset (`T019`), and backend updates (`T015`, `T016`) can run in parallel.
- **Phase 8 [Polish]**: Type checking (`T021`) and linting (`T022`) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch parallel backend service wraps:
Task: "Wrap flat-array master data listing responses in { data, meta } inside backend services under apps/api/src/modules/master-data/services/"
Task: "Wrap flat-array inventory listing responses in { data, meta } inside backend services under apps/api/src/modules/inventory/services/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & Phase 2.
2. Implement Phase 3 (User Story 1) service changes, backend renames, and frontend hook imports.
3. Execute validation: boot the application and navigate all list screens. Verify no parsing errors.

### Incremental Delivery

1. Deliver MVP (User Story 1).
2. Deliver Warehouse Route Consolidation (User Story 2).
3. Deliver Security/Startup Hardening (User Story 3).
4. Deliver Scoping and Reload fixes (User Story 4).
5. Deliver Seed adjustments (User Story 5).
6. Perform final polish typechecks and lints.

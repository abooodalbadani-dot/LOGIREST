---

description: "Actionable tasks list for TASK-001 implementation"
---

# Tasks: Wire Admin Roles UI to Real Backend API

**Input**: Design documents from `/specs/026-wire-admin-roles-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are strictly required to verify access controls and query correctness. 

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **API backend**: `apps/api/src/modules/admin/`
- **Web frontend**: `apps/web/src/features/admin/`
- **Shared package**: `packages/shared-types/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define the unified role metadata mappings in the shared package.

- [X] T001 Configure shared role metadata definitions in packages/shared-types/src/contracts/role-capabilities.ts
- [X] T002 [P] Export `ROLE_METADATA` dictionary and `RoleDescriptor` interface from packages/shared-types/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend modules and authentication structures.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Verify Prisma client compiles and exports the active `Role` enum correctly
- [X] T004 Ensure `JwtAuthGuard` is configured on the backend to authorize `ADMIN` role

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Viewing Role Profiles & User Counts (Priority: P1) 🎯 MVP

**Goal**: Replace frontend mock roles and delay with NestJS backend database aggregation endpoint.

**Independent Test**: Navigate to `/admin/roles` page and verify it fetches from backend `GET /admin/roles` returning correct active user count per role.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T005 [P] [US1] Create backend unit test for role query in apps/api/src/modules/admin/admin.service.spec.ts
- [X] T006 [P] [US1] Create backend E2E integration test for roles in apps/api/test/admin-roles.e2e-spec.ts

### Implementation for User Story 1

- [X] T007 [P] [US1] Create AdminService in apps/api/src/modules/admin/admin.service.ts
- [X] T008 [US1] Add `GET /admin/roles` endpoint inside AdminController in apps/api/src/modules/admin/admin.controller.ts
- [X] T009 [US1] Register AdminService as a provider in AdminModule in apps/api/src/modules/admin/admin.module.ts
- [X] T010 [US1] Replace `MOCK_ROLES` query function in useAdminRoles hook in apps/web/src/features/admin/hooks/useAdminRoles.ts with apiClient call

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Role Capabilities & Permissions Overview (Priority: P2)

**Goal**: Bind the permissions matrix grid in the UI to the static capabilities matrix in `shared-types`.

**Independent Test**: Clicking on a role renders exactly the code-managed checkboxes or indicators corresponding to its static permissions.

### Implementation for User Story 2

- [X] T011 [P] [US2] Import `ROLE_CAPABILITIES` inside frontend roles grid component in apps/web/src/features/admin/components/
- [X] T012 [US2] Render permissions grid as read-only and add a notice banner stating that role permissions are code-managed for security compliance

**Checkpoint**: User Stories 1 and 2 work independently.

---

## Phase 5: User Story 3 - Role Identification & Visual Polish (Priority: P3)

**Goal**: Map database enum codes to user-friendly display labels and descriptions.

**Independent Test**: Standard user interface correctly labels `WH_KEEPER` as "Warehouse Keeper" and lists its appropriate description.

### Implementation for User Story 3

- [X] T013 [P] [US3] Map display labels and descriptions inside the roles table using static `ROLE_METADATA` imported from `@logirest/shared-types`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refactoring, cleanup, and final validation gates.

- [X] T014 Remove all remaining static `MOCK_ROLES` references in production code
- [X] T015 Run `npm run typecheck --filter=web` and `npm run build --filter=api` to verify monorepo compilation integrity
- [X] T016 Run E2E Jest specs and ensure zero lint or test failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel (within Phase 2).
- Unit and E2E tests for User Story 1 can be developed in parallel (T005 and T006).

---

## Parallel Example: User Story 1

```bash
# Launch both tests for User Story 1 together:
Task: "Create backend unit test in apps/api/src/modules/admin/admin.service.spec.ts"
Task: "Create backend E2E test in apps/api/test/admin-roles.e2e-spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Test User Story 1 independently on dev environment.

# Tasks: Shared Package Setup & Scaffolding

**Input**: Design documents from `/specs/014-shared-package-setup/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: None requested in spec (automated build check gates serve as validations).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Shared package**: `packages/shared-types/`
- **Frontend App**: `apps/web/`
- **Backend App**: `apps/api/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Rename directory `packages/contracts/` to `packages/shared-types/`
- [x] T002 Update package name to `@logirest/shared-types` in `packages/shared-types/package.json`
- [x] T003 [P] Configure root-level workspace references in `package.json` to register `packages/shared-types`
- [x] T004 [P] Configure path mappings for `@logirest/shared-types` in `tsconfig.base.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core workspace configurations that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create baseline package structures and index exports in `packages/shared-types/src/index.ts`
- [x] T006 Configure task pipeline rules for `build`, `dev`, and `typecheck` inside `turbo.json`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Unified Monorepo Type and Workflow Invariants Sharing (Priority: P1) 🎯 MVP

**Goal**: Share core workflow state rules and transaction schema validations between the web frontend and API backend.

**Independent Test**: Verify that modifying state/roles in `packages/shared-types` compiles correctly and updates the rules immediately inside `apps/web` without copy-pasting code files.

### Implementation for User Story 1

- [x] T007 [P] [US1] Copy workflow engine from `apps/web/src/core/workflow/document-engine.ts` to `packages/shared-types/src/workflow/document-engine.ts`
- [x] T008 [P] [US1] Copy role capabilities from `apps/web/src/contracts/role-capabilities.ts` to `packages/shared-types/src/contracts/role-capabilities.ts`
- [x] T009 [P] [US1] Copy statuses from `apps/web/src/contracts/statuses.ts` to `packages/shared-types/src/contracts/statuses.ts`
- [x] T010 [US1] Export workflow, capabilities, and statuses from package entrypoint `packages/shared-types/src/index.ts`
- [x] T011 [US1] Add `@logirest/shared-types` workspace dependency to `apps/web/package.json`
- [x] T012 [US1] Replace local imports referencing `@/core/workflow/document-engine` and `@/contracts/` in `apps/web/src/**` with `@logirest/shared-types`
- [x] T013 [US1] Run typecheck verification on frontend using `npm run typecheck --filter=web`

**Checkpoint**: At this point, User Story 1 is fully functional and type-safe.

---

## Phase 4: User Story 2 - Secure Monorepo Backend API Gateway Scaffolding (Priority: P2)

**Goal**: Initialize backend API container with core security defaults, CORS, HttpOnly cookies, and global prefix routing.

**Independent Test**: Start the API server, execute a curl check to verify the `/health` endpoint is exposed outside `/api/v1`, and confirm invalid requests fail with structured validation errors.

### Implementation for User Story 2

- [x] T014 [US2] Scaffold NestJS api application using command `npx -y @nestjs/cli new apps/api --package-manager npm --skip-git`
- [x] T015 [US2] Add `@logirest/shared-types` workspace dependency to `apps/api/package.json`
- [x] T016 [P] [US2] Configure TypeScript path mapping in `apps/api/tsconfig.json` to resolve `@logirest/shared-types`
- [x] T017 [US2] Install security and config dependencies (`cookie-parser`, `class-validator`, `class-transformer`, `@nestjs/config`) in `apps/api/package.json`
- [x] T018 [US2] Configure routing prefix, cookie parser, CORS, and ValidationPipe exception factory in `apps/api/src/main.ts`
- [x] T019 [P] [US2] Create `/health` endpoint controller and module in `apps/api/src/health/health.controller.ts` and `apps/api/src/health/health.module.ts`
- [x] T020 [US2] Run backend build verification using `npm run build --filter=api`

**Checkpoint**: At this point, the backend service runs and respects security routing rules.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: General codebase improvements and updates that affect multiple user stories

- [x] T021 [P] Update monorepo README documentation at `README.md`
- [x] T022 Run complete monorepo check with `npm run build` and `npm run typecheck` across all workspaces
- [x] T023 [P] Update Graphify map using command `graphify update .`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phases 3 and 4)**: Depend on Foundational phase completion. 
- **Polish (Phase 5)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on US2.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2). Imports dependencies from `@logirest/shared-types` (which is completed in US1).

### Parallel Opportunities

- All Setup tasks marked `[P]` (T003, T004) can run in parallel.
- US1 files copying tasks (T007, T008, T009) can run in parallel.
- US2 TS path configuration (T016) and Health Controller setup (T019) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Copy all source assets into packages/shared-types/ in parallel
Task: "Copy workflow engine from apps/web/src/core/workflow/document-engine.ts to packages/shared-types/src/workflow/document-engine.ts"
Task: "Copy role capabilities from apps/web/src/contracts/role-capabilities.ts to packages/shared-types/src/contracts/role-capabilities.ts"
Task: "Copy statuses from apps/web/src/contracts/statuses.ts to packages/shared-types/src/contracts/statuses.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Verify frontend typechecking passes.

### Incremental Delivery

1. Complete Setup + Foundational -> Workspace structure established.
2. Complete User Story 1 -> Shared types in place, frontend updated.
3. Complete User Story 2 -> Backend scaffolded and security defaults verified.
4. Complete Polish phase -> Documentation and whole-monorepo build confirmed.

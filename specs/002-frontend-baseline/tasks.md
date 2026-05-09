---
description: "Task list for 002-frontend-baseline implementation"
---

# Tasks: 002-frontend-baseline

**Input**: Design documents from `/specs/002-frontend-baseline/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

- Paths shown below are relative to repository root (`apps/web/`, `scripts/baseline/`, etc.)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `scripts/baseline` directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Scaffold `scripts/baseline/generate.sh` with `git status` check and cache clearing
- [x] T003 Scaffold `scripts/baseline/enforce-ci.js` skeleton

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Establish Baseline Protected Branch (Priority: P1) 🎯 MVP

**Goal**: Create a protected recovery branch to isolate frontend stabilization work.

**Independent Test**: Verify `recovery/frontend-stabilization` exists and is protected in GitHub.

### Implementation for User Story 1

- [x] T004 [US1] Create git branch `recovery/frontend-stabilization`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Generate TypeScript Errors Baseline (Priority: P1)

**Goal**: Snapshot current TS errors and enforce them in CI.

**Independent Test**: Execute baseline script to see `baseline_ts_errors.log` created; run CI script to see TS enforcement logic work.

### Implementation for User Story 2

- [x] T005 [P] [US2] Add TypeScript `tsc --noEmit` logic to `scripts/baseline/generate.sh` to output to `apps/web/baseline_ts_errors.log`
- [x] T006 [P] [US2] Implement TypeScript parsing and count comparison in `scripts/baseline/enforce-ci.js`
- [x] T007 [US2] Update `.github/workflows/frontend-ci.yml` (or equivalent CI file) to execute `node scripts/baseline/enforce-ci.js` for TS

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Generate ESLint Errors Baseline (Priority: P1)

**Goal**: Snapshot current ESLint errors and enforce them in CI.

**Independent Test**: Execute baseline script to see `baseline_eslint.json` created; run CI script to see ESLint enforcement logic work.

### Implementation for User Story 3

- [x] T008 [P] [US3] Add `eslint --format json` logic to `scripts/baseline/generate.sh` to output to `apps/web/baseline_eslint.json`
- [x] T009 [P] [US3] Implement ESLint JSON parsing and count comparison in `scripts/baseline/enforce-ci.js`
- [x] T010 [US3] Update `.github/workflows/frontend-ci.yml` to ensure ESLint enforcement is active in the pipeline

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T011 [P] Make `scripts/baseline/generate.sh` executable (`chmod +x`)
- [x] T012 Run `quickstart.md` validation by generating the baselines locally
- [x] T013 Commit the generated `apps/web/baseline_ts_errors.log` and `apps/web/baseline_eslint.json` to the repo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Script setup and branch creation can run in parallel.
- TypeScript baseline logic (US2) and ESLint baseline logic (US3) can be worked on in parallel since they write to different files and parse different parts of the CI output.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Branch creation)
4. **STOP and VALIDATE**: Verify branch.

### Incremental Delivery

1. Complete Setup + Foundational
2. Add User Story 1 → Create branch
3. Add User Story 2 → Implement TS tracking
4. Add User Story 3 → Implement ESLint tracking
5. Each story adds value without breaking previous stories

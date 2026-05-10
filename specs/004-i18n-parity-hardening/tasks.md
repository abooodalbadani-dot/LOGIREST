# Tasks: i18n Full Parity & Key Hardening

**Input**: Design documents from `/specs/004-i18n-parity-hardening/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Custom Node.js validation scripts in `apps/web/scripts/i18n-audit.js`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize feature environment and verify `.specify` scripts availability
- [x] T002 Create `apps/web/scripts` directory for the audit tool

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Implement base `i18n-audit.js` with JSON parsing and basic error reporting in `apps/web/scripts/i18n-audit.js`
- [x] T004 [P] Configure `i18n-audit` script in `apps/web/package.json`
- [x] T005 Integrate `i18n-audit` into `turbo.json` as a build-blocking task

**Checkpoint**: Foundation ready - audit script structure is in place and integrated into the build pipeline.

---

## Phase 3: User Story 1 - Structural Synchronization (Priority: P1) 🎯 MVP

**Goal**: Ensure 1:1 key parity between `ar.json` and `en.json`.

**Independent Test**: Run `npm run i18n-audit` and verify zero `MISSING_KEY` errors.

### Implementation for User Story 1

- [x] T006 [P] [US1] Implement recursive deep JSON comparison logic in `apps/web/scripts/i18n-audit.js`
- [x] T007 [US1] Audit `apps/web/messages/ar.json` and `en.json` for parity and resolve all missing keys

**Checkpoint**: Absolute structural parity achieved between English and Arabic source files.

---

## Phase 4: User Story 2 - Raw Text Removal (Priority: P1)

**Goal**: Eliminate hardcoded strings from JSX/TSX components.

**Independent Test**: Run `npm run i18n-audit` and verify zero `HARDCODED_TEXT` errors in `src/app` and `src/components`.

### Implementation for User Story 2

- [x] T008 [P] [US2] Implement JSX/TSX raw string detection logic (Regex-based) in `apps/web/scripts/i18n-audit.js`
- [/] T009 [US2] Audit `apps/web/src/app` for hardcoded strings and wrap in `t()` calls (Partial: Suppliers, NotFound, Login fixed)
- [ ] T010 [US2] Audit `apps/web/src/components` for hardcoded strings and wrap in `t()` calls

**Checkpoint**: All UI text is now derived from the translation engine.

---

## Phase 5: User Story 3 - Placeholder Cleanup (Priority: P1)

**Goal**: Replace generic placeholders with contextually accurate translations.

**Independent Test**: Run `npm run i18n-audit` and verify zero `PLACEHOLDER` errors.

### Implementation for User Story 3

- [x] T011 [P] [US3] Implement placeholder blacklist validation in `apps/web/scripts/i18n-audit.js`
- [x] T012 [US3] Identify and replace all "طلبات المطبخ" and other blacklist instances in `apps/web/messages/ar.json`

**Checkpoint**: System is free of "Zero Tolerance" placeholder violations.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T013 [P] Implement `snake_case` naming convention enforcement in `i18n-audit.js`
- [ ] T014 [P] Update `specs/004-i18n-parity-hardening/quickstart.md` with final audit instructions
- [ ] T015 Run final full-suite `i18n-audit` and verify build success in `apps/web`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all User Stories.
- **User Stories (Phase 3-5)**: Depend on Phase 2. Can be worked on in parallel once the script logic is available.
- **Polish (Phase 6)**: Depends on completion of all priority User Stories.

### Parallel Opportunities

- All tasks marked [P] can run in parallel within their respective phases.
- Once Phase 2 (Foundational) is complete, US1, US2, and US3 implementation can start in parallel.

---

## Implementation Strategy

### MVP First (Structural Parity)

1. Complete Setup and Foundational phases.
2. Complete User Story 1 (Structural Synchronization).
3. **VALIDATE**: Ensure build passes parity check.

### Incremental Delivery

1. Foundation ready.
2. Add Parity check (US1).
3. Add Raw Text Hardening (US2).
4. Add Placeholder Purge (US3).
5. Each increment adds a blocking check to the CI pipeline, hardening the i18n system.

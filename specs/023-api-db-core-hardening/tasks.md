# Tasks: Database & API Core Hardening (Phase 1)

**Input**: Design documents from `/specs/023-api-db-core-hardening/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Includes automated test writing tasks for the controllers and validation checks as requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo paths are specified relative to the repository root (e.g., `apps/api/src/...`, `.github/workflows/...`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project dependency and context initialization

- [x] T001 Verify and update project dependencies in apps/api/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database alignment and environment loading checks that MUST be complete before reports or workflow mutations can run

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Generate database delta migration and apply to PostgreSQL in apps/api/prisma/schema.prisma
- [x] T003 [P] Implement Prisma migrations sync verification checks in apps/api/src/database/prisma.service.ts
- [x] T004 [P] Implement environment schema validation using Zod in apps/api/src/config/env.validation.ts and apps/api/src/app.module.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Warehouse Operator Live Reports View (Priority: P1) 🎯 MVP

**Goal**: Implement and expose secure reporting routes under `/reports` mapping to Prisma database queries.

**Independent Test**: Hit each reporting route via HTTP requests with active scope headers and assert correct database output data is returned.

### Implementation for User Story 1

- [x] T005 [P] [US1] Implement Available Inventory report route in apps/api/src/modules/reports/reports.controller.ts
- [x] T006 [P] [US1] Implement paginated Inventory Movements report route in apps/api/src/modules/reports/reports.controller.ts
- [x] T007 [P] [US1] Implement Expiry report route in apps/api/src/modules/reports/reports.controller.ts
- [x] T008 [P] [US1] Implement Stocktake Variance report route in apps/api/src/modules/reports/reports.controller.ts
- [x] T009 [P] [US1] Implement Procurement Status report route in apps/api/src/modules/reports/reports.controller.ts
- [x] T010 [P] [US1] Implement Currency Summaries report route in apps/api/src/modules/reports/reports.controller.ts
- [x] T011 [US1] Implement unit and integration tests in apps/api/src/modules/reports/reports.controller.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - System Administrator Safe Configuration Validation (Priority: P2)

**Goal**: Ensure configuration errors cause fail-fast boot crashes logged securely.

**Independent Test**: Comment out JWT_ACCESS_SECRET from `.env`, boot API, and assert process exits with exit code 1 and logs FATAL JSON error.

### Implementation for User Story 2

- [x] T012 [US2] Implement configuration validation verification test suite in apps/api/test/config-validation.e2e-spec.ts

**Checkpoint**: At this point, User Story 2 configuration guard is active and verified.

---

## Phase 5: User Story 3 - Database Drift Remediation & Transaction Safety (Priority: P3)

**Goal**: Ensure database mutations (locks/notifications) succeed without DDL column/table errors.

**Independent Test**: Execute warehouse lock and workflow transitions and assert no SQL execution errors occur.

### Implementation for User Story 3

- [x] T013 [US3] Verify compilation of warehouse lock guard and controller in apps/api/src/guards/warehouse-lock.guard.ts

**Checkpoint**: All schema-dependent lock and notification triggers are validated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality verification and CI config updates

- [x] T014 [P] Add typecheck and tests commands to CI workflow in .github/workflows/test-build.yml
- [x] T015 Run lint validation check via npm run lint --filter=api
- [x] T016 Run typecheck validation check via npm run typecheck --filter=api
- [x] T017 Run quickstart.md validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel or sequentially.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities

- Foundational tasks T003 and T004 can run in parallel once DB migration is generated.
- Reporting route tasks T005 to T010 can run in parallel since they modify independent routes in the controller.
- CI configuration changes (T014) can be prepared in parallel with implementation.

---

## Parallel Example: User Story 1

```bash
# Implement reporting endpoints in parallel:
Task: "Implement Available Inventory report route in apps/api/src/modules/reports/reports.controller.ts"
Task: "Implement paginated Inventory Movements report route in apps/api/src/modules/reports/reports.controller.ts"
Task: "Implement Expiry report route in apps/api/src/modules/reports/reports.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (DB alignment + startup checks)
3. Complete Phase 3: User Story 1 (Reports Controller implementation)
4. Validate User Story 1 using unit tests and REST client.

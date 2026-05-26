# Tasks: Sprint 0 Readiness Hardening

**Input**: Design documents from `specs/030-sprint0-remediation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create env template file `docker-compose.env.example` in repo root and add `.env` pattern to `.gitignore`
- [x] T002 Update workspace configuration in package.json to prepare build-pipeline integrations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database constraints and schema setups that MUST be completed before user stories

- [x] T003 Setup and apply raw SQL database check constraints via a new database migration in `prisma/migrations/`
- [x] T004 Add `VOIDED` status to the database enums in the schema file `prisma/schema.prisma`
- [x] T005 Add `VOID` action and `VOIDED` status definitions to the shared transition maps in `packages/shared-types/src/workflow/`

---

## Phase 3: User Story 1 - Posted Document Voiding and Inventory Reversal (Priority: P1) 🎯 MVP

**Goal**: Implement backend and frontend workflows to reverse posted documents and update stock ledgers.
**Independent Test**: Post a Goods Received Note, select void, provide a reason comment, and assert stock decreases to pre-posting values.

### Implementation for User Story 1

- [x] T006 Implement the void/reversal transaction engine service in `apps/api/src/modules/operations/void.service.ts`
- [x] T007 [P] Create the void controller in `apps/api/src/modules/operations/void.controller.ts` to expose endpoints
- [x] T008 Register the new controller and service in `apps/api/src/app.module.ts`
- [x] T009 [P] [US1] Create backend unit tests verifying ledger reversals in `apps/api/src/modules/operations/void.service.spec.ts`
- [x] T010 [US1] Implement Void Button, comment modal, and status styling in the frontend document details component `apps/web/src/app/[locale]/(app)/(procurement)/purchase-orders/[id]/POViewer.tsx`

---

## Phase 4: User Story 2 - Real-time Roles Management and Search Integration (Priority: P1)

**Goal**: Wire frontend role lists and transaction search views to real backend APIs instead of mock data.
**Independent Test**: Load the Roles page and check network traffic for a GET request to `/admin/roles`.

### Implementation for User Story 2

- [x] T011 [US2] Update the role query hook in `apps/web/src/features/admin/hooks/useAdminRoles.ts` to query the live backend API and remove static arrays
- [x] T012 [US2] Update the search view in `apps/web/src/app/[locale]/(app)/search/SearchClient.tsx` to call the live search API
- [x] T013 [P] [US2] Create integration tests for the roles component in `apps/web/src/app/[locale]/(app)/admin/roles/RolesListClient.spec.tsx`

---

## Phase 5: User Story 3 - Operational Fail-Safe Warnings and Database Safeguards (Priority: P1)

**Goal**: Return email errors when unconfigured and generate admin notification logs.
**Independent Test**: Trigger a transaction with SMTP unconfigured; confirm outbox event fails and an admin warning is created.

### Implementation for User Story 3

- [x] T014 [US3] Update transporter checks and return values in `apps/api/src/modules/outbox/email.service.ts`
- [x] T015 [US3] Implement status mapping and database admin notification logs in `apps/api/src/modules/outbox/outbox.worker.ts`
- [x] T016 [P] [US3] Create outbox worker tests in `apps/api/src/modules/outbox/email.service.spec.ts`

---

## Phase 6: User Story 4 - Settings-Driven Multi-Currency Dashboard (Priority: P2)

**Goal**: Format metrics dynamically using the base currency setting.
**Independent Test**: Change base currency in settings and verify dashboard totals update immediately.

### Implementation for User Story 4

- [x] T017 [US4] Bind dashboard metrics to configuration settings hook in `apps/web/src/app/[locale]/(app)/dashboard/DashboardClient.tsx`
- [x] T018 [US4] Bind currency formatting in store manager dashboard cards in `apps/web/src/app/[locale]/(app)/dashboard/StoreManagerDashboard.tsx`
- [x] T019 [US4] Update currency hook selectors in `apps/web/src/features/purchasing/hooks/useGoodsReceipts.ts`

---

## Phase 7: User Story 5 - Environment-Isolated Secrets Configuration (Priority: P2)

**Goal**: Externalize secrets to environment variables.
**Independent Test**: Verify docker-compose.yml runs without plain-text secret values.

### Implementation for User Story 5

- [x] T020 [US5] Replace hardcoded secrets with environment variable references in `docker-compose.yml`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Typechecks and final project verification checks.

- [x] T021 [P] Run typecheck validation scripts via package.json
- [x] T022 Validate all pre-flight check scenarios detailed in `specs/030-sprint0-remediation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks user stories.
- **User Stories (Phase 3+)**: All depend on Foundational completion. Can run in parallel once foundation is complete.
- **Polish (Phase 8)**: Depends on all user stories.

### Parallel Opportunities

- All tasks marked `[P]` can run in parallel within their respective phases.
- Once Phase 2 is complete, US1, US2, US3, US4, and US5 can be developed in parallel by separate team streams.

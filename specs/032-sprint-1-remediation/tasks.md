# Tasks: Sprint 1 — High-Priority Hardening

**Input**: Design documents from `/specs/032-sprint-1-remediation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Jest unit/integration tests and React Testing Library specs are included to verify implementation correctness.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation checks

- [X] T001 Verify active git branch is `032-sprint-1-remediation` and plan references match in `AGENTS.md`
- [X] T002 Configure ExcelJS dependency in `apps/api/package.json` and `packages/shared-types/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities, route bindings, and database migrations

- [X] T003 Setup database migration to add unique composite key on `document_sequences` table in `prisma/migrations/`
- [X] T004 Run database migration on dev environment and update client models by running `npx prisma generate`
- [X] T005 [P] Setup global APP_GUARD registry for `CsrfGuard` in `apps/api/src/app.module.ts`
- [X] T006 [P] Configure client-side API instance to attach CSRF headers on mutations in `apps/web/src/lib/api-client.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Unique and Sequential Document Numbering (Priority: P1) 🎯 MVP

**Goal**: Enforce DB-level constraint to prevent duplicate sequence numbers during concurrent postings.

**Independent Test**: Concurrent database insert checks for sequence records fail on duplicate keys.

### Implementation for User Story 1

- [X] T007 [P] [US1] Inspect unique composite checks in `apps/api/src/modules/operations/document-sequence.service.ts`
- [X] T008 [US1] Create unit test simulating concurrent database sequence requests in `apps/api/src/modules/operations/document-sequence.service.spec.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Real-time SMTP Configuration and Validation Interface (Priority: P1)

**Goal**: Expose admin settings UI to edit and validate SMTP details with test-email trigger.

**Independent Test**: Fill settings in settings UI, click send test email, verify connection details successfully validated.

### Implementation for User Story 2

- [X] T009 [P] [US2] Update settings query in `apps/api/src/modules/admin/admin.service.ts` to return masked password string and decrypt correctly on save
- [X] T010 [US2] Wire the SMTP credentials UI form fields to the update settings endpoint in `apps/web/src/app/[locale]/(app)/admin/settings/page.tsx`
- [X] T011 [US2] Implement "Send Test Email" buttons and alert warning banners in `apps/web/src/app/[locale]/(app)/admin/settings/page.tsx`
- [X] T012 [P] [US2] Add unit tests for settings update and connection test in `apps/api/src/modules/admin/admin.service.spec.ts`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Adjustment Valuation Protection (Priority: P1)

**Goal**: Ensure Adjustments of type "IN" require positive costs.

**Independent Test**: Post adjustment IN with zero cost returns 400 Bad Request.

### Implementation for User Story 3

- [X] T013 [P] [US3] Add validation logic to throw `BadRequestException` for zero-cost Adjustments IN in `apps/api/src/modules/operations/adjustment-post.service.ts`
- [X] T014 [US3] Set unitCost input to required for Adjustment IN forms in `apps/web/src/features/inventory/components/adjustment-form.tsx`
- [X] T015 [US3] Add unit tests for Adjustment IN cost validation in `apps/api/src/modules/operations/adjustment-post.service.spec.ts`

**Checkpoint**: User Story 3 is fully functional.

---

## Phase 6: User Story 4 - Seamless Barcode Scanning & Rate Limit Tuning (Priority: P1)

**Goal**: Expose custom throttles per-endpoint to allow rapid wedge scanner operations.

**Independent Test**: Scan 30 items sequentially without encountering throttling screens.

### Implementation for User Story 4

- [X] T016 [P] [US4] Configure throttler limits in `apps/api/src/app.module.ts` and set strict caps on `auth` controllers
- [X] T017 [US4] Add unit tests for rate limiting response rules in `apps/api/test/rate-limiting.e2e-spec.ts`

**Checkpoint**: User Story 4 is fully functional.

---

## Phase 7: User Story 5 - Interactive Reports Hub with WAC History and Lot Traceability (Priority: P2)

**Goal**: Create report cards and details pages for WAC and Lot Trace reports.

**Independent Test**: Click WAC history report card, view table, click source PO link, PO details modal opens.

### Implementation for User Story 5

- [X] T018 [P] [US5] Add WAC and Lot Trace navigation options in `apps/web/src/app/[locale]/(app)/reports/ReportsHubClient.tsx`
- [X] T019 [US5] Build WAC History report UI page with filters and table in `apps/web/src/app/[locale]/(app)/reports/wac-history/page.tsx`
- [X] T020 [US5] Build Lot Traceability report UI page in `apps/web/src/app/[locale]/(app)/reports/lot-trace/page.tsx`

**Checkpoint**: User Story 5 is fully functional.

---

## Phase 8: User Story 6 - Memory-Safe Streaming and Export Guard for Large Reports (Priority: P2)

**Goal**: Limit exports to 50k rows and stream generated tables using cursor pagination.

**Independent Test**: Attempt export matching 60k rows, verify blocked in UI; run export under limit, verify successful download.

### Implementation for User Story 6

- [X] T021 [P] [US6] Extract report queries from controllers to `apps/api/src/modules/reports/reports.service.ts`
- [X] T022 [US6] Add row limits checks and streamed workbook responses in `apps/api/src/modules/reports/reports.controller.ts`
- [X] T023 [US6] Configure CSV/XLSX streaming export actions in Reports Hub UI components

**Checkpoint**: User Story 6 is fully functional.

---

## Phase 9: User Story 7 - Batch Reconciliation Operations (Priority: P2)

**Goal**: Optimize reconciliation queries to run database freezes in one single batch update.

**Independent Test**: Reconciliation job executes and freezes discrepant items in < 10 seconds.

### Implementation for User Story 7

- [X] T024 [P] [US7] Refactor the loops to execute `updateMany` for discrepancies in `apps/api/src/modules/ledger/reconciliation.job.ts`
- [X] T025 [US7] Verify batch execution and logs in `apps/api/src/modules/ledger/reconciliation.job.spec.ts`

**Checkpoint**: User Story 7 is fully functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T026 Build and typecheck api package: `npm run build --filter=api`
- [X] T027 Run frontend typechecks: `npm run typecheck --filter=web`
- [X] T028 Run quickstart.md manual validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3 to 9)**: Depend on Foundational phase completion
- **Polish (Phase 10)**: Depends on all user stories being complete

### Parallel Opportunities

- Foundational tasks T005 and T006 can run in parallel.
- Once Foundation completes, US1 to US7 implementations can start in parallel based on team assignment.

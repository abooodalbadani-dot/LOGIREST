# Tasks: Sprint 2: Automated Validation & UI Integration

**Input**: Design documents from `/specs/045-validation-ui-integration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included as explicit Playwright and Jest verification steps to satisfy operational safety requirements.

**Organization**: Tasks are grouped by setup, foundation, and individual user story phases to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

## Path Conventions

- **NestJS API App**: `apps/api/src/`
- **Next.js Client App**: `apps/web/src/`
- **Shared Types Package**: `packages/shared-types/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema enhancement and environment variables configuration

- [ ] T001 Add the `isFrozen` boolean field mapping to `is_frozen` (defaulting to false) in `apps/api/prisma/schema.prisma` and execute `npx prisma generate`
- [ ] T002 [P] Add placeholder configuration entries for `SLACK_VALIDATION_WEBHOOK_URL` and `VALIDATION_ALERT_EMAILS` in `apps/api/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core quarantine validation layer inside the api operations scope validation service

**⚠️ CRITICAL**: No user story UI work can begin until this backend validation guard layer is complete

- [ ] T003 Implement `checkWarehouseItemQuarantine(itemId, warehouseId)` in `apps/api/src/modules/operations/scope-validation.service.ts` to query if an item lot is frozen
- [ ] T004 [P] Integrate the `checkWarehouseItemQuarantine` guard into the transfer posting and receive transaction service in `apps/api/src/modules/operations/transfer-post.service.ts`
- [ ] T005 [P] Integrate the `checkWarehouseItemQuarantine` guard into the inventory issue post transaction service in `apps/api/src/modules/operations/issue-post.service.ts`

**Checkpoint**: Foundation ready - quarantine guard active. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Automated Stock-to-Ledger Consistency Verification Engine (Priority: P1) 🎯 MVP

**Goal**: Automatically audit ledger physical balance invariants at 1:00 AM daily, auto-freeze discrepant items in specific warehouses, and dispatch Slack/email alerts.

**Independent Test**: Administrative API call `GET /api/admin/inventory/validate` executes, outputs JSON certificate, and auto-freezes an item when a ledger discrepancy is simulated.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T006 [P] [US1] Write unit and integration tests for consistency equations validation in `apps/api/src/modules/admin/tests/inventory-validation.spec.ts`

### Implementation for User Story 1

- [ ] T007 [P] [US1] Implement the raw SQL invariant check queries (Equations 1, 2, and 3) in `apps/api/src/modules/admin/inventory-validation.service.ts`
- [ ] T008 [US1] Implement automatic item-freezing update updates on `WarehouseItem` within the validation service in `apps/api/src/modules/admin/inventory-validation.service.ts`
- [ ] T009 [US1] Implement Slack webhook and SMTP notification alert triggers inside the validation service in `apps/api/src/modules/admin/inventory-validation.service.ts`
- [ ] T010 [US1] Create the authenticated controller endpoint `GET /api/admin/inventory/validate` in `apps/api/src/modules/admin/inventory-validation.controller.ts`
- [ ] T011 [US1] Add the cron decorator schedule `@Cron('0 1 * * *')` in `apps/api/src/modules/admin/inventory-validation.cron.ts` to trigger daily at 1:00 AM

**Checkpoint**: At this point, User Story 1 (Consistency engine & alerts) is fully functional and independently testable on the backend.

---

## Phase 4: User Story 2 - Confirm Receipt Button in Transfer Viewer UI (Priority: P2)

**Goal**: Render active "Confirm Receipt" button for in-transit stock transfers, enabling receiving keepers to receive transfer shipments.

**Independent Test**: Keepers view in-transit transfers, click the receipt button, and confirm receipt state updates.

### Tests for User Story 2

- [ ] T012 [P] [US2] Write Playwright integration test for Confirm Receipt interaction in `tests/e2e/operations/transfer-receive.spec.ts`

### Implementation for User Story 2

- [ ] T013 [P] [US2] Add the receive stock transfer PUT endpoint handler `PUT /api/operations/transfers/:id/receive` in `apps/api/src/modules/operations/transfers/transfer.controller.ts`
- [ ] T014 [US2] Render the Confirm Receipt action button in `apps/web/src/features/operations/components/transfer-viewer.tsx` only when status is `IN_TRANSIT`
- [ ] T015 [US2] Connect the receipt button handler to trigger the transfer receive mutation API call in `apps/web/src/features/operations/components/transfer-viewer.tsx`

**Checkpoint**: User Story 2 is complete. Users can ship and receive transfer shipments with instant client-side updates.

---

## Phase 5: User Story 3 - Submit Button and Hook in Inventory Issue Form (Priority: P2)

**Goal**: Render submit button in draft inventory issues form and wire `useSubmitIssue` mutation to complete stock consumption.

**Independent Test**: User opens a draft issue, submits it, form transitions to posted status, and locked controls render as read-only.

### Tests for User Story 3

- [ ] T016 [P] [US3] Write Playwright E2E test verifying inventory issue form posting in `tests/e2e/operations/issue-submission.spec.ts`

### Implementation for User Story 3

- [ ] T017 [P] [US3] Create the query mutation hook `useSubmitIssue` in `apps/web/src/features/operations/hooks/useSubmitIssue.ts`
- [ ] T018 [US3] Add the Submit button next to Save Draft on the issue form layout in `apps/web/src/features/operations/components/issue-form.tsx`
- [ ] T019 [US3] Wire the Submit button to trigger the issue submission hook and update the local component view state to read-only in `apps/web/src/features/operations/components/issue-form.tsx`

**Checkpoint**: User Story 3 is complete. Issues can be fully drafted and submitted in the UI.

---

## Phase 6: User Story 4 - Form Lock for Non-Draft Procurement Documents (Priority: P3)

**Goal**: Automatically freeze PR/PO form editing controls and render read-only Lock Banners once procurement documents are approved or posted.

**Independent Test**: Open an approved PO/PR edit screen, check that all fields are disabled, and verify that the Lock Banner alert is displayed.

### Tests for User Story 4

- [ ] T020 [P] [US4] Write E2E Playwright verification test for form locking in `tests/e2e/procurement/form-locking.spec.ts`

### Implementation for User Story 4

- [ ] T021 [US4] Add the read-only warning Lock Banner at the top of the form view in `apps/web/src/features/procurement/components/pr-form.tsx`
- [ ] T022 [US4] Add the read-only warning Lock Banner at the top of the form view in `apps/web/src/features/procurement/components/po-form.tsx`
- [ ] T023 [US4] Bind all inputs, item selectors, additions, and save triggers to `disabled` if the document's state is not `DRAFT` in `apps/web/src/features/procurement/components/pr-form.tsx`
- [ ] T024 [US4] Bind all inputs, item selectors, additions, and save triggers to `disabled` if the document's state is not `DRAFT` in `apps/web/src/features/procurement/components/po-form.tsx`

**Checkpoint**: User Story 4 is complete. Approved procurement documents are safely locked down.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Micro-audits, bundle checks, build verifications, and testing completions

- [ ] T025 [P] Run `npm run build --filter=api` to verify NestJS API compilation
- [ ] T026 [P] Run `npm run typecheck --filter=web` to verify Next.js frontend TypeScript compilation
- [ ] T027 Run all Playwright and Jest verification suites per `quickstart.md`
- [ ] T028 Update API documentation and user guide files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. **BLOCKS all user stories**.
- **User Story Phases (Phase 3-6)**: All depend on Phase 2 completion. Can then proceed in parallel.
- **Polish (Phase 7)**: Depends on all user story completions.

### Parallel Opportunities

- All Phase 1 setup tasks marked [P] can run in parallel.
- Phase 2 validation integrations (T004 and T005) can run in parallel in different service files.
- Once Phase 2 completes, Phase 3 (US1 backend logic), Phase 4 (US2 transfer UI), Phase 5 (US3 issue UI), and Phase 6 (US4 form locks) can be executed in parallel by different developers.
- All Playwright/Jest tests marked [P] can be written in parallel.

---

## Parallel Example: User Story 1

```bash
# Developer A writes backend validation queries:
Task: "T007 [P] [US1] Implement the raw SQL invariant check queries (Equations 1, 2, and 3) in apps/api/src/modules/admin/inventory-validation.service.ts"

# Developer B writes unit tests:
Task: "T006 [P] [US1] Write unit and integration tests for consistency equations validation in apps/api/src/modules/admin/tests/inventory-validation.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Setup and Foundational constraints check.
2. Complete US1 (Automated Validation and Auto-Freeze logic).
3. **Validate independently**: Run manual SQL discrepancy tests to verify that items auto-freeze successfully.

### Incremental Delivery
1. Deploy MVP to staging environment and run manual scans.
2. Deliver US2 (Confirm Receipt UI) to unlock transfer completions.
3. Deliver US3 (Submit Issue UI) to unlock physical stock issues.
4. Deliver US4 (Form Locks) to safe-guard finalized procurement states.

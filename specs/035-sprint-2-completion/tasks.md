# Tasks: Sprint 2 Quality Hardening & Completion

**Input**: Design documents from `/specs/035-sprint-2-completion/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are requested for the void service layer (`[CRIT-3]`), setting validators (`[CRIT-4]`), transfer posts (`[CRIT-2]`), and outbox handlers (`[CRIT-1]`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial monorepo environment sync and branch verification

- [x] T001 Verify active Git feature branch name is `035-sprint-2-completion` in repository root
- [x] T002 Verify backend node modules and shared dependencies compiled by running `npm run build --filter=api`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema uniqueness constraint enforcement

**⚠️ CRITICAL**: No user story work can begin until this database schema index is applied

- [x] T003 Enforce composite unique sequence index `@@unique([documentType, year, branchId])` in `apps/api/prisma/schema.prisma`
- [x] T004 Apply database-level migration by running `npx prisma migrate dev --name add_document_sequence_unique_constraint` in repository root

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel or sequence.

---

## Phase 3: User Story 1 - Real-time Goods Receipt Note (GRN) Data Integrity (Priority: P1) 🎯 MVP

**Goal**: Full replacement of simulated frontend GRN mocks with actual RESTful backend API calls.

**Independent Test**: Navigate to the Goods Received Note list, detail, and post views, and verify all operations trigger live API requests instead of mock arrays and setTimeout intervals.

### Implementation for User Story 1

- [x] T005 [US1] Remove mock data arrays, `setTimeout` simulations, and local mutations from `apps/web/src/features/purchasing/api/useGoodsReceipts.ts`
- [x] T006 [US1] Integrate live endpoints in `apps/web/src/features/purchasing/api/useGoodsReceipts.ts` using `apiClient` mapping to `GET /grn`, `GET /grn/${id}`, `POST /grn`, `POST /grn/${id}/post`, and `POST /grn/lines/update`
- [x] T007 [US1] Derive `supplierCurrency` dynamically from the returned GRN object in `apps/web/src/app/[locale]/(app)/(procurement)/goods-received/[id]/post/GRNPostClient.tsx`
- [x] T008 [US1] Inject settings context using `useSettings()` to retrieve system-wide `baseCurrency` in `apps/web/src/app/[locale]/(app)/(procurement)/goods-received/[id]/post/GRNPostClient.tsx`

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently against live backend REST controllers.

---

## Phase 4: User Story 2 - Automated Inventory Expiry Alerts (Priority: P2)

**Goal**: Proactive outbox warning handler for lots approaching their expiration date.

**Independent Test**: Trigger the expiry check job and verify that outbox warning events resolve target roles and render fully structured bilingual email notifications.

### Tests for User Story 2

- [x] T009 [P] [US2] Create unit test in `apps/api/src/modules/outbox/outbox.worker.spec.ts` asserting `EXPIRY_WARNING` event types resolve correctly

### Implementation for User Story 2

- [x] T010 [P] [US2] Extend the `OutboxPayload` interface in `apps/api/src/modules/outbox/outbox.worker.ts` with `lotNumber?: string; expiryDate?: string;` fields
- [x] T011 [US2] Update `resolveRecipients()` switch block in `apps/api/src/modules/outbox/outbox.worker.ts` to map `EXPIRY_WARNING` events to active `[Role.INV_MGR]` users
- [x] T012 [US2] Update `renderTemplate()` switch block in `apps/api/src/modules/outbox/outbox.worker.ts` to support `EXPIRY_WARNING` bilingual, lot-level HTML email structures

**Checkpoint**: At this point, User Story 2 is fully capable of processing and generating expirable warning notifications.

---

## Phase 5: User Story 3 - Real-time Stock Transfer Notifications (Priority: P3)

**Goal**: Push automatic transfer received events and system-wide notifications to source and destination keepers.

**Independent Test**: Finalize a stock transfer receipt and verify that outbox events are dispatched and live log entries are written for both keepers.

### Tests for User Story 3

- [x] T013 [P] [US3] Create unit tests in `apps/api/src/modules/operations/transfer-post.service.spec.ts` verifying outbox event writes and keeper notification logs upon receipt

### Implementation for User Story 3

- [x] T014 [US3] Register `OutboxService` dependency provider in `apps/api/src/modules/operations/operations.module.ts`
- [x] T015 [US3] Inject `OutboxService` into `apps/api/src/modules/operations/transfer-post.service.ts` constructor
- [x] T016 [US3] Dispatch `TRANSFER_RECEIVED` outbox event within `receive()` in `apps/api/src/modules/operations/transfer-post.service.ts`
- [x] T017 [US3] Write dual keeper in-system notification logs (source keeper at `fromWarehouseId` and destination keeper at `toWarehouseId`) in `apps/api/src/modules/operations/transfer-post.service.ts`

**Checkpoint**: All receipt actions now automatically trigger background notifications and in-system alerts.

---

## Phase 6: User Story 4 - High-Fidelity Void Operations (Priority: P4)

**Goal**: Full unit test coverage for document voiding logic, WAC cost timeline calculations, status checks, and concurrency locks.

**Independent Test**: Execute Jest testing commands and confirm 100% of service-level assertions pass for all 5 document void workflows.

### Tests for User Story 4

- [x] T018 [P] [US4] Create comprehensive spec mock assertions for GRN voiding in `apps/api/src/modules/operations/grn-void.service.spec.ts` covering happy path cost recalculation, non-posted rejections, and lot consumption checks
- [x] T019 [P] [US4] Create comprehensive spec mock assertions for stock issue voiding in `apps/api/src/modules/operations/issue-void.service.spec.ts`
- [x] T020 [P] [US4] Create comprehensive spec mock assertions for adjustments voiding in `apps/api/src/modules/operations/adjustment-void.service.spec.ts`
- [x] T021 [P] [US4] Create comprehensive spec mock assertions for stock transfer voiding in `apps/api/src/modules/operations/transfer-void.service.spec.ts`
- [x] T022 [P] [US4] Create comprehensive spec mock assertions for kitchen requests voiding in `apps/api/src/modules/operations/kitchen-request-void.service.spec.ts`

**Checkpoint**: All 5 void services are validated with robust coverage.

---

## Phase 7: User Story 5 - Secure System Settings Administration (Priority: P5)

**Goal**: Server-side validation and parameter whitelisting for updating system-wide properties.

**Independent Test**: Send setting payloads with invalid ports or unwhitelisted keys, and verify the NestJS boundary filters inputs and rejects bad data with 400 errors.

### Tests for User Story 5

- [x] T023 [P] [US5] Add unit tests in `apps/api/src/modules/admin/admin.controller.spec.ts` to assert that invalid settings payloads throw validation exceptions

### Implementation for User Story 5

- [x] T024 [P] [US5] Create `apps/api/src/modules/admin/dto/update-settings.dto.ts` with strict class-validator decorators mapping ports, timezones, encryption, and system name formats
- [x] T025 [US5] Implement the `UpdateSettingsDto` type constraint on the setting modification request handler in `apps/api/src/modules/admin/admin.controller.ts`
- [x] T026 [US5] Verify that the global `ValidationPipe` in `apps/api/src/main.ts` is configured with `whitelist: true` and `transform: true` options enabled

**Checkpoint**: Settings endpoints are fully secured against parameter tampering.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Monorepo compilation checks, linting audits, and manual verification sweeps.

- [x] T027 Run typecheck validation on Next.js frontend by executing `npm run typecheck --filter=web` in repository root
- [x] T028 Run compilation build on NestJS backend by executing `npm run build --filter=api` in repository root
- [x] T029 Execute the full Jest test suite across the monorepo by running `npm run test --filter=api`
- [x] T030 Confirm and sign off on all quickstart guide checklist items in `specs/035-sprint-2-completion/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all subsequent user stories.
- **User Stories (Phases 3+)**: All depend on Foundational phase completion. User Story 1 (P1) is the MVP and should be completed first to establish live endpoint behaviors.
- **Polish (Phase 8)**: Depends on all user story phases being completed.

### Parallel Opportunities

- All void spec files (`T018` through `T022`) can be created and developed in parallel by different developers.
- Setup parameters for outbox `EXPIRY_WARNING` DTOs (`T010`) and setting DTO configurations (`T024`) are parallelizable.
- Once Phase 2 (Foundational migrations) is complete, User Story 1 (Procurement Mocks) and User Story 5 (Settings Security) can be implemented in parallel.

---

## Parallel Example: User Story 4

```bash
# Launch creation of all void unit spec files together:
Task: "Create grn-void.service.spec.ts"
Task: "Create issue-void.service.spec.ts"
Task: "Create adjustment-void.service.spec.ts"
Task: "Create transfer-void.service.spec.ts"
Task: "Create kitchen-request-void.service.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Apply Phase 2 database schema unique composite index migrations.
2. Complete User Story 1, replacing frontend mock hooks with actual API adapters.
3. **STOP and VALIDATE**: Verify Goods Received lists, details, and post updates against local API mocks/endpoints.

### Incremental Delivery

1. Deliver Setup and Migrations → Base ready.
2. Deliver User Story 1 → GRN Live MVP.
3. Deliver User Story 2 & 3 → Outbox workers & transfers.
4. Deliver User Story 4 & 5 → Void assertions & Settings security parameters.

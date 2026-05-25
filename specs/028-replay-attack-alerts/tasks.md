# Tasks: Security Replay Attack Alerts

**Input**: Design documents from `/specs/028-replay-attack-alerts/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- All descriptions include exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic environment verification.

- [x] T001 Verify feature branch and environment configuration in `apps/api/.env` and `.specify/feature.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Verify Prisma models (`OutboxEvent`, `NotificationLog`, `User`) are fully compiled and recognized in `apps/api/prisma/schema.prisma`
- [x] T003 Import and expose `Role` and `'SECURITY_ALERT_REPLAY_ATTACK'` constants in `apps/api/src/modules/outbox/outbox.worker.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Immediate Email Alerting for Administrators (Priority: P1) 🎯 MVP

**Goal**: Dynamically resolve active administrator email addresses and dispatch formatted security incident reports upon token replay detection.

**Independent Test**: Trigger a simulated outbox worker process with a `SECURITY_ALERT_REPLAY_ATTACK` event and verify email template rendering and administrator list query.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] [US1] Create failing unit test for `SECURITY_ALERT_REPLAY_ATTACK` recipient resolution in `apps/api/src/modules/outbox/outbox.worker.spec.ts`
- [x] T005 [P] [US1] Create failing unit test for `SECURITY_ALERT_REPLAY_ATTACK` email template rendering in `apps/api/src/modules/outbox/outbox.worker.spec.ts`

### Implementation for User Story 1

- [x] T006 [P] [US1] Implement `SECURITY_ALERT_REPLAY_ATTACK` recipient resolver under `OutboxWorker.resolveRecipients()` in `apps/api/src/modules/outbox/outbox.worker.ts` to query active ADMIN roles
- [x] T007 [P] [US1] Implement template rendering logic for `SECURITY_ALERT_REPLAY_ATTACK` under `OutboxWorker.renderTemplate()` in `apps/api/src/modules/outbox/outbox.worker.ts`
- [x] T008 [US1] Verify that recipient and template tests pass in `apps/api/src/modules/outbox/outbox.worker.spec.ts`

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - In-System Notification for Active Admins (Priority: P2)

**Goal**: Automate transaction-safe creation of an in-system `NotificationLog` targeting the ADMIN role on replay attack detection.

**Independent Test**: Execute a refresh token replay and verify that a high-priority unread notification log is atomically created.

### Tests for User Story 2

- [x] T009 [P] [US2] Create failing integration test case in `apps/api/test/rtr.e2e-spec.ts` (or `apps/api/src/auth/rtr.service.spec.ts`) verifying that a token replay detection produces both an outbox event and an in-system notification record targeting the ADMIN role

### Implementation for User Story 2

- [x] T010 [US2] Add direct transaction `tx.notificationLog.create()` write for `Role.ADMIN` inside the token rotation replay handling transaction block in `apps/api/src/auth/rtr.service.ts`
- [x] T011 [US2] Verify integration tests pass and in-system notifications are created atomically in `apps/api/test/rtr.e2e-spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 are both fully functional and testable independently.

---

## Phase 5: User Story 3 - Event Auditing and Failure Visibility (Priority: P3)

**Goal**: Establish exponential backoff retry policies for SMTP delivery failures to guarantee complete delivery transparency.

**Independent Test**: Simulate an SMTP failure and verify that outbox events retry up to 5 times before being flagged as FAILED with a logged error.

### Tests for User Story 3

- [x] T012 [P] [US3] Create mock failing test in `apps/api/src/modules/outbox/outbox.worker.spec.ts` simulating SMTP failure and verifying status stays `PENDING` (under 5 attempts) or changes to `FAILED` (at 5 attempts)

### Implementation for User Story 3

- [x] T013 [P] [US3] Configure backoff retry counter and status transition constraints up to a maximum of 5 attempts under `apps/api/src/modules/outbox/outbox.worker.ts`
- [x] T014 [US3] Verify that the outbox worker test suite successfully passes for failure handling

**Checkpoint**: All user stories are now independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and quality auditing of security alert pathways.

- [x] T015 [P] Execute local manual validation steps detailed in `specs/028-replay-attack-alerts/quickstart.md`
- [x] T016 [P] Execute linting validation: `npm run lint --filter=api`
- [x] T017 [P] Execute typecheck validation: `npm run typecheck --filter=api`
- [x] T018 Execute full backend test suite to ensure zero regressions: `npm run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2 → P3).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with `rtr.service.ts` trigger.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Hardens the outbox queue dispatch.

### Parallel Opportunities

- Setup task T001 and Foundational tasks T002-T003 can be executed sequentially by a developer.
- Once Foundational phase is complete:
  - Developer A can work on User Story 1 (resolving Outbox resolutions in `outbox.worker.ts`).
  - Developer B can work in parallel on User Story 2 (injecting `NotificationLog` transactions in `rtr.service.ts`).
- Tests T004-T005 (P1) and T012 (P3) can be written and verified in parallel.

---

## Parallel Example: User Story 1

```bash
# Implement and test P1 in parallel
Task T004: "Create failing unit test for SECURITY_ALERT_REPLAY_ATTACK recipient resolution in apps/api/src/modules/outbox/outbox.worker.spec.ts"
Task T005: "Create failing unit test for SECURITY_ALERT_REPLAY_ATTACK email template rendering in apps/api/src/modules/outbox/outbox.worker.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1 (Core Email Alerts).
4. **STOP and VALIDATE**: Verify administrator email dispatches.

### Incremental Delivery

1. Complete Setup + Foundational → System base verified.
2. Add User Story 1 → Email alerts functional (MVP).
3. Add User Story 2 → In-system notifications active.
4. Add User Story 3 → Retry policy and error logging hardened.

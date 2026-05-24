# Tasks: Observability, Security & Deployment Hardening (Phase 3)

**Input**: Design documents from `/specs/025-observability-security-deployment-hardening/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Every task description contains the target file path.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment configuration

- [x] T001 Verify project structure under specs/025-observability-security-deployment-hardening/
- [x] T002 Configure backend and frontend env dependencies for cookies and queues in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database tables and middleware that must be complete before any user story work begins

**⚠️ CRITICAL**: No user story implementation can start until the database outbox schema and base routing middlewares are complete.

- [ ] T003 Setup database migrations for OutboxEvent table in apps/api/prisma/schema.prisma
- [ ] T004 Run Prisma migrations to update live database schema with outbox_events table using powershell
- [ ] T005 [P] Register Cookie-Parser middleware on NestJS API in apps/api/src/main.ts
- [ ] T006 [P] Initialize Redis configuration module in apps/api/src/modules/app.module.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Secure Session Cookies (Priority: P1) 🎯 MVP

**Goal**: Deliver session and refresh tokens in HttpOnly/Secure/SameSite=Strict cookies with RTR updates and frontend propagation.

**Independent Test**: Assert that tokens are not readable via `document.cookie` in browser console, and subsequent requests authenticate successfully.

### Tests for User Story 1
- [ ] T007 [P] [US1] Write integration tests for secure cookie delivery and refresh rotation in apps/api/test/auth-cookies.spec.ts

### Implementation for User Story 1
- [ ] T008 [US1] Refactor AuthController login and register to set access_token and refresh_token in response cookies in apps/api/src/modules/auth/auth.controller.ts
- [ ] T009 [US1] Refactor AuthController refresh to read refresh_token from cookies and execute RTR in apps/api/src/modules/auth/auth.controller.ts
- [ ] T010 [US1] Refactor JwtAuthGuard and strategies to extract access token from cookies in apps/api/src/modules/auth/jwt.strategy.ts
- [ ] T011 [US1] Refactor frontend custom client to enable standard credentials propagation (credentials: 'include') in apps/web/src/lib/client.ts
- [ ] T012 [US1] Execute authentication integration tests and assert successful cookie login/refresh in apps/api/test/auth-cookies.spec.ts

**Checkpoint**: Secure session cookies are fully functional and independently verified.

---

## Phase 4: User Story 2 - Fail-Fast API Configuration (Priority: P2)

**Goal**: Enforce client fail-fast checks at startup when mocks are disabled and API URL is missing.

**Independent Test**: Start frontend dev server without NEXT_PUBLIC_API_URL and assert startup termination.

### Tests for User Story 2
- [ ] T013 [P] [US2] Write unit tests for client configuration validation in apps/web/test/config.spec.ts

### Implementation for User Story 2
- [ ] T014 [US2] Implement fail-fast validation check inside the application entry point in apps/web/src/app/layout.tsx
- [ ] T015 [US2] Run client fail-fast validation tests and confirm application halts on invalid config in apps/web/test/config.spec.ts

**Checkpoint**: Client fail-fast configuration is operational.

---

## Phase 5: User Story 3 - Health Check Database Connectivity (Priority: P3)

**Goal**: Backend health route checks Prisma database connection health and returns 503 if unreachable.

**Independent Test**: Simulate database outage and assert /health returns 503 Service Unavailable.

### Tests for User Story 3
- [ ] T016 [P] [US3] Write integration tests for active database health check in apps/api/test/health.spec.ts

### Implementation for User Story 3
- [ ] T017 [US3] Refactor HealthController to execute Prisma query raw connectivity ping in apps/api/src/modules/health/health.controller.ts
- [ ] T018 [US3] Verify active database connection health check tests succeed in apps/api/test/health.spec.ts

**Checkpoint**: Active database health checks are fully integrated and verified.

---

## Phase 6: User Story 4 - Asynchronous Notification Outbox Queue (Priority: P4)

**Goal**: Atomic transactional outbox writes processed asynchronously via BullMQ/Redis with 7-day succeeded logs retention.

**Independent Test**: Commit a Purchase Order update, verify outbox log record, and assert background queue processes the event.

### Tests for User Story 4
- [ ] T019 [P] [US4] Write integration tests for transactional outbox writes and background worker queue processing in apps/api/test/outbox.spec.ts

### Implementation for User Story 4
- [ ] T020 [US4] Create OutboxService for writing events atomically inside Prisma transaction context in apps/api/src/modules/outbox/outbox.service.ts
- [ ] T021 [US4] Implement OutboxWorker utilizing BullMQ/Redis to process pending events in apps/api/src/modules/outbox/outbox.worker.ts
- [ ] T022 [US4] Integrate OutboxService in document workflow modules (e.g. PurchaseOrder, Transfer) in apps/api/src/modules/operations/
- [ ] T023 [US4] Implement OutboxCleanupJob cron job for 7-day successful logs cleanup in apps/api/src/modules/outbox/outbox-cleanup.job.ts
- [ ] T024 [US4] Run outbox processing integration tests and verify successful execution, retries, and cleanups in apps/api/test/outbox.spec.ts

**Checkpoint**: Transactional outbox queue and asynchronous dispatch are operational.

---

## Phase 7: User Story 5 - Standalone Containerized Packaging (Priority: P5)

**Goal**: Create multi-stage production Docker configurations and local docker-compose configuration including a Redis container.

**Independent Test**: Build and boot services locally via compose, verifying successful communication.

### Implementation for User Story 5
- [ ] T025 [P] [US5] Create multi-stage production container configuration in apps/api/Dockerfile
- [ ] T026 [P] [US5] Create multi-stage production container configuration in apps/web/Dockerfile
- [ ] T027 [US5] Create container composition and local development infrastructure settings in docker-compose.yml
- [ ] T028 [US5] Build and run entire application stack via compose locally, verifying container sanity and connectivity

**Checkpoint**: Standalone containerized environments are fully set up.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Code cleanup, documentation, lint checks, and final verification

- [ ] T029 Documentation updates in README.md and specs/025-observability-security-deployment-hardening/quickstart.md
- [ ] T030 Execute global code linting and typecheck checks via npm scripts in package.json
- [ ] T031 Run final full-suite verification tests to confirm zero regressions in apps/api/test/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all subsequent user stories.
- **User Stories (Phases 3–7)**: Depend on Foundational phase completion.
  - **User Story 1 (P1)**: High priority, standalone auth cookie logic.
  - **User Story 2 (P2)**: Focuses on client-side startup config checks.
  - **User Story 3 (P3)**: Focuses on API health checks.
  - **User Story 4 (P4)**: Focuses on background outbox processing and requires database schema (T003).
  - **User Story 5 (P5)**: Focuses on container composition (relies on setup configurations).
- **Polish (Phase 8)**: Depends on all user story completions.

### Parallel Opportunities

- All setup tasks marked [P] can run in parallel.
- All foundational middleware and Redis setup tasks marked [P] can run in parallel in Phase 2.
- Integration test tasks (T007, T013, T016, T019) and container configurations (T025, T026) can be initiated in parallel by different developers.

---

## Parallel Example: User Story 1

```bash
# Developer A: Implement auth cookies on backend controller and strategy
Task: "Refactor AuthController login and register to set access_token and refresh_token in response cookies in apps/api/src/modules/auth/auth.controller.ts"

# Developer B: Implement credentials propagation on frontend client
Task: "Refactor frontend custom client to enable standard credentials propagation (credentials: 'include') in apps/web/src/lib/client.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational database migrations (T001-T006).
2. Complete secure cookie authentication (T007-T012).
3. **STOP and VALIDATE**: Test secure cookie authentication independently before proceeding.

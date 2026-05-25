# Tasks: Observability, Security & Deployment Hardening (Phase 3)

## Phase 1: Setup (Shared Infrastructure)
- [x] T001 Verify project structure under specs/025-observability-security-deployment-hardening/
- [x] T002 Configure backend and frontend env dependencies for cookies and queues in package.json

## Phase 2: Foundational (Blocking Prerequisites)
- [x] T003 Setup database migrations for OutboxEvent table in apps/api/prisma/schema.prisma
- [x] T004 Run Prisma migrations to update live database schema with outbox_events table using powershell
- [x] T005 [P] Register Cookie-Parser middleware on NestJS API in apps/api/src/main.ts
- [x] T006 [P] Initialize Redis configuration module in apps/api/src/modules/app.module.ts

## Phase 3: User Story 1 - Secure Session Cookies (Priority: P1)
- [x] T007 [P] [US1] Write integration tests for secure cookie delivery and refresh rotation in apps/api/test/auth-cookies.e2e-spec.ts
- [x] T008 [US1] Refactor AuthController login and register to set access_token and refresh_token in response cookies in apps/api/src/modules/auth/auth.controller.ts
- [x] T009 [US1] Refactor AuthController refresh to read refresh_token from cookies and execute RTR in apps/api/src/modules/auth/auth.controller.ts
- [x] T010 [US1] Refactor JwtAuthGuard and strategies to extract access token from cookies in apps/api/src/modules/auth/jwt.strategy.ts
- [x] T011 [US1] Refactor frontend custom client to enable standard credentials propagation (credentials: 'include') in apps/web/src/lib/client.ts
- [x] T012 [US1] Execute authentication integration tests and assert successful cookie login/refresh in apps/api/test/auth-cookies.e2e-spec.ts

## Phase 4: User Story 2 - Fail-Fast API Configuration (Priority: P2)
- [x] T013 [P] [US2] Write unit tests for client configuration validation in apps/web/src/tests/unit/config.test.ts
- [x] T014 [US2] Implement fail-fast validation check inside the application entry point in apps/web/src/app/[locale]/layout.tsx
- [x] T015 [US2] Run client fail-fast validation tests and confirm application halts on invalid config in apps/web/src/tests/unit/config.test.ts

## Phase 5: User Story 3 - Health Check Database Connectivity (Priority: P3)
- [x] T016 [P] [US3] Write integration tests for active database health check in apps/api/test/health.e2e-spec.ts
- [x] T017 [US3] Refactor HealthController to execute Prisma query raw connectivity ping in apps/api/src/health/health.controller.ts
- [x] T018 [US3] Verify active database connection health check tests succeed in apps/api/test/health.e2e-spec.ts

## Phase 6: User Story 4 - Asynchronous Notification Outbox Queue (Priority: P4)
- [ ] T019 [P] [US4] Write integration tests for transactional outbox writes and background worker queue processing in apps/api/test/outbox.spec.ts
- [ ] T020 [US4] Create OutboxService for writing events atomically inside Prisma transaction context in apps/api/src/modules/outbox/outbox.service.ts
- [ ] T021 [US4] Implement OutboxWorker utilizing BullMQ/Redis to process pending events in apps/api/src/modules/outbox/outbox.worker.ts
- [ ] T022 [US4] Integrate OutboxService in document workflow modules (e.g. PurchaseOrder, Transfer) in apps/api/src/modules/operations/
- [ ] T023 [US4] Implement OutboxCleanupJob cron job for 7-day successful logs cleanup in apps/api/src/modules/outbox/outbox-cleanup.job.ts
- [ ] T024 [US4] Run outbox processing integration tests and verify successful execution, retries, and cleanups in apps/api/test/outbox.spec.ts

## Phase 7: User Story 5 - Standalone Containerized Packaging (Priority: P5)
- [ ] T025 [P] [US5] Create multi-stage production container configuration in apps/api/Dockerfile
- [ ] T026 [P] [US5] Create multi-stage production container configuration in apps/web/Dockerfile
- [ ] T027 [US5] Create container composition and local development infrastructure settings in docker-compose.yml
- [ ] T028 [US5] Build and run entire application stack via compose locally, verifying container sanity and connectivity

## Phase 8: Polish & Cross-Cutting Concerns
- [ ] T029 Documentation updates in README.md and specs/025-observability-security-deployment-hardening/quickstart.md
- [ ] T030 Execute global code linting and typecheck checks via npm scripts in package.json
- [ ] T031 Run final full-suite verification tests to confirm zero regressions in apps/api/test/

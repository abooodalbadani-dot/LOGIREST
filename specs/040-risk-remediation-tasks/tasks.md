# Tasks: LogiRest Risk Remediation Tasks

**Input**: Design documents from `/specs/040-risk-remediation-tasks/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation

- [ ] T001 Verify active Git feature branch and update global plan parameters in `.specify/feature.json` and `AGENTS.md`
- [ ] T002 Verify monorepo workspace configurations and package scope filters in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema models, migrations, and performance indexes that MUST be complete before user story development

**⚠️ CRITICAL**: No user story work can begin until database schemas are successfully migrated

- [ ] T003 Create raw SQL migration containing non-negative check constraints on warehouse items, lots, and request fulfillment quantities in a new migration directory `apps/api/prisma/migrations/`
- [ ] T004 [P] Add missing performance indexes for statuses and document IDs to `apps/api/prisma/schema.prisma`
- [ ] T005 [P] Add `failedLoginAttempts` and `lockedUntil` fields to User model in `apps/api/prisma/schema.prisma`
- [ ] T006 [P] Add `PasswordResetToken` model mapping single-use hashes to `apps/api/prisma/schema.prisma`
- [ ] T007 [P] Add `YieldBatch` model mapping persistent production batch statistics to `apps/api/prisma/schema.prisma`
- [ ] T008 [P] Add `issueId` relation field linking requests to physical inventory deductions in `apps/api/prisma/schema.prisma`
- [ ] T009 Execute schema generation and migrate database changes utilizing `npx prisma migrate dev` in terminal

**Checkpoint**: Foundational schemas and indexes migrated successfully. Let's begin user story implementations.

---

## Phase 3: User Story 1 - Secure Identity & Access Management Hardening (Priority: P1) 🎯 MVP

**Goal**: Protect identity and authentication endpoints from brute-force login attacks, token forgery, session hijacking, and privilege leaks.

**Independent Test**: Verified by checking that missing secrets fail to start the server, accounts lock after 5 failed login attempts, profile changes block email/role updates, and IP addresses are written to audit logs.

### Implementation for User Story 1

- [ ] T010 [P] [US1] Remove hardcoded fallback secret key inside NestJS JWT strategy in `apps/api/src/auth/jwt.strategy.ts`
- [ ] T011 [P] [US1] Validate required JWT environment variables on startup in app module validation schema in `apps/api/src/app.module.ts`
- [ ] T012 [P] [US1] Create strict profile update parameter Class-Validator DTO in `apps/api/src/auth/dto/update-profile.dto.ts`
- [ ] T013 [US1] Refactor update profile methods to enforce DTO whitelist and log `USER_PROFILE_UPDATED` entries in `apps/api/src/auth/auth.service.ts` (depends on T012)
- [ ] T014 [US1] Update profile controller endpoint to accept new validation DTO and prevent non-editable alterations in `apps/api/src/auth/auth.controller.ts` (depends on T013)
- [ ] T015 [US1] Refactor login service logic to increment invalid attempts, enforce 15-minute lockouts, and log successful logins in `apps/api/src/auth/auth.service.ts`
- [ ] T016 [US1] Update login controller endpoint to capture incoming IP address from request headers in `apps/api/src/auth/auth.controller.ts` (depends on T015)
- [ ] T017 [US1] Implement admin unlock user account REST endpoint in `apps/api/src/auth/auth.controller.ts`

**Checkpoint**: At this point, User Story 1 (Secure IAM Hardening) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Operational Inventory Movement & Control Integration (Priority: P1)

**Goal**: Link kitchen requests to physical stock deductions atomically, transition expired lots to blocked statuses automatically, and enforce sequential document sequence numbers.

**Independent Test**: Fulfilling a kitchen request automatically creates and posts a corresponding inventory issue, and daily lot checks freeze expired batches.

### Implementation for User Story 2

- [ ] T018 [P] [US2] Integrate sequence sequence numbers for kitchen requests using document sequence generator in `apps/api/src/modules/kitchen-requests/kitchen-requests.service.ts`
- [ ] T019 [US2] Add document sequence seed record for KITCHEN_REQUEST to database seeds in `apps/api/prisma/seed.ts`
- [ ] T020 [US2] Extend daily lot alert job to automatically transition past-expiry lots to EXPIRED status in `apps/api/src/jobs/expiry-alert.job.ts`
- [ ] T021 [US2] Refactor kitchen requests service `fulfill()` to atomically link requests to automatically created and posted submitted inventory issues in `apps/api/src/modules/kitchen-requests/kitchen-requests.service.ts`

**Checkpoint**: User Story 2 (Operational Movement links and Lot controls) is fully integrated.

---

## Phase 5: User Story 3 - Financial Recalculation & Running Balances (Priority: P2)

**Goal**: Unify Weighted Average Cost calculations across transfers, optimize cost reconciliations to set-based single queries, and calculate physical running balances correctly.

**Independent Test**: Running balance queries sequence records with windowed calculations, and transfer receiving valuation matches GRN receipts.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Replace inline transfer receipt calculations with calls to central `WacService` in transfer posting service `apps/api/src/modules/operations/transfer-post.service.ts`
- [ ] T023 [US3] Refactor cost ledger reconciliation checker job to query orphans using a single set-based join query in `apps/api/src/modules/ledger/reconciliation.job.ts`
- [ ] T024 [US3] Rewrite inventory stock movement query utilizing SQL window functions to calculate running balance in `apps/api/src/modules/inventory/inventory.service.ts`

**Checkpoint**: User Story 3 (Financial recalculations and performance optimization) is fully complete.

---

## Phase 6: User Story 4 - Business Continuity, Observability & Webhook Alerts (Priority: P2)

**Goal**: Support offsite database backups, visual Grafana dashboards, Slack webhooks for critical system incidents, and Swagger UI access auth.

**Independent Test**: Verifying backup scripts execute, Grafana metrics render stats, and Basic Auth restricts Swagger UI.

### Implementation for User Story 4

- [ ] T025 [P] [US4] Add daily `db-backup` service configuration to Docker Compose executing `pg_dump` and uploading to S3 in `docker-compose.yml`
- [ ] T026 [P] [US4] Create database backup script executing compressed pg_dump outputs in `scripts/db-backup.sh`
- [ ] T027 [P] [US4] Create database restore script testing fresh container recovery in `scripts/db-restore.sh`
- [ ] T028 [US4] Register backup health alert freshness check endpoint in `apps/api/src/health/health.controller.ts` (depends on T026)
- [ ] T029 [P] [US4] Implement token-based secure single-use password reset workflow in `apps/api/src/auth/auth.service.ts`
- [ ] T030 [P] [US4] Add password reset token automatic expiration pruning to token cleanup job in `apps/api/src/jobs/token-cleanup.job.ts`
- [ ] T031 [P] [US4] Register secure single-use password reset email outbox template in `apps/api/src/modules/outbox/outbox.service.ts`
- [ ] T032 [P] [US4] Implement custom `@Idempotent()` HTTP protection decorator in `apps/api/src/guards/idempotency.guard.ts`
- [ ] T033 [US4] Apply idempotency annotations to post endpoints in inventory issue and stock adjustments controllers in `apps/api/src/modules/operations/issues/issues.controller.ts` and `apps/api/src/modules/operations/adjustments/adjustments.controller.ts` (depends on T032)
- [ ] T034 [P] [US4] Create the `AlertService` executing outbox event dispatching webhooks to Slack in `apps/api/src/modules/alerts/alert.service.ts`
- [ ] T035 [P] [US4] Create alert module wiring dependencies in `apps/api/src/modules/alerts/alert.module.ts` (depends on T034)
- [ ] T036 [US4] Trigger alert webhooks on critical session replay detections and reconciliation failures in `apps/api/src/auth/rtr.service.ts` and `apps/api/src/modules/ledger/reconciliation.job.ts` (depends on T035)
- [ ] T037 [P] [US4] Add pre-configured Grafana visualizer container datasource to Docker Compose in `docker-compose.yml`
- [ ] T038 [P] [US4] Configure Grafana datasources and dashboard mapping in `grafana/provisioning/datasources/prometheus.yml` and `grafana/provisioning/dashboards/dashboard.yml`
- [ ] T039 [P] [US4] Implement HTTP Basic Auth protection for Swagger API documentation UI endpoint in non-dev in `apps/api/src/main.ts`

**Checkpoint**: User Story 4 (Observability, Backup, Alert webhooks, Idempotency) is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: General codebase improvements and final validation sweeps

- [ ] T040 Replace volatile in-memory storage arrays inside operational yield service with persistent database records in `apps/api/src/modules/operations/yield/yield.service.ts`
- [ ] T041 [P] Clean up all ESLint suppressions and generic `any` models inside stock adjustments post services in `apps/api/src/modules/operations/issue-post.service.ts`, `apps/api/src/modules/operations/adjustment-post.service.ts`, and `apps/api/src/modules/operations/transfer-post.service.ts`
- [ ] T042 Enforce strict TS compilation validation across the monorepo in `apps/api/tsconfig.json`
- [ ] T043 Run developer quickstart verification suite, lint rules, and compile validation in `specs/040-risk-remediation-tasks/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all User Stories.
- **User Stories (Phase 3+)**: All depend on Foundational completion.
- **Polish (Final Phase)**: Depends on all User Stories.

### Parallel Opportunities

- **Setup**: `T001` and `T002` can be verified in parallel.
- **Foundational**: All schema updates (`T004` to `T008`) can be written in parallel.
- **User Story 1**: DTO structures (`T012`), JWT validations (`T010`, `T011`) can be written in parallel.
- **User Story 4**: Backups (`T025`–`T027`), Password resets (`T029`–`T031`), Idempotency (`T032`), Webhook alerts (`T034`, `T035`), and Grafana dashboard (`T037`, `T038`) can all be built in parallel.

---

## Parallel Example: User Story 4

```bash
# Developer A builds backing scripts and Docker Compose services:
Task: "Add daily db-backup service configuration to docker-compose.yml"
Task: "Create database backup script executing compressed pg_dump outputs in scripts/db-backup.sh"

# Developer B builds secure password reset workflows:
Task: "Implement token-based secure single-use password reset workflow in apps/api/src/auth/auth.service.ts"
Task: "Add password reset token automatic expiration pruning to token cleanup job in apps/api/src/jobs/token-cleanup.job.ts"

# Developer C builds webhook alerting structures:
Task: "Create the AlertService executing outbox event dispatching webhooks to Slack in apps/api/src/modules/alerts/alert.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational database migrations.
2. Complete all tasks under User Story 1 (Identity access hardening & login audits).
3. **STOP & VALIDATE**: Run manual lockout tests and JWT startup validation.

### Incremental Delivery

1. Complete Setup + Foundational -> Core database structure is ready.
2. Complete User Story 1 -> Secure login audits active (MVP!).
3. Complete User Story 2 -> Kitchen deductions atomically linked to physical stock.
4. Complete User Story 3 -> WAC calculations unified and N+1 loop performance optimized.
5. Complete User Story 4 -> Daily backups, Grafana, Slack alert webhooks, and Swagger basic auth live.
6. Complete Polish -> Persistent yields, tsconfig strictness, and strict lint sweeps.

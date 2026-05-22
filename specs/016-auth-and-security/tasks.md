---
description: "Task list for authentication and security feature implementation"
---

# Tasks: Authentication & Security

**Input**: Design documents from `/specs/016-auth-and-security/`
**Prerequisites**: [plan.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/plan.md) (required), [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/spec.md) (required), [research.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/research.md), [data-model.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/data-model.md), [contracts/auth.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/contracts/auth.ts)

**Tests**: Jest unit and integration/E2E tests will be written and run before each user story's implementation tasks.

**Organization**: Tasks are grouped by user story phases to ensure independent testing and incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All descriptions reference exact file paths.

## Path Conventions

- Monorepo backend service: `apps/api/src/`
- Shared packages: `packages/shared-types/`
- Integration tests: `apps/api/test/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project dependency installation and shared contract setup.

- [X] T001 [P] Install backend authentication and hashing dependencies (`@nestjs/jwt`, `bcrypt`, `@types/bcrypt`) in [apps/api/package.json](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/package.json)
- [X] T002 Expose auth-related environment variables (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`) in [apps/api/.env](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/.env) and update configuration schemas
- [X] T003 [P] Move API contracts and Zod validation schemas from [specs/016-auth-and-security/contracts/auth.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/contracts/auth.ts) to [packages/shared-types/src/contracts/auth.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/packages/shared-types/src/contracts/auth.ts)
- [X] T004 Export the new auth schemas and types from [packages/shared-types/src/index.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/packages/packages/shared-types/src/index.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database changes and seeding required before user story development.

**⚠️ CRITICAL**: Database schema migrations must be successfully completed before user story implementation begins.

- [X] T005 Add the `RefreshToken` model and relation on `User` inside [apps/api/prisma/schema.prisma](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/prisma/schema.prisma)
- [X] T006 Apply database migrations and regenerate client via `npx turbo run prisma:migrate --filter=api`
- [X] T007 Add test credentials (hashed passwords) and user warehouse scopes to the database seed script [apps/api/prisma/seed.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/prisma/seed.ts)

**Checkpoint**: Database layers and baseline seeds are verified. User story work can now proceed.

---

## Phase 3: User Story 1 - Secure User Authentication & JWT Protection (Priority: P1) 🎯 MVP

**Goal**: User authentication, password hashing, JWT generation, login/logout, profile retrieval, database active check.

**Independent Test**: Submit valid credentials to POST `/api/v1/auth/login` to receive access token and cookie. Access protected route `GET /api/v1/auth/me` with access token. Verify that deactivated user access is blocked instantly (HTTP 401).

### Tests for User Story 1 (TDD red-green cycle)
- [X] T008 [P] [US1] Create unit tests for password hashing and authentication in [apps/api/src/auth/auth.service.spec.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/auth.service.spec.ts)
- [X] T009 [P] [US1] Create E2E integration tests for login, logout, and token validation in [apps/api/test/auth.e2e-spec.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/test/auth.e2e-spec.ts)

### Implementation for User Story 1
- [X] T010 [P] [US1] Implement `BcryptService` password hashing and validation in [apps/api/src/auth/bcrypt.service.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/bcrypt.service.ts)
- [X] T011 [P] [US1] Define NestJS login payload validator DTO in [apps/api/src/auth/dto/login.dto.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/dto/login.dto.ts) matching shared contract specifications
- [X] T012 [P] [US1] Create a `@Public()` route bypass decorator in [apps/api/src/auth/decorators/public.decorator.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/decorators/public.decorator.ts)
- [X] T013 [P] [US1] Create a `@CurrentUser()` custom parameter decorator in [apps/api/src/auth/decorators/current-user.decorator.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/decorators/current-user.decorator.ts)
- [X] T014 [US1] Create validation and extraction logic in passport or JWT guard [apps/api/src/auth/jwt.strategy.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/jwt.strategy.ts)
- [X] T015 [US1] Create global `JwtAuthGuard` checking user token validity and verifying user `isActive === true` from the DB on every request in [apps/api/src/auth/guards/jwt-auth.guard.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/guards/jwt-auth.guard.ts)
- [X] T016 [US1] Implement authentication, login session creation, and secure HttpOnly cookie signing in [apps/api/src/auth/auth.service.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/auth.service.ts)
- [X] T017 [US1] Expose routes for login, logout, and token introspection in [apps/api/src/auth/auth.controller.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/auth.controller.ts)
- [X] T018 [US1] Register `AuthModule` and bind `JwtAuthGuard` globally in [apps/api/src/app.module.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/app.module.ts)

**Checkpoint**: User authentication works seamlessly and JWT access checks are fully enforced.

---

## Phase 4: User Story 2 - Warehouse & Branch Scope Isolation / IDOR Prevention (Priority: P1)

**Goal**: Block access attempts outside the user's authorized scope (IDOR protection) using headers (`x-warehouse-id`, `x-branch-id`), logging security violations, and injecting valid scopes into request context.

**Independent Test**: Log in with warehouse keeper access to Warehouse A. Make request with `x-warehouse-id` pointing to Warehouse B. Validate request returns `403 Forbidden` and creates `SECURITY_VIOLATION` in `AuditLog` table.

### Tests for User Story 2
- [X] T019 [P] [US2] Create unit tests for Scope Isolation Interceptor in [apps/api/src/auth/interceptors/scope.interceptor.spec.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/interceptors/scope.interceptor.spec.ts)
- [X] T020 [P] [US2] Create E2E integration tests targeting scope headers validation and access violations in [apps/api/test/scope.e2e-spec.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/test/scope.e2e-spec.ts)

### Implementation for User Story 2
- [X] T021 [P] [US2] Create active scope decorator `@ActiveScope()` in [apps/api/src/auth/decorators/active-scope.decorator.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/decorators/active-scope.decorator.ts)
- [X] T022 [US2] Implement scope checks, context injection, and public path exemptions inside NestJS Interceptor [apps/api/src/auth/interceptors/scope.interceptor.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/interceptors/scope.interceptor.ts)
- [X] T023 [US2] Implement audit log integration inside the Interceptor to record `SECURITY_VIOLATION` events upon unauthorized scope access attempts in [apps/api/src/auth/interceptors/scope.interceptor.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/interceptors/scope.interceptor.ts)
- [X] T024 [US2] Bind the `ScopeInterceptor` globally in [apps/api/src/app.module.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/app.module.ts)

**Checkpoint**: Scope isolation blocks cross-boundary mutations and records attempts immediately.

---

## Phase 5: User Story 3 - Session Persistence & Silent Refresh (Priority: P2)

**Goal**: Implement cookie-based Refresh Token Rotation (RTR) to support silent session renewal, concurrent sessions, and replay attack family tree revocation.

**Independent Test**: Silent refresh via POST `/api/v1/auth/refresh` succeeds and rotates tokens. Immediate reuse of the old refresh token fails with 401, revokes all sibling/child tokens, and writes a `REFRESH_TOKEN_REPLAY` audit log entry.

### Tests for User Story 3
- [X] T025 [P] [US3] Create unit tests for rotation and revocation logic in [apps/api/src/auth/rtr.service.spec.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/rtr.service.spec.ts)
- [X] T026 [P] [US3] Create integration/E2E tests for refresh token rotation, concurrent sessions, and replay attack detection in [apps/api/test/rtr.e2e-spec.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/test/rtr.e2e-spec.ts)

### Implementation for User Story 3
- [X] T027 [US3] Create refresh token lifecycle and CRUD services in [apps/api/src/auth/rtr.service.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/rtr.service.ts)
- [X] T028 [US3] Add family rotation checks and session-wide tree revocation upon reuse detection in [apps/api/src/auth/rtr.service.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/rtr.service.ts)
- [X] T029 [US3] Integrate `REFRESH_TOKEN_REPLAY` log writing on session revocation inside [apps/api/src/auth/rtr.service.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/rtr.service.ts)
- [X] T030 [US3] Expose POST `/api/v1/auth/refresh` silent refresh endpoint in [apps/api/src/auth/auth.controller.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/auth.controller.ts)
- [X] T031 [US3] Update logout handler to clean up DB refresh tokens for that session in [apps/api/src/auth/auth.controller.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/auth/auth.controller.ts)

**Checkpoint**: Silent refreshes rotate session tokens, and any token theft attempts trigger complete session revocation.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Security auditing verification, database performance, and build validation.

- [X] T032 [P] Verify endpoint configurations and token security schemas in Swagger [apps/api/src/main.ts](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/src/main.ts)
- [X] T033 Audit Postgres index utilization for `refresh_tokens` lookups in database schemas
- [X] T034 Run lint checks, typecheck compiles, and next builds (`npx turbo run lint typecheck build`)
- [X] T035 [P] Perform manual verification scenarios (user deactivation, scope change, token expiration) as defined in [quickstart.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - Blocks all User Stories.
- **User Stories (Phases 3+)**: All depend on Phase 2 completion.
  - User Stories are prioritized (US1 → US2 → US3) but their tests and decorators can be initialized in parallel once baseline scaffolding is done.
- **Polish (Final Phase)**: Depends on all stories being complete.

### Within Each User Story

- Test cases must be created and failing before implementing the actual services.
- Decorators and DTOs should be created before strategy integrations.
- Core service logic must be completed and tested before controller endpoints are registered.

### Parallel Opportunities

- Scaffolding dependency installation (T001) and packages contract preparation (T003) can run in parallel.
- Service unit tests (T008) and endpoint integration tests (T009) can run in parallel.
- DTO validation classes (T011), decorators (T012, T013), and BcryptService (T010) can be created in parallel.
- Scope decorator (T021) and interceptor tests (T019, T020) can run in parallel.
- Refresh rotation service tests (T025, T026) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Developer A: Hashing and payload decorators
Task: "Implement BcryptService password hashing and validation in apps/api/src/auth/bcrypt.service.ts"
Task: "Create a @Public() route bypass decorator in apps/api/src/auth/decorators/public.decorator.ts"

# Developer B: Writing tests
Task: "Create unit tests for password hashing and authentication in apps/api/src/auth/auth.service.spec.ts"
Task: "Create E2E integration tests for login, logout, and token validation in apps/api/test/auth.e2e-spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Prerequisites).
2. Scaffold `AuthModule` and implement Bcrypt credentials verification.
3. Establish global `JwtAuthGuard` checking user status directly against Postgres database.
4. Verify user login and logout handlers, ensuring that deactivated accounts are rejected.
5. **STOP and VALIDATE**: Verify that secure routes respond with 401 without valid tokens.

### Incremental Delivery

1. Verify User Authentication works seamlessly (MVP).
2. Add the `ScopeInterceptor` to protect endpoints against IDOR scope leaks. Verify unauthorized headers yield 403 and create `AuditLog` violations.
3. Implement `RtrService` to enable silent refreshes, rotate keys, and invalidate entire family session trees upon replay attempts.

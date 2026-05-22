# Implementation Plan: Authentication & Security

**Branch**: `016-auth-and-security` | **Date**: 2026-05-22 | **Spec**: [spec.md](file:///E:/Kitchen%E2%80%91Store%20Inventory%20System/specs/016-auth-and-security/spec.md)
**Input**: Feature specification from `/specs/016-auth-and-security/spec.md`

## Summary

The goal of this feature is to establish a secure, zero-trust authentication and authorization foundation for the Kitchen-Store Inventory System. This includes user credential validation, JWT-based access token management (15-minute expiration), secure HttpOnly cookies for Refresh Token Rotation (RTR) to handle session persistence, global request authentication, active user status validation on every request, and warehouse/branch scope isolation (IDOR protection) via a global NestJS Interceptor.

We will use NestJS `@nestjs/jwt`, `bcrypt` for secure password hashing, and cookie-parser to extract refresh tokens. We will define a `RefreshToken` database model in Prisma to track concurrent sessions, rotated token states, and facilitate session chain revocation in the event of a token replay attack. All scope violations will be blocked (403 Forbidden) and logged into the `AuditLog` table.

## Technical Context

**Language/Version**: TypeScript / Node.js 24+, NestJS 11  
**Primary Dependencies**: `@nestjs/jwt`, `bcrypt`, `@types/bcrypt`, `cookie-parser` (already installed), `@logirest/shared-types`  
**Storage**: PostgreSQL (via Prisma client)  
**Testing**: Jest (unit and integration tests in `apps/api`)  
**Target Platform**: Linux Container / Node.js Runtime  
**Project Type**: Monorepo / Web-Service  
**Performance Goals**:
- Authentication verification and token generation completing in <500ms.
- Scope validation interceptor adding <5ms overhead per request.
**Constraints**:
- Access Token lifespan: Exactly 15 minutes.
- Refresh Token Rotation (RTR): Each silent refresh issues a single-use refresh token and invalidates the previous one. If reuse of an invalidated refresh token is detected, the entire session chain for that user must be immediately revoked.
- User Active Check: The authentication guard queries the database to verify the user exists and is active (`isActive === true`) on every incoming request.
- Scope Isolation: Resolve `x-warehouse-id` and `x-branch-id` from request headers, check against `UserWarehouseScope` in the database, and inject the resolved scope IDs into the request object. Reject immediately (403) on scope violations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Every gate is verified against the principles defined in [constitution.md](file:///E:/Kitchen%E2%80%91Store%20Inventory%20System/.specify/memory/constitution.md):

1. **Backend Authority Gate**:
   - *Status*: **PASSED**
   - *Detail*: All authentication, password hashing, JWT signing, refresh token rotation, and scope isolation logic is implemented exclusively on the NestJS backend (`apps/api`). The frontend is strictly consumer-facing.

2. **Separation of Concerns Gate**:
   - *Status*: **PASSED**
   - *Detail*: Shared structures (validation schemas, user roles, capability maps) are kept inside `packages/shared-types`. The Next.js frontend (`apps/web`) is completely isolated from database models and NestJS modules.

3. **Pessimistic Locking Gate**:
   - *Status*: **PASSED**
   - *Detail*: Authentication does not directly mutate inventory stock ledgers, but all stateful updates to `users` and `refresh_tokens` will respect safe transaction semantics where concurrent sessions are updated.

4. **Optimistic Locking Gate**:
   - *Status*: **PASSED**
   - *Detail*: The `User` model features a `version` field. When updating user profiles or active states, version-based checks are used in database updates.

5. **IDOR Protection Gate**:
   - *Status*: **PASSED**
   - *Detail*: Resolved warehouse and branch scopes are intercepted via a NestJS Interceptor using headers (`x-warehouse-id`, `x-branch-id`). Scopes are validated against `UserWarehouseScope` in the database, and injected directly into the request context. Payload-provided scope values are ignored.

6. **Workflow State Guard Gate**:
   - *Status*: **PASSED**
   - *Detail*: Access controls and endpoint rules derive strictly from RBAC configurations and capability maps defined in `packages/shared-types`.

7. **Audit Trail Gate**:
   - *Status*: **PASSED**
   - *Detail*: Security events (successful logins, logouts, access scope violations) will create immutable `AuditLog` records containing user context, targeted resource scope, action performed, and client IP details.

## Project Structure

### Documentation (this feature)

```text
specs/016-auth-and-security/
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output: Token Rotation & Scope Interception decisions
├── data-model.md        # Phase 1 output: RefreshToken model & DB updates
├── quickstart.md        # Phase 1 output: Migration instructions & local setup
└── contracts/
    └── auth.ts          # Authentication API endpoints and request/response contracts
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   └── schema.prisma    # MODIFIED: Add RefreshToken model and link it to User
└── src/
    ├── app.module.ts    # MODIFIED: Import AuthModule, register global guards/interceptors
    └── auth/            # NEW: Authentication & Security Module
        ├── auth.module.ts
        ├── auth.controller.ts
        ├── auth.service.ts
        ├── jwt.strategy.ts
        ├── dto/
        │   └── login.dto.ts
        ├── guards/
        │   ├── jwt-auth.guard.ts
        │   └── roles.guard.ts
        ├── interceptors/
        │   └── scope.interceptor.ts
        └── decorators/
            ├── public.decorator.ts
            └── current-user.decorator.ts
```

**Structure Decision**: 
We are creating a dedicated `auth` module inside `apps/api/src/auth/` containing services, controllers, guards, interceptors, and decorators. The database schema in `apps/api/prisma/schema.prisma` will be extended to support token tracking. Shared DTO validation rules or interfaces will be exposed from `packages/shared-types`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Introducing a database `RefreshToken` model | Necessary to support Refresh Token Rotation (RTR) security and detect token replay attacks by invalidating full token family trees. | Storing refresh tokens completely statelessly (e.g., purely in JWTs) does not allow immediate server-side revocation or token reuse detection. |
| DB verification on every authenticated request | Mandatory to verify user exists and `isActive === true` instantly if an administrator deactivates a user mid-session. | Relying purely on cached token payloads would let deactivated users continue accessing the system until their 15-minute access token expires. |

# Implementation Plan: LogiRest Phase 1 — Master Issue Registry

**Branch**: `041-master-issue-registry` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-master-issue-registry/spec.md`

## Summary

This feature resolves the P0, P1, and P5 blockers in the active stabilization phase. The technical approach involves wrapping 21 flat or legacy backend endpoints in the standardized `{ data, meta }` paginated response envelope, merging the legacy warehouse route collision controllers, adding async fail-fast startup checks to JwtModule, restoring active scopes within AuthService.updateProfile, seeding a default kitchen department, and introducing query guards to useWarehouseLock to prevent null lock request race conditions.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+  
**Primary Dependencies**: NestJS, Passport-JWT, Prisma Client, Next.js 16, React Query, Zod.  
**Storage**: PostgreSQL (Prisma).  
**Testing**: Jest, Supertest integration testing.  
**Target Platform**: Linux Server (Docker-based deployment).  
**Project Type**: Monorepo Web Service / API & Frontend Client.  
**Performance Goals**: API response wrapping latency overhead < 5ms, list queries execution < 100ms.  
**Constraints**: Separation of concerns between UI client and backend service, zero fallback secrets, strict scope-interceptor header mapping, no schema alterations, and DRY validation schemas.  
**Scale/Scope**: Sprint 1 recovery fixes targeting 21 pagination envelopes, 2 route controllers, 2 authentication endpoints, 1 database seed file, and 9 frontend hooks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Zero-Trust Monorepo (Concern Separation)**: Mapped all adjustments within backend controllers (`apps/api`) and frontend client layers (`apps/web`). All schema contracts utilize `packages/shared-types` or frontend API factories. -> **PASSED**
- **Pessimistic Locking**: No direct ledger updates are introduced, preserving existing lock mechanisms. -> **PASSED**
- **Optimistic Locking**: No database doc models are updated, preserving versioning protocols. -> **PASSED**
- **IDOR Prevention Interceptor**: Warehouse and branch scopes are extracted and validated via request headers. The updateProfile scope retention prevents scope wiping. -> **PASSED**
- **Immutable Auditing**: Seed and profile data modifications conform to auditing guidelines. -> **PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/041-master-issue-registry/
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output (Design Decisions)
├── data-model.md        # Phase 1 output (Seed Data Configuration)
├── quickstart.md        # Phase 1 output (Dev Setup & Verification)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   └── seed.prod.ts                        # Added default "Main Kitchen" department seed
├── src/
│   ├── auth/
│   │   ├── auth.module.ts                  # Migrate to JwtModule.registerAsync (fail-fast startup)
│   │   └── auth.service.ts                 # Map and preserve scopes in updateProfile response
│   └── modules/
│       └── master-data/
│           └── warehouses/
│               ├── warehouses-direct.controller.ts # Consolidated CRUD endpoint target
│               └── warehouses.controller.ts        # [DELETE] Legacy duplicate controller
apps/web/
├── src/
│   ├── hooks/
│   │   └── useWarehouseLock.ts             # Enable/disable query guard to prevent null lock calls
│   ├── providers/
│   │   └── WarehouseScopeProvider.tsx      # Global loading spinner state during scope restore
│   └── features/
│       ├── branches/hooks/useBranches.ts   # Remove inline schema, import paginatedSchema factory
│       ├── departments/hooks/useDepartments.ts # Remove inline schema, import paginatedSchema factory
│       └── warehouses/hooks/useWarehouses.ts # Remove inline schema, import paginatedSchema factory
```

**Structure Decision**: Monorepo split between `apps/api` (NestJS Nest application backend), `apps/web` (Next.js client), and `packages/shared-types` (shared business validation schemas). All code files for risk remediation reside inside the `apps/api` and `packages/shared-types` boundaries, satisfying the separation architecture.

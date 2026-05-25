# Implementation Plan: Wire Admin Roles UI to Real Backend API

**Branch**: `027-wire-admin-roles-ui` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/026-wire-admin-roles-ui/spec.md`

## Summary

TASK-001 replaces the current static `MOCK_ROLES` structure and simulated latency in `useAdminRoles.ts` with real database aggregation queries from the NestJS backend. The frontend roles administration panel will fetch active user counts dynamically. Per the resolved specification choice (Option A), role permission displays are read-only and governed statically by the codebase via `@logirest/shared-types/contracts/role-capabilities` to guarantee architectural safety, zero database drift, and robust security posture.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20  
**Primary Dependencies**: NestJS 10, Next.js 16 (App Router), Prisma 5, TanStack React Query, `@logirest/shared-types`  
**Storage**: PostgreSQL (via Prisma ORM)  
**Testing**: Jest (Unit/Integration), Next/Web Testing library  
**Target Platform**: Node.js, Web Browser  
**Project Type**: Monorepo Web Application (NestJS API + Next.js Web App)  
**Performance Goals**: `<200ms` API p95 response time; `<1s` roles UI dashboard render  
**Constraints**: strictly read-only permissions mapping (Option A), 100% DRY metadata mastering in `shared-types`  
**Scale/Scope**: 10 system roles, 10k users  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority** (Pass): Access control and active user count query logic are mastered strictly inside the NestJS api layer. The frontend has advisory permissions only.
- **Strict Separation of Concerns** (Pass): Backend routes aggregate user records via database queries. The Next.js frontend has zero direct database queries or raw SQL.
- **DRY Schema Principle** (Pass): Role display names, descriptions, and capabilities are imported by both backend and frontend from `@logirest/shared-types/contracts/role-capabilities`.
- **Micro-Phasing & Quality Gates** (Pass): Development proceeds with sequential, independent, and compile-safe units. Each PR is verified using `npm run build` and `npm run typecheck`.

## Project Structure

### Documentation (this feature)

```text
specs/026-wire-admin-roles-ui/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 data modeling
├── quickstart.md        # Phase 1 getting started
└── contracts/           # Phase 1 interface definitions
    └── index.ts         # Contract types and static maps
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts    # GET /admin/roles handler with ADMIN Role guard
│   │   │   ├── admin.service.ts       # Service to query DB user grouping and map metadata
│   │   │   └── admin.module.ts        # AdminModule listing the service as a provider
│   │   └── ledger/                    # Other modules (ledger, outbox)
│   └── main.ts
│
apps/web/
├── src/
│   ├── features/
│   │   ├── admin/
│   │   │   ├── hooks/
│   │   │   │   └── useAdminRoles.ts   # Client hook consuming apiClient.get('/admin/roles')
│   │   │   └── components/            # Roles grid and list UI features
│   │   └── ...
│   └── app/
│
packages/shared-types/
├── src/
│   ├── rbac.ts                        # UserRole enum type
│   └── contracts/
│       └── role-capabilities.ts       # Source of truth for static role capabilities mapping
```

**Structure Decision**: Fully adheres to the Monorepo architecture. Shared roles data types are stored in `packages/shared-types`, the DB query service belongs to `apps/api`, and UI components live in `apps/web`.

## Complexity Tracking

*No constitution check violations were detected. The design utilizes standard patterns with clean isolation.*

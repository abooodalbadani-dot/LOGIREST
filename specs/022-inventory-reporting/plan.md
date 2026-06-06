# Implementation Plan: Inventory Query, Reporting, & Administrative Jobs

**Branch**: `022-inventory-reporting` | **Date**: 2026-05-23 | **Spec**: [specs/022-inventory-reporting/spec.md](file:///e:/kitchen-store-inventory-system/specs/022-inventory-reporting/spec.md)
**Input**: Feature specification from `/specs/022-inventory-reporting/spec.md`

## Summary

This feature implements Phase 9 of the LogiRest Backend roadmap:
1. **Inventory Queries & Reports**: Scoped balance queries (`GET /inventory/balance`), lot allocation listings (`GET /inventory/lots`), read-only movements history (`GET /inventory/movements`), dashboard KPIs, and audit log history.
2. **Scanner Lookup API**: An optimized barcode scanner resolution endpoint (`GET /items/scan?barcode=X`) returning items, conversion factors, and active lots.
3. **Lock Cleanup Job**: A NestJS background cron job running every minute to mark locks that have exceeded `expiresAt` as `STALE`, without auto-releasing them.
4. **Notification Dispatch**: Event-driven notification logging to a `NotificationLog` table with endpoints for individual and bulk read updates.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+  
**Primary Dependencies**: `@nestjs/common`, `@nestjs/schedule`, `prisma`, `@logirest/shared-types`  
**Storage**: PostgreSQL (via Prisma Client)  
**Testing**: Jest (Unit & Integration tests)  
**Target Platform**: Linux Server / Docker  
**Project Type**: web-service (REST API backend)  
**Performance Goals**: Barcode scan lookup < 100ms, inventory/movements query < 150ms  
**Constraints**: All queries MUST use `ScopeInterceptor` and check `x-warehouse-id`/`x-branch-id` headers. Stale locks MUST continue to block mutations until manually unlocked by Admin/Manager.  
**Scale/Scope**: 10k items, 30+ tables, paginated queries (default size 50).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Supreme Authority**: Handled. Scope and authorization are fully validated by NestJS Guards and Interceptors on `apps/api`.
- **Strict Separation of Concerns**: Handled. API endpoints reside in `apps/api/src/modules/` and data models are defined inside `apps/api/prisma/schema.prisma`.
- **DRY Schema Principle**: Handled. Schema/Zod models for request validation and outputs reside in `packages/shared-types`.
- **IDOR Prevention**: Handled. `ScopeInterceptor` validates `x-warehouse-id` header against `UserWarehouseScope` to prevent cross-warehouse access.
- **State Machine & Locking Integrity**: Handled. Stale locks retain `isActive = true` to prevent concurrent write transactions during pending stocktake.
- **Immutable Auditing**: Handled. Audit logs are logged on manual unlock operations.

## Project Structure

### Documentation (this feature)

```text
specs/022-inventory-reporting/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    └── endpoints.md     # Interface endpoints contract
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/
│   ├── inventory/
│   │   ├── inventory.module.ts
│   │   ├── inventory.service.ts
│   │   └── inventory.controller.ts
│   ├── reports/
│   │   ├── reports.module.ts
│   │   ├── reports.service.ts
│   │   └── reports.controller.ts
│   ├── notifications/
│   │   ├── notification.module.ts
│   │   ├── notification.service.ts
│   │   └── notification.controller.ts
│   └── admin/
│       ├── audit-logs.controller.ts
│       └── admin.module.ts
├── jobs/
│   └── lock-cleanup.job.ts
└── guards/
    └── roles.guard.ts

packages/shared-types/src/
└── schemas/
    ├── notification.schema.ts
    └── inventory-queries.schema.ts
```

**Structure Decision**: Monorepo structure using separate NestJS modules under `apps/api/src/modules/` and shared schemas in `packages/shared-types`.

## Complexity Tracking

*No constitution violations detected; complexity tracking is not required.*

# Implementation Plan: LogiRest Engineering Recovery & Stabilization

**Branch**: `042-stabilization-recovery-plan` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-stabilization-recovery-plan/spec.md`

## Summary

This feature resolves the full set of P1 and P2 engineering stabilization blockers identified in the LogiRest Recovery Plan audit. The technical approach spans three areas:

1. **API Contract Hardening** — Extend the existing 21-endpoint pagination envelope fix (completed in spec 041) to all remaining listing endpoints not covered yet, including stock movements, lot tracking, adjustments, stocktakes, and all master-data types (barcodes, currencies, audit logs, notification templates). Enforce strict negative-stock prevention via database-level `CHECK` constraints and service-layer abort logic.
2. **Operational Integrity** — Resolve the scope wipe regression in `updateProfile`, secure JWT startup via `registerAsync`, consolidate warehouse route collision, and guard `useWarehouseLock` from firing with null identifiers during page reload.
3. **Resilience & Recovery** — Establish a daily automated encrypted PostgreSQL backup pipeline to offsite S3, expose backup freshness via the `/health` endpoint (degraded if > 26 hours old), define a 24-Hour RPO / 4-Hour RTO target, and validate restore capability via drill scripts.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+ (NestJS 10, Next.js 16)
**Primary Dependencies**: NestJS, Passport-JWT, Prisma Client 5.x, React Query v5, Zod v3, `pg_dump`, AWS SDK v3 S3 client, `@nestjs/schedule` (CronModule)
**Storage**: PostgreSQL 15 (Prisma ORM). No new migrations required for pagination changes. One `ALTER TABLE` migration for `qtyOnHand >= 0` CHECK constraint.
**Testing**: Jest + Supertest (API integration), Playwright (E2E smoke), manual restore drill script
**Target Platform**: Linux Server (Docker-based deployment, docker-compose)
**Project Type**: Monorepo Web Service — `apps/api` (NestJS) + `apps/web` (Next.js) + `packages/shared-types`
**Performance Goals**: API response envelope wrapping overhead < 5ms; list query execution < 100ms at p95; backup upload < 15 minutes per daily cycle
**Constraints**: Zero-Trust Monorepo — no backend logic in `apps/web`; all Zod schemas shared via `packages/shared-types`; pessimistic locking (`SELECT FOR UPDATE` in `Serializable` transaction) for all ledger mutations; optimistic locking (`version` field) for non-ledger documents; no schema alterations except the one CHECK constraint migration
**Scale/Scope**: ~21 pagination envelope fixes + 1 route deconfliction + 2 auth fixes + 1 seed fix + 2 frontend hooks + 1 backup cron + 1 health endpoint + 1 DB constraint migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Zero-Trust Monorepo (Concern Separation)**: All backend mutations confined to `apps/api`. All frontend adjustments confined to `apps/web`. Shared Zod schemas reside in `packages/shared-types`. → **PASSED**
- **Pessimistic Locking**: All ledger writes (issues, transfers, adjustments, kitchen fulfillment) use `prisma.$transaction` with `Serializable` isolation level + `SELECT FOR UPDATE`. The new negative-stock check operates inside the same transaction lock. → **PASSED**
- **Optimistic Locking**: Non-ledger documents (PR, PO) retain `version` field checks in all Prisma update `where` clauses. No changes to optimistic locking behavior. → **PASSED**
- **IDOR Prevention Interceptor**: `warehouseId`/`branchId` resolved from request headers via NestJS Interceptor, not payload. Scope preservation in `updateProfile` reads from authenticated DB scopes only. → **PASSED**
- **Immutable Auditing**: Seed and profile data modifications conform to auditing guidelines. No audit log records will be modified. → **PASSED**
- **DRY Schema Principle**: No manual duplication of Zod validation. All pagination schemas reference `paginatedSchema()` from `packages/shared-types`. → **PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/042-stabilization-recovery-plan/
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output — architectural decisions
├── data-model.md        # Phase 1 output — schema changes & contracts
├── quickstart.md        # Phase 1 output — dev setup & verification guide
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── migrations/
│   │   └── [timestamp]_add_qty_on_hand_check/
│   │       └── migration.sql       # ADD CONSTRAINT qtyOnHand >= 0
│   └── seed.prod.ts                # [ALREADY DONE in 041] Default department seed
├── src/
│   ├── auth/
│   │   ├── auth.module.ts          # [ALREADY DONE in 041] JwtModule.registerAsync
│   │   └── auth.service.ts         # [ALREADY DONE in 041] Scope preservation in updateProfile
│   ├── health/
│   │   └── health.controller.ts    # [NEW] /health endpoint — backup freshness indicator
│   ├── backup/
│   │   ├── backup.module.ts        # [NEW] BackupModule (CronModule integration)
│   │   ├── backup.service.ts       # [NEW] pg_dump + S3 upload + freshness tracking
│   │   └── backup.cron.ts          # [NEW] Daily cron job (@Cron expression)
│   └── modules/
│       └── master-data/
│           └── warehouses/
│               ├── warehouses-direct.controller.ts  # [ALREADY DONE in 041] Consolidated
│               └── warehouses.controller.ts         # [DELETE] Legacy duplicate
│   └── modules/inventory/
│       └── [various service files]  # Negative-stock abort logic in deduction services

apps/web/
└── src/
    ├── hooks/
    │   └── useWarehouseLock.ts     # [ALREADY DONE in 041] enabled: !!warehouseId guard
    └── providers/
        └── WarehouseScopeProvider.tsx  # [ALREADY DONE in 041] Global loading spinner

scripts/
└── backup-restore-drill.sh         # [NEW] Manual restore drill validation script
```

**Structure Decision**: This is a monorepo web service split across `apps/api` (NestJS), `apps/web` (Next.js), and `packages/shared-types`. All backend recovery logic resides in `apps/api`. All frontend guards reside in `apps/web`. Shared pagination Zod schemas live in `packages/shared-types`. Infrastructure scripts (backup restore drill) are placed in the repo-root `scripts/` directory.

## Complexity Tracking

No constitution violations. All work adheres to established architectural axioms.

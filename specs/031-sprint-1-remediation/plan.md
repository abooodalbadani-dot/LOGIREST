# Implementation Plan: Sprint 1 Production Readiness Remediation

**Branch**: `031-sprint-1-remediation` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/031-sprint-1-remediation/spec.md`

## Summary
The primary requirement is to execute all high-priority production-readiness tasks in Sprint 1 to ensure backend authority, strict state transitions, transactional inventory reversals (Void), memory-safe data extractions, and a seamless operations-focused user interface. 

The technical approach implements database-level `CHECK` and composite unique constraints, Redis-based debounce alerts, atomic PostgreSQL `Serializable` transactions for ledger reversals, cursor-based reporting pagination, code extraction for report queries, and interactive report interfaces in the web frontend.

---

## Technical Context

* **Language/Version**: TypeScript / Node.js v20+ / Next.js 16 App Router / NestJS 10
* **Primary Dependencies**: Prisma ORM, Redis (ioredis), class-validator, xlsx, Throttler
* **Storage**: PostgreSQL (Neon Serverless/Postgres) with PostgREST-style APIs and Redis cache cluster
* **Testing**: NestJS standard testing framework (Jest) and integration E2E tests
* **Target Platform**: Node.js API runtime + Vercel Next.js static and serverless hosting
* **Project Type**: Multi-project monorepo containing `apps/api` (backend), `apps/web` (frontend), and `packages/shared-types` (shared types)
* **Performance Goals**: Stream reports under 50MB server memory footprint; fast API response under 100ms
* **Constraints**: Hard limits on export (max 50,000 rows); strict rate-limiting for auth endpoints (10 req/60s)
* **Scale/Scope**: Multi-branch restaurant networks with over 10,000 items and daily reconciliation runs

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Separation of Concerns**: ✅ **Passed.** Frontend (`apps/web`) is completely isolated from database/ORM logic. Backend NestJS (`apps/api`) remains the supreme authority for data mutations and transactions.
- **DRY Validation Schemas**: ✅ **Passed.** All shared types and transition maps are imported directly from `packages/shared-types` without code duplication.
- **Single DB Protocol**: ✅ **Passed.** All migrations and queries operate on the centralized `DATABASE_URL` PostgreSQL engine.
- **Locking Protocols**: ✅ **Passed.** Lot and item ledger mutations inside void operations utilize strict `SELECT FOR UPDATE` raw SQL locking models.
- **IDOR Prevention**: ✅ **Passed.** Target scopes (`warehouseId`, `branchId`) are resolved via secure headers inside interceptors, completely ignoring insecure payload arguments.
- **Immutable Auditing**: ✅ **Passed.** Every void or cancellation inserts a full before/after state audit log.

---

## Project Structure

### Documentation (this feature)

```text
specs/031-sprint-1-remediation/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Specification Quality Checklist
└── contracts/
    └── endpoints.md     # Phase 1 API contracts
```

### Source Code Files Affected / Created

```text
packages/shared-types/
└── src/
    └── index.ts                                         # [MODIFY] Expose CANCELLED/VOIDED transition maps

apps/api/
├── prisma/
│   ├── schema.prisma                                    # [MODIFY] Composite unique keys & lot discrepancies count
│   └── migrations/                                      # [NEW] Check DDL constraint SQL migrations
├── src/
│   ├── app.module.ts                                    # [MODIFY] Multi-tiered Throttler setup
│   ├── auth/
│   │   └── auth.controller.ts                           # [MODIFY] Apply strict auth rate limits
│   ├── jobs/
│   │   └── low-stock-alert.job.ts                       # [MODIFY] Move memory map to Redis cache
│   ├── modules/
│   │   ├── ledger/
│   │   │   └── reconciliation.job.ts                    # [MODIFY] Lot-level check validation
│   │   ├── operations/
│   │   │   ├── adjustment-post.service.ts               # [MODIFY] Adjust positive unitCost checks
│   │   │   ├── grn-void.service.ts                      # [NEW] GRN reversal cost/ledger adjustments
│   │   │   ├── issue-void.service.ts                    # [NEW] Issue reversal restorations
│   │   │   ├── adjustment-void.service.ts               # [NEW] Adjustment reversal cost adjustments
│   │   │   └── operations.controller.ts                 # [MODIFY] Add voiding endpoints
│   │   └── reports/
│   │       ├── reports.controller.ts                    # [MODIFY] Thin controller, cursor exports
│   │       ├── reports.service.ts                       # [NEW] Reporting query extraction
│   │       └── reports.module.ts                        # [MODIFY] Register new ReportsService provider
│   └── health/
│       └── health.controller.ts                         # [MODIFY] Add Redis/BullMQ ping tests
└── test/
    ├── db-integrity.e2e-spec.ts                         # [NEW] DDL check constraints tests
    ├── document-sequence.e2e-spec.ts                    # [NEW] Sequence concurrency collision tests
    └── void-workflow.e2e-spec.ts                        # [NEW] Option A void reversal tests

apps/web/
└── src/
    └── features/
        ├── dashboard/
        │   └── components/
        │       └── StoreManagerDashboard.tsx            # [MODIFY] Dynamically fetch currencies
        └── reports/
            ├── components/
            │   ├── WacHistoryReport.tsx                 # [NEW] RTL drill-down valuation table
            │   └── LotTraceReport.tsx                   # [NEW] Clickable lot tracking dashboard
            └── api/
                └── reportsApi.ts                        # [MODIFY] Count-checking queries
```

**Structure Decision**: The project is structured as a standard monorepo. Shared schema validation is centralized in `packages/shared-types`, state transitions and ledgers are validated on NestJS (`apps/api`), and Next.js (`apps/web`) acts purely as the RTL-enabled nocturnal-themed UI dashboard client.

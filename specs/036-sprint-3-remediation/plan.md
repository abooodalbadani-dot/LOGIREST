# Implementation Plan: Sprint 3 Remediation and System Hardening

**Branch**: `036-sprint-3-remediation` | **Date**: 2026-05-27 | **Spec**: [/specs/036-sprint-3-remediation/spec.md](spec.md)
**Input**: Feature specification from `/specs/036-sprint-3-remediation/spec.md`

## Summary

Sprint 3 focuses on backend stability, concurrency, cost integrity, performance optimizations, and report hub visualizations:
1. **Reconciliation & Observability**: Implementing lot-level balance drift checks and wiring metrics logging to Prometheus.
2. **Database Hardening**: Adding unique constraints to document sequence indexing to block duplicate creations under concurrent pressure.
3. **Query Optimization**: Fixing WAC consistency job N+1 queries by implementing high-performance SQL query batching.
4. **Security & Validation**: Implementing service-level role gates on document voids, and Cost Adjustment WAC cost fallback rules to prevent WAC database corruption.
5. **High-Throughput Operations**: Overriding API throttlers on rapid handheld barcode scanning and multi-line posting endpoints.
6. **Data Visualizations & Reports**: Introducing cursor-based progressive streaming exports for massive sheets, and visual reports for "WAC Cost History" and "Lot Traceability" in the Reports Hub.

---

## Technical Context

**Language/Version**: TypeScript / Node.js 18+ (NestJS 10, Next.js 16)  
**Primary Dependencies**: class-validator, class-transformer, Prisma Client, ExcelJS, @nestjs/throttler  
**Storage**: PostgreSQL (via Prisma)  
**Testing**: Jest (Unit testing & E2E)  
**Target Platform**: Linux Server / Web Browser (Next.js 16)  
**Project Type**: Monorepo (Next.js 16 Frontend + NestJS Backend + Shared Types package)  
**Performance Goals**: WAC Consistency Job optimized to constant O(2) query footprint; Large exports (100k+ records) streamed progressively with ExcelJS stream writer; Rapid scanner entry support up to 100 requests per minute per user.  
**Constraints**: Zero N+1 queries in cron jobs; Database-enforced document sequences uniqueness; 100% service-layer authorization verification.  
**Scale/Scope**: 9 high-priority remediation tasks covering backend, frontend, and database schema layers.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

* **Rule: Backend supreme authority**: All data audits (Lot drifts), cost logic constraints (Adjustment WAC fallbacks), and access permissions (unauthorized void service gates) are strictly implemented and verified in NestJS core service layers.
* **Rule: Strictly separate concerns**: Next.js (`apps/web`) communicates purely via the REST API endpoints using custom react-query hooks. No backend or direct DB models are imported.
* **Rule: DRY Schema**: Shared types are declared in `packages/shared-types` (Zod validation structures).
* **Rule: Immutable Auditing**: Voiding actions assert and capture AuditLog snapshots before and after state transitions.
* **Rule: Micro-phasing & Quality Gates**: Code is tested to build and typecheck validations (`npm run build --filter=api` and `npm run typecheck --filter=web`) after each task.

---

## Project Structure

### Documentation (this feature)

```text
specs/036-sprint-3-remediation/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0: Technical choices & rationales
├── data-model.md        # Phase 1: Database models & fields
├── quickstart.md        # Phase 1: Local setup and verification commands
├── contracts/           # Phase 1: API controller contracts & DTO specs
└── checklists/
    └── requirements.md  # Spec quality validation checklist
```

### Source Code (repository root)

```text
apps/
├── api/                 # NestJS Backend Application
│   ├── prisma/
│   │   └── schema.prisma # Prisma Schema for sequence unique index
│   └── src/
│       ├── jobs/
│       │   └── wac-consistency.job.ts   # optimized consistency checks
│       └── modules/
│           ├── admin/
│           │   └── admin.service.ts     # metrics injector
│           ├── ledger/
│           │   └── reconciliation.job.ts # lot reconciliation + metrics
│           ├── operations/
│           │   ├── adjustment-post.service.ts # cost default logic
│           │   ├── grn-void.service.ts       # role guard void gate
│           │   ├── issue-void.service.ts     # role guard void gate
│           │   ├── adjustment-void.service.ts # role guard void gate
│           │   ├── transfer-void.service.ts   # role guard void gate
│           │   └── kitchen-request-void.service.ts # role guard void gate
│           ├── purchasing/
│           │   └── grn.controller.ts     # scanner throttle override
│           └── reports/
│               └── reports.controller.ts  # cursor-based streaming Excel export
│
└── web/                 # Next.js 16 Frontend Application
    └── src/
        ├── app/
        │   └── [locale]/
        │       └── (app)/
        │           └── reports/
        │               ├── ReportsHubClient.tsx # updated layout with card triggers
        │               ├── wac-history/
        │               │   └── page.tsx        # new visual report page
        │               └── lot-trace/
        │                   └── page.tsx        # new visual trace page
        └── features/
            └── reports/
                └── hooks/
                    ├── useWacHistory.ts        # react-query cost report hook
                    └── useLotTrace.ts          # react-query lot trace hook

packages/
└── shared-types/        # Shared types, Zod schemas, workflow transitions
```

**Structure Decision**: Monorepo project structure. Strict separation between Next.js UI (`apps/web`) and NestJS service logic (`apps/api`). All database modifications are executed via Prisma schema migrations.

---

## Complexity Tracking

*No Constitution Check violations are present. The architectural layout respects all LogiRest Zero-Trust monorepo directives.*

# Implementation Plan: Prisma Database Models & Migration Setup

**Branch**: `015-prisma-db-models` | **Date**: 2026-05-22 | **Spec**: [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/015-prisma-db-models/spec.md)
**Input**: Feature specification from `/specs/015-prisma-db-models/spec.md`

## Summary

The goal of Phase 2 is to design and establish the database infrastructure and Prisma schemas for the LogiRest system, enabling full T1 to T6 model capabilities as specified in [PROJECT_MAP.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/PROJECT_MAP.md). 

The technical approach implements:
1. Exact mapping of the 30+ tables and custom enums via Prisma in a single database context (`DATABASE_URL`).
2. High-precision decimal formats: `@db.Decimal(18, 4)` for money and quantities, and `@db.Decimal(18, 6)` for FX rates.
3. Safety and audit features including optimistic version counters (`version: Int @default(1)`) on mutable tables and append-only ledger partitions (`StockLedger` and `CostLedger`).
4. Composite primary keys for live inventory (`WarehouseItem` and `WarehouseItemLot`) to ensure strict uniqueness.
5. Index optimizations to support FEFO/FIFO lookup queries.

## Technical Context

**Language/Version**: TypeScript / Node.js 24+, NestJS 11  
**Primary Dependencies**: `@prisma/client`, `prisma` CLI (v6+ or latest compatible), `@logirest/shared-types`  
**Storage**: PostgreSQL (via InsForge)  
**Testing**: Jest (`test` scripts in `apps/api`)  
**Target Platform**: Linux Container / Node.js Runtime  
**Project Type**: Monorepo / Web-Service  
**Performance Goals**: 
- Database migration creation and deployment execution in <10 seconds.
- Database lookup data seeding completing in <5 seconds.
- Support transaction throughput up to 100 concurrent ledger adjustments per second.
**Constraints**:
- Strict separation of concern: frontend `apps/web` must not import NestJS or query the database directly.
- All live stock and cost movements must go through a serializable transaction with database-level row locks.
**Scale/Scope**: ~30 database tables, 10 enums, and comprehensive seed data supporting multiple currency base rates (SAR, USD) and organizational warehouses.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Every gate must be evaluated and verified against the principles defined in [constitution.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/.specify/memory/constitution.md):

1. **Backend Authority Gate**:
   - *Status*: **PASSED**
   - *Detail*: No Prisma configuration, schema files, or seeding code resides or is executed inside `apps/web`. The backend (`apps/api`) is the sole system of record.

2. **Separation of Concerns Gate**:
   - *Status*: **PASSED**
   - *Detail*: All data schemas and transitions are compiled inside `packages/shared-types`. No NestJS modules or raw database models leak into `apps/web`.

3. **Pessimistic Locking Gate**:
   - *Status*: **PASSED**
   - *Detail*: All T5 ledger mutations (`StockLedger`, `CostLedger`) and T3/T4 live positions (`WarehouseItem`, `WarehouseItemLot`) will utilize row-level locking (`SELECT FOR UPDATE`) within `prisma.$transaction` configured with `Serializable` isolation level.

4. **Optimistic Locking Gate**:
   - *Status*: **PASSED**
   - *Detail*: Every mutable transaction document (PR, PO, GRN, Issue, Transfer, Adjustment, KitchenRequest, StocktakeSession) includes an integer `version` field. Updates must assert the current version value in the `where` block and increment it in the data update object.

5. **IDOR Protection Gate**:
   - *Status*: **PASSED**
   - *Detail*: The schema defines `UserWarehouseScope` to bind users to their allowed warehouses. A custom NestJS interceptor will intercept headers `x-warehouse-id` and `x-branch-id` and check them against this table, preventing scope escalation.

6. **Workflow State Guard Gate**:
   - *Status*: **PASSED**
   - *Detail*: An `ApprovalEvent` model records history, and document status fields map directly to `transitionMapV2` defined in `packages/shared-types`.

7. **Audit Trail Gate**:
   - *Status*: **PASSED**
   - *Detail*: The `AuditLog` table stores serialized `beforeStateJson` and `afterStateJson` for all mutable entity modifications.

## Project Structure

### Documentation (this feature)

```text
specs/015-prisma-db-models/
├── plan.md              # This file (implementation plan)
├── research.md          # Technical decisions and alternatives
├── data-model.md        # Detailed entity and fields documentation
├── quickstart.md        # Schema validation and migration instructions
└── checklists/          # Checklists generated for implementation
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── schema.prisma    # Complete T1-T6 Prisma database schema
│   ├── seed.ts          # Core lookup data seeding script
│   └── migrations/      # Generated migration SQL scripts
└── src/
    └── database/        # NestJS database integration module
        └── prisma.service.ts

packages/shared-types/
├── src/
│   ├── index.ts
│   ├── role-capabilities.ts # Extracted role capabilities
│   └── statuses.ts          # Workflow status maps
└── package.json
```

**Structure Decision**: 
The schema file resides in `apps/api/prisma/schema.prisma` and seeds from `apps/api/prisma/seed.ts`. Sharing of enums and validations is accomplished by importing the types compiled in `packages/shared-types` into both `apps/api` and `apps/web`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate T5 Ledger Tables (`StockLedger`, `CostLedger`) | To enforce immutability constraints. Posted transactions must be append-only and cannot be updated. | Reconstructing live quantities directly from T2 documents is slow, error-prone, and doesn't allow tracking adjustment histories reliably. |
| Composite Primary Keys on `WarehouseItem` and `WarehouseItemLot` | Uniquely tracks real-time inventory balances per warehouse-item and per warehouse-item-lot. | Auto-incrementing surrogate IDs (`id`) would add indexing overhead and make querying composite relationships slower and less descriptive. |

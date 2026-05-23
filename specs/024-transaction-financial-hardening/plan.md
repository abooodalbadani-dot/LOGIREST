# Implementation Plan: Transactional & Financial Hardening (Phase 2)

**Branch**: `023-api-db-core-hardening` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-transaction-financial-hardening/spec.md`

## Summary

This implementation plan focuses on Phase 2 hardening tasks for the LogiRest system. It addresses WAC propagation on stock transfers, WAC decimal arithmetic precision using Prisma's built-in Decimal class (wrapping decimal.js), a database-backed sequential document sequence generator that resets annually per branch with atomic locking, and a daily automated stock-to-ledger reconciliation job that freezes SKU mutations upon detecting any inventory drift.

## Technical Context

**Language/Version**: TypeScript / Node.js v20 / NestJS v11  
**Primary Dependencies**: Prisma Client, Zod, NestJS Core  
**Storage**: PostgreSQL  
**Testing**: Jest (Unit & Integration tests)  
**Target Platform**: Linux Container / Node Runtime  
**Project Type**: Monorepo Web Service (NestJS API Backend & Next.js Frontend)  
**Performance Goals**: Sequence generation in <10ms, reconciliation completion for 10k SKUs in <2 mins  
**Constraints**: Zero decimal rounding drift, database-level atomic sequences, strict SKU-level locking for drift  
**Scale/Scope**: 5 key files modified, 1 new Prisma model, 1 new reconciliation cron job  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Backend Authority**: Enforce WAC calculations, sequential numbering, and SKU-level locks on the NestJS backend API.
- [x] **Strict Separation of Concerns**: Database schema changes and controllers are implemented entirely within the API; frontend only respects the `isFrozen` status flag to disable actions.
- [x] **Pessimistic Locking**: Ensure document numbering updates and reconciliation checks utilize database-level transaction locks to prevent concurrency race conditions.
- [x] **Optimistic Locking**: Enforce the `version` field matching during updates to prevent double-postings or overwrite conflicts.
- [x] **Immutable Auditing**: Generate audit logs for sequence allocations, unfreezing mutations, and drift detections.

## Project Structure

### Documentation (this feature)

```text
specs/024-transaction-financial-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 database design output
├── quickstart.md        # Phase 1 quickstart guide
└── contracts/
    └── endpoints.md     # Phase 1 contract details for numbering & reconciliation
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── migrations/      # Sequential numbering migration
│   └── schema.prisma    # Added DocumentSequence and WarehouseItem.isFrozen
├── src/
│   ├── modules/
│   │   ├── ledger/
│   │   │   ├── wac.service.ts        # Recalculate WAC using decimal arithmetic
│   │   │   └── reconciliation.job.ts # [NEW] Daily reconciliation job
│   │   ├── operations/
│   │   │   └── transfers/
│   │   │       └── transfer-post.service.ts # Recalculate WAC on receive; log transit losses
│   │   └── sequencing/
│   │       ├── document-sequence.service.ts # [NEW] Sequential numbering generator
│   │       └── document-sequence.module.ts  # [NEW] Module registration
```

**Structure Decision**: Code changes are integrated directly inside NestJS services under `apps/api/src/modules/` aligning with existing operations and ledger modules.

## Complexity Tracking

*No constitution check violations exist.*

# Implementation Plan: Inventory Transactions (Phase 7)

**Branch**: `020-inventory-transactions` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/020-inventory-transactions/spec.md`

## Summary

Implement the backend posting transaction engine for Phase 7 (Inventory Transactions) of the LogiRest Kitchen-Store Inventory System. This includes atomic ledger postings for Goods Received Notes (GRN), Inventory Issues, Warehouse Transfers (Ship/Receive), Stock Adjustments, and Stocktake Sessions. The implementation will enforce raw SQL row-level locks, FEFO/FIFO lot allocations, and WAC recalculations to guarantee inventory data integrity.

## Technical Context

- **Language/Version**: TypeScript / Node.js (NestJS)  
- **Primary Dependencies**: `@nestjs/core`, `@nestjs/common`, `@prisma/client`, `@logirest/shared-types`  
- **Storage**: PostgreSQL via Prisma ORM  
- **Testing**: Jest (Unit & Integration tests)  
- **Target Platform**: Node.js Server Environment  
- **Project Type**: RESTful Web Service (API)  
- **Performance Goals**: Transaction posting execution under 500ms  
- **Constraints**: 
  - Raw SQL row locks (`SELECT FOR UPDATE`) on mutating inventory.
  - Negative stock prevention at lot and warehouse total levels.
  - Expired/Stale stocktake locks block all warehouse transactions.
- **Scale/Scope**: Phase 7 transaction posting modules inside `apps/api/src/modules/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: Enforced. All business constraints (Negative stock checks, locks) are autoritative on the server. (Status: **PASS**)
- **Separation of Concerns**: Enforced. Backend logic is self-contained in `apps/api`; types shared via `packages/shared-types`. (Status: **PASS**)
- **DRY Schema Principle**: Enforced. Schemas and transition maps are imported directly from `@logirest/shared-types`. (Status: **PASS**)
- **Pessimistic Locking**: Enforced. All inventory ledger mutations wrap mutations in a serializable transaction with row locks. (Status: **PASS**)
- **Optimistic Locking**: Enforced. Document updates utilize the `version` increment guard. (Status: **PASS**)
- **IDOR Prevention**: Enforced. Scopes validated from headers against `UserWarehouseScope` table via NestJS Interceptor. (Status: **PASS**)
- **State Machine Parity**: Enforced. State transitions validate live DB status via `WorkflowStateGuard` and shared transitions map. (Status: **PASS**)
- **Immutable Auditing**: Enforced. Mutating operations log before/after JSON states. (Status: **PASS**)

## Project Structure

### Documentation (this feature)

```text
specs/020-inventory-transactions/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── checklists/
│   └── requirements.md  # Spec checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/
│   ├── purchasing/
│   │   └── grn-post.service.ts
│   ├── operations/
│   │   ├── issue-post.service.ts
│   │   ├── transfer-post.service.ts
│   │   └── adjustment-post.service.ts
│   ├── stocktake/
│   │   └── stocktake-post.service.ts
│   └── ledger/
│       ├── ledger-lock.service.ts
│       ├── allocation.service.ts
│       └── wac.service.ts
```

**Structure Decision**: Web application option (NestJS backend API project under `apps/api/src/modules`).

## Complexity Tracking

> **No violations identified.**

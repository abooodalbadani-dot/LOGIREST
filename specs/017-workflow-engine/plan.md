# Implementation Plan: Workflow Engine (Phase 4)

**Branch**: `017-workflow-engine` | **Date**: 2026-05-22 | **Spec**: [specs/017-workflow-engine/spec.md](file:///e:/Kitchen‑Store%20Inventory%20System/specs/017-workflow-engine/spec.md)
**Input**: Feature specification from `/specs/017-workflow-engine/spec.md`

## Summary
Implement Phase 4 (Workflow Engine) of the LogiRest system. This implementation provides a robust, zero-trust NestJS `WorkflowService` and `WorkflowStateGuard` that validates document status transitions and user role capabilities against the shared `@logirest/shared-types` state machine mapping, updates `schema.prisma` to enhance `ApprovalEvent`, and integrates transaction-based audit logs and operational locks (stocktake check).

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 20+
**Primary Dependencies**: NestJS (v11.0.1), `@prisma/client` (v6.9.0), `@logirest/shared-types`
**Storage**: PostgreSQL (via Prisma)
**Testing**: Jest unit tests and NestJS E2E tests (Supertest)
**Target Platform**: Node.js web-service (Express)
**Project Type**: web-service (API backend)
**Performance Goals**: State machine validation and role capability checks under 50ms per request.
**Constraints**:
- Strict server-side verification using database-loaded state (never DTO status).
- Concurrency handled at database update level using optimistic locking `version` check.
- Warehouse lock check blocks physical inventory mutations (e.g. GRN, Transfer, Adjustment) in locked warehouses while permitting procurement (PR/PO).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: Validated. The guard will query the database directly for the target document's current state.
- **Separation of Concerns**: Validated. All status machine transition validations reside in `apps/api/src/guards/workflow-state.guard.ts` and `apps/api/src/modules/workflow/workflow.service.ts`.
- **DRY Schema Principle**: Validated. `WorkflowService` imports `canPerformActionV2`, `getNextStatusV2`, and `ROLE_CAPABILITIES` directly from `@logirest/shared-types`.
- **Immutable Auditing**: Validated. Successful and failed status transitions write to the database `AuditLog` table.
- **State Machine Parity**: Validated. Guard utilizes `@logirest/shared-types/src/workflow/document-engine.ts` mappings.

## Project Structure

### Documentation (this feature)

```text
specs/017-workflow-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/          # Validation Checklists
```

### Source Code (repository root)

```text
apps/api/src/
├── app.module.ts                         # Import WorkflowModule
├── modules/
│   └── workflow/
│       ├── workflow.module.ts            # NestJS Module exporting WorkflowService
│       └── workflow.service.ts           # Interacts with shared-types and database
├── guards/
│   └── workflow-state.guard.ts           # NestJS Guard to intercept requests and validate status/role
└── decorators/
    └── workflow-action.decorator.ts      # Sets metadata for WorkflowStateGuard
```

**Structure Decision**: Selected standard NestJS modular layout under `apps/api/src/modules/workflow` and general controllers/guards in `apps/api/src/guards` / `apps/api/src/decorators`.

## Complexity Tracking

*No violations identified.*

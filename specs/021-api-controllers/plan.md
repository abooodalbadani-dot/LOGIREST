# Implementation Plan: API Controllers (Phase 8)

**Branch**: `021-api-controllers` | **Date**: 2026-05-23 | **Spec**: [specs/021-api-controllers/spec.md](file:///e:/Kitchen‑Store%20Inventory System/specs/021-api-controllers/spec.md)
**Input**: Feature specification from `/specs/021-api-controllers/spec.md`

## Summary

This feature implements the complete set of NestJS API controllers and routing modules for the backend (Phase 8 of the implementation roadmap). It includes wiring authentication endpoints, master data CRUD operations (with soft-delete/archiving for warehouses with transaction history), procurement document lifecycles (PR, PO, GRN), operations documents (Issues, Adjustments, Transfers), stocktake sessions (with locking systems), and kitchen requests. 

The technical approach enforces all security and state guards defined in the LogiRest Constitution:
1. **JWT Authentication**: `JwtAuthGuard` applied globally to protect routes.
2. **Multi-Tenant Scope Isolation**: `ScopeInterceptor` validating headers and filtering records.
3. **Workflow Transitions**: `WorkflowStateGuard` verifying state machine transitions using database status.
4. **Concurrency Safety**: `ConcurrencyService` enforcing version checks on updates.
5. **Idempotency**: `IdempotencyGuard` preventing duplicate document creation.
6. **Warehouse Lock**: `WarehouseLockGuard` blocking stock mutations during stocktakes.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+  
**Primary Dependencies**: NestJS, Prisma, Class Validator, Passport JWT, Zod  
**Storage**: PostgreSQL (Prisma ORM)  
**Testing**: Jest (Unit and Integration tests)  
**Target Platform**: Linux Server / Node.js runtime  
**Project Type**: web-service (API Controllers)  
**Performance Goals**: API response times under 500ms for document operations, under 200ms for master data reads under standard load.  
**Constraints**: Zero direct database updates bypassing version controls or guards; strictly enforce header-based warehouse scope checks.  
**Scale/Scope**: Exposes 30+ endpoints covering auth, 11 master data modules, and 6 transaction modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: Passed. The API controllers act as the primary validation gate, using guards and interceptors to enforce all business logic.
- **Separation of Concerns**: Passed. All logic is isolated in the NestJS API; shared validation contracts are imported from `packages/shared-types`.
- **DRY Schema Principle**: Passed. Controllers utilize Zod schemas and validation types exported from `@logirest/shared-types`.
- **Pessimistic & Optimistic Locking**: Passed. Transactions leverage optimism via version checks and respect database-level warehouse locks.
- **IDOR Prevention**: Passed. `ScopeInterceptor` strictly checks `x-warehouse-id` and `x-branch-id` headers against the database `UserWarehouseScope` configuration.
- **State Machine Parity**: Passed. State transitions are verified by `WorkflowStateGuard` querying the database.
- **Immutable Auditing**: Passed. Actions that modify documents log the state before and after to `AuditLog`.

## Project Structure

### Documentation (this feature)

```text
specs/021-api-controllers/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/          
│   └── requirements.md  # Spec quality checklist
├── contracts/           # Phase 1 output (endpoints definition)
└── tasks.md             # Phase 2 output (to be created by tasks command)
```

### Source Code (repository root)

```text
apps/api/src/
├── main.ts
├── app.module.ts
├── decorators/
│   └── active-scope.decorator.ts
├── interceptors/
│   └── scope.interceptor.ts
├── guards/
│   ├── workflow-state.guard.ts
│   ├── idempotency.guard.ts
│   └── warehouse-lock.guard.ts
└── modules/
    ├── auth/
    │   └── auth.controller.ts
    ├── master-data/
    │   ├── branches/branches.controller.ts
    │   ├── warehouses/warehouses.controller.ts
    │   ├── departments/departments.controller.ts
    │   ├── items/items.controller.ts
    │   ├── suppliers/suppliers.controller.ts
    │   ├── uoms/uoms.controller.ts
    │   ├── categories/categories.controller.ts
    │   ├── currencies/currencies.controller.ts
    │   ├── barcodes/barcodes.controller.ts
    │   └── fx-rates/fx-rates.controller.ts
    ├── purchasing/
    │   ├── purchase-requests/pr.controller.ts
    │   ├── purchase-orders/po.controller.ts
    │   └── grn/grn.controller.ts
    ├── operations/
    │   ├── issues/issues.controller.ts
    │   ├── adjustments/adjustments.controller.ts
    │   └── transfers/transfers.controller.ts
    ├── stocktake/
    │   └── stocktake.controller.ts
    └── kitchen-requests/
        └── kitchen-requests.controller.ts
```

**Structure Decision**: Expose the endpoints within the existing NestJS structure under `apps/api/src/modules/` matching the directory configuration.

## Complexity Tracking

*No constitution violations detected. Standard NestJS monorepo architecture rules applied.*

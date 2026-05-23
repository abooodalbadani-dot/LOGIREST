# Implementation Plan: Concurrency Control (Phase 5)

**Branch**: `018-concurrency-control` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/018-concurrency-control/spec.md`

## Summary

This feature implements the core concurrency and consistency controls for the LogiRest monorepo. It ensures zero data loss and absolute transactional integrity across a multi-user, multi-branch kitchen and warehouse inventory system. 
The implementation is broken down into three logical subsystems:
1. **Optimistic Locking Handler (Phase 5.1)**: Wraps version-controlled Prisma document updates to prevent concurrent overwrite bugs. A version mismatch yields a `409 Conflict` exception containing metadata.
2. **Idempotency Guard & Interceptor (Phase 5.2)**: Enforces unique HTTP creation requests using `x-idempotency-key` header with a 24-hour TTL. Duplicate requests return cached responses, and executing requests return `409 Conflict`.
3. **WarehouseLock Guard & Admin Override (Phase 5.3)**: Blocks physical inventory mutations on warehouses under an active stocktake. Stale locks (>= 72 hours) require a manual, audited administrator override.

---

## Technical Context

* **Language/Version**: TypeScript, Node.js v20+
* **Primary Dependencies**: NestJS v10+, Prisma ORM v5+, `@logirest/shared-types`
* **Storage**: PostgreSQL (Prisma Client)
* **Testing**: Jest (Unit & Integration tests)
* **Target Platform**: Docker-packaged NestJS Server (`apps/api`)
* **Project Type**: Backend service + REST API endpoints
* **Performance Goals**: 
  - Idempotency check overhead < 10ms (cached database query)
  - Version conflict checks resolved in < 50ms
  - Zero lock leaks
* **Constraints**: 
  - Concurrency checks must strictly be enforced in `apps/api`
  - Zero-trust header parsing with strict RBAC verification
  - Immutable database auditing logs

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitutional Rule | Compliance Verification | Status |
| :--- | :--- | :--- |
| **Backend Authority** | All version verification, idempotency checking, and warehouse locking logic are performed strictly on the server (`apps/api`). | ✅ PASS |
| **DRY Schema Principle** | Role validation and status mapping import from `@logirest/shared-types`. | ✅ PASS |
| **Optimistic Locking** | Every document model update implements a `version` filter check to prevent concurrency overwrite bugs. | ✅ PASS |
| **Immutable Auditing** | Manual force-unlocking of warehouses is logged to the `AuditLog` table with a mandatory `reason_notes` field and the lock's `beforeState`. | ✅ PASS |
| **No Violet/Purple Accents** | N/A (Backend logic has no visual component; frontend override UI will strictly respect the Nocturne design system). | ✅ PASS |

---

## Project Structure

This feature introduces new services, guards, interceptors, and a lock-management module to the API codebase.

### Documentation (this feature)

```text
specs/018-concurrency-control/
├── plan.md              # This file
├── research.md          # Phase 0: System design & analysis
├── data-model.md        # Phase 1: Database schemas and entities
├── quickstart.md        # Phase 1: Developer environment & testing guide
└── contracts/
    └── warehouse-lock.api.md  # Phase 1: Force-unlock API endpoint contract
```

### Source Code (repository root)

```text
apps/api/src/
├── exceptions/
│   └── version-conflict.exception.ts         # Custom ConflictException (409)
├── services/
│   ├── concurrency.service.ts                 # Service wrapping optimistic updates
│   └── idempotency.service.ts                 # Service managing idempotency store
├── guards/
│   ├── idempotency.guard.ts                   # Guard enforcing presence of key header
│   └── warehouse-lock.guard.ts                # Guard blocking mutating writes on locks
├── interceptors/
│   └── idempotency.interceptor.ts             # Interceptor caching/returning response
├── decorators/
│   ├── idempotent.decorator.ts                # Decorator to opt-in to idempotency checks
│   └── bypass-warehouse-lock.decorator.ts     # Decorator to skip lock checks
└── modules/
    └── warehouse-lock/
        ├── warehouse-lock.module.ts           # Module for lock overrides
        ├── warehouse-lock.controller.ts       # Endpoint to force unlock warehouse locks
        └── warehouse-lock.service.ts          # Core locking & stale lock override service
```

**Structure Decision**: The files are organized into their respective global folders (`exceptions/`, `services/`, `guards/`, `interceptors/`, `decorators/`) as they are shared cross-cutting concerns. The override controller and module are contained in `modules/warehouse-lock` to maintain a modular API design.

---

## Complexity Tracking

*No violations of the Constitution detected. All design choices strictly align with the Zero-Trust Monorepo architecture.*

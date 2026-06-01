# Implementation Plan: Sprint 1 - Security & Stock Correctness

**Branch**: `044-security-stock-correctness` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-security-stock-correctness/spec.md`

## Summary

This plan outlines the engineering execution for Sprint 1: Security & Stock Correctness. It resolves severe security IDOR vulnerabilities by enforcing warehouse-scoped validation globally in workflow guards and local controllers. Additionally, it addresses a major stock leak during kitchen request cancellations by introducing serialized, transaction-safe inventory issue reversals. Finally, it repairs a short-circuit bug in the workflow status engine to guarantee that document state locks cannot be bypassed.

## Technical Context

**Language/Version**: TypeScript / NestJS (Node.js v20+)  
**Primary Dependencies**: `@nestjs/common`, `@nestjs/core`, `@prisma/client`  
**Storage**: PostgreSQL (via Prisma ORM)  
**Testing**: Jest (Unit / Integration tests)  
**Target Platform**: Linux Monorepo Environment  
**Project Type**: NestJS Web Service API  
**Performance Goals**: IDOR scope checks and transition guard checks complete in under 5ms; kitchen voids complete in under 200ms.  
**Constraints**: Zero global soft-delete middleware, 100% backend authority on scopes, explicit optimistic/pessimistic lock rules.  
**Scale/Scope**: 7 primary controllers hardened, 1 central state guard updated, 1 void service transaction restructured, 1 workflow engine helper corrected.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Phase Objective Gate**: PASS. Sprint 1 is strictly dedicated to stability and integrity (P0 critical bugs). No feature creep or unnecessary refactoring.
- **Backend Authority Gate**: PASS. All warehouse scope validations and state transition maps are executed and enforced directly inside the NestJS API layer.
- **Pessimistic Locking Gate**: PASS. Kitchen request void stock restorations will acquire write locks (`SELECT FOR UPDATE`) on the target lot and warehouse item rows within a `prisma.$transaction` configured with `Serializable` isolation level.
- **Optimistic Locking Gate**: PASS. Draft updates and deletions retain version checks in their update clauses where required.
- **IDOR Prevention Gate**: PASS. Scopes are validated using the `ScopeValidationService` checking the authenticated user's `UserWarehouseScope` entries.

## Project Structure

### Documentation (this feature)

```text
specs/044-security-stock-correctness/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical design choices and rationales
├── data-model.md        # Entities, lot balances, and state transitions
├── quickstart.md        # Local testing and verification instructions
└── contracts/
    └── api.md           # Internal endpoint updates and behavior
```

### Source Code (repository root)

```text
apps/api/src/
├── guards/
│   └── workflow-state.guard.ts        # Dynamic warehouse scope checks and state transition map checks
├── auth/
│   └── scope-validation.service.ts    # Centralized warehouse scope validation service
├── modules/
│   ├── purchase-requests/
│   │   └── purchase-requests.controller.ts  # Scoped PUT/DELETE draft route validation
│   ├── purchasing/
│   │   ├── purchase-orders/
│   │   │   └── po.controller.ts       # Scoped PUT/DELETE draft route validation
│   │   └── grn/
│   │       └── grn.controller.ts      # Scoped PUT/DELETE draft route validation
│   ├── operations/
│   │   ├── kitchen-request-void.service.ts  # Transactional stock & cost reversal
│   │   ├── transfers/
│   │   │   └── transfers.controller.ts  # Scoped PUT/DELETE draft route validation
│   │   ├── issues/
│   │   │   └── issues.controller.ts    # Scoped PUT/DELETE draft route validation
│   │   └── adjustments/
│   │       └── adjustments.controller.ts  # Scoped PUT/DELETE draft route validation
│   └── kitchen-requests/
│       └── kitchen-requests.controller.ts  # Scoped PUT/DELETE draft route validation
packages/shared-types/src/
└── workflow/
    └── document-engine.ts             # canPerformActionV2 precedence order fix
```

**Structure Decision**: Monorepo layout. All backend changes belong inside `apps/api` (NestJS) and `packages/shared-types` (Zod schemas and shared workflow rules). No changes to the frontend (`apps/web`) are within the scope of Sprint 1.

## Complexity Tracking

> *No Constitution Check violations are present. The design strictly conforms to active guidelines.*

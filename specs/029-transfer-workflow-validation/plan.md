# Implementation Plan: Fix Transfer SHIP/RECEIVE Workflow Role Validation

**Branch**: `029-transfer-workflow-validation` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-transfer-workflow-validation/spec.md`

## Summary

TASK-003 addresses a critical security vulnerability where `TransferPostService.ship()` and `TransferPostService.receive()` bypass the centralized system permission matrix (`canPerformActionV2()`), validating document status directly instead of validating user roles first.

Our technical approach will:
1. Integrate the centralized `canPerformActionV2` role validation check inside both `ship()` and `receive()` methods before status transitions.
2. Strictly enforce branch-scoping logic: users executing a `SHIP` action must have access/scope to the transfer's origin warehouse, and users executing a `RECEIVE` action must have access/scope to the transfer's destination warehouse (unless they hold a global administrator bypass role).
3. If authorization checks fail, trigger database transaction rollback, log the unauthorized attempt in real-time warning logs, and write a persistent security record to the `AuditLog` table.
4. Keep document status validation checks as a secondary guard (defense-in-depth) post-authorization.
5. Create robust E2E test suites in `workflow-roles.e2e-spec.ts` to verify authorization enforcement for ship/receive and warehouse scope constraints.

## Technical Context

**Language/Version**: TypeScript / Node.js (NestJS)  
**Primary Dependencies**: `@nestjs/common`, `@prisma/client`, `@logirest/shared-types`  
**Storage**: PostgreSQL (via Prisma ORM)  
**Testing**: Jest (NestJS E2E testing framework)  
**Target Platform**: Linux/Docker Node.js Environment  
**Project Type**: Monorepo Web Service  
**Performance Goals**: Authorization check latency < 5ms  
**Constraints**: Zero trust on client-side requests; enforce user credentials from securely verified session tokens.  
**Scale/Scope**: Governs core warehouse-to-warehouse stock movement.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority Gate**: **PASSED**. Enforces all access control, business validation, and branch scope matching strictly on the NestJS backend supreme authority (`apps/api`), leaving the client with zero execution rights.
- **Strict Separation of Concerns Gate**: **PASSED**. Keeps all UI elements in Next.js web application strictly isolated. The validation execution resides inside the backend `transfer-post.service.ts`, importing static schemas/types from `@logirest/shared-types`.
- **DRY Schema Principle Gate**: **PASSED**. Reuses the shared matrix method `canPerformActionV2` and transition maps directly from the shared packages module without duplication.
- **State Machine Parity Gate**: **PASSED**. Integrates the transition validation check using `@logirest/shared-types` matrix directly inside the operational service layer, maintaining alignment with system-wide guards.
- **Immutable Auditing Gate**: **PASSED**. Blocked unauthorized attempts will write persistent entries to the immutable `AuditLog` database table mapping the details of the forbidden request context.

## Project Structure

### Documentation (this feature)

```text
specs/029-transfer-workflow-validation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API schema / responses)
└── checklists/
    └── requirements.md  # Quality Checklist
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── modules/
│   │   ├── operations/
│   │   │   ├── transfer-post.service.ts    # Service executing ship() and receive()
│   │   │   └── operations.module.ts        # Module config
│   │   └── workflow/
│   │       └── workflow.service.ts         # Central workflow service
└── test/
    └── workflow-roles.e2e-spec.ts          # E2E integration test suite

packages/shared-types/
└── src/
    ├── index.ts                            # Re-exports types/matrices
    └── role-capabilities.ts                # Matrix definition for SHIP/RECEIVE
```

**Structure Decision**: Monorepo architecture matching existing backend (`apps/api`) and shared types (`packages/shared-types`) workspace layout.

## Complexity Tracking

> **No violations of the Constitution identified.**

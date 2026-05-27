# Implementation Plan: Sprint 2 Quality Hardening & Completion

**Branch**: `035-sprint-2-completion` | **Date**: 2026-05-27 | **Spec**: [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/035-sprint-2-completion/spec.md)  
**Input**: Feature specification from `/specs/035-sprint-2-completion/spec.md`

## Summary

This plan details the implementation of the **Sprint 2 Quality Hardening & Completion** tasks, covering the critical remediation of mock-backed frontends, backend outbox events, stock transfer notification logging, comprehensive transaction void test coverage, and strict settings controller validation.

The execution strategy transitions the Goods Receipt Note (GRN) system to live RESTful APIs, implements a robust Redis-backed 7-day debounced expiration warning worker, wires real-time transfer received notification logs, builds comprehensive mock spec assertions for voids, and wraps administration endpoints with strict DTO validators.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x, Next.js 16  
**Primary Dependencies**: NestJS 10.x, Prisma 5.x, class-validator, class-transformer, @logirest/shared-types, exceljs  
**Storage**: PostgreSQL (Prisma), Redis (`ioredis`)  
**Testing**: Jest (Unit/Integration), Supertest (E2E)  
**Target Platform**: Linux Server (NestJS API), Web Browser (Next.js App)  
**Project Type**: Monorepo (Web Service & Web App)  
**Performance Goals**: 
- WAC sequential timeline recalculation completes in < 300ms.
- Settings validation and filtering processed in < 50ms.
- Expiry notification worker execution debounces and dispatches under 2 seconds.
**Constraints**: 
- No direct database access or NestJS dependencies inside `apps/web` (Next.js).
- strict role boundary checks (ADMIN/INV_MGR) on void operations.
- 7-day Redis debounce TTL to prevent notification fatigue.
- Unique sequence database-level unique constraint to guarantee zero duplicate document numbers.
**Scale/Scope**:
- 5 core remediation features.
- 5 new test spec files covering all void service layers.
- Full integration of Goods Receipt Note (GRN) client hooks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: **Pass**. All unfreeze, retry, validation, role restrictions, WAC recalculations, and audit logs are fully executed on the NestJS backend (`apps/api`).
- **Strict Separation of Concerns**: **Pass**. `apps/web` (Next.js) is limited to UI rendering. No direct database queries or raw SQL exist in Next.js.
- **State Machine Parity**: **Pass**. Document states transition only from DRAFT → POSTED → VOIDED under database status constraints and transition maps.
- **Immutable Auditing**: **Pass**. Void actions and WAC revisions write immutable `AuditLog` records containing prior and subsequent state snapshots.
- **Pessimistic/Optimistic Locking**: **Pass**. Concurrency guards (`version` checks) are enforced on prisma updates.
- **Micro-Phasing & Quality Gates**: **Pass**. Code is kept in a compilation-safe state at all times, with filter-based builds (`npm run build --filter=api` and `npm run typecheck --filter=web`) executed after changes.

## Project Structure

### Documentation (this feature)

```text
specs/035-sprint-2-completion/
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output (Decisions & rationales)
├── data-model.md        # Phase 1 output (Entities schema & validations)
├── quickstart.md        # Phase 1 output (Developer execution guide)
├── contracts/
│   └── endpoints.md     # Phase 1 output (API endpoints documentation)
└── checklists/
    └── requirements.md  # Specification Quality Checklist
```

### Source Code

```text
apps/api/
├── src/
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts          # Settings controller with validation
│   │   │   ├── admin.service.ts             # Settings service
│   │   │   └── dto/
│   │   │       └── update-settings.dto.ts   # New validated DTO
│   │   ├── outbox/
│   │   │   └── outbox.worker.ts             # Outbox worker (EXPIRY_WARNING handler)
│   │   └── operations/
│   │       ├── transfer-post.service.ts     # Outbox event & NotificationLog dispatch
│   │       ├── grn-void.service.spec.ts     # New void unit tests
│   │       ├── issue-void.service.spec.ts    # New void unit tests
│   │       ├── adjustment-void.service.spec.ts # New void unit tests
│   │       ├── transfer-void.service.spec.ts  # New void unit tests
│   │       └── kitchen-request-void.service.spec.ts # New void unit tests
│   └── main.ts                              # Global ValidationPipe configuration
│
apps/web/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       └── (app)/
│   │           └── (procurement)/
│   │               └── goods-received/
│   │                   └── [id]/
│   │                       └── post/
│   │                           └── GRNPostClient.tsx # Settings and Currency context hooks
│   └── features/
│       └── purchasing/
│           └── api/
│               └── useGoodsReceipts.ts      # Live API hook integration
```

**Structure Decision**: Web application (Option 2). Frontend/Backend split within the Monorepo structure. Code files will be modified directly under `apps/api` and `apps/web`.

## Complexity Tracking

*No constitutional violations detected. Separation of concerns and type parity are maintained.*

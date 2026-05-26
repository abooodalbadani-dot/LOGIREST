# Implementation Plan: Sprint 2 Quality Hardening

**Branch**: `033-sprint-2-quality-hardening` | **Date**: 2026-05-27 | **Spec**: [spec.md](file:///E:/Kitchen%E2%80%91Store%20Inventory%20System/specs/033-sprint-2-quality-hardening/spec.md)  
**Input**: Feature specification from `/specs/033-sprint-2-quality-hardening/spec.md`

## Summary

This feature implements the Sprint 2 quality hardening and system resilience items for the LogiRest system. It focuses on transition of background tasks to standardized scheduling structures, implementation of persistent caching for alert debounces, integration of Prometheus monitoring metrics for outbox failures, detailed auditing of security events (failed logins), and the construction of two next-generation Next.js administration dashboards (Frozen Items Management and Outbox retry Console) alongside database-level state validation.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x, Next.js 16  
**Primary Dependencies**: NestJS 10.x, Prisma 5.x, Redis (`ioredis`), `@nestjs/schedule`, TailwindCSS 3.4  
**Storage**: PostgreSQL (Prisma), Redis  
**Testing**: Jest (Unit/Integration)  
**Target Platform**: Linux Server (NestJS API), Web Browser (Next.js App)  
**Project Type**: Monorepo (Web Service & Web App)  
**Performance Goals**: 
- Background lock cleanup task runs under 150ms.
- Failed login audit log generation and DB persistence completes in under 100ms.
- Unfreeze and outbox event retry actions process in under 200ms.
**Constraints**: 
- All background cron tasks must use `@nestjs/schedule` decorators.
- Alert debouncing state must persist inside Redis cache to survive application restarts.
- Strict database status validation via PostgreSQL `CHECK` constraint on the outbox table.
- IDOR prevention must be maintained via JWT and role-based scope checks.
**Scale/Scope**:
- 7 core engineering remediation tasks.
- 2 new responsive dashboard interfaces in `apps/web/src/app/[locale]/(app)/admin`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: YES. All unfreeze and retry business logic, validation, role restrictions, and audit logs are fully executed on the NestJS backend.
- **Strict Separation of Concerns**: YES. The Next.js frontend only interacts with the backend via secure API controllers, preserving zero database access in the web workspace.
- **State Machine Parity**: YES. All status changes and document-state logic align with unified maps, and database status is constrained at the table definition level.
- **Immutable Auditing**: YES. Login failure events and unfreeze actions write immutable `AuditLog` records containing state snapshots.
- **Pessimistic/Optimistic Locking**: YES. Standard database transactions are utilized during status transitions and unfreeze operations.
- **Micro-Phasing & Quality Gates**: YES. Builds and typechecks will be validated separately in both directories to ensure full compilation safety.

## Project Structure

### Documentation (this feature)

```text
specs/033-sprint-2-quality-hardening/
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API endpoints documentation)
└── checklists/
    └── requirements.md  # Specification Quality Checklist
```

### Source Code

```text
apps/api/
├── src/
│   ├── jobs/
│   │   ├── lock-cleanup.job.ts             # Lock cleanup cron job
│   │   └── low-stock-alert.job.ts           # Redis-backed low stock alert job
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts          # API endpoints for unfreezing and outbox retry
│   │   │   └── admin.service.ts             # Business logic for unfreezing and retry operations
│   │   └── outbox/
│   │       └── outbox.worker.ts             # Outbox worker with metrics integration
│   └── auth/
│       └── auth.service.ts                  # Security failed login audit logger

apps/web/
├── src/
│   └── app/
│       └── [locale]/
│           └── (app)/
│               └── admin/
│                   ├── layout.tsx           # Navigation links injection
│                   ├── frozen-items/
│                   │   └── page.tsx         # Frozen items administration UI
│                   └── outbox/
│                       └── page.tsx         # Outbox queue retry panel
```

**Structure Decision**: Option 2 (Web application - Frontend/Backend split within the Monorepo). Files will be directly located under `apps/api` and `apps/web`. Shared structures will be imported from `packages/shared-types` if necessary.

## Complexity Tracking

*No constitutional violations detected. Clean architecture is preserved.*

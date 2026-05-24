# Implementation Plan: Observability, Security & Deployment Hardening (Phase 3)

**Branch**: `025-observability-security-deployment-hardening` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-observability-security-deployment-hardening/spec.md`

## Summary

This implementation plan focuses on Phase 3 hardening tasks for the LogiRest system. It addresses user session security via HttpOnly cookies, client fail-fast API initialization checks, active database health checks, an asynchronous notification outbox queue using BullMQ/Redis with a 7-day retention policy, and multi-stage container packaging templates for a unified development and production environment.

## Technical Context

**Language/Version**: TypeScript / Node.js v20 / NestJS v11 / Next.js v16  
**Primary Dependencies**: Prisma Client, BullMQ, Redis, Zod, Cookie-Parser, Next.js  
**Storage**: PostgreSQL (Primary Database), Redis (Queue Broker)  
**Testing**: Jest (Unit & Integration tests)  
**Target Platform**: Linux Container / Docker Runtime  
**Project Type**: Monorepo Web Service (NestJS API Backend & Next.js Frontend)  
**Performance Goals**: Cookie authentication latency <5ms, outbox queue ingestion <10ms, database health ping <10ms  
**Constraints**: HttpOnly/Secure/SameSite=Strict cookie enforcement, transactional atomicity for outbox log writes, multi-stage production packaging limits.  
**Scale/Scope**: 6 key files modified, 1 new Prisma model, 1 new outbox worker service, Docker files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Backend Authority**: Enforce session cookie issuance, outbox log transactional writes, and health checks on the NestJS backend API.
- [x] **Strict Separation of Concerns**: Keep UI logic and environment-checks in Next.js completely isolated from backend datastore and queues.
- [x] **DRY Schema Principle**: Reuse shared types and outbox structures in `packages/shared-types` between backend workers and API modules.
- [x] **Single DB Protocol**: Ensure all transactional outbox inserts share the configured primary database connection and runtime transactions.
- [x] **Pessimistic Locking / Transaction isolation**: Secure the outbox logging table and prevent duplicate worker pickups using transactional status updates.
- [x] **Immutable Auditing**: Enforce permanent tracking of failed outbox notifications and maintain a 7-day audit window for successful notifications.

## Project Structure

### Documentation (this feature)

```text
specs/025-observability-security-deployment-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 database design output
├── quickstart.md        # Phase 1 quickstart guide
└── contracts/
    └── endpoints.md     # Phase 1 API contracts (auth cookies & health endpoints)
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── migrations/      # Outbox log table migration
│   └── schema.prisma    # Added OutboxEvent model
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   └── auth.controller.ts     # Cookie delivery and RTR updates
│   │   ├── health/
│   │   │   └── health.controller.ts   # Database connectivity ping check
│   │   ├── outbox/
│   │   │   ├── outbox.service.ts      # Transactional outbox event writer
│   │   │   ├── outbox.worker.ts       # BullMQ processor for event dispatch
│   │   │   └── outbox-cleanup.job.ts  # [NEW] Cron job for 7-day logs cleanup
│   │   └── app.module.ts              # Redis / BullMQ module registration
apps/web/
├── src/
│   ├── lib/
│   │   └── client.ts                  # Fetch credentials propagation
│   └── app/
│       └── layout.tsx                 # Fail-fast initialization check
```

**Structure Decision**: Integrated backend outbox worker and cleanup cron job under `apps/api/src/modules/outbox/` and client credentials adjustments inside `apps/web/src/lib/` and `apps/web/src/app/`.

## Complexity Tracking

*No constitution check violations exist.*

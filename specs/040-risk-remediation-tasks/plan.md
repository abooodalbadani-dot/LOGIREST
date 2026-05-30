# Implementation Plan: LogiRest Risk Remediation Tasks

**Branch**: `feature/040-risk-remediation-tasks` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-risk-remediation-tasks/spec.md`

## Summary

This feature encompasses the design and implementation plans for the 20 engineering tasks (TASK-001 through TASK-020) identified during the security and data integrity audit of the LogiRest backend. The technical approach involves hardening authentication mechanisms, implementing automated offsite database backups, establishing robust pessimistic ledger locking transitions, recalculating running balances via PostgreSQL window functions, optimizing cost-ledger queries, and provisioning pre-configured Grafana metrics dashboards.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+  
**Primary Dependencies**: NestJS, Prisma Client, class-validator, Docker Compose, Prometheus, Grafana, custom HTTP Idempotency Guards.  
**Storage**: PostgreSQL (check constraints on quantities, index optimization).  
**Testing**: Jest, Supertest integration test suite.  
**Target Platform**: Linux Server (Docker-based deployment).  
**Project Type**: Monorepo Web Service / API.  
**Performance Goals**: Running balance movement history query execution time < 100ms; single set-based SQL queries for GRN reconciliation checking to eliminate N+1 roundtrips.  
**Constraints**: Serializable pessimistic database isolation for ledger postings, optimistic version locking for documents, zero-fallback mandatory environment configurations, strict NestJS controller/shared-types boundary boundaries.  
**Scale/Scope**: 20 risk remediation tasks spanning security, operational movement links, and monitoring subsystems.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Zero-Trust Monorepo (Concern Separation)**: API governs database actions and transaction isolations. Front-end is kept entirely separate from database operations. All shared types live in `packages/shared-types`. -> **PASSED**
- **Pessimistic Locking**: Ledgers utilize raw SQL `SELECT FOR UPDATE` inside `prisma.$transaction` at `Serializable` isolation to guarantee ledger balance integrity. -> **PASSED**
- **Optimistic Locking**: Non-ledger documents enforce `version` checks during Prisma updates. -> **PASSED**
- **IDOR Prevention Interceptor**: Warehouse and branch scopes are extracted and validated via request headers rather than payload trust. -> **PASSED**
- **Immutable Auditing**: Success audits include before and after snapshots logged securely. -> **PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/040-risk-remediation-tasks/
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output (Architecture Decisions)
├── data-model.md        # Phase 1 output (Prisma Schema Changes)
├── quickstart.md        # Phase 1 output (Dev Setup & Verification Commands)
├── contracts/           # Phase 1 output (API DTOs & Custom Decorators)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code

```text
apps/api/
├── prisma/
│   ├── schema.prisma                       # Database Schema Models
│   ├── seed.ts                             # Sequence document seeds
│   └── migrations/                         # SQL Database migrations
├── src/
│   ├── app.module.ts                       # App initialization config schemas
│   ├── main.ts                             # Swagger protection basic auth
│   ├── auth/
│   │   ├── auth.service.ts                 # Lockouts & DTO validation changes
│   │   ├── auth.controller.ts              # IP-address audit tracking
│   │   ├── jwt.strategy.ts                 # Startup validation without fallback keys
│   │   └── dto/
│   │       └── update-profile.dto.ts       # Secure class-validator profile payloads
│   ├── health/
│   │   └── health.controller.ts            # Backup freshness metrics endpoint
│   ├── jobs/
│   │   ├── expiry-alert.job.ts             # Lot auto-expiry status engine
│   │   ├── token-cleanup.job.ts            # Expired password token purging
│   │   └── token-cleanup.job.ts            
│   └── modules/
│       ├── alerts/
│       │   ├── alert.service.ts            # Webhook dispatcher
│       │   └── alert.module.ts             
│       ├── kitchen-requests/
│       │   └── kitchen-requests.service.ts # Document sequence and stock deduction links
│       ├── ledger/
│       │   └── reconciliation.job.ts       # Batch set-based SQL checks
│       └── operations/
│           ├── issues/
│           │   └── issues.controller.ts    # Idempotency decorations
│           ├── adjustments/
│           │   └── adjustments.controller.ts # Idempotency decorations
│           ├── transfer-post.service.ts    # WacService integration
│           └── wac.service.ts              # Weighted Average Cost calculations
docker-compose.yml                          # backup and Grafana container specifications
```

**Structure Decision**: Monorepo split between `apps/api` (NestJS Nest application backend), `apps/web` (Next.js client), and `packages/shared-types` (shared business validation schemas). All code files for risk remediation reside inside the `apps/api` and `packages/shared-types` boundaries, satisfying the separation architecture.

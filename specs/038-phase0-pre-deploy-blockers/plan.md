# Implementation Plan: Phase 0 — Pre-Deploy Blockers

**Branch**: `038-phase0-pre-deploy-blockers` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-phase0-pre-deploy-blockers/spec.md`

---

## Summary

This implementation plan details the architectural and engineering designs to resolve the **7 P0 Deploy Blockers (TASK-01 → TASK-07)** before any production release. We will implement database-level transaction atomicity for Token Rotation (optimistic locking), boot-time Zod validations to prevent weak secrets, self-healing Docker Compose restart policies, fine-grained health probes to avoid routing errors, idempotent database seeding decoupled from Docker container startup, explicit PostgreSQL lock timeouts, and a highly reliable shell-based database backup and restore system with a 30-day retention loop.

---

## Technical Context

* **Language/Version**: NestJS 10 (TypeScript 5.x, Node.js 20.x LTS), Next.js 16 (App Router), Docker Engine v24+, PostgreSQL 16
* **Primary Dependencies**: `prisma` (v5.x), `@nestjs/jwt`, `zod` (v3.x), `prom-client` (for metrics telemetry), `caddy` (v2.x reverse proxy), `bash` (v4.x+ on host)
* **Storage**: PostgreSQL (Primary Transactional), Redis (Cache & Token Session Store)
* **Testing**: Jest (Unit and Integration testing), Docker compose integration simulation, Curl endpoints validation
* **Target Platform**: Production Host running Linux (Ubuntu 22.04 LTS or newer) with Docker and Docker Compose
* **Project Type**: Monorepo Full-Stack Enterprise Application
* **Performance Goals**: Lock timeout ≤ 5s (fail-fast), health check response time < 100ms, container crash recovery within 10s
* **Constraints**: 100% startup crash if default secrets are detected in `production` mode; absolutely zero dirty database writes on failed token rotations
* **Scale/Scope**: Hardening of the entire container runtime network and baseline identity providers for 100% uptime safety

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Rule | Compliance Status | Implementation Strategy / Notes |
|:---|:---|:---|
| **Backend Authority** | ✅ Compliant | All security and secret validations (TASK-02) and transaction logic (TASK-01) reside strictly on the NestJS API. |
| **Strict Separation of Concerns** | ✅ Compliant | Changes are limited to `apps/api`, `docker-compose.yml`, and root deployment shell scripts. `apps/web` is entirely untouched. |
| **DRY Schema Principle** | ✅ Compliant | Zod validation schemas are declared and maintained under `apps/api/src/config/env.validation.ts` for startup configuration. |
| **Pessimistic Locking** | ✅ Compliant | Ledger writes in other sprints use `SELECT FOR UPDATE`. TASK-06 sets `lock_timeout=5000` to prevent indefinite waiting. |
| **Optimistic Locking** | ✅ Compliant | TASK-01 strictly enforces the `version` increment optimistic lock within a `prisma.$transaction` block. |
| **IDOR Prevention** | ✅ Compliant | API route isolation is maintained. Health checks use safe localhost-only paths. |
| **State Machine Parity** | ✅ Compliant | Seeding idempotency (TASK-05) guarantees database state integrity across runs. |

---

## Project Structure

### Documentation (this feature)

```text
specs/038-phase0-pre-deploy-blockers/
├── spec.md              # Feature Specification (Clarified)
├── plan.md              # This file (Implementation Plan)
├── research.md          # Phase 0 output (Technical design research & choices)
├── data-model.md        # Phase 1 output (Prisma and Zod schema updates)
├── quickstart.md        # Phase 1 output (Startup, testing, and operations)
└── contracts/           
    └── health-auth.md   # Phase 1 output (Health check and authentication contracts)
```

### Source Code (repository root)

```text
apps/api/
├── Dockerfile           # Modified (Seeding removed from CMD)
└── src/
    ├── auth/
    │   └── rtr.service.ts  # Modified (Atomic prisma.$transaction for rotation)
    └── config/
        └── env.validation.ts # Modified (Zod JWT secret production validation)

docker-compose.yml       # Modified (Added restart policies, health checks, environment parameters)
docker-compose.env.example # Modified (Added DATABASE_URL lock_timeout and JWT secret production notes)

scripts/
├── backup.sh            # NEW (Bash database dump + 30-day pruning)
└── restore.sh           # NEW (Interactive interactive restore script)

RUNBOOK.md               # Modified/Extended (Section on Backup, Restore, and Manual Seeding)
```

**Structure Decision**: A hybrid monorepo approach. Source modifications are located in `apps/api` to maintain backend authority. Platform infrastructure configs (`docker-compose.yml`, `.env.example`) live at the root, and maintenance scripts reside in `scripts/`.

---

## Complexity Tracking

*No violations of the Constitution or complex workarounds are required for this phase. Standard enterprise reliability patterns are strictly adhered to.*

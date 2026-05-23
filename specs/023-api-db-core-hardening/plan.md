# Implementation Plan: Database & API Core Hardening (Phase 1)

**Branch**: `023-api-db-core-hardening` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-api-db-core-hardening/spec.md`

## Summary

This feature addresses the baseline production readiness blocker (Phase 1) for the LogiRest backend. It resolves the PostgreSQL database schema drift (applying missing columns/indexes to `warehouse_locks` and creating the `notification_logs` table), integrates startup Zod environment validation with fail-fast crash signaling, implements missing reports endpoints under `/reports`, and sets up backend type checks/linting/tests in the GitHub Actions workflow.

## Technical Context

**Language/Version**: TypeScript / Node.js v20 / NestJS v10  
**Primary Dependencies**: Prisma Client, Zod, @nestjs/config, NestJS Core  
**Storage**: PostgreSQL  
**Testing**: Jest (Unit & Integration tests)  
**Target Platform**: Linux Container / Node Runtime  
**Project Type**: Monorepo Web Service (NestJS API Backend)  
**Performance Goals**: Startup validation under 1s, API response under 500ms for reports  
**Constraints**: Fail-fast on startup configuration and schema validation failures  
**Scale/Scope**: 4 key files modified/created, 1 migration generated, 6 reports routes  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Backend Authority**: Strict validation on NestJS configuration and schema migration checks before bootstrap.
- [x] **Strict Separation of Concerns**: Backend logic and DB queries kept entirely in `apps/api`.
- [x] **IDOR Prevention**: All `/reports` endpoints securely extract `warehouseId` using `@ActiveScope('warehouseId')` context injection. Open query params for `warehouseId` are ignored/blocked.
- [x] **Micro-Phasing**: Keeping compilation green, verifying types, and building before commits.

## Project Structure

### Documentation (this feature)

```text
specs/023-api-db-core-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 database design output
├── quickstart.md        # Phase 1 quickstart guide
└── contracts/
    └── endpoints.md     # Phase 1 contract details for /reports API
```

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── migrations/      # Delta migration folders
│   └── schema.prisma    # Existing schema containing lock & log models
├── src/
│   ├── config/
│   │   └── env.validation.ts  # [NEW] Environment variables validation
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma.service.ts  # Add startup migration checks
│   ├── modules/
│   │   └── reports/
│   │       ├── reports.controller.ts  # Add reporting endpoints
│   │       └── reports.controller.spec.ts # Add tests for new endpoints
│   └── app.module.ts    # Integrate config validation schema
.github/
└── workflows/
    └── test-build.yml   # CI workflows adding NestJS tests & type checks
```

**Structure Decision**: Standard NestJS structure within the `apps/api` project directory of the monorepo, keeping shared schemas in place and adhering to monorepo separation.

## Complexity Tracking

*No constitution check violations exist.*

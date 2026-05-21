# Implementation Plan: Shared Package Setup & Scaffolding

**Branch**: `014-shared-package-setup` | **Date**: 2026-05-21 | **Spec**: [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/014-shared-package-setup/spec.md)
**Input**: Feature specification from `/specs/014-shared-package-setup/spec.md`

## Summary

This feature encompasses Phase 1: Shared Package Setup & Scaffolding of the LogiRest monorepo. It establishes the central `@logirest/shared-types` workspace package containing shared types, Zod validation schemas, and workflow state machines, and initializes the NestJS backend API gateway with core security, CORS policies, authentication cookie parsers, standardized validation error parsing, and root health check routes. Direct compiler-free workspace resolution is set up to prevent build-latency and type drift between `apps/web` and `apps/api`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+, NestJS 10.x, Next.js 16+  
**Primary Dependencies**: `zod`, `cookie-parser`, `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `class-validator`, `class-transformer`  
**Storage**: N/A (this phase is pure package and workspace architecture setup, no DB tables are created/migrated)  
**Testing**: Jest (NestJS unit/integration tests)  
**Target Platform**: Local Node.js runtime and future Docker/containerized deployment  
**Project Type**: Monorepo Workspaces setup and API Service gateway scaffolding  
**Performance Goals**: Built-in validation pipeline latency under < 5ms per request; health check response under < 10ms.  
**Constraints**: Zero compilation steps for shared package types; absolute strictness on backend constraint authority.  
**Scale/Scope**: Initial workspace structure for 2 core packages/apps: `apps/api` and `packages/shared-types`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Backend Authority (Ax. I)**: Under this plan, all constraints are evaluated on the backend using NestJS global ValidationPipe. Frontend validations are purely advisory. (Status: PASS)
2. **Strict Separation of Concerns (Ax. I)**: `apps/web` handles only UI; `apps/api` governs database mutations/transaction gates; `packages/shared-types` houses core Zod validation schemas and workflow maps. (Status: PASS)
3. **DRY Schema Principle (Ax. I)**: The backend scaffold is designed to import Zod validation schemas and transition maps directly from the shared package, with zero copy-pasting of rules. (Status: PASS)
4. **Graphify First (Op. Rule II)**: We checked the graph and structure using Graphify reports. (Status: PASS)
5. **Micro-Phasing (Op. Rule II)**: We verify typecheck and build status for apps and packages dynamically. (Status: PASS)

## Project Structure

### Documentation (this feature)

```text
specs/014-shared-package-setup/
├── plan.md              # This file
├── research.md          # Design decisions and findings
├── data-model.md        # Document schemas and transitions placeholder
├── quickstart.md        # Monorepo setup and command execution steps
└── contracts/           # API interface schema validations
    └── validation-error.json # JSON error schema
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── health/
│   │       └── health.controller.ts
│   └── package.json
└── web/
    └── package.json

packages/
├── shared-types/
│   ├── src/
│   │   ├── index.ts
│   │   ├── schemas/
│   │   └── workflows/
│   └── package.json
└── contracts/
    └── package.json
```

**Structure Decision**: Option 2 (Web application with frontend `apps/web`, backend `apps/api`, and shareable types `packages/shared-types`).

## Complexity Tracking

*No constitution violations present. Standard modular monorepo setup.*

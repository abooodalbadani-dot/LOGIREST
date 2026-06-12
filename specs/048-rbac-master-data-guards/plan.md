# Implementation Plan: RBAC Master-Data Controller Guards

**Branch**: `048-rbac-master-data-guards` | **Date**: 2026-06-12 | **Spec**: [spec.md](file:///c:/kitchen-store-inventory-system/specs/048-rbac-master-data-guards/spec.md)
**Input**: Feature specification from `specs/048-rbac-master-data-guards/spec.md`

## Summary

This implementation plan focuses on securing the master-data reference layer against unauthorized mutations by replacing manual role checks with NestJS declarative `@Roles()` decorators and `RolesGuard` configuration, introducing structured 403 warn logging, and masking financial valuation columns (`unitCost` and `totalValue`) in the web client using the existing role visibility infrastructure.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 / React 18 / Next.js 16  
**Primary Dependencies**: NestJS (v10), Prisma Client, TanStack Table (v8)  
**Storage**: PostgreSQL / Prisma ORM  
**Testing**: Jest (Unit/E2E), React Testing Library  
**Target Platform**: Node.js API, Chrome/Firefox/Safari Browsers  
**Project Type**: Monorepo (NestJS API + Next.js Web App)  
**Performance Goals**: Guard overhead <5ms, UI Column filtering overhead <5ms  
**Constraints**: Zero-Trust security. No PII logged. Single atomic release deployment unit.  
**Scale/Scope**: 6 backend controllers, 1 frontend component, 1 auth guard.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: Backend remains the supreme authority. Roles are strictly validated at the controller level using `RolesGuard`.
- **Strict Separation of Concerns**: Monorepo roles check backend endpoints and database records; UI uses column masking for display preferences.
- **Declarative Guard Decorators**: Ad-hoc role verification inside controllers is fully removed. All role boundaries are defined declaratively via `@Roles(...)` decorators.
- **Security Warning Logging**: Unauthorized request rejections emit a structured warning message containing non-PII details (requesting role, method, path, timestamp) to prevent auditing blind spots.

## Project Structure

### Documentation (this feature)

```text
specs/048-rbac-master-data-guards/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
└── quickstart.md        # Phase 1 output (/speckit.plan command)
```

### Source Code (repository root)

```text
apps/api/src/
├── auth/
│   └── guards/
│       └── roles.guard.ts
└── modules/
    └── master-data/
        ├── barcodes/
        │   └── barcodes.controller.ts
        ├── departments/
        │   └── departments.controller.ts
        ├── fx-rates/
        │   └── fx-rates.controller.ts
        ├── items/
        │   └── items.controller.ts
        ├── units-of-measure/
        │   └── uom.controller.ts
        └── variance-reasons/
            └── variance-reasons.controller.ts

apps/web/src/
├── hooks/
│   └── useColumnVisibility.ts
└── features/
    └── reports/
        └── components/
            └── valuation-table.tsx
```

**Structure Decision**: Web application option. Consists of API backend controllers under `apps/api/src/modules/master-data/` and a frontend table component under `apps/web/src/features/reports/components/`.

## Complexity Tracking

*No violations of the Constitution Check.*

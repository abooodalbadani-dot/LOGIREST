# Implementation Plan: Sprint 0 Readiness Hardening

**Branch**: `030-sprint0-remediation` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/030-sprint0-remediation/spec.md`

## Summary
Implement the Sprint 0 Pre-Production Critical Blockers to ensure production clearance. This covers externalizing docker-compose secrets, enforcing non-negative inventory constraints at the database check level, fixing the SMTP unconfigured silent failure by propagating errors and triggering admin warnings, validating dynamic base currency on the dashboard and GRN components, removing search client mock demo records, wiring the live role lists endpoint to the UI, and building the full posted document void/reversal transaction workflow with offsetting stock and cost ledgers.

## Technical Context

**Language/Version**: TypeScript / Node.js v20+  
**Primary Dependencies**: NestJS (v10+), Next.js (v16.x), Prisma ORM (v5.x), Tailwind CSS (v3.4), Zod (v3.x)  
**Storage**: PostgreSQL (v15+)  
**Testing**: Jest for backend units/integrations, React Testing Library  
**Target Platform**: Docker-Compose production environment  
**Project Type**: Monorepo Web Application  
**Performance Goals**: Ledger void operation transactions completes in <30s; dashboard currency updates dynamically; roles query <1s.  
**Constraints**: Optimistic concurrency locks on document updates; pessimistic row-locking on ledger transactions; strictly zero logic leaks from backend to frontend.  
**Scale/Scope**: Affects 7 distinct pre-production critical areas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Phase Check**: Active phase is "Frontend Stabilization & Recovery" and "Backend Foundation". All tasks resolve critical blockers.
- **Architectural separation**: UI handles rendering; api handles validation and data changes. No raw SQL in frontend.
- **DRY schema rules**: All state transitions and role definitions are shared from `packages/shared-types`.
- **Ledger lock safety**: Reversal/void ledger entries will use safe nested SQL transactions.
- **Audit Trails**: Voiding records changes in `AuditLog` with serialized states and authenticated user references.

## Project Structure

### Documentation (this feature)

```text
specs/030-sprint0-remediation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/           # Phase 1 output
    └── void-endpoints.md # Void API endpoints contract
```

### Source Code Layout

```text
apps/api/src/
├── modules/
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   └── admin.service.ts
│   ├── operations/
│   │   ├── void.service.ts        # [NEW] Reversal/void ledger engine
│   │   └── void.controller.ts     # [NEW] Exposes void endpoints
│   ├── outbox/
│   │   ├── email.service.ts       # Return error on SMTP unconfigured
│   │   └── outbox.worker.ts       # Track fail and alert admin
│   └── search/
│       └── search.controller.ts   # Live search querying
├── app.module.ts                  # Rate limiting and global Csrf/Auth config

apps/web/src/
├── app/[locale]/(app)/
│   ├── dashboard/
│   │   ├── DashboardClient.tsx    # Currency dynamically read
│   │   └── StoreManagerDashboard.tsx
│   ├── search/
│   │   └── SearchClient.tsx       # Fetches live search API
│   └── admin/
│       └── roles/                 # Connected to real API hook
├── features/
│   └── admin/
│       └── hooks/
│           └── useAdminRoles.ts   # Live roles hook (remove mock data)

packages/shared-types/src/
└── workflow/                      # Add VOIDED status and transition capabilities
```

**Structure Decision**: Monorepo split between `apps/api` (NestJS backend), `apps/web` (Next.js frontend), and `packages/shared-types` (common schemas). Reversal/void endpoints are centralized in a new Operations submodule on the backend.

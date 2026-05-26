# Implementation Plan: Sprint 1 — High-Priority Hardening

**Branch**: `032-sprint-1-remediation` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/032-sprint-1-remediation/spec.md`

## Summary
Implement high-priority production hardening across the database, backend services, and admin UI. This sprint focuses on securing sequential document numbering with composite unique DB-level constraints, building the SMTP Admin Settings UI (with the send test email capability), preventing zero-cost Adjustment IN values to protect WAC integrity, tuning NestJS throttles to allow barcode scans while protecting authentication endpoints, verifying and applying global CsrfGuard middleware, exposing WAC History and Lot Traceability report pages inside the Reports Hub, optimizing the reconciliation job using batch freeze operations to prevent O(N) database transactions, and replacing memory-intensive report exports with safe streamed downloads capped at 50,000 rows.

## Technical Context

**Language/Version**: TypeScript / Node.js v20+  
**Primary Dependencies**: NestJS (v10+), Next.js (v16.x), Prisma ORM (v5.x), Tailwind CSS (v3.4), Zod (v3.x), ExcelJS  
**Storage**: PostgreSQL (v15+), Redis (for alert debouncing and queues)  
**Testing**: Jest (backend unit/integration tests), React Testing Library (frontend UI tests)  
**Target Platform**: Docker-Compose production environment  
**Project Type**: Monorepo Web Application  
**Performance Goals**: Reconciliation batch freeze < 10s; Excel exports memory overhead < 50MB; API queries < 500ms.  
**Constraints**: Optimistic locks on documents; strict transactional scope isolation; 50,000 max row limit for reports.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Active Phase Check**: Compiles with "Frontend Stabilization & Recovery" and "Backend Foundation". All tasks harden the system against data-integrity risks.
- **Architectural separation**: Frontend code restricted strictly to layout structure and user interactions. No direct database or NestJS dependencies.
- **Ledger lock safety**: WAC cost-recalculation logic preserved in api services; adjustment check prevents 0 WAC state.
- **Audit Trails**: Actions like unfreezing, system settings changes, and document sequencing remain logged and traceable.

## Project Structure

### Documentation (this feature)

```text
specs/032-sprint-1-remediation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/           # Phase 1 output (API endpoints)
```

### Source Code Layout

```text
apps/api/src/
├── app.module.ts                  # Global throttler config, CsrfGuard providers
├── main.ts                        # Global Csrf registration/configuration
├── modules/
│   ├── admin/
│   │   ├── admin.controller.ts    # Settings endpoints
│   │   └── admin.service.ts       # Settings and outbox service
│   ├── ledger/
│   │   └── reconciliation.job.ts  # Optimizing N+1 updates to batch freeze
│   ├── operations/
│   │   └── adjustment-post.service.ts # Validation on Adjustment IN costs
│   └── reports/
│       ├── reports.service.ts     # [NEW] Reporting database operations
│       └── reports.controller.ts  # Exposes reports list/export
├── jobs/
│   └── low-stock-alert.job.ts     # Redis-backed alert debouncing

apps/web/src/
├── app/[locale]/(app)/
│   ├── admin/
│   │   └── settings/              # SMTP configuration UI
│   └── reports/
│       ├── ReportsHubClient.tsx   # Added WAC History and Lot Trace cards
│       ├── wac-history/           # [NEW] WAC History report page
│       └── lot-trace/             # [NEW] Lot Traceability report page
├── lib/
│   └── api-client.ts              # CSRF Header inclusion for non-GET requests
```

**Structure Decision**: Monorepo layout matching the codebase. Reporting queries are extracted from the controller into a new `ReportsService` inside the api reporting module.

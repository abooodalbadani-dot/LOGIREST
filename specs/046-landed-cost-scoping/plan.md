# Implementation Plan: Landed Cost & Scoping (Sprint 3)

**Branch**: `046-landed-cost-scoping` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/046-landed-cost-scoping/spec.md`

## Summary

Build the Landed Cost Allocation module, secure reporting boundaries, and localize currency dynamically across the LogiRest monorepo. The core deliverables are:
1. **Landed Cost Allocation Module**: Enable finance users to pool import fees (freight, duties, customs, handling) across multiple Goods Received Notes (GRN) and distribute them pro-rata (by Value, Quantity, or Weight/Volume). Recalculations are queued asynchronously to calculate Weighted Average Cost (WAC) changes on affected lots within open financial periods under `Serializable` transaction isolation.
2. **Warehouse Scope Filtering**: Harden search and reporting endpoints to inject warehouse boundaries based on the user's active session, allowing administrators and central directors (`ADMIN`, `PROCUREMENT_DIR`) to bypass these checks automatically.
3. **Dynamic Currency Display**: Replace hardcoded currency symbols/labels on the dashboard and reporting pages with dynamic properties resolved from active global settings.
4. **Admin Role Assignment UI**: Implement a read-only permissions and static capabilities viewer and wire the `PUT /api/admin/users/:id/role` endpoint to enable administrators to update user role mappings securely.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20.x  
**Primary Dependencies**: NestJS 10.x, Next.js 16 (App Router), Prisma 5.x, BullMQ (for asynchronous background queues), TailwindCSS  
**Storage**: PostgreSQL (Prisma ORM)  
**Testing**: Jest (API unit and integration testing), Playwright (Client and workflow E2E testing)  
**Target Platform**: Linux Server / Web Browsers  
**Project Type**: Monorepo Web Application  
**Performance Goals**: 
- Background WAC recalculation jobs completed in under 5 seconds for normal volumes.
- Warehouse scope filtering interceptor overhead < 10ms.
- Dashboard load times and currency resolution < 1 second.
**Constraints**: 
- Strict database transaction isolation (`Serializable`) and row locking (`SELECT FOR UPDATE`) on lots/items during costing updates.
- Landed cost allocations blocked for closed financial periods.
- Restricting roles assignment and user list endpoints strictly to the static `ADMIN` role to prevent privilege escalation.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend Authority**: `apps/api` remains the supreme authority for data mutations, scoping filters, and transactional integrity. Frontend guards are advisory. (PASSED)
- **Pessimistic Locking**: Bulk costing calculations and revaluations on WAC utilize raw SQL `SELECT FOR UPDATE` on affected lots/items inside serialized transactions to guarantee balance consistency. (PASSED)
- **No Global Soft-Delete Filtering**: Custom listing queries apply `isActive` filters at the query level instead of using global Prisma middleware, protecting historical ledger joins. (PASSED)
- **Zero-Trust Scope Enforcement**: Interceptors dynamically load user-assigned warehouse bounds and block cross-warehouse mutations. Administrators and Central Procurement roles bypass this automatically. (PASSED)

---

## Project Structure

### Documentation (this feature)

```text
specs/046-landed-cost-scoping/
├── plan.md              # This file
├── research.md          # Phase 0 output: decisions and rationales
├── data-model.md        # Phase 1 output: database schema additions and lot state maps
├── quickstart.md        # Phase 1 output: developer onboarding and validation guide
└── contracts/
    └── api-endpoints.md # Phase 1 output: API contract routes and Zod validation maps
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/
│   ├── procurement/
│   │   └── landed-cost/ # Landed cost business controllers and background queues
│   ├── search/          # Warehouse scope-filtered search handlers
│   └── admin/           # Admin roles list and user role mapping endpoints
└── interceptors/        # Scoping interceptors enforcing physical boundaries

apps/web/src/
├── app/[locale]/(app)/
│   ├── (procurement)/
│   │   └── landed-cost/ # Landed Cost allocation wizard UI and tables
│   ├── dashboard/       # Dashboard client dynamically resolving currency settings
│   └── admin/
│       └── roles/       # Read-only Roles matrix & admin user role assigner
└── components/          # Shared components and visual lock banners

packages/shared-types/src/
└── zod/
    └── landed-cost.ts   # Shared schema schemas for landed cost allocations
```

**Structure Decision**: Multi-project Monorepo structure. Concisely separates concerns across backend services (`apps/api`), frontend pages (`apps/web`), and shared typing and contract validation packages (`packages/shared-types`).

---

## Complexity Tracking

*No gates violated. Section is marked N/A.*

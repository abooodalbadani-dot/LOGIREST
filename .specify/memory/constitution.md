<!-- 
Sync Impact Report
- Version change: 2.0.0 → 3.0.0
- List of modified principles:
  - Added ARCHITECTURAL AXIOMS (The Zero-Trust Monorepo).
  - Added AI AGENT OPERATIONAL RULES (OpenCode Directives).
  - Added DATABASE & STATE PROTOCOLS (InsForge & Prisma).
  - Added SECURITY & WORKFLOW ENFORCEMENT.
- Added sections:
  - ARCHITECTURAL AXIOMS (The Zero-Trust Monorepo)
  - AI AGENT OPERATIONAL RULES (OpenCode Directives)
  - DATABASE & STATE PROTOCOLS (InsForge & Prisma)
  - SECURITY & WORKFLOW ENFORCEMENT
- Removed sections: N/A
- Templates requiring updates: ✅ None required (guidelines are fully in sync and compiled).
- Follow-up TODOs: N/A
-->
# LogiRest Constitution & Development Guidelines

## Active Phase: Frontend Stabilization & Recovery

*Ratified for immediate execution.*

### 1. Current Phase — What Are We Doing Now?

We are in: **Recovery & Stabilization Execution Phase**
We are NOT in: Feature development, UI enhancement, Backend integration, Large-scale refactoring, or Architecture redesign. This phase is strictly about stability and integrity.

### 2. Objective of This Phase

The goal is to eliminate all frontend instability before moving to backend development.
- Zero broken pages
- Zero missing translation keys
- Zero unsafe redirects
- Zero unstructured mutations
- Zero orphan routes
- Zero console errors
- Zero broken workflows
The frontend must be operationally clean and production-safe.

### 3. What We Will NOT Do in This Phase

- No Phase C refactors
- No UI redesign
- No performance optimizations unrelated to bugs
- No architectural experimentation
- No backend work
- No new features
Anything outside stabilization is out of scope.

### 4. Mandatory Execution Order

The work must proceed in the following strict order:

**Step 1 — Route & Navigation Integrity**
- No orphan routes
- No unreachable pages
- Every route must have a valid entry point
- Every page must have a Back navigation
- Every page must have a logical CTA (Create/Edit/etc.)
- All routes must respect layout authentication

**Step 2 — Mutation & Redirect Compliance**
- No `router.push` outside `onSuccess`
- No mutation without `version` (where applicable)
- No improper mixing of `mutate` and `mutateAsync`
- No silent `try/catch`
- No eager navigation before server confirmation
- No bypass of Conflict Layer

**Step 3 — Guard Integrity**
- All forms using `useForm` must implement `UnsavedChangesGuard`
- AutoSave screens must explicitly opt out of guard
- Dirty state must reset correctly after successful save
- No false-positive dirty state traps

**Step 4 — i18n Parity & Hardening**
- `en.json` and `ar.json` must have 1:1 structural parity
- No raw UI text in JSX
- No placeholder translation values
- No namespace drift
- No missing keys

**Step 5 — UX Completeness & Workflow Closure**
- Every List page has a Create button
- Every Detail page has Edit and Back buttons
- Every destructive action requires confirmation
- Every locked document displays a Lock Banner
- No dead-end workflow states

**Step 6 — Runtime Cleanliness**
- Zero React key warnings
- Zero hydration mismatch warnings
- Zero unhandled promise rejections
- Conflict Layer verified through concurrency simulation
- No console errors during critical flows

### 5. Definition of “Done”

This phase is considered complete only when:
- Production Readiness Score ≥ 95
- 0 Critical issues
- 0 High issues
- All workflows tested manually
- All recovery phases closed formally

### 6. What Happens After This Phase?

Only after stabilization is complete: We begin Backend Foundation work. Not before.

### 7. Phase Rule

If new issues are discovered: Do not apply random patches. Classify them under the correct recovery step. Fix them systematically. No uncontrolled changes.

### 8. Leadership Principle

We do not move fast. We move correctly. And we do not exit this phase until it is fully closed.

---

## Architectural Axioms & Directives

### I. ARCHITECTURAL AXIOMS (The Zero-Trust Monorepo)

* **Backend Authority**: The NestJS backend (`apps/api`) is the supreme authority. Frontend validation is advisory only. Every constraint, business rule, and permission must be strictly enforced on the server.
* **Strict Separation of Concerns**: 
  * `apps/web` (Next.js 16) is restricted to UI rendering, layout structure, and user interaction. No direct database queries, no raw SQL, and no NestJS dependencies are allowed.
  * `apps/api` (NestJS) governs database mutations, transaction isolation, security guards, and locking systems.
  * `packages/shared-types` contains unified Zod schemas, types, and workflow transition maps.
* **DRY Schema Principle**: The NestJS API MUST import Zod validation schemas and state transition maps directly from `packages/shared-types`. Manual duplication of validation logic or type definitions is strictly FORBIDDEN.

### II. AI AGENT OPERATIONAL RULES (OpenCode Directives)

* **Graphify First**: Agents MUST consult `graph.json` and `GRAPH_REPORT.md` in `graphify-out/` to resolve imports and relationships before examining the codebase. Blind directory searches or file-structure guessing is strictly FORBIDDEN.
* **SpecKit Adherence**: Agents MUST execute tasks exactly as defined in the approved SpecKit plans. Unauthorized refactoring, code formatting updates, or feature creep are FORBIDDEN.
* **Micro-Phasing & Quality Gates**: Code must be kept in a compilation-safe, runnable state at all times. Every completed task MUST end with build and typecheck validations (`npm run build --filter=api` and `npm run typecheck --filter=web`).

### III. DATABASE & STATE PROTOCOLS (InsForge & Prisma)

* **Single DB Protocol**: All operations MUST use the configured database (`DATABASE_URL`). Testing REQUIRE updating `prisma/seed.ts`. Reset the database using `npx prisma migrate reset --force` between test cycles. Direct database tampering is FORBIDDEN.
* **Pessimistic Locking**: All ledger mutations (GRN, Issue, Transfer, Adjustments) MUST use raw SQL `SELECT FOR UPDATE` on lot and item rows within a `prisma.$transaction` configured with `Serializable` isolation level.
* **Optimistic Locking**: All non-ledger document updates (PR, PO, etc.) MUST include a `version` check in the Prisma update `where` clause to prevent concurrency overwrite bugs.

### IV. SECURITY & WORKFLOW ENFORCEMENT

* **IDOR Prevention**: Target scopes (`warehouseId`, `branchId`) MUST be resolved via request headers (`x-warehouse-id`, `x-branch-id`) and verified against `UserWarehouseScope` via a NestJS Interceptor. Payload-provided scopes MUST NOT be trusted.
* **State Machine Parity**: Status transitions MUST be checked by a backend `WorkflowStateGuard` that queries the database status of the document and cross-references it with `transitionMapV2` and `role-capabilities.ts`.
* **Immutable Auditing**: Every critical mutation MUST insert an immutable `AuditLog` record containing `beforeStateJson` and `afterStateJson` snapshots, along with authenticated user credentials.

---

## Core Principles

### I. Product Value & Operational Speed

LogiRest exists to streamline multi-branch restaurant inventory. Every screen must prioritize operational efficiency:
- Scanning-first: Actionable fields must be reachable via barcode wedge without mouse/touch interaction.
- Low-latency feedback: Visual confirmation of scans and posts must occur within 100ms.
- Safety-first: High-stakes actions (posting) require explicit confirmation to prevent user error.

### II. Auditability & Irreversibility

Inventory accuracy is governed by a ledger-based approach:
- Posted documents are read-only; zero editing or deletion allowed once finalized.
- All corrections must use approved Adjustment documents with a required audit reason.
- Every state change must be timestamped and traced to the specific user/role.

### III. Safety & Waste Reduction

Protecting the supply chain from stock-outs and spoilage:
- FEFO (First-Expired, First-Out) is the non-negotiable issuance default.
- Expired items are blocked by default; overrides require administrative privileges and a logged reason.
- Real-time stocktake locks: Movement is prohibited in a warehouse during an active stocktake snapshot to prevent ghost inventory.

### IV. Cultural & Visual Integrity

LogiRest is an Arabic-first professional tool:
- RTL-first: All layouts, breadcrumbs, and steppers must prioritize Arabic reading patterns.
- Zero mixed-dir controls: Never mix Arabic and English in the same UI field or button.
- Operational Nocturne Aesthetic: High-density, tonal-shift UI using neon cyan/amber/error accents for high visibility in kitchen/warehouse environments.

---

## Governance

- The Constitution is the "Source of Truth" for all architectural and product decisions.
- Amendments require a MAJOR/MINOR version bump and update to the Sync Impact Report.
- Use `CODEBASE.md` for runtime implementation details and dependency maps.

**Version**: 3.0.0 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-21

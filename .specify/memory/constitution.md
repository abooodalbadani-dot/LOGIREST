<!-- 
Sync Impact Report
- Version change: 1.1.0 → 2.0.0
- List of modified principles:
  - Added new mandatory phase override (Frontend Stabilization & Recovery).
- Added sections: Active Phase: Frontend Stabilization & Recovery (covering Objectives, Strict Exclusions, Mandatory Execution Order, Definition of Done, and Phase Rules).
- Removed sections: N/A
- Templates requiring updates: ✅ None required (the phase instructions act as runtime governance for all agents).
- Follow-up TODOs: N/A
-->
# LogiRest Constitution

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

## UX/UI Principles
1. **RTL-first Design**: Mirror components (arrows, sidebars, steppers) correctly for Arabic.
2. **Barcode-First UX**: Ensure USB wedge and mobile camera input are primary input methods.
3. **Irreversible Action Alerts**: Use `PostConfirmDialog` with specific warnings for all POST movements.
4. **Consistency**: Use `Operational Nocturne` tokens; avoid ad-hoc Tailwind colors.
5. **Accessibility**: Target WCAG AA compliance with a focus on high-contrast and RTL screen readers.

## Architecture Principles
1. **RSC vs Client Boundaries**: Prefer Server Components for data fetching; use Client Components for scanning and forms.
2. **Modularity**: Business logic (FEFO, scanning) must live in `src/features` or specialized hooks, not Page components.
3. **Dependency Rules**: Primitives in `src/components/ui` must not depend on business logic; shared components in `src/components/shared` handle common inventory patterns.
4. **Type Safety**: Zero `any` policy; Zod validation required for all API response boundaries.

## Data/Workflow Principles
1. **State Management**: Use TanStack Query for server state; avoid global state for document data (prefer URL/Context).
2. **Posting Rules**: GRN captures FX at post; Stocktake locks movement at start.
3. **Idempotency**: All write operations must include an items-level check or UUID to prevent double-posting.
4. **Permissions**: Use `<ProtectedRoute>` and `usePermission()` to gate UI elements before they are rendered.

## Security & Compliance
1. **Audit Logging**: Every POST or change must be accompanied by an audit entry in the database (client-side triggers).
2. **Least Privilege**: Users only see data scoped to their assigned Branch/Warehouse/Department.
3. **Error Handling**: Mask sensitive API errors; map status codes to localized i18n messages.

## Code Standards
1. **Naming**: CamelCase for components/hooks, kebab-case for files and routes.
2. **Localization**: Zero hard-coded strings. All text must use `next-intl` keys.
3. **Folders**: Follow `src/` modular structure defined in `Front_end_execution_tasks.md`.
4. **i18n rules**: Arabic is `ar` (default), English is `en`. Numerical values are `dir="ltr"`.

## Testing & Quality Gates
- **Unit Tests**: Mandatory for logic (FEFO allocation, FX calculation).
- **E2E Tests**: Critical for "Happy Paths" (Complete a GRN, Submit a Stocktake).
- **DoD Checklist**: PRs are not merged if they fail RTL audit or have lint errors (`tsc --noEmit`).

## Change Management
- Token updates require a designer review and version bump in `FE-DS`.
- Breaking changes to shared components require updating all dependent screens in the same PR.

## Governance
- The Constitution is the "Source of Truth" for all architectural and product decisions.
- Amendments require a MAJOR/MINOR version bump and update to the Sync Impact Report.
- Use `CODEBASE.md` for runtime implementation details and dependency maps.

### How to verify compliance:
- [ ] Does it work in RTL?
- [ ] Is it readable in Dark Mode (Nocturne)?
- [ ] Is every string translated?
- [ ] Is the document POST state handled correctly?
- [ ] Are numeric values LTR?
- [ ] Does the change strictly align with the current Stabilization Phase?

**Version**: 2.0.0 | **Ratified**: 2026-04-18 | **Last Amended**: 2026-05-09

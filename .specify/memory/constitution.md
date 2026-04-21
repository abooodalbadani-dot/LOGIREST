<!-- 
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- List of modified principles:
  - High Performance → Operational Speed & FEFO
  - Transparency → Auditability & Safety
  - Scalability → Waste Reduction
- Added sections: UX/UI Principles, Architecture Principles, Data/Workflow Principles, Security & Compliance, Code Standards, Testing & Quality Gates, Change Management.
- Templates requiring updates: ✅ status (v1.1.0)
-->
# LogiRest Constitution

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
- Amendments require a MINOR version bump and update to the Sync Impact Report.
- Use `CODEBASE.md` for runtime implementation details and dependency maps.

### How to verify compliance:
- [ ] Does it work in RTL?
- [ ] Is it readable in Dark Mode (Nocturne)?
- [ ] Is every string translated?
- [ ] Is the document POST state handled correctly?
- [ ] Are numeric values LTR?

**Version**: 1.1.0 | **Ratified**: 2026-04-18 | **Last Amended**: 2026-04-19

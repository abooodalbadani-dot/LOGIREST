# Implementation Plan: Route & Navigation Integrity Audit

**Branch**: `003-route-integrity-audit` | **Date**: 2026-05-09 | **Spec**: [spec.md](file:///E:/Kitchen%E2%80%91Store%20Inventory%20System/specs/003-route-integrity-audit/spec.md)
**Input**: Feature specification from `/specs/003-route-integrity-audit/spec.md`

## Summary

The primary requirement is to ensure 100% route reachability and security compliance across the Kitchen-Store Inventory System. The technical approach involves creating a Python-based static analysis script to extract routes from `apps/web/src/app`, map navigation references (Link/router.push), and verify authentication guards against the `proxy.ts` middleware configuration.

## Technical Context

**Language/Version**: TypeScript (Next.js 16), Python 3.11 (Audit Script)
**Primary Dependencies**: `next-intl`, `lucide-react`
**Storage**: Markdown Report (audit-report.md)
**Testing**: Manual Audit Review
**Target Platform**: Web
**Project Type**: Web Application (Recovery Audit)
**Performance Goals**: N/A
**Constraints**: Zero orphan routes, Zero broken pages
**Scale/Scope**: ~100 routes in `apps/web/src/app`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **RTL-first**: Are navigation paths logical for Arabic reading patterns?
- [ ] **Security**: Are all non-public routes protected by `proxy.ts`?
- [ ] **Integrity**: Is there an entry point for every page?
- [ ] **Stability**: Does this audit detect "dead-end" workflow states?

## Project Structure

### Documentation (this feature)

```text
specs/003-route-integrity-audit/
├── spec.md              # Requirement specification
├── plan.md              # This file
├── research.md          # Route extraction methodology
├── data-model.md        # Audit Report Schema
├── quickstart.md        # How to run the audit
└── audit-report.md      # Final Audit Output
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/             # Routing structure
│   ├── proxy.ts         # Authentication Middleware
│   └── components/      # Navigation components
└── scripts/
    └── audit-routes.py  # Audit Script
55: ├── audit/               # Audit data
56: │   ├── external-entry-points.json
57: │   └── feature-gated-routes.json
```

**Structure Decision**: The audit will be performed as a separate utility script within `apps/web/scripts` to avoid polluting the production bundle, generating a report in the feature specification directory.

## Route Classification Rules

### 1. External Entry Points
Routes used in emails, deep links, or callbacks that are not directly linked in the UI must be manually whitelisted.
- **Source of Truth**: `apps/web/audit/external-entry-points.json`
- **Criteria**: Any route not appearing in Sidebar/Link/router.push but used externally.

### 2. Feature-Gated Routes
Routes that are live in the filesystem but hidden behind feature flags.
- **Requirement**: Must have `// @feature-flag: <name>` comment at the top of the page file.
- **Source of Truth**: `apps/web/audit/feature-gated-routes.json`
- **Status**: Classified as `Planned / Hidden (Feature-Gated)`, not Orphan.

### 3. Internal / Debug Routes
Routes intended for developer use only.
- **Source of Truth**: `apps/web/audit/internal-tooling.json`
- **Requirement**: Must be blocked in `proxy.ts` when `NODE_ENV === 'production'`.
- **Status**: Classified as `Internal Tooling`.

## Route Classification Matrix (Final)

| Category | Condition | Resulting Status |
| :--- | :--- | :--- |
| **Standard** | Found on disk AND referenced in UI | `Active` |
| **External** | Found on disk AND in `external-entry-points.json` | `External Entry Point` |
| **Internal** | Found on disk AND in `internal-tooling.json` | `Internal Tooling` |
| **Feature** | Found on disk AND in `feature-gated-routes.json` | `Feature-Gated` |
| **Orphan** | Found on disk AND NOT referenced OR whitelisted | `Orphan` |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

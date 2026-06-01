# Implementation Plan: Sprint 2: Automated Validation & UI Integration

**Branch**: `045-validation-ui-integration` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/045-validation-ui-integration/spec.md`

## Summary

This feature implements the core inventory balance validation engine (`ENG-NEW-001`) to prevent silent stock discrepancies and ensure physical-to-ledger auditability. It integrates three essential user interface capabilities: adding the "Confirm Receipt" transition to the Transfer Viewer component (`ENG-0005`), completing the Inventory Issue submission action and hook (`ENG-0006`), and enforcing read-only locking state guards on approved procurement forms (`ENG-0019`). 

Our technical approach ensures the validation engine runs asynchronously at 1:00 AM using NestJS Cron, utilizing highly optimized PostgreSQL aggregation queries to audit physical records without lock contention. State-changing UI buttons are directly wired to the backend workflow state machines, fully respecting serializable transactional locking and version controls.

## Technical Context

**Language/Version**: TypeScript / Node.js 20 / Next.js 16 (React 19) / NestJS 10  
**Primary Dependencies**: `@nestjs/schedule` (for validation scheduler), `@tanstack/react-query` (for UI data fetching), `zod` (validation schemas)  
**Storage**: PostgreSQL (Prisma ORM)  
**Testing**: Jest (unit & backend integration testing), Playwright (end-to-end frontend interaction testing)  
**Target Platform**: Linux Server / Modern Web Browsers  
**Project Type**: Monorepo Web Application (NestJS API + Next.js client)  
**Performance Goals**: Daily ledger validation completes in <30 seconds system-wide; UI state changes update the view in <2 seconds.  
**Constraints**: Invariant validation scans must run under read-committed isolation to avoid lock contention; mutations must run in serializable transaction blocks with pessimistic locks (`SELECT FOR UPDATE`).  
**Scale/Scope**: Scales to validate thousands of transaction rows across multiple lots and branches.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The proposed architecture is fully compliant with the **LogiRest Constitution (v3.0.0)** active recovery phase:
1. **Backend Authority**: Validation logic, locking, and status transitions reside strictly on the NestJS backend (`apps/api`). The UI only displays state and triggers transitions.
2. **Pessimistic Locking**: Receipt and issue updates will acquire locks (`SELECT FOR UPDATE`) on lots and items inside serializable transactions to prevent concurrency drifts.
3. **State Machine Parity**: Status updates (transfers and issues) strictly leverage the backend `WorkflowStateGuard` and the `transitionMapV2` definitions imported from `packages/shared-types`.
4. **DRY Schemas**: Reuse shared types and validators from `packages/shared-types`.
5. **Visual Parity**: Keep RTL-first layouts intact; forms render lock status banners on read-only screens.

## Project Structure

### Documentation (this feature)

```text
specs/045-validation-ui-integration/
├── plan.md              # This file
├── research.md          # Phase 0: Design decisions & rationales
├── data-model.md        # Phase 1: Database schemas & entities
├── quickstart.md        # Phase 1: Testing & local setups
└── contracts/           # Phase 1: API endpoint payloads & contracts
    └── contracts.md     # Unified API contract definitions
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/
│   ├── admin/
│   │   ├── inventory-validation.service.ts     # Validation engine
│   │   └── inventory-validation.controller.ts    # On-demand admin API
│   ├── operations/
│   │   ├── transfers/
│   │   │   └── transfer-post.service.ts        # Receive transaction logic
│   │   └── issues/
│   │       └── issue-post.service.ts           # Issue submission logic
│   └── ledger/

apps/web/src/
├── features/
│   ├── operations/
│   │   ├── components/
│   │   │   ├── transfer-viewer.tsx             # Confirm Receipt UI
│   │   │   └── issue-form.tsx                  # Issue Submit UI
│   │   └── hooks/
│   │       └── useSubmitIssue.ts               # Issue submit query hook
│   └── procurement/
│       └── components/
│           ├── pr-form.tsx                     # Non-draft read-only lock
│           └── po-form.tsx                     # Non-draft read-only lock
```

**Structure Decision**: Zero-trust monorepo architecture. API routes reside in the `api` app; all UI rendering, query hooks, and presentation state reside in `web`. Common schemas are imported from the shared types package.

## Complexity Tracking

> **No violations of the Constitution identified.**

# Tasks: Guard Integrity Audit (Phase 4)

## Summary

This task list organizes the implementation of the **Phase 4: Guard Integrity Audit** for the Kitchen-Store Inventory System. The goal is to ensure 100% form protection across the application while eliminating "trapped" UI states. Work is divided into audit, foundational hardening, and user-story-based implementation phases.

## Dependencies
- **[US1]** depends on **Phase 2 (Foundational)**.
- **[US2]** can be executed partially in parallel with **[US1]** but requires completion of **[US1]** for full verification.

## Implementation Strategy
- **Audit-First**: Identify all gaps before applying fixes.
- **Standardization**: HARDEN the shared provider before rolling out to individual forms.
- **Incremental Verification**: Use Playwright to verify each user story independently.

## Phase 1: Setup

- [X] T001 Perform comprehensive audit of `apps/web/src` to identify all `useForm` calls and existing `UnsavedChangesGuard` usages

## Phase 2: Foundational (Blocking)

- [X] T002 Verify and harden `UnsavedChangesProvider` implementation to ensure it intercepts `router.push` and `popstate` correctly in `apps/web/src/lib/unsaved-changes/UnsavedChangesProvider.tsx`
- [X] T003 [P] Ensure `UnsavedChangesDialog` uses strict modal focus trap (FR-009) in `apps/web/src/lib/unsaved-changes/UnsavedChangesDialog.tsx`
- [X] T004 [P] Standardize global warning message (FR-008) in `apps/web/messages/en.json` and `apps/web/messages/ar.json`

## Phase 3: [US1] Prevent Accidental Data Loss (P1)
**Goal**: 100% coverage of interactive forms.

- [X] T005 [P] [US1] Apply `useUnsavedChangesGuard` to all Master Data forms identified in T001 in `apps/web/src/app/[locale]/(app)/master-data/`
- [X] T006 [P] [US1] Apply `useUnsavedChangesGuard` to all Operations forms identified in T001 in `apps/web/src/app/[locale]/(app)/(operations)/`
- [X] T007 [P] [US1] Apply `useUnsavedChangesGuard` to all Procurement forms identified in T001 in `apps/web/src/app/[locale]/(app)/(procurement)/`
- [X] T008 [US1] Verify that clicking sidebar links or browser back while a form is dirty triggers the dialog in any of the above paths

## Phase 4: [US2] Avoid "Trapped" Form States (P2)
**Goal**: Zero false positives and clean exit paths.

- [X] T009 [US2] Audit all mutation `onSuccess` handlers to ensure `form.reset()` is called immediately after server confirmation in `apps/web/src/`
- [X] T010 [P] [US2] Implement `skipGuard: true` for all explicit "Discard" and "Cancel" buttons in audited forms per FR-007 in `apps/web/src/`
- [X] T011 [US2] Verify that forms with failed server-side validation STILL protect data unless explicitly discarded per US2 Acceptance Scenario 2

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T012 Perform RTL visual audit of the confirmation dialog in both Arabic and English
- [X] T013 Verify accessibility (tab order and focus trap) for the confirmation dialog
- [x] T014 Final E2E sweep to confirm SC-001 (100% coverage) and SC-003 (No trapped states)

## Phase 6: Refinement & Bug Fixes

- [x] T015 Fix reference error in `TemplateEditorClient.tsx` (Hook lifecycle order)
- [x] [P] T016 Standardize `onCancel` skip-guard logic across all Master Data and Operations forms
- [x] [P] T017 Ensure `form.reset()` is consistently called after successful mutations to prevent "ghost" dirty state

## Parallel Execution Examples

### Parallel Track A: Master Data Audit
- T005 [US1] Apply to Master Data
- T010 [US2] Add `skipGuard` to Master Data Cancel buttons

### Parallel Track B: Operations Audit
- T006 [US1] Apply to Operations
- T010 [US2] Add `skipGuard` to Operations Cancel buttons

## Story Completion order
1. **[US1]** (Core Protection) -> 2. **[US2]** (UX Refinement)
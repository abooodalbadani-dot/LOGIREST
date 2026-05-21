# Tasks: Phase 1 — Critical Operational Safety

**Input**: Design documents from `specs/011-critical-operational-safety/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not requested — test tasks are omitted. Run `npx vitest run` after each phase to verify no regressions.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths in all descriptions

---

## Phase 1: Setup (Translation Keys)

**Purpose**: Add all new i18n keys needed by user stories so no task is blocked on missing translations.

- [x] T001 Add translation keys in `apps/web/messages/en.json` and `apps/web/messages/ar.json`: `operations.adjustment.errors.negative_stock_not_allowed`, `operations.adjustment.errors.exceeds_available_stock`, `batch.skipped_n_ineligible`, `auth.session_verification_failed`

**Checkpoint**: All translation keys available — user story implementation can begin.

---

## Phase 2: User Story 1 — Prevent Negative Inventory from Adjustment Decreases (Priority: P1) 🎯 MVP

**Goal**: Block saving/submitting any adjustment where a DECREASE line would produce negative stock. Disable buttons and show per-line inline error when negative stock is detected.

**Independent Test**: Create a DECREASE adjustment with `qty_adjusted > qty_before`, verify save/submit is blocked with error toast and per-line indicator. Reduce quantity below stock → buttons re-enable and save works.

### Implementation for User Story 1

- [x] T002 [US1] Add `hasNegativeStock` useMemo guard, disable save/submit buttons when negative, show per-line inline error for offending rows, and add early-return with toast in `handleSaveDraft` in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`

**Checkpoint**: Negative stock adjustments cannot be saved. Normal adjustments work as before.

---

## Phase 3: User Story 2 — Prevent Concurrent Overwrites During Batch Approve/Post (Priority: P1)

**Goal**: Pre-fetch current document versions immediately before batch approve/post, send the correct version per item, and handle 409 conflicts gracefully without blocking remaining items.

**Independent Test**: Select adjustments, modify one in another session, execute batch approve — verify conflict is detected and reported while other items succeed.

### Implementation for User Story 2

- [x] T003 [US2] Replace hardcoded `version: 0` in `handleBatchApprove` and `handleBatchPost` with pre-fetched version map in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`: pre-fetch all selected documents via `apiClient.get`, build `Map<id, version>`, skip fetch failures, use `versionMap.get(id)` in each mutation call

**Checkpoint**: Batch operations send correct document versions. Concurrent modifications are detected.

---

## Phase 4: User Story 3 — Enforce Workflow Rules During Batch Approve/Post (Priority: P1)

**Goal**: Filter batch selections through workflow eligibility rules before execution, use mutation hooks instead of raw API calls, and display a summary of per-item results (success/failure with reasons).

**Independent Test**: Select mixed-status adjustments (DRAFT, SUBMITTED, POSTED), click batch approve — only SUBMITTED are processed, others skipped with toast explaining why.

**Dependency**: Builds on T003 (Phase 3) — uses the version-locked batch structure established in US2.

### Implementation for User Story 3

- [x] T004 [US3] Add workflow eligibility filter using `canPerformActionV2` before the batch loop in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`: filter selected items by eligibility for the requested action, show toast with skipped count, only process eligible items
- [x] T005 [US3] Replace raw `apiClient.post` in batch approve with `useApproveAdjustment` hook and ensure `usePostAdjustment` hook is used in batch post, add per-item success/failure summary dialog in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`

**Checkpoint**: Batch operations respect workflow rules and use standard mutation hooks. Results are summarized.

---

## Phase 5: User Story 4 — Validate Active Session on Application Load (Priority: P2)

**Goal**: Call `GET /auth/me` on every application mount to validate the session server-side. Redirect to login on failure. Keep loading state until validation resolves to prevent flash of authenticated content.

**Independent Test**: Log in, revoke session server-side, refresh page — verify redirect to login with no dashboard flash. With valid session, verify dashboard loads after validation completes.

### Implementation for User Story 4

- [x] T006 [US4] Add `GET /auth/me` call with 10-second `AbortSignal` timeout in the init `useEffect` of `apps/web/src/providers/AuthProvider.tsx`: call after JWT decode, on 200 update user state with server data, on 401/timeout/error clear state and redirect to `/login?reason=expired` or `/login?reason=verification_failed`, keep `isLoading = true` until resolved

**Checkpoint**: Session is validated server-side on every mount. Stale/revoked sessions redirect to login.

---

## Phase 6: Polish & Verification

**Purpose**: Verify all changes compile, lint, and build correctly. Manual verification per quickstart.md.

- [x] T007 Run `npx tsc --noEmit` from `apps/web/` and fix any type errors
- [x] T008 [P] Run `npx eslint` from `apps/web/` and fix any lint errors
- [x] T009 Run `npx next build` from `apps/web/` and verify production build succeeds
- [x] T010 Manual verification: run through all test scenarios from `specs/011-critical-operational-safety/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Setup (translation keys for error messages)
- **US2 (Phase 3)**: Depends on Setup only
- **US3 (Phase 4)**: Depends on US2 (modifies same file, builds on version-locked batch structure)
- **US4 (Phase 5)**: Depends on Setup (translation keys for auth errors)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — only needs Setup
- **US2 (P1)**: Independent — only needs Setup
- **US3 (P1)**: Depends on US2 (same file: `AdjustmentListClient.tsx`)
- **US4 (P2)**: Independent — only needs Setup

### Within Each User Story

- Implementation tasks are sequential within each story
- Each story has a checkpoint for independent validation

### Parallel Opportunities

- **US1 and US4** can be worked on in parallel (different files, no shared state)
- **US1 and US2** can be worked on in parallel (different files)
- **US4 and US2** can be worked on in parallel (different files)
- **US3 MUST wait for US2** (same file, sequential dependency)
- **T007 and T008** can run in parallel (typecheck and lint are independent tools)

---

## Parallel Example

```text
# After Setup (Phase 1) completes:
# Launch in parallel:
Developer A: T002 [US1] AdjustmentForm.tsx (negative stock guard)
Developer B: T003 [US2] AdjustmentListClient.tsx (version locking)

# After US2 completes:
Developer B: T004 + T005 [US3] AdjustmentListClient.tsx (workflow filter)

# Meanwhile (in parallel with any phase):
Developer C: T006 [US4] AuthProvider.tsx (session validation)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (translation keys)
2. Complete Phase 2: User Story 1 (negative stock guard)
3. **STOP and VALIDATE**: Test US1 independently per checkpoint
4. Deploy/demo — ledger corruption risk is eliminated

### Incremental Delivery

1. Setup → Foundation ready
2. Add US1 → Test independently → Ledger safety restored (MVP!)
3. Add US2 → Test independently → Concurrent overwrites prevented
4. Add US3 → Test independently → Workflow rules enforced in batch
5. Add US4 → Test independently → Session validation active
6. Polish → Build verification → Production-ready

### Files Changed Summary

| File | Tasks | User Story |
|------|-------|-----------|
| `messages/en.json` | T001 | Setup |
| `messages/ar.json` | T001 | Setup |
| `adjustments/[id]/AdjustmentForm.tsx` | T002 | US1 |
| `adjustments/AdjustmentListClient.tsx` | T003, T004, T005 | US2, US3 |
| `providers/AuthProvider.tsx` | T006 | US4 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Task IDs reflect sequential execution order; parallel tasks skip ahead in numbering when possible
- US3 (Phase 4) depends on US2 (Phase 3) because both modify `AdjustmentListClient.tsx`
- All tasks are frontend-only; backend endpoints are listed as prerequisites in spec.md Assumptions
- Commit after each phase checkpoint to maintain atomic rollback points

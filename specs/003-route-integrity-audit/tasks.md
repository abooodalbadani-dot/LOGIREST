# Tasks: Route & Navigation Integrity Audit

**Input**: Design documents from `/specs/003-route-integrity-audit/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Manual audit verification. Automated tests are NOT requested for the audit script itself.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize audit script file in `apps/web/scripts/audit-routes.py`
- [X] T002 [P] Configure Python environment and regex patterns for Next.js routing in `apps/web/scripts/audit-routes.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Implement filesystem traversal to find all `page.tsx` files in `apps/web/src/app`
- [X] T004 Implement route normalization logic (remove route groups, handle locales) in `apps/web/scripts/audit-routes.py`
- [X] T005 [P] Implement base Route Map data structure per `specs/003-route-integrity-audit/data-model.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Audit Route Reachability (Priority: P1) 🎯 MVP

**Goal**: Identify broken or orphaned pages by comparing disk routes to UI links.

**Independent Test**: Verify that the audit table lists 100% of routes found on disk.

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement regex logic to extract `href` from `Link` and `<a>` tags in `apps/web/src`
- [X] T007 [P] [US1] Implement regex logic to extract targets from `router.push` and `router.replace` in `apps/web/src`
- [X] T008 [US1] Cross-reference extracted disk routes with found UI references in `apps/web/scripts/audit-routes.py`
- [X] T009 [US1] Flag pages with no references as `Orphan` in the Route Map

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Security Guard Verification (Priority: P1)

**Goal**: Ensure every route is protected by authentication guards.

**Independent Test**: Cross-reference extracted routes against `proxy.ts` public paths.

### Implementation for User Story 2

- [X] T010 [US2] Implement logic to parse `publicPaths` from `apps/web/src/proxy.ts`
- [X] T011 [US2] Assign `Protected` or `Public` status to each route based on `proxy.ts` configuration
- [X] T012 [US2] Verify that the middleware `matcher` includes all non-public internal routes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Dynamic Route Entry Points (Priority: P2)

**Goal**: Ensure dynamic routes have valid navigational entry points.

**Independent Test**: Verify dynamic routes have at least one valid navigational link.

### Implementation for User Story 3

- [X] T013 [US3] Implement detection for dynamic path construction (variables/template literals) in `apps/web/scripts/audit-routes.py`
- [X] T014 [US3] Map dynamic routes (e.g., `[id]`) to corresponding UI references or flag as `Review` in the Route Map

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T015 Generate the final `audit-report.md` in `specs/003-route-integrity-audit/`
- [X] T016 [P] Update `specs/003-route-integrity-audit/quickstart.md` with final script usage instructions
- [X] T017 Conduct a manual review of all routes flagged as `Review` or `Orphan`
- [X] T018 Validate the final audit report against success criteria (SC-001 to SC-004)

---

## Phase 7: User Story 4 - Internal Tooling Management (Priority: P2)

**Goal**: Classify and secure internal/debug routes.

- [X] T019 [US4] Update `spec.md` and `plan.md` with Internal Tooling classification rules
- [X] T020 [US4] Create `apps/web/audit/internal-tooling.json` for exemption list
- [X] T021 [US4] Update `audit-routes.py` to handle `Internal Tooling` status
- [X] T022 [US4] Implement production block in `apps/web/src/proxy.ts` for internal paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable

---

## Parallel Example: User Story 1

```bash
# Launch link extraction tasks for User Story 1 together:
Task: "Implement regex logic to extract href from Link and <a> tags in apps/web/src"
Task: "Implement regex logic to extract targets from router.push and router.replace in apps/web/src"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Test User Story 1 & 2 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Audit Baseline ready
3. Add User Story 2 → Test independently → Security verification ready
4. Add User Story 3 → Test independently → Dynamic route verification ready
5. Each story adds value without breaking previous stories

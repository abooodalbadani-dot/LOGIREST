# Tasks: Phase 0 Security Hardening

**Input**: Design documents from `/specs/010-phase-0-security-hardening/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment and project verification

- [X] T001 Verify active environment config parameters in apps/web/.env.local

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and hooks that must be completed before user stories

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete

- [X] T002 Implement cookie helper utility functions (get, set, delete) in apps/web/src/lib/api/cookies.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Secure Session Token Storage (Priority: P1) 🎯 MVP

**Goal**: Store JWT token in secure cookie, remove from localStorage, clear on logout.

**Independent Test**: Logging in sets the `logirest_token` cookie, localStorage remains empty of credentials, and logout clears the cookie.

### Implementation for User Story 1

- [X] T003 [P] [US1] Set up simulated login cookie management in apps/web/src/infrastructure/mock/mock-api.adapter.ts
- [X] T004 [US1] Remove token store/load references from localStorage in apps/web/src/providers/AuthProvider.tsx
- [X] T005 [US1] Update login function in apps/web/src/providers/AuthProvider.tsx to use cookie-based token validation
- [X] T006 [US1] Update logout function in apps/web/src/providers/AuthProvider.tsx to call logout API, clear state, clear cookie, and redirect
- [X] T007 [US1] Refactor apiClient request function in apps/web/src/lib/api/client.ts to extract token from document.cookie/headers instead of localStorage

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Automatic Session Expiration Redirect (Priority: P2)

**Goal**: Catch 401 Unauthorized errors globally and route user back to login with a preserved redirect path.

**Independent Test**: Triggering a mock 401 error from the API forces the user to the login screen, shows an expiration notification, and includes the previous path in the query string.

### Implementation for User Story 2

- [X] T008 [P] [US2] Implement API interceptor callback for 401 responses in apps/web/src/lib/api/client.ts
- [X] T009 [US2] Implement dispatch event auth:expired in apps/web/src/lib/api/client.ts on auth failure
- [X] T010 [US2] Listen for auth:expired event and clear user state and redirect in apps/web/src/providers/AuthProvider.tsx
- [X] T011 [US2] Retrieve query params and display expired toast in apps/web/src/app/[locale]/(auth)/login/page.tsx

**Checkpoint**: User Stories 1 and 2 work together. Invalid sessions trigger instant redirection to login.

---

## Phase 5: User Story 3 - Proactive Silent Session Renewal (Priority: P3)

**Goal**: Quietly refresh tokens in the background before they expire using a locked singleton promise to prevent concurrent storms.

**Independent Test**: Monitoring the network panel shows single `/auth/refresh` requests executing at 50% token lifetime or 5 minutes before expiry.

### Implementation for User Story 3

- [X] T012 [P] [US3] Implement silent refresh singleton promise logic in apps/web/src/lib/api/client.ts
- [X] T013 [US3] Implement background timeout trigger scheduling in apps/web/src/providers/AuthProvider.tsx
- [X] T014 [US3] Add simulated refresh token endpoint (/auth/refresh) handler in apps/web/src/infrastructure/mock/mock-api.adapter.ts

**Checkpoint**: Active user sessions are renewed in the background transparently.

---

## Phase 6: User Story 4 - Elimination of Debug Token Exposure in Logs (Priority: P1)

**Goal**: Prevent security key leakages in debug/production console and logs.

**Independent Test**: Logging in and performing resource queries logs zero credential values or raw tokens to the console.

### Implementation for User Story 4

- [X] T015 [P] [US4] Remove debug print statements and response log info from apps/web/src/lib/api/client.ts

**Checkpoint**: Session credentials do not appear in console outputs.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Code cleanliness, linting, typechecks, and build verification.

- [X] T016 Run typecheck command npx tsc --noEmit inside apps/web
- [X] T017 Run linter command npm run lint inside apps/web
- [X] T018 Run Next.js build validation npm run build inside apps/web

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001.
- **User Stories (Phases 3-6)**: Depend on Phase 2 (T002).
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Parallel Opportunities

- T003 [P] [US1] (mock login cookie management) can run in parallel with general setup.
- T008 [P] [US2] (api interceptor logic) can run in parallel.
- T012 [P] [US3] (singleton refresh logic) can run in parallel.
- T015 [P] [US4] (removing console logs) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 & 4)

1. Complete Setup and Foundational cookie utility.
2. Complete US4 (Remove token logs) to prevent leakage during testing.
3. Complete US1 (HttpOnly cookie session storage).
4. **STOP and VALIDATE**: Confirm user can log in/out with token residing in cookies only.

### Incremental Delivery

1. Deploy MVP.
2. Add US2 (401 Redirection) and test with manual cookie expiration.
3. Add US3 (Silent Background Refresh) and verify background execution.

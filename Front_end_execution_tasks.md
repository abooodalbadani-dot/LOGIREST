# LogiRest — Frontend Execution Tasks
**Version:** 1.0 | **Date:** 2026-04-18
**Stack:** Next.js 16+ (App Router) · TypeScript · Tailwind CSS · shadcn/ui · next-intl · React Hook Form + Zod · TanStack Table · Playwright · Vitest + Testing Library

> **Source of truth:** `PROJECT PROPOSAL.md` — all acceptance criteria must validate against it.

---

## Quick Reference — Build Order

```
Week 1  FE-FOUND-001..006 → FE-DS-001..003
Week 2  FE-COMP-001..011  (all shared components before any screen)
Week 3  FE-PRO-GRN-001/002 + FE-COMP-005/006/007  (highest-risk flows)
Week 4  FE-OPS-ISSUE-001/002/003 + FE-OPS-STOCK-001/002/003
Week 5  FE-PRO-PR-001 + FE-PRO-PO-001 + FE-OPS-ADJ-001 + FE-OPS-TRANS-001
Week 6  FE-MD-001..004 + FE-AUTH-001..004
Week 7  FE-INV-001/002 + FE-NOTIF-001 + FE-REP-001 + FE-ADMIN-001..004
Week 8  FE-QA-001..006
```

---

## Global Definition of Done (applies to EVERY task)

- [ ] RTL breadcrumbs / pagination / stepper / icons tested and correct
- [ ] No mixed AR/EN labels in any single control
- [ ] Posted documents — edit/delete buttons absent; all inputs `disabled`
- [ ] POST actions — `PostConfirmDialog` shown before irreversible execution
- [ ] Stocktake lock — `LockBanner` visible; conflicting POST buttons disabled
- [ ] Barcode scan — input stays focused + undo works + success/fail feedback shown
- [ ] Loading / Empty / Error / PermissionDenied states on every data-fetching screen
- [ ] Numeric values always rendered `dir="ltr"` even inside RTL layout
- [ ] `tsc --noEmit` passes; zero `any` without explicit justification comment

---

## Epic Index

| # | Epic | Goal |
|---|---|---|
| 1 | **Foundation** | App scaffold, routing groups, i18n RTL/LTR, auth shell, RBAC gates, API client |
| 2 | **Design System** | Tailwind tokens (Operational Nocturne), shadcn overrides, RTL AppShell |
| 3 | **Shared Components** | Reusable business components used across all screens |
| 4 | **Screens** | All 116 required screens organised by module |
| 5 | **QA & Hardening** | RTL audit, mobile breakpoints, WCAG AA, coverage completion |

---

## Epic 1 — Foundation

---

### FE-FOUND-001 · Initialize Next.js 16 App Router project

**Type:** Foundation | **Phase:** 1

**Scope:**
`npx create-next-app` with App Router; strict TypeScript; establish folder convention:
```
src/
  app/[locale]/
    (auth)/
    (app)/
      (admin)/  (master-data)/  (operations)/
      (procurement)/  (inventory)/
      (communications)/  (reports)/
  components/
    ui/          ← shadcn primitives
    shared/      ← reusable business components
    layouts/
  lib/api/  hooks/  utils/
  i18n/  types/  tests/
```

**Out of scope:** Any UI, routing logic, or content beyond scaffold.

**Files/Areas touched:**
`package.json`, `tsconfig.json`, `next.config.ts`, `src/` tree, `.env.example`

**Dependencies:** None

**Acceptance Criteria:**
- `npm run dev` starts without errors
- `npm run build` succeeds
- TypeScript strict mode enabled; zero untyped `any`
- `.env.example` documents `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`
- No `pages/` directory created

**Test Plan:** CI runs `tsc --noEmit` and `npm run build`; confirms zero errors.

**Notes:** Use `src/app/[locale]/` as root locale segment for next-intl.

---

### FE-FOUND-002 · Configure next-intl — Arabic RTL default + English LTR

**Type:** Foundation | **Phase:** 1

**Scope:**
- Install `next-intl`; configure middleware for locale detection
- `messages/ar.json` and `messages/en.json` with placeholder keys for every module
- `i18n/config.ts` — `locales: ['ar', 'en']`, `defaultLocale: 'ar'`
- Middleware applies `dir="rtl"` on `<html>` for `ar`, `dir="ltr"` for `en`
- `useLocale()` hook wrapper
- `LocaleSwitcher` component (AR ⇌ EN toggle); persisted via cookie

**Out of scope:** Actual translated strings (placeholder keys only for now).

**Files/Areas touched:**
`middleware.ts`, `src/i18n/`, `src/app/[locale]/layout.tsx`, `messages/ar.json`, `messages/en.json`, `src/components/shared/LocaleSwitcher.tsx`

**Dependencies:** FE-FOUND-001

**Acceptance Criteria:**
- `/ar/*` → `dir="rtl"` and `lang="ar"` on `<html>`
- `/en/*` → `dir="ltr"` and `lang="en"` on `<html>`
- Locale switch persists via cookie (not query param)
- `t('key')` throws in dev if key is missing
- Zero hard-coded Arabic/English strings anywhere in source

**Test Plan:**
- Vitest: `middleware.test.ts` verifies `dir` attribute injection
- Playwright: navigate to `/ar/` → assert `document.dir === 'rtl'`; `/en/` → assert `'ltr'`

**Notes:** All UI text MUST go through `useTranslations()`; hard-coded strings are a build-time lint error.

---

### FE-FOUND-003 · JWT auth shell — login redirect, session guard, refresh, timeout

**Type:** Foundation | **Phase:** 1

**Scope:**
- `AuthProvider` — `user`, `token`, `logout()` in React context
- `useSession()` hook — reads JWT from `httpOnly` cookie; detects expiry
- Route middleware — unauthenticated → redirect to `/[locale]/login`
- Session timeout interceptor — 401 from API → show `SessionTimeoutModal` (no full redirect)
- `SessionTimeoutModal` placeholder component

**Out of scope:** Actual login form (FE-AUTH-001); OAuth/SSO.

**Files/Areas touched:**
`src/lib/auth/`, `src/providers/AuthProvider.tsx`, `middleware.ts`, `src/components/shared/SessionTimeoutModal.tsx`, `src/hooks/useSession.ts`

**Dependencies:** FE-FOUND-001, FE-FOUND-002

**Acceptance Criteria:**
- Unauthenticated GET to `/ar/dashboard` redirects to `/ar/login`
- 401 API response triggers `SessionTimeoutModal` within 500 ms
- Token refresh succeeds silently when token near expiry
- `logout()` clears cookie and redirects to login
- `user.role` and `user.scopes` available on auth context

**Test Plan:**
- Playwright: visit protected route unauthenticated → assert redirect
- Playwright: simulate 401 → assert modal appears
- Vitest: `AuthProvider` unit test with mock API responses

**Notes:** JWT stored `httpOnly` on API side; client never reads raw token string.

---

### FE-FOUND-004 · RBAC gate — `<ProtectedRoute>` + `usePermission()` hook

**Type:** Foundation | **Phase:** 1

**Scope:**
- `ROLES` and `PERMISSIONS` TypeScript enums in `src/types/rbac.ts`
- `usePermission(action, resource)` → `{ allowed: boolean, reason: string }`
- `<ProtectedRoute roles={[]} />` — renders children or `<PermissionDenied />`
- `withPermission(Component, roles)` HOC for page-level wrapping
- Sidebar nav items hidden/shown based on current user role

**Out of scope:** Backend permission sync; UI beyond gate logic.

**Files/Areas touched:**
`src/types/rbac.ts`, `src/hooks/usePermission.ts`, `src/components/shared/ProtectedRoute.tsx`, `src/components/shared/PermissionDenied.tsx`

**Dependencies:** FE-FOUND-003

**Acceptance Criteria:**
- ADMIN sees all nav items; AUDITOR sees read-only nav only
- Non-ADMIN visiting ADMIN route → `<PermissionDenied />` rendered
- `usePermission('create', 'grn')` returns `false` for AUDITOR
- Permission check is synchronous (derived from JWT claims; no API call)

**Test Plan:**
- Vitest: each role against all permission combinations
- Playwright: login as AUDITOR → navigate to `/admin/users` → assert PermissionDenied

---

### FE-FOUND-005 · API client scaffold — typed fetch, TanStack Query, interceptors

**Type:** Foundation | **Phase:** 1

**Scope:**
- Base `apiClient` using native `fetch` with typed request/response generics
- Auth interceptor — attach Bearer token; on 401 call `refreshToken()` once then logout
- TanStack Query v5 setup — `QueryClientProvider`, stale-time defaults, error-boundary integration
- Typed factory — `createQuery(url, schema)` using Zod for response validation
- `ApiError` type — `code`, `message`, `field_errors`

**Out of scope:** Module-specific API calls (added per screen task).

**Files/Areas touched:**
`src/lib/api/client.ts`, `src/lib/api/types.ts`, `src/lib/api/errors.ts`, `src/providers/QueryProvider.tsx`

**Dependencies:** FE-FOUND-003

**Acceptance Criteria:**
- All API calls are fully type-safe; TypeScript rejects mismatched response shapes
- 401 triggers one refresh attempt then `logout()`
- Network failure → `ApiError { code: 'NETWORK_ERROR' }`
- Zod validation failure → dev-console warning (non-blocking in prod)

**Test Plan:** Vitest: mock `fetch`; verify interceptor retry logic; verify Zod failure path.

**Notes:** Do NOT use Axios. TanStack Query v5 only.

---

### FE-FOUND-006 · Playwright E2E infrastructure + Vitest setup + CI pipeline

**Type:** Foundation / Test | **Phase:** 1

**Scope:**
- `playwright.config.ts` — two browser projects (Chromium, WebKit), retries=2 in CI
- `tests/e2e/fixtures/auth.ts` — fixture that logs in and returns authenticated page
- `tests/e2e/helpers/rtl.ts` — helper asserting `dir="rtl"` and Flexbox direction
- GitHub Actions workflow running `npm run test:e2e` and `npm run test:unit` on push
- `vitest.config.ts`, `src/tests/setup.ts` with `@testing-library/jest-dom`

**Out of scope:** Actual test cases (added per screen task).

**Files/Areas touched:**
`playwright.config.ts`, `vitest.config.ts`, `tests/e2e/`, `src/tests/setup.ts`, `.github/workflows/ci.yml`

**Dependencies:** FE-FOUND-001

**Acceptance Criteria:**
- `npm run test:unit` exits 0 (empty suite passes)
- `npm run test:e2e` exits 0 (empty suite passes)
- Auth fixture logs in against dev API successfully
- RTL helper correctly detects direction

**Test Plan:** CI runs and passes on a clean clone.

**Notes:** `@playwright/test` v1.44+. Separate commands for unit vs. E2E.

---

## Epic 2 — Design System

---

### FE-DS-001 · Tailwind config — Operational Nocturne tokens + shadcn theme

**Type:** DS | **Phase:** 2

**Scope:**
- `tailwind.config.ts` — extend colors with full Operational Nocturne palette:
  - `brand.primary` = `#3ABEFF` | `brand.primary-dim` = `#98D6FF`
  - `surface.*` hierarchy: `0c0e12 → 111317 → 1a1c20 → 1e2024 → 282a2e → 333539 → 37393e`
  - `neon.cyan`, `neon.amber` (`#FFB020`), `neon.error` (`#FFB4AB`)
  - `on.*` text tokens (`on-surface`, `on-surface-variant`, etc.)
- CSS variables in `globals.css` for shadcn CSS-variable theming (dark mode only; no light mode)
- `typography` plugin — Plus Jakarta Sans (headings), Inter (body), IBM Plex Sans Arabic (Arabic body)
- Google Fonts via `next/font/google`; Arabic font with `subset: ['arabic']`
- 4 px baseline spacing grid
- Max border-radius: `rounded-lg` = `0.75rem` (no `rounded-xl` in production)

**Out of scope:** Component-level styling (done per component task).

**Files/Areas touched:** `tailwind.config.ts`, `src/app/globals.css`, `src/lib/fonts.ts`

**Dependencies:** FE-FOUND-001

**Acceptance Criteria:**
- All token colors reachable via Tailwind (`bg-surface-container`, `text-on-surface`, etc.)
- shadcn `Button` renders with neon-cyan primary in dark mode
- Arabic text uses IBM Plex Sans Arabic; Latin text uses Inter/Plus Jakarta Sans
- Zero usage of standard Tailwind colors (`blue-500`, `gray-200`, etc.) in production code
- `rounded-xl` disabled or aliased away

**Test Plan:** Visual snapshot: render a button → compare PNG in CI. Vitest: assert font CSS variables present.

---

### FE-DS-002 · AppShell — RTL sidebar, topbar, content area, breadcrumbs

**Type:** DS | **Phase:** 2

**Scope:**
- `AppShell` layout component wrapping all authenticated pages
- `Sidebar` — right-anchored in RTL (`inset-inline-end`), left-anchored in LTR; no border (tonal shift only)
- Active nav item — neon-cyan bar on the **leading edge** (right in RTL, left in LTR)
- `Topbar` — locale switcher, user avatar, notification bell, scope indicator (Branch / WH / Dept)
- `Breadcrumb` — RTL-aware (arrows reverse direction)
- `PageHeader` — title + action slot; right-leading in RTL
- Mobile: sidebar collapses to hamburger drawer

**Out of scope:** Nav item content (populated per module); icon library.

**Files/Areas touched:**
`src/components/layouts/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `src/components/shared/Breadcrumb.tsx`, `src/components/shared/PageHeader.tsx`

**Dependencies:** FE-DS-001, FE-FOUND-002, FE-FOUND-004

**Acceptance Criteria:**
- `ar` locale → sidebar on right; breadcrumb arrows RTL
- `en` locale → sidebar on left; breadcrumb arrows LTR
- Scope indicator in Topbar shows active Branch / WH / Dept in correct locale
- No mixed AR/EN text in any nav label
- "No-Line Rule" enforced — sidebar uses tonal shift, not `border-r`

**Test Plan:**
- Playwright: capture RTL and LTR screenshots; assert sidebar position
- Vitest: `Sidebar` renders with `data-side="right"` in RTL

---

### FE-DS-003 · RTL-safe primitives — icons, ghost-border inputs, neon focus, buttons, cards

**Type:** DS | **Phase:** 2

**Scope:**
- `Icon` wrapper — auto-flips arrow/chevron/search icons via `transform: scaleX(-1)` in RTL
- `Input` override — ghost border `rgba(135,146,155,0.15)`; focus → `primary` border + 2 px outer glow; icon position flips in RTL
- `Button` variants — `primary` (gradient `#98D6FF → #3ABEFF`), `ghost`, `destructive`
- `Card` — `surface_container_high` bg, `rounded-lg`, ambient shadow; no visible border
- `Badge` — `full` pill for status; `md` for filter chips

**Out of scope:** Business-specific status values (done in FE-COMP-002).

**Files/Areas touched:**
`src/components/ui/icon.tsx`, `input.tsx`, `button.tsx`, `card.tsx`, `badge.tsx`

**Dependencies:** FE-DS-001

**Acceptance Criteria:**
- Search icon on RIGHT in RTL, LEFT in LTR
- Input focus — `#98D6FF` border with soft glow (snapshot tested)
- Primary button renders gradient, not flat color
- Card has no visible divider line
- All primitives accept `className` for extension; no ad-hoc padding overrides inside them

**Test Plan:** Vitest snapshot: each primitive in RTL and LTR. Playwright: focus input → assert glow class applied.

---

## Epic 3 — Shared Components

---

### FE-COMP-001 · `DataTable` — TanStack Table, filters, pagination, export, RTL

**Type:** Component | **Phase:** 3

**Scope:**
- Generic `DataTable<T>` wrapping TanStack Table v8
- Column visibility, row selection, client + server-side sorting
- `FilterPanel` slot — text search, date range, multi-select chips
- RTL-aware pagination (prev/next arrows reversed in AR)
- Export — CSV / XLSX via `xlsx` library
- Loading state — shimmer skeleton (9 rows)
- Empty state slot — accepts `<EmptyState />` node
- Numeric cells always `dir="ltr"` even in RTL layout

**Out of scope:** Module-specific column definitions (defined in each screen task).

**Files/Areas touched:**
`src/components/shared/DataTable/DataTable.tsx`, `FilterPanel.tsx`, `Pagination.tsx`, `index.ts`

**Dependencies:** FE-DS-001, FE-DS-002

**Acceptance Criteria:**
- Sorting toggles asc/desc correctly
- Pagination "next" arrow is reversed in RTL (Playwright confirmed)
- Export downloads valid CSV with correct column headers
- Skeleton rows visible for ≥300 ms during load
- Numeric columns render LTR in AR locale
- Empty state renders when `data=[]`

**Test Plan:**
- Vitest: filter logic, sort logic, CSV export column headers
- Playwright: click sort header → assert row order change; click export → assert download

**Notes:** High-density layout — `py-2 px-3` cell padding. Alternating row tones (no border dividers).

---

### FE-COMP-002 · `StatusBadge` + `StatusTimeline`

**Type:** Component | **Phase:** 3

**Scope:**
- Variants: `draft`, `submitted`, `approved`, `posted`, `rejected`, `locked`, `in_transit`, `cancelled`
- All labels from i18n keys (no hard-coded Arabic)
- `StatusTimeline` — vertical step list with timestamp + user per entry; descending time order

**Files/Areas touched:**
`src/components/shared/StatusBadge.tsx`, `src/components/shared/StatusTimeline.tsx`

**Dependencies:** FE-DS-003, FE-FOUND-002

**Acceptance Criteria:**
- All 8 variants render with correct color and icon
- Switching locale updates badge label
- Badge never shows English status code directly to Arabic user
- Timeline entries in descending time order in both locales

**Test Plan:** Vitest snapshot: each status variant. Playwright: switch locale → verify badge label changes.

---

### FE-COMP-003 · `PostConfirmDialog` — irreversible action modal

**Type:** Component | **Phase:** 3

**Scope:**
- Wraps shadcn `AlertDialog`
- Props: `title`, `description`, `warningText` (amber box — "هذا الإجراء لا يمكن التراجع عنه")
- Optional `requiresTextConfirmation` — user types "تأكيد" to unlock confirm button
- `onConfirm` async callback; loading spinner while running; dialog non-closable during load
- Used for: GRN POST, Stocktake POST, Adjustment POST, every other irreversible operation

**Files/Areas touched:** `src/components/shared/PostConfirmDialog.tsx`

**Dependencies:** FE-DS-003

**Acceptance Criteria:**
- Destructive action unreachable without dialog
- Text-confirmation blocks confirm until exact match (case-insensitive)
- Loading spinner shown during async; dialog cannot be closed during load
- Escape closes dialog (only when not loading)
- Warning box renders amber; content in correct locale

**Test Plan:**
- Vitest: confirm-disabled state; text-confirmation logic
- Playwright: open dialog → confirm without typing → assert button disabled

---

### FE-COMP-004 · `ScanInput` — barcode scan, focused, undo, feedback, scan log

**Type:** Component | **Phase:** 3

**Scope:**
- Always-focused input (re-focuses on blur within 100 ms)
- Processes barcode string on Enter / USB wedge termination char
- On valid scan → `onScan(barcode, qty, uom)` callback + cyan border pulse
- On invalid barcode → red border pulse + error entry in scan log
- Controls: "تراجع عن آخر مسح" + "مسح الكل"
- Scan log — last 10 scans with timestamp, item name, qty
- `ScanMode` wrapper — full-screen layout at M breakpoint (390 px)

**Files/Areas touched:**
`src/components/shared/ScanInput/ScanInput.tsx`, `ScanLog.tsx`, `ScanMode.tsx`

**Dependencies:** FE-DS-003, FE-FOUND-002

**Acceptance Criteria:**
- Input re-focuses within 100 ms after any blur
- Valid scan → cyan flash + log entry added
- Invalid barcode → red flash + error in log (no item added)
- Undo removes last log entry and decrements qty
- Scan log RTL: item name on right, qty/timestamp on left in AR
- Full-screen mode on 390 px viewport

**Test Plan:**
- Vitest: simulate keydown events → assert `onScan` called; test undo removes last entry
- Playwright: render scan mode → simulate barcode string → assert log entry appears

**Notes:** USB keyboard wedge only (no native camera for MVP). Design `onScan` interface to accept camera input later without component changes.

---

### FE-COMP-005 · `FEFOLotAllocator` — FEFO sort, split allocation, expired blocking

**Type:** Component | **Phase:** 3

**Scope:**
- Table of lots for an item: `lot_number`, `expiry_date`, `qty_available`, `is_expired`
- Default sort: expiry ASC (FEFO); non-admin cannot reorder
- Auto-fill: allocates lots top-down on qty entry
- Manual split: user adjusts per-lot qty; sum must equal requested qty
- Expired lot row: grayed out + lock icon; qty input disabled for WH_KEEPER
- Expired override inline — reason textarea in row; fires `onExpiredOverride(lotId, reason)`; only for ADMIN/INV_MGR
- Row color: green (valid) · amber (near-expiry ≤30 days) · red (expired)

**Files/Areas touched:**
`src/components/shared/FEFOLotAllocator/FEFOLotAllocator.tsx`, `LotRow.tsx`, `ExpiredOverrideInline.tsx`

**Dependencies:** FE-COMP-002, FE-FOUND-004

**Acceptance Criteria:**
- Lots sorted expiry ASC by default; WH_KEEPER cannot change order
- Expired lot qty disabled for WH_KEEPER
- ADMIN/INV_MGR: clicking expired lot shows reason field; allocation blocked until reason entered
- Total allocated qty must equal requested qty (validation error if not)
- Near-expiry (≤30 days) → amber badge; expired → red "منتهي الصلاحية" badge
- Edge case: all lots expired → empty message "لا توجد دفعات صالحة للصرف"

**Test Plan:**
- Vitest: FEFO auto-allocation with 3 lots; expired blocking by role; reason validation
- Playwright: render as WH_KEEPER → attempt expired lot qty edit → assert input disabled

---

### FE-COMP-006 · `LockBanner` — stocktake warehouse lock alert

**Type:** Component | **Phase:** 3

**Scope:**
- Sticky top-of-page banner when current warehouse has active stocktake
- Props: `warehouseName`, `stocktakeSessionId`, `startedBy`, `startedAt`
- Style: amber background (`neon_amber`), lock icon, "المستودع مقفول بسبب جلسة جرد نشطة"
- "عرض جلسة الجرد" link → stocktake details
- `useLockStatus(warehouseId)` hook — 30 s polling (real-time subscription placeholder)
- Pages using this hook pass `blockedByLock={true}` to gated POST buttons

**Files/Areas touched:**
`src/components/shared/LockBanner.tsx`, `src/hooks/useLockStatus.ts`

**Dependencies:** FE-DS-003, FE-FOUND-005

**Acceptance Criteria:**
- Visible on: GRN create, Issue create, Transfer create, Adjustment create — when warehouse locked
- POST button disabled when `blockedByLock=true`
- Banner dismissed only when lock released (not by user action)
- `useLockStatus` returns within 500 ms (cached)

**Test Plan:**
- Vitest: mock locked API response → assert `isLocked: true`
- Playwright: mock lock API → navigate to GRN create → assert POST disabled + banner visible

**Notes:** This is a **global concern** — every operational create/post page must use `useLockStatus`.

---

### FE-COMP-007 · `FXCapturePanel` — FX rate display and lock at GRN POST

**Type:** Component | **Phase:** 3

**Scope:**
- Card panel shown during GRN POST step
- Displays: PO supplier currency, base currency, system FX rate (fetched), totals in both currencies
- Rate input — editable for manual override; defaults to system rate
- "هذه هي النسبة التي سيتم تثبيتها عند الترحيل" — immutability notice
- Integrates with `PostConfirmDialog` as the final GRN post step
- After post — panel renders rate as read-only with "تم التثبيت في [timestamp]"

**Files/Areas touched:** `src/components/shared/FXCapturePanel.tsx`

**Dependencies:** FE-COMP-003, FE-DS-003

**Acceptance Criteria:**
- FX rate fetched and shown before confirm is available
- Base-currency total updates live as rate is edited
- Confirm button disabled until FX rate is acknowledged
- After POST: stored rate shown read-only; live rate NOT recalculated
- Numeric values always `dir="ltr"`

**Test Plan:**
- Vitest: base-currency calculation with mock rate
- Playwright: render → edit rate → assert total updates → confirm → assert read-only state

---

### FE-COMP-008 · `ImportWizard` — 4-step Excel import flow

**Type:** Component | **Phase:** 3

**Scope:**
- Step 1 **Upload**: `.xlsx` dropzone; template download link per type (items / uom / barcodes)
- Step 2 **Validate**: calls validation API; spinner; valid + error row counts
- Step 3 **Error Report**: `DataTable` of errors (row #, field, message); "تحميل تقرير الأخطاء" XLSX download; re-upload returns to step 1
- Step 4 **Commit**: UUID idempotency key; calls commit endpoint; shows imported row count
- RTL stepper — numbers left-to-right (progress direction); labels and arrows RTL-correct
- Commit disabled when error count > 0; file size limit 20 MB

**Files/Areas touched:**
`src/components/shared/ImportWizard/ImportWizard.tsx`, `steps/`, `Stepper.tsx`

**Dependencies:** FE-DS-003, FE-COMP-001

**Acceptance Criteria:**
- Stepper arrows RTL in Arabic
- Commit blocked when errors > 0
- Double-click on commit does not duplicate the import (idempotency key)
- Template download is type-specific
- 20 MB limit enforced with user-facing error in locale

**Test Plan:**
- Vitest: idempotency key uniqueness; commit-blocked state
- Playwright: upload valid file → complete all 4 steps → assert success

---

### FE-COMP-009 · `AuditDiffViewer` — before/after field comparison

**Type:** Component | **Phase:** 3

**Scope:**
- Two-column layout: "قبل التعديل" | "بعد التعديل"
- Changed fields highlighted amber; unchanged fields muted
- Supports: string, number, date, status, array types
- Collapsible sections for large objects
- Filter: field-name search, changed-only toggle
- Null/undefined displayed as "—" (never "null")
- Arabic field labels via i18n (no raw JSON keys shown to user)

**Files/Areas touched:** `src/components/shared/AuditDiffViewer.tsx`

**Dependencies:** FE-DS-003

**Acceptance Criteria:**
- Changed/unchanged classification correct
- Collapsible sections keyboard-accessible
- Filter "changed only" hides unchanged rows

**Test Plan:** Vitest: diff two mock objects → assert changed/unchanged counts.

**Notes:** Use `deep-diff` or equivalent library. Never render raw JSON to the user.

---

### FE-COMP-010 · `EmptyState`, `PermissionDenied`, `ErrorState`, `LoadingSkeleton`

**Type:** Component | **Phase:** 3

**Scope:**
- `EmptyState` — icon slot, title, description, optional CTA
- `PermissionDenied` — lock icon, required role shown, "ليس لديك صلاحية..."
- `ErrorState` — error message, error code (mapped to i18n), retry button calling `onRetry`
- `LoadingSkeleton` — shimmer matching the visual shape of target (not generic grey box)

**Files/Areas touched:**
`src/components/shared/EmptyState.tsx`, `PermissionDenied.tsx`, `ErrorState.tsx`, `LoadingSkeleton.tsx`

**Dependencies:** FE-DS-003

**Acceptance Criteria:**
- Each state renders correct locale text and icon
- Raw API error codes never shown to Arabic user (mapped via i18n)
- `LoadingSkeleton` shape matches its target component

**Test Plan:** Vitest snapshot: each state in RTL and LTR.

---

### FE-COMP-011 · `DocumentReadOnlyOverlay` + `useDocumentLock` hook

**Type:** Component | **Phase:** 3

**Scope:**
- `useDocumentLock(document)` → `{ isPosted, postedAt, postedBy }`
- `DocumentReadOnlyOverlay` banner — cyan, "تم الترحيل — هذا المستند للقراءة فقط" + poster name + timestamp
- When `isPosted=true`: all form inputs get `disabled`; edit/delete buttons hidden
- Programmatic edit attempt → `onEditAttempt` toast: "لا يمكن تعديل مستند مرحَّل"
- Applied to: GRN, Issue, Adjustment, PO, PR, Transfer, Stocktake details

**Files/Areas touched:**
`src/components/shared/DocumentReadOnlyOverlay.tsx`, `src/hooks/useDocumentLock.ts`

**Dependencies:** FE-DS-003, FE-COMP-002

**Acceptance Criteria:**
- Posted document: all inputs have `disabled` attribute; no edit button in DOM
- Banner shows poster name, timestamp in locale format
- Toast fires on keyboard-shortcut edit attempt

**Test Plan:**
- Vitest: render form with `isPosted=true` → assert all inputs disabled
- Playwright: open posted GRN → assert edit button absent from DOM

---

## Epic 4 — Screens

### 4A · Auth & Global

---

### FE-AUTH-001 · Login screen

**Type:** Screen | **Phase:** 4

**Scope:** Login form (email + password), React Hook Form + Zod, API call, redirect post-login. Error states: invalid credentials, rate-limit (429), network error.

**Files/Areas touched:**
`src/app/[locale]/(auth)/login/page.tsx`, `LoginForm.tsx`

**Dependencies:** FE-FOUND-003, FE-DS-003, FE-FOUND-002

**Acceptance Criteria:**
- RTL layout: labels right-aligned, inputs RTL in Arabic
- Zod validation messages in correct locale
- Rate-limit → "تجاوزت عدد المحاولات، يرجى الانتظار X ثانية"
- Success → redirects to `/{locale}/dashboard`

**Test Plan:** Playwright: empty submit → assert validation errors; valid credentials → assert redirect.

---

### FE-AUTH-002 · Forgot Password + Reset Password

**Type:** Screen | **Phase:** 4

**Scope:** Forgot → email input + API + success message. Reset → token from URL + new password + confirm + API + redirect.

**Files/Areas touched:**
`src/app/[locale]/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx`

**Dependencies:** FE-AUTH-001, FE-DS-003

**Acceptance Criteria:**
- Missing reset token → redirect to forgot-password with error toast
- Passwords must match (Zod refinement); error in correct locale

**Test Plan:** Playwright: submit forgot-password → assert success state shown.

---

### FE-AUTH-003 · Dashboard screens — role-specific KPI variants

**Type:** Screen | **Phase:** 4

**Scope:**
- Role-specific views for: Admin, INV_MGR, WH_KEEPER, PROC_OFF, APPROVER, AUDITOR (6 variants)
- KPI cards: total items, low-stock count, near-expiry count (≤30 days), pending approvals
- Near-expiry alert widget — top 5 items expiring soon → links to expiry report
- Pending documents widget — role-filtered PRs / POs / Adjustments awaiting approval

> ⛔ **Content Manager dashboard is OUT OF SCOPE per RFC §4. Do NOT implement.**

**Files/Areas touched:**
`src/app/[locale]/(app)/dashboard/`, `src/components/dashboard/`

**Dependencies:** FE-DS-002, FE-COMP-002, FE-FOUND-004

**Acceptance Criteria:**
- Each role sees only their relevant KPI cards
- Numbers in KPI cards always LTR even in RTL layout
- Near-expiry widget: 0 items → `EmptyState` (not empty → blank)
- AUDITOR dashboard: no action buttons

**Test Plan:** Playwright: login as each of 6 roles → assert correct KPI card set.

---

### FE-AUTH-004 · Profile screen + Context Selector (Branch / WH / Dept)

**Type:** Screen | **Phase:** 4

**Scope:** Profile: display name, email, role, language toggle, avatar placeholder. Context Selector: modal; cascading Branch → WH → Dept; persisted in session; active scope shown in Topbar.

**Files/Areas touched:**
`src/app/[locale]/(app)/profile/page.tsx`, `src/components/shared/ContextSelector.tsx`

**Dependencies:** FE-AUTH-003, FE-FOUND-003

**Acceptance Criteria:**
- Language toggle changes locale immediately and persists
- Context Selector cascades correctly; Dept disabled unless WH selected
- Active scope visible in Topbar at all times after selection

**Test Plan:** Playwright: toggle language → assert locale change; select scope → assert Topbar updates.

---

### 4B · Master Data

---

### FE-MD-001 · Entity list screens (Branches, Warehouses, Departments, Suppliers, Categories)

**Type:** Screen | **Phase:** 4

**Scope:** Five list screens using `DataTable`. Each: search/filter, status badge, role-gated create button, row click → details. Implemented as shared `EntityListPage` component with module-specific column config.

**Files/Areas touched:**
`src/app/[locale]/(app)/(master-data)/branches/page.tsx` (+ warehouses, departments, suppliers, categories), `src/components/master-data/EntityListPage.tsx`

**Dependencies:** FE-COMP-001, FE-FOUND-004

**Acceptance Criteria:**
- All 5 list screens render with loading / empty / error states
- Create button visible only to authorized roles
- Warehouses list — "مقفول" status badge if active stocktake exists
- RTL table column order — primary info in rightmost column in AR

**Test Plan:** Playwright: visit each list → assert table renders; mock empty API → assert `EmptyState`.

---

### FE-MD-002 · Entity form screens — Create + Edit for all 10 entities

**Type:** Screen | **Phase:** 4

**Scope:** React Hook Form + Zod forms for: Branches, Warehouses, Departments, Suppliers, Categories, Items (UoM / barcode sub-sections), UoM + Conversions, Barcodes (default qty), Currencies, FX Rates. Create and Edit share the same form component; prefilled on edit.

**Files/Areas touched:**
`src/app/[locale]/(app)/(master-data)/[entity]/new/page.tsx`, `[entity]/[id]/edit/page.tsx`, `src/components/master-data/forms/`

**Dependencies:** FE-MD-001, FE-DS-003, FE-COMP-010

**Acceptance Criteria:**
- All required fields validated; Zod errors in correct locale
- Items form — visually split into tabs: "المعلومات الأساسية | وحدات القياس | الباركود"
- Barcodes form — `default_qty` required, min 1
- Currency form — `is_base_currency` radio; only one allowed at a time
- Department form — virtual warehouse mapping field present
- RTL: labels right-aligned; inputs RTL-aware

**Test Plan:**
- Vitest: Zod schema mandatory-field tests
- Playwright: empty submit → assert errors; valid submit → assert success toast

---

### FE-MD-003 · Entity detail screens for all 10 entities

**Type:** Screen | **Phase:** 4

**Scope:** Detail views for all 10 entities. Warehouses: shows lock status when locked + link to active stocktake. Items: tabs — Overview / Lots / Ledger. Role-gated edit/delete buttons.

**Files/Areas touched:**
`src/app/[locale]/(app)/(master-data)/[entity]/[id]/page.tsx`, `src/components/master-data/details/`

**Dependencies:** FE-MD-001, FE-COMP-011

**Acceptance Criteria:**
- Warehouses detail: lock section visible when warehouse is locked
- Items detail: 3 tabs all render correctly
- Breadcrumb navigation present on all detail screens

**Test Plan:** Playwright: navigate to item detail → assert all 3 tabs render.

---

### FE-MD-004 · Excel Import wizard screens (4-step)

**Type:** Screen | **Phase:** 4

**Scope:** Import Center landing (3 cards: items / uom / barcodes) + 4-step wizard (`ImportWizard` component) per import type.

**Files/Areas touched:**
`src/app/[locale]/(app)/(master-data)/import/`, `import/[type]/`

**Dependencies:** FE-COMP-008, FE-FOUND-004

**Acceptance Criteria:**
- Correct wizard launched per import type
- Template download produces valid `.xlsx` with correct column headers
- Commit step idempotent — double-click safe

**Test Plan:** Playwright: items import → upload valid file → complete all 4 steps → assert success.

---

### 4C · Operations

---

### FE-OPS-KIT-001 · Kitchen Requests — List + Create + Details

**Type:** Screen | **Phase:** 4

**Scope:** List (DataTable + status filter), Create (item search + qty + notes + PostConfirmDialog), Details (status timeline + APPROVER actions).

**Files/Areas touched:** `src/app/[locale]/(app)/(operations)/kitchen-requests/`

**Dependencies:** FE-COMP-001, FE-COMP-002, FE-DS-002

**Acceptance Criteria:**
- Status filter: Draft / Submitted / Approved / Fulfilled / Partial
- Approval: APPROVER sees Approve/Reject with comment field
- Partial fulfillment status reflected in Details

**Test Plan:** Playwright: create request → submit → assert status "مرسل".

---

### FE-OPS-ISSUE-001 · Issues — List + Details (posted read-only)

**Type:** Screen | **Phase:** 4

**Scope:** Issue list (DataTable; columns: رقم الصرف / المخزن / التاريخ / الحالة / المرحِّل; filters: status, date, warehouse). Issue details: line items with lot numbers + expiry; posted documents render `DocumentReadOnlyOverlay`.

**Files/Areas touched:**
`src/app/[locale]/(app)/(operations)/issues/page.tsx`, `issues/[id]/page.tsx`

**Dependencies:** FE-COMP-001, FE-COMP-011

**Acceptance Criteria:**
- Posted issue detail: no edit button; `DocumentReadOnlyOverlay` banner visible
- Lot numbers and expiry dates shown per line item

**Test Plan:** Playwright: open posted issue → assert edit button absent from DOM.

---

### FE-OPS-ISSUE-002 · Create Issue — form + FEFO Lot Allocator

**Type:** Screen | **Phase:** 4

**Scope:** Create Issue form: warehouse selector, item search, requested qty. For each lot-tracked item: opens `FEFOLotAllocator` as a drawer. Draft save + submit (with PostConfirmDialog).

**Files/Areas touched:**
`src/app/[locale]/(app)/(operations)/issues/new/page.tsx`, `src/components/operations/IssueForm.tsx`

**Dependencies:** FE-COMP-005, FE-COMP-003, FE-COMP-006

**Acceptance Criteria:**
- `LockBanner` appears if selected warehouse is locked
- Submit blocked without completing lot allocation
- `PostConfirmDialog` confirms issue is irreversible

**Test Plan:** Playwright: select locked warehouse → assert LockBanner; submit without lot allocation → assert validation error.

---

### FE-OPS-ISSUE-003 · Issue Scan Mode + Expired Override flow

**Type:** Screen | **Phase:** 4

**Scope:** Scan Mode: `ScanInput` + running issue line list. Expired Override modal: reason field (≥10 chars, mandatory) + role gate; fires audit entry on confirm.

**Files/Areas touched:**
`src/app/[locale]/(app)/(operations)/issues/new/scan/page.tsx`, `src/components/operations/ExpiredOverrideModal.tsx`

**Dependencies:** FE-COMP-004, FE-COMP-005, FE-FOUND-004

**Acceptance Criteria:**
- Scan re-focuses within 100 ms after each successful scan
- Scanning expired barcode → red feedback + override modal (role-gated)
- WH_KEEPER sees "لا تملك صلاحية تجاوز الصلاحية" instead of override form
- Undo removes last scanned line

**Test Plan:**
- Vitest: empty reason → assert validation error
- Playwright: simulate expired barcode scan → assert override modal appears

---

### FE-OPS-TRANS-001 · Transfers — List + Create + Details + Ship + Receive

**Type:** Screen | **Phase:** 4

**Scope:** All 5 transfer screens. Ship action: TRANSFER_OUT `PostConfirmDialog`. Receive action: TRANSFER_IN + discrepancy reason when received qty ≠ shipped qty.

**Files/Areas touched:** `src/app/[locale]/(app)/(operations)/transfers/`

**Dependencies:** FE-COMP-001, FE-COMP-003, FE-COMP-006, FE-COMP-011

**Acceptance Criteria:**
- Lot number + expiry preserved and shown in ship + receive views
- Ship: irreversible `PostConfirmDialog` shown
- Discrepancy reason required when quantities differ
- `LockBanner` if destination warehouse is locked on Create

**Test Plan:** Playwright: create → ship → receive with discrepancy → assert reason field required.

---

### FE-OPS-STOCK-001 · Stocktake — Sessions List + Create + Details (with Lock Banner)

**Type:** Screen | **Phase:** 4

**Scope:** Sessions list (DataTable; statuses: Draft/Started/Counting/Variance/Approved/Posted). Create session form. Stocktake Details: RTL stepper (إنشاء → بدء → العد → الفروقات → الاعتماد → الإغلاق); `LockBanner` when session = Started/Counting/Variance.

**Files/Areas touched:**
`src/app/[locale]/(app)/(operations)/stocktakes/page.tsx`, `stocktakes/[id]/page.tsx`

**Dependencies:** FE-COMP-001, FE-COMP-002, FE-COMP-006

**Acceptance Criteria:**
- Details: `LockBanner` visible when session is in Started/Counting/Variance status
- RTL stepper renders with correct arrow directions
- Create form requires warehouse + session name

**Test Plan:** Playwright: open started stocktake → assert lock banner visible.

---

### FE-OPS-STOCK-002 · Stocktake — Start (Snapshot + Lock) + Counting (barcode scan)

**Type:** Screen | **Phase:** 4

**Scope:** Start screen: item summary + `PostConfirmDialog` ("سيتم إنشاء لقطة للأرصدة وقفل المخزن — لا يمكن التراجع"). Counting screen: `ScanInput` (barcode-first) + manual qty fallback; system snapshot hidden until variance step.

**Files/Areas touched:**
`src/app/[locale]/(app)/(operations)/stocktakes/[id]/start/page.tsx`, `[id]/count/page.tsx`

**Dependencies:** FE-COMP-003, FE-COMP-004, FE-COMP-006

**Acceptance Criteria:**
- After Start: warehouse shows locked site-wide; `LockBanner` visible everywhere for that warehouse
- System snapshot qty NOT visible during counting phase
- Barcode scan auto-fills item row; manual input available as fallback

**Test Plan:** Playwright: start stocktake → navigate to dashboard → assert LockBanner visible.

---

### FE-OPS-STOCK-003 · Stocktake — Variance Review + Approve + Post/Close

**Type:** Screen | **Phase:** 4

**Scope:** Variance Review: table with snapshot qty / counted qty / variance / reason input (required when variance ≠ 0). Approve: APPROVER summary + approve/reject + comment. Post/Close: `PostConfirmDialog`; success releases warehouse lock; detail becomes read-only.

**Files/Areas touched:**
`src/app/[locale]/(app)/(operations)/stocktakes/[id]/variance/`, `approve/`, `post/`

**Dependencies:** FE-COMP-003, FE-COMP-011, FE-FOUND-004

**Acceptance Criteria:**
- Variance reason required for every non-zero variance line
- Post: `PostConfirmDialog` shown; warehouse lock released on success
- After post: `DocumentReadOnlyOverlay`; `LockBanner` removed site-wide

**Test Plan:** Playwright: complete variance → approve → post → assert lock banner gone.

---

### FE-OPS-ADJ-001 · Adjustments — List + Create + Details (posted read-only) + Approval

**Type:** Screen | **Phase:** 4

**Scope:** List (DataTable), Create (item + lot + qty + mandatory reason ≥10 chars), Details (`DocumentReadOnlyOverlay` when posted; linked movement ID), Approval (APPROVER approve/reject + comment).

**Files/Areas touched:** `src/app/[locale]/(app)/(operations)/adjustments/`

**Dependencies:** FE-COMP-003, FE-COMP-011, FE-FOUND-004

**Acceptance Criteria:**
- Reason field required; minimum 10 chars; Zod error in locale
- `LockBanner` on Create if target warehouse is locked
- Posted adjustment: no edit/delete; movement ID visible + linked to ledger

**Test Plan:** Playwright: submit without reason → assert error; open posted adjustment → assert read-only.

---

### 4D · Procurement

---

### FE-PRO-PR-001 · PR — List + Create + Details + Approve/Reject

**Type:** Screen | **Phase:** 4

**Scope:** List (DataTable; filter: status, date, warehouse), Create (React Hook Form + draft save), Details (status timeline; posted = read-only), Approval (separate route for APPROVER; reject requires comment).

**Files/Areas touched:** `src/app/[locale]/(app)/(procurement)/pr/`

**Dependencies:** FE-COMP-001, FE-COMP-002, FE-COMP-011

**Acceptance Criteria:**
- PR Details: posted state uses `DocumentReadOnlyOverlay`
- Reject requires mandatory comment (Zod validated)
- Approval on a **separate route** from Details

**Test Plan:** Playwright: PROC_OFF creates PR → APPROVER approves → assert status change.

---

### FE-PRO-PO-001 · PO — List + Create (supplier currency) + Details + Approve/Reject

**Type:** Screen | **Phase:** 4

**Scope:** PO list. Create PO: supplier currency selector; line unit prices in supplier currency; live base-currency total. PO Details. Approval (separate route for APPROVER).

**Files/Areas touched:** `src/app/[locale]/(app)/(procurement)/po/`

**Dependencies:** FE-PRO-PR-001, FE-COMP-003, FE-COMP-011

**Acceptance Criteria:**
- Supplier currency from Currencies master data
- Base-currency total updates live; always displayed `dir="ltr"`
- Approve/reject on separate route from PO Details

**Test Plan:** Playwright: create PO with foreign currency → assert base-currency total visible.

---

### FE-PRO-GRN-001 · GRN — List + Create GRN from PO

**Type:** Screen | **Phase:** 4

**Scope:** GRN list (DataTable; filter: PO, supplier, date, status). Create GRN via `?po=[id]`; auto-populates PO lines; each line requires received qty + lot number + expiry date; partial receipt supported. `LockBanner` if target warehouse locked.

**Files/Areas touched:**
`src/app/[locale]/(app)/(procurement)/grn/page.tsx`, `grn/new/page.tsx`

**Dependencies:** FE-PRO-PO-001, FE-COMP-001

**Acceptance Criteria:**
- Create GRN: lot number + expiry Zod-validated as required per line
- Partial receipt: received qty < PO qty allowed; partial status reflected
- `LockBanner` when target warehouse is locked

**Test Plan:** Playwright: create GRN from PO → submit partial → assert partial status in list.

---

### FE-PRO-GRN-002 · GRN — Scan Mode + Post GRN (FX Capture) + Details (posted read-only)

**Type:** Screen | **Phase:** 4

> ⚠️ **Highest-risk screen in the system.** FX rate must be stored at post time — NEVER recalculated.

**Scope:** Scan Mode: `ScanInput` adds items to GRN lines; first scan of a lot prompts lot + expiry entry. Post GRN: `FXCapturePanel` → `PostConfirmDialog`. GRN Details: posted → `DocumentReadOnlyOverlay` showing stored FX rate.

**Files/Areas touched:**
`src/app/[locale]/(app)/(procurement)/grn/new/scan/page.tsx`, `grn/[id]/post/page.tsx`, `grn/[id]/page.tsx`

**Dependencies:** FE-COMP-004, FE-COMP-007, FE-COMP-003, FE-COMP-011

**Acceptance Criteria:**
- Scan: first scan of a new lot opens lot-number + expiry popup before adding line
- Post GRN: FX rate shown; user may override; stored FX rate locked on confirm
- After post: GRN details shows "سعر الصرف المثبَّت" read-only; live rate not shown
- `PostConfirmDialog` explicitly states GRN post is irreversible
- Stored FX rate in detail matches the rate confirmed at post time

**Test Plan:** Playwright: create GRN → Post (confirm FX) → reopen GRN → assert stored rate displayed (not live rate).

---

### 4E · Inventory Views

---

### FE-INV-001 · Inventory Balances + Lot Balances

**Type:** Screen | **Phase:** 4

**Scope:** Inventory Balances: `DataTable` (Warehouse × Item × Qty; filters: warehouse, category, item; XLSX export). Lot Balances: extends with Lot × Expiry × Qty; near-expiry rows amber, expired rows red.

**Files/Areas touched:**
`src/app/[locale]/(app)/(inventory)/balances/page.tsx`, `lots/page.tsx`

**Dependencies:** FE-COMP-001, FE-COMP-002

**Acceptance Criteria:**
- Expired lots: red row; near-expiry (≤30 days): amber row
- XLSX export works for both tables
- Multiple simultaneous filters work correctly
- Quantities always `dir="ltr"`

**Test Plan:** Playwright: filter by warehouse → assert table filters; assert expired row has red class.

---

### FE-INV-002 · Stock Movements Ledger

**Type:** Screen | **Phase:** 4

**Scope:** Dense read-only `DataTable` of all ledger entries. Filters: date range, movement type, warehouse, item, lot. XLSX/CSV export. Zero edit/delete controls anywhere on this screen.

**Files/Areas touched:** `src/app/[locale]/(app)/(inventory)/movements/page.tsx`

**Dependencies:** FE-COMP-001

**Acceptance Criteria:**
- No edit or delete button anywhere on the ledger (DOM assertion)
- Movement type filter labels in Arabic
- High-density layout: ≥50 rows visible without scroll at 1440 px width

**Test Plan:** Playwright: assert no `[data-action="edit"]` or `[data-action="delete"]` found anywhere on page.

---

### 4F · Notifications & Email

---

### FE-NOTIF-001 · Notification Center + Outbox + Email Templates + Email Logs

**Type:** Screen | **Phase:** 4

**Scope:**
- Notification Center: bell panel; mark as read; unread badge count
- Outbox: list (Pending / Sent / Failed) + Retry button for Failed rows
- Email Templates: list + WYSIWYG editor; AR tab and EN tab fully separate (never interleaved)
- Email Logs: read-only list (ADMIN/AUDITOR only)

**Files/Areas touched:** `src/app/[locale]/(app)/(communications)/`

**Dependencies:** FE-COMP-001, FE-DS-003

**Acceptance Criteria:**
- Outbox retry: row updates to "جاري الإرسال" while pending
- Template editor: AR and EN tabs fully separate; no mixed language in single editor
- Email logs: no edit controls; correct role gate

**Test Plan:** Playwright: mark notification read → assert count decrements; retry failed email → assert row status changes.

---

### 4G · Reports

---

### FE-REP-001 · Reports Hub + all 6 report screens

**Type:** Screen | **Phase:** 4

**Scope:** Reports Hub: navigation cards for 6 reports. Reports: Available Inventory, Stock Movements, Expiry/Near-Expiry (color-coded rows), Stocktake Variance, PR/PO/GRN Status, Currency Summaries. Each: `DataTable` + filters + XLSX/CSV export.

**Files/Areas touched:** `src/app/[locale]/(app)/(reports)/`

**Dependencies:** FE-COMP-001, FE-COMP-002

**Acceptance Criteria:**
- All 6 reports render with loading / empty / error states
- Expiry report: same row coloring as Lot Balances (amber near-expiry, red expired)
- Currency Summaries: numeric columns always `dir="ltr"`
- Export downloads valid XLSX

**Test Plan:** Playwright: navigate to each report → assert render; click export → assert download triggered.

---

### 4H · Admin

---

### FE-ADMIN-001 · User Management — List + Create + Details + Edit

**Type:** Screen | **Phase:** 4

**Scope:** User list (DataTable; filter: role, status). Create User: name, email, role selector, scope selector (Branch → WH → Dept cascade), language preference. User Details: roles + scopes. Edit User: same form prefilled.

**Files/Areas touched:** `src/app/[locale]/(app)/(admin)/users/`

**Dependencies:** FE-COMP-001, FE-FOUND-004

**Acceptance Criteria:**
- ADMIN-only; `<ProtectedRoute roles={['ADMIN']} />` on all pages
- Scope selector cascades correctly; Dept disabled unless WH selected
- User details shows all effective scopes

**Test Plan:** Playwright: login as INV_MGR → navigate to `/admin/users` → assert PermissionDenied rendered.

---

### FE-ADMIN-002 · Roles & Permissions matrix

**Type:** Screen | **Phase:** 4

**Scope:** Roles list (6 predefined roles). Role Details: Module × Action permission matrix (checkbox grid — 8 modules × 5 actions). Save triggers confirmation dialog.

**Files/Areas touched:**
`src/app/[locale]/(app)/(admin)/roles/`, `src/components/admin/PermissionMatrix.tsx`

**Dependencies:** FE-FOUND-004, FE-DS-003

**Acceptance Criteria:**
- Matrix: all 6 roles × all modules × all actions rendered
- Save shows confirmation: "سيؤثر هذا على جميع مستخدمي هذا الدور"
- Module names in Arabic in RTL mode

**Test Plan:** Playwright: toggle permission → save → assert confirmation dialog appears.

---

### FE-ADMIN-003 · Audit Logs screen (separate route)

**Type:** Screen | **Phase:** 4

> ⚠️ Audit Logs and Settings **must not** be on the same page/route. Separate them.

**Scope:** Dedicated Audit Logs page (`/admin/audit-logs`). `DataTable`: who / when / action / resource / changed fields. Filters: user, action, date range, resource type. Row expansion → `AuditDiffViewer`.

**Files/Areas touched:** `src/app/[locale]/(app)/(admin)/audit-logs/page.tsx`

**Dependencies:** FE-COMP-001, FE-COMP-009

**Acceptance Criteria:**
- Audit Logs on `/admin/audit-logs`; Settings on `/admin/settings` (separate routes)
- Row expansion shows `AuditDiffViewer` in correct locale
- AUDITOR and ADMIN both have access

**Test Plan:** Playwright: expand audit row → assert diff viewer renders with before/after.

---

### FE-ADMIN-004 · Settings screen (separate route)

**Type:** Screen | **Phase:** 4

**Scope:** Settings (`/admin/settings`): base currency (dropdown; ADMIN only), default language, email sender name, system name.

**Files/Areas touched:** `src/app/[locale]/(app)/(admin)/settings/page.tsx`

**Dependencies:** FE-FOUND-004, FE-DS-003

**Acceptance Criteria:**
- Settings on separate route from Audit Logs
- Base currency change shows warning: "سيؤثر هذا على جميع التقارير"
- ADMIN-only

**Test Plan:** Playwright: login as INV_MGR → navigate to Settings → assert PermissionDenied.

---

## Epic 5 — QA & Hardening

---

### FE-QA-001 · RTL parity audit — all screens AR vs EN

**Type:** QA | **Phase:** 5

**Scope:** Playwright visual regression suite comparing AR and EN screenshots for every screen. Automated assertions: `dir` attribute, sidebar position, breadcrumb/pagination arrows, icon flips, form label alignment, stepper direction.

**Files/Areas touched:** `tests/e2e/rtl-parity/`

**Dependencies:** All Epic 4 tasks

**Acceptance Criteria:**
- Zero mixed AR/EN labels in any single control
- Sidebar: right in AR, left in EN
- Breadcrumb + pagination arrows reversed in AR
- All icon flips correct (search, chevron, arrow-back)

**Test Plan:** Playwright full screenshot suite in AR and EN; diff report generated in CI.

---

### FE-QA-002 · Mobile 390 px breakpoints for scan-flow screens

**Type:** QA | **Phase:** 5

**Scope:** Implement and verify mobile layouts for: Issue Scan Mode, GRN Scan Mode, Stocktake Counting, Transfer Receive — all must be fully operable at 390 px.

**Files/Areas touched:** Tailwind responsive classes on scan-flow screens.

**Dependencies:** FE-OPS-ISSUE-003, FE-PRO-GRN-002, FE-OPS-STOCK-002, FE-OPS-TRANS-001

**Acceptance Criteria:**
- Scan input occupies full viewport width at 390 px
- Scan log scrollable below input
- Zero horizontal scroll on any scan screen at 390 × 844 px

**Test Plan:** Playwright: viewport 390×844 → visit each scan screen → assert `scrollWidth === clientWidth`.

---

### FE-QA-003 · Error-state completeness audit

**Type:** QA | **Phase:** 5

**Scope:** Playwright with mocked API errors (500, 403, 404, empty list) to verify every list screen, detail screen, and form handles all four states: Loading / Empty / Error / PermissionDenied.

**Files/Areas touched:** `tests/e2e/error-states/`

**Dependencies:** FE-COMP-010, all Epic 4 tasks

**Acceptance Criteria:**
- Every list screen: empty data → `EmptyState` rendered (no blank screen)
- Every list screen: 500 → `ErrorState` with retry
- Every form: 403 → `PermissionDenied`

**Test Plan:** Playwright: intercept network → mock 500 on list endpoints → assert `ErrorState` renders.

---

### FE-QA-004 · WCAG AA accessibility audit on critical flows

**Type:** QA | **Phase:** 5

**Scope:** `axe-core` via Playwright on: Login, Dashboard, Issue Create, GRN Post, Stocktake Counting, Audit Logs. Fix: focus rings, color contrast, ARIA labels on icon-only buttons, screen-reader form error announcements.

**Files/Areas touched:** `globals.css` + flagged components.

**Dependencies:** All Epic 4 critical-path tasks

**Acceptance Criteria:**
- Zero critical axe violations on listed screens
- All icon-only buttons have `aria-label` in correct locale
- `BDC8D1` on `1E2024` verified ≥ 4.5:1 contrast ratio

**Test Plan:** Playwright + axe: `await checkA11y(page)` on each critical screen; CI fails on critical violations.

---

### FE-QA-005 · Unit test coverage completion for all shared components

**Type:** Test | **Phase:** 5

**Scope:** Vitest unit tests for all FE-COMP-* components reaching ≥80% branch coverage. Priority: FEFOLotAllocator allocation logic, PostConfirmDialog state machine, ScanInput event handling, ImportWizard idempotency.

**Files/Areas touched:** `src/tests/components/`

**Dependencies:** All FE-COMP-* tasks

**Acceptance Criteria:**
- `npm run test:unit` passes with ≥80% statement coverage on `src/components/shared/`
- FEFO edge cases tested: all lots expired, partial qty, single lot
- PostConfirmDialog text-confirmation blocks submit until exact match

**Test Plan:** `vitest run --coverage`; coverage report in CI.

---

### FE-QA-006 · Critical E2E workflow tests (GRN, Stocktake, Issue FEFO)

**Type:** Test | **Phase:** 5

**Scope:**
Three full happy-path E2E workflows against dev API:

1. **GRN Post flow** — Create PO → Create GRN from PO → add lots → Post GRN (confirm FX) → reopen GRN → verify stored FX rate displayed (not live rate) → verify read-only state
2. **Stocktake lifecycle** — Create session → Start (lock warehouse) → Count (barcode scan) → Variance (enter reasons) → Approve → Post (verify lock released)
3. **Issue FEFO flow** — Create Issue → open FEFO allocator → auto-allocate lots (expiry ASC) → post → verify ledger entry created

**Files/Areas touched:** `tests/e2e/workflows/`

**Dependencies:** FE-QA-001 complete; all relevant screen tasks complete

**Acceptance Criteria:**
- All 3 workflows green in CI against dev environment
- GRN: stored FX rate persists; re-opening GRN shows stored rate (not live)
- Stocktake: warehouse lock released after Post; `LockBanner` gone from all screens
- Issue FEFO: lots allocated in expiry ASC order (earliest first)

**Test Plan:** Playwright: three workflow test files; all must pass in CI.

---

## Coverage Checklist

### Screens → Tasks

| Module | Required Screens | Tasks |
|---|---|---|
| Auth & Global | 6 | FE-AUTH-001/002/003/004 |
| Master Data Entities | 30 | FE-MD-001/002/003 |
| Excel Import | 4 | FE-MD-004 |
| Kitchen Requests | 3 | FE-OPS-KIT-001 |
| Issues | 6 | FE-OPS-ISSUE-001/002/003 |
| Transfers | 5 | FE-OPS-TRANS-001 |
| Stocktake | 8 | FE-OPS-STOCK-001/002/003 |
| Adjustments | 3 | FE-OPS-ADJ-001 |
| PR | 4 | FE-PRO-PR-001 |
| PO | 4 | FE-PRO-PO-001 |
| GRN | 5 | FE-PRO-GRN-001/002 |
| Inventory Views | 3 | FE-INV-001/002 |
| Notifications & Email | 4 | FE-NOTIF-001 |
| Reports | 7 | FE-REP-001 |
| Admin — Users | 4 | FE-ADMIN-001 |
| Admin — Roles | 2 | FE-ADMIN-002 |
| Admin — Audit + Settings | 2 | FE-ADMIN-003/004 (separated) |
| **Total** | **116** | **78 tasks** |

### Shared Components Coverage

| Component | Task | Required By |
|---|---|---|
| DataTable | FE-COMP-001 | All list screens |
| StatusBadge + Timeline | FE-COMP-002 | All operational documents |
| PostConfirmDialog | FE-COMP-003 | GRN, Stocktake, Adjustment, Issue |
| ScanInput | FE-COMP-004 | GRN scan, Issue scan, Stocktake count |
| FEFOLotAllocator | FE-COMP-005 | Issue create, GRN create |
| LockBanner | FE-COMP-006 | Issue, GRN, Transfer, Adjustment create |
| FXCapturePanel | FE-COMP-007 | GRN Post only |
| ImportWizard | FE-COMP-008 | Master Data import |
| AuditDiffViewer | FE-COMP-009 | Audit Logs admin screen |
| EmptyState / PD / Error / Skeleton | FE-COMP-010 | All screens |
| DocumentReadOnlyOverlay | FE-COMP-011 | All posted documents |

### Critical Workflow Test Coverage

| Workflow | Covered By |
|---|---|
| GRN post with FX capture | FE-QA-006 |
| Stocktake full lifecycle | FE-QA-006 |
| Issue with FEFO allocation | FE-QA-006 |
| Expired override (role-gated) | FE-OPS-ISSUE-003 test plan |
| Warehouse lock blocks other POSTs | FE-COMP-006 test plan |
| RTL parity all screens | FE-QA-001 |

---

*End of file — 78 tasks across 5 epics.*

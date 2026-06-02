# Front-End API-Readiness Audit

**Kitchen-Store Inventory System** — Enterprise Ledger-based, FEFO-driven Web App

**Audit Date:** 2026-05-12  
**Auditor:** Senior Frontend Architect / QA Lead  
**Overall Readiness:** **79% — B+**

---

## 1. Executive Summary

| Pillar | Score | Verdict |
|--------|-------|---------|
| 1. API Integration Architecture | **65%** | ⚠️ Foundational layer exists but missing critical error/refresh infrastructure |
| 2. Data Modeling & Mocking | **80%** | ✅ Strong types + mock adapter. Inconsistent feature-level types drag the score |
| 3. Business Logic & UI Constraints | **75%** | ⚠️ FEFO/scanner/lock foundations solid, each has ~2-3 blocking gaps |
| 4. Resilience & Edge Cases | **93%** | ✅ Production-ready. Minor hardening items only |
| 5. Localization & Formatting | **85%** | ⚠️ Excellent i18n/RTL. `formatNumber` precision bug and `date-fns` bleed need fixing |
| **OVERALL** | **79%** | **⚠️ PROCEED WITH CAUTION** — 3-day hardening sprint recommended before backend kickoff |

**Go/No-Go:** The FE is usable now, but you will accumulate technical debt if you start building APIs before closing the 5 CRITICAL gaps. Recommend 3-5 days of hardening before backend start.

---

## 2. Audit Report by Pillar

---

### PILLAR 1: API Integration Architecture (65%)

| # | Item | Status | Details |
|---|------|--------|---------|
| 1.1 | Centralized API client | ✅ | `lib/api/client.ts` — unified `apiClient` with native `fetch`, Zod response validation on all responses |
| 1.2 | Service layer files | ✅ | `adapters.ts` (camelCase/snake_case converters), `types.ts`, `errors.ts`, `conflict-bus.ts` |
| 1.3 | JWT injection | ⚠️ | Inline in `client.ts:44` via Bearer header from `localStorage`. Works but no interceptor pattern — tightly coupled to the `request()` function |
| 1.4 | Refresh token mechanism | ❌ **MISSING** | `SessionTimeoutModal.tsx` is fully stubbed (`const isSessionTimeout = false; const resolveSessionTimeout = () => {};`). No token expiry parsing, no refresh endpoint call, no silent renewal |
| 1.5 | Global error toast (401/403/500) | ❌ **MISSING** | No global interceptor captures HTTP errors. `QueryProvider.onError` handles only 409 (Conflict). ~30+ scattered `toast.error()` calls across feature hooks — redundant and inconsistent |
| 1.6 | Global 409 conflict handling | ✅ | `ConflictBus` + `ConflictProvider` + `ConflictDialog` + `useSafeMutation` — clean decoupled pattern with retry/reload/stay |
| 1.7 | Environment variables | ⚠️ | Only `.env.local` with `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_USE_MOCKS`. No `.env.production`, `.env.staging`, `.env.example` |
| 1.8 | Feature API consistency | ⚠️ | Mix of 3 patterns: `apiClient` (stocktakes, master-data), raw `fetch()` (currencies — `useCurrencies.ts:19-21`), hardcoded Promises with `setTimeout` (purchasing/operations/items/warehouses) |
| 1.9 | React Query integration | ✅ | `staleTime:60s`, `gcTime:5min`, `retry:1`, `MutationCache` for 409 interception — properly configured |
| 1.10 | Auth provider | ✅ | Login/logout/scope management in `AuthProvider.tsx`. Writes JWT to localStorage + cookie. No token expiry check on startup |
| 1.11 | Provider hierarchy | ✅ | Well-structured in `layout.tsx`: NextIntlClientProvider > QueryProvider > UnsavedChangesProvider > ConflictProvider > ConfirmationProvider > AuthProvider > ThemeProvider > WarehouseScopeProvider |

#### Key File Paths
- `apps/web/src/lib/api/client.ts` — Core API client
- `apps/web/src/lib/api/adapters.ts` — Key converters + normalizers
- `apps/web/src/lib/api/errors.ts` — ApiError class
- `apps/web/src/lib/api/ConflictError.ts` — 409 conflict error
- `apps/web/src/lib/api/conflict-bus.ts` — Conflict event bus
- `apps/web/src/providers/AuthProvider.tsx` — Auth state management
- `apps/web/src/providers/QueryProvider.tsx` — React Query + MutationCache
- `apps/web/src/providers/ConflictProvider.tsx` — 409 dialog provider
- `apps/web/src/providers/ErrorProvider.tsx` — Global error handler (unhandledrejection + window.onerror only)
- `apps/web/src/core/concurrency/useSafeMutation.ts` — Mutation wrapper

---

### PILLAR 2: Data Modeling & Mocking (80%)

| # | Item | Status | Details |
|---|------|--------|---------|
| 2.1 | Core domain types (Zod) | ✅ | All major domains covered: `inventory.ts` (StockBalanceItem, InventoryLot, InventoryMovement, DashboardKPI), `documents.ts` (GRN, PR, PO, Issue, Transfer, Adjustment with full line items), `stocktake.ts` (StocktakeCount, StocktakeSession, WarehouseLockState), `master-data.ts` (Branch, Warehouse, Department, Item, Lot, Supplier, Category, UoM, Currency, FXRate, Barcode), `auth.ts`, `admin.ts`, `rbac.ts`, `notifications.ts` |
| 2.2 | Centralized status contracts | ✅ | `contracts/statuses.ts` — 8 document domains with `as const` + union types + `assertNever()`: PR_STATUS, PO_STATUS, GRN_STATUS, STOCKTAKE_STATUS, TRANSFER_STATUS, ISSUE_STATUS, ADJUSTMENT_STATUS, KITCHEN_REQUEST_STATUS |
| 2.3 | Shared package types | ❌ **MISSING** | `packages/contracts/src/index.ts` is empty (`export {};`). No shared types across the monorepo — all type definitions live inside `apps/web/` |
| 2.4 | Feature-level types consistency | ⚠️ | Duplication between canonical `types/` and `features/*/types/` with conflicting naming conventions (snake_case vs camelCase). Example: `features/purchasing/types/index.ts` diverges from `types/documents.ts`; `features/operations/types/index.ts` uses camelCase diverging from canonical snake_case |
| 2.5 | In-memory mock database | ✅ | `infrastructure/mock/` — full CRUD with Zod-validated generic repository, storage drivers (memory/localStorage), factory functions, seed orchestration |
| 2.6 | Mock API adapter | ✅ | 727-line `mock-api.adapter.ts` covering all major routes with real business logic: inventory manifestation on POST, warehouse lock simulation, FEFO-like lot handling, version conflict detection, status transition validation |
| 2.7 | Seed data realism | ⚠️ | Master data well-seeded with bilingual data. **Gaps:** Purchasing seeds have no line items (`lines: []`); operations seeds for transfers/adjustments/kitchen-requests are empty arrays; stocktake `stk-002` (posted) has no items array |
| 2.8 | Legacy static mocks | ✅ | `lib/api/mocks/` — fallback mocks for inventory, auth, notifications, admin, reports — realistic nested data with dates |
| 2.9 | JSON fixture files | ❌ **MISSING** | No JSON fixture files or `__mocks__` directories. All mocks are code-bound TypeScript — cannot be easily swapped or shared with external tools |
| 2.10 | E2E test fixtures | ⚠️ | Minimal — only `tests/e2e/fixtures/auth.ts` exists for Playwright context setup |

#### Key File Paths
- `apps/web/src/types/inventory.ts` — StockBalanceItem, InventoryLot, InventoryMovement
- `apps/web/src/types/documents.ts` — GRN/PR/PO/Issue/Transfer/Adjustment schemas
- `apps/web/src/types/stocktake.ts` — StocktakeCount, StocktakeSession, WarehouseLockState
- `apps/web/src/types/master-data.ts` — All master data types (Branch, Warehouse, Item, Lot, etc.)
- `apps/web/src/types/api.ts` — PaginatedResponse, ApiError, Zod helpers
- `apps/web/src/contracts/statuses.ts` — Centralized document statuses
- `apps/web/src/infrastructure/mock/mock-database.ts` — Mock DB registry
- `apps/web/src/infrastructure/mock/mock-api.adapter.ts` — 727-line mock adapter
- `apps/web/src/infrastructure/mock/mock-factory.ts` — Factory functions
- `apps/web/src/infrastructure/mock/seeds/` — Seed data files
- `packages/contracts/src/index.ts` — **EMPTY** — needs shared types
- `apps/web/src/lib/api/mocks/` — Legacy static mocks

---

### PILLAR 3: Business Logic & UI Constraints (75%)

| # | Item | Status | Details |
|---|------|--------|---------|
| 3.1 | FEFO lot sorting utilities | ✅ | `utils/fefo.ts` — `sortLotsByFEFO()`, `isExpired()`, `isNearExpiry()` — pure functions |
| 3.2 | FEFO lot allocator (shared) | ✅ | `shared/FEFOLotAllocator/` — auto-alloc based on FEFO, expired-skip for non-admin, override reason requirement, colour-coded rows (red=expired, amber=expiring, default=fresh), `max={lot.qty_available}` on input |
| 3.3 | Expired override modal | ✅ | `components/operations/expired-override-modal.tsx` — role-based (`CAN_OVERRIDE_EXPIRED`), min-10-chars reason validation |
| 3.4 | Qty max enforcement (JS-level) | ❌ **MISSING** | `LotRow.tsx:57-58` uses HTML `max` attribute only — no JS enforcement on `onChange`/`onBlur` to clamp values. Can be bypassed via browser devtools or direct value input |
| 3.5 | Hardcoded Arabic in component | ⚠️ | `ExpiredOverrideInline.tsx:8` contains hardcoded `تحذير: هذا المنتج منتهي الصلاحية` instead of using `useTranslations` |
| 3.6 | Duplicate FEFO component (legacy) | ⚠️ | `ui/fefo-lot-allocator.tsx` has hardcoded `MOCK_AVAILABLE_LOTS` — should be consolidated with the shared version |
| 3.7 | Barcode ScanInput component | ✅ | `shared/ScanInput/ScanInput.tsx` — 185 lines: Enter-key-trigger, debounce 300ms, double-trigger prevention 500ms, `scannerMode` prop with global keydown redirect, auto-focus, status indicators (idle/success/error), scan-line animation |
| 3.8 | Dedicated scan mode overlay | ✅ | `shared/ScanInput/ScanMode.tsx` — full-screen overlay with `backdrop-blur-md`, `z-[100]`, animated scan-line |
| 3.9 | Scan integration in forms | ✅ | Integrated in PR form, Issue form, GRN form, Transfer form, Item form, Barcode mapping page |
| 3.10 | Reusable `useBarcodeScanner` hook | ❌ **MISSING** | Scanner logic is embedded in the `ScanInput` component. No extracted hook for non-input scenarios (e.g., full-screen scan mode, page-level scan navigation) |
| 3.11 | USB vs manual typing auto-detection | ❌ **MISSING** | `scannerMode` is prop-driven (not auto-detected). No timing-based heuristics to distinguish rapid-fire USB scanner input (<50ms between keystrokes) from human typing |
| 3.12 | Camera-based scanning library | ❌ **MISSING** | `ScannerClient.tsx` uses `setTimeout` mock. No integration with `zbar-wasm`, `quagga2`, `html5-qrcode`, or similar |
| 3.13 | Stocktake posting lock — warehouse lock | ✅ | `useWarehouseLock` hook, `LockBanner` with pulsating alert, `DocumentLockBanner` with variant styling, `DocumentLock` fieldset wrapper, proper `isDomainLocked('STOCKTAKE', status)` guard |
| 3.14 | Stocktake — transfer/issue disabled when locked | ✅ | Transfer ship/receive/new checked (dual warehouse lock), Issue post checked — all use `isEitherLocked` to disable actions |
| 3.15 | Issue form ignores lock during editing | ⚠️ | `issue-form.tsx:98` calls `useWarehouseLock` but **does not destructure the return value** — lock only checked on post error, not proactively during editing |
| 3.16 | No global lock context | ❌ **MISSING** | No `WarehouseLockProvider` — each component fetches independently via `useWarehouseLock`, no shared state across the app |
| 3.17 | No "Posting Lock" specific label | ⚠️ | `DocumentLockBanner` shows generic `document_locked` text, not a specific "Posting in Progress — Inventory Frozen" message for stocktake contexts |
| 3.18 | Approval workflow engine | ✅ | `core/workflow/document-engine.ts` — 332 lines: `workflowMap`, `transitionMapV2`, `canPerformActionV2()`, `isDocumentLocked()`, `getNextStatusV2()` — role-based |
| 3.19 | ActionGuard component | ✅ | `core/workflow/ActionGuard.tsx` — wraps children, renders only if `canPerformActionV2()` returns true, with `fallback` prop |
| 3.20 | PR inline approve/reject UI | ⚠️ | PR form navigates away to approve (`/purchase-requests/${id}/approve`). No inline rejection reason dialog. No status timeline component |
| 3.21 | PO ActionGuard buttons | ⚠️ | PO form has `isLocked` read-only but **zero workflow action buttons** — no ActionGuard for approve/reject/submit visible at all |

#### Key File Paths
- `apps/web/src/utils/fefo.ts` — FEFO utilities
- `apps/web/src/components/shared/FEFOLotAllocator/` — Shared FEFO allocator
- `apps/web/src/components/ui/fefo-lot-allocator.tsx` — **Legacy duplicate** with hardcoded mocks
- `apps/web/src/components/shared/ScanInput/` — Barcode scanner component suite
- `apps/web/src/hooks/useWarehouseLock.ts` — Warehouse lock hook
- `apps/web/src/components/shared/LockBanner.tsx` — Warehouse lock banner
- `apps/web/src/components/shared/DocumentLockBanner.tsx` — Document-level lock banner
- `apps/web/src/components/shared/DocumentLock.tsx` — Disabled fieldset wrapper
- `apps/web/src/core/workflow/document-engine.ts` — Workflow engine
- `apps/web/src/core/workflow/ActionGuard.tsx` — Role-based action guard
- `apps/web/src/domain/status-guards.ts` — Domain-specific guards

---

### PILLAR 4: Resilience & Edge Cases (93%)

| # | Item | Status | Details |
|---|------|--------|---------|
| 4.1 | `useSafeMutation` pattern | ✅ | All data-modifying hooks use `useSafeMutation` — intercepts HTTP 409 conflicts centrally with retry/reload/stay dialog |
| 4.2 | Submit button disabling | ✅ | `FormFooter` disables Save/Cancel on `isSaving`; `PostConfirmDialog` disables confirm + blocks Escape/backdrop on `isLoading`; all forms (login, PR, PO, GRN, Issue, Warehouse, Branch, Supplier, Item) disable buttons during submit |
| 4.3 | Idempotency key | ✅ | Import wizard uses `crypto.randomUUID()` as idempotency key |
| 4.4 | ConflictProvider + ConflictDialog | ✅ | Global 409 optimistic-locking handled with clean Retry/Reload/Stay UX |
| 4.5 | Skeleton components | ✅ | `PageSkeleton` (list + detail variants), `TableSkeleton` (configurable rows/columns), `LoadingSkeleton` (generic), `InlineLoader` (spinner + label) |
| 4.6 | Skeleton usage coverage | ⚠️ | **3 hardcoded `isLoading={false}`** — `LotBalanceClient.tsx:205`, `StocktakeListClient.tsx:249`, `SupplierProfileClient.tsx:285` — these skip skeleton loading states |
| 4.7 | Empty states — `EmptyState` component | ✅ | Dual implementation in `shared/EmptyState.tsx` (image + icon variants) and `ui/empty-state.tsx` (basic) |
| 4.8 | Empty states — DataTable integration | ✅ | All ~20+ list clients pass contextual `emptyState` with title, description, optional CTA. DataTable auto-renders `EmptyState` when `data.length === 0` |
| 4.9 | Error boundaries — `GlobalErrorBoundary` | ✅ | Class component at root `layout.tsx` — catches render errors app-wide |
| 4.10 | Error boundaries — `ErrorBoundary` | ✅ | Class component at app shell `(app)/layout.tsx` — "System Fault Detected" UI + retry button |
| 4.11 | Error boundaries — `ErrorProvider` | ✅ | Catches `unhandledrejection` + `window.onerror` |
| 4.12 | Error boundaries — `ErrorState` | ✅ | Contextual error messages, retry, back actions — used throughout |
| 4.13 | Error passthrough to DataTable | ⚠️ | `MovementsClient`, `AuditLogsClient`, `StocktakeVarianceClient`, `LotBalanceClient` don't pass `isError`/`onRetry` to DataTable — errors silently show empty table |
| 4.14 | `useMutation` improvements | ⚠️ | `useCreateItem`/`useDeleteItem` in `features/items/hooks/useItems.ts:53,108` use plain `useMutation` (not `useSafeMutation`) — no conflict detection |
| 4.15 | Network status banner | ✅ | `NetworkStatusBanner` handles offline/online transitions with toast |
| 4.16 | Per-row pending guards | ⚠️ | Issue form line-level action buttons (add line, scan, change qty, remove line) lack `disabled={isPending}` guards — rapid double-clicks on row actions not prevented |

#### Key File Paths
- `apps/web/src/core/concurrency/useSafeMutation.ts` — Mutation wrapper
- `apps/web/src/core/concurrency/ConflictDialog.tsx` — 409 dialog
- `apps/web/src/providers/ConflictProvider.tsx` — Conflict provider
- `apps/web/src/providers/ErrorProvider.tsx` — Global error handler
- `apps/web/src/components/shared/ErrorBoundary.tsx` — Error boundary
- `apps/web/src/components/shared/GlobalErrorBoundary.tsx` — Global error boundary
- `apps/web/src/components/shared/ErrorState.tsx` — Error state display
- `apps/web/src/components/shared/EmptyState.tsx` — Empty state component
- `apps/web/src/components/shared/PageSkeleton.tsx` — Page skeleton
- `apps/web/src/components/shared/TableSkeleton.tsx` — Table skeleton
- `apps/web/src/core/network/NetworkStatusBanner.tsx` — Offline/online banner

---

### PILLAR 5: Localization & Formatting (85%)

| # | Item | Status | Details |
|---|------|--------|---------|
| 5.1 | Currency formatting — `formatCurrency()` | ✅ | `utils/currency.ts` — dynamic `currencyCode` parameter (multi-currency support), 2-decimal enforcement via `minimumFractionDigits: 2`, `Intl.NumberFormat` locale-aware, Western Arabic numerals for Arabic locale (`ar-u-nu-latn`), error handling with fallback |
| 5.2 | Multi-currency usage at GRN post | ✅ | `GRNPostClient.tsx:270,293` passes dynamic `supplierCurrency` from document data |
| 5.3 | `formatNumber()` precision bug | ❌ **CRITICAL** | When `precision` is `undefined`, `Intl.NumberFormat` receives `minimumFractionDigits: undefined` — coerces to **0 decimals**. `formatNumber(1234.56)` returns `"1,235"` instead of `"1,234.56"`. Active data loss across 54+ call sites |
| 5.4 | Date formatting — centralized utilities | ✅ | `formatDate()`, `formatDateTime()`, `formatTime()` in `utils/currency.ts` — locale-aware via `Intl.DateTimeFormat` |
| 5.5 | Date formatting — hydration safety | ✅ | `ClientOnlyTime` wrapper (76+ locations) prevents hydration mismatches |
| 5.6 | Date formatting — `date-fns` bleed | ⚠️ | **6 files bypass centralized formatters** with raw `date-fns` `format()` — loses locale awareness: `TransferListClient.tsx`, `AuditLogsClient.tsx`, `LotEntryModal.tsx`, `KitchenRequestsListClient.tsx`, `AdjustmentViewer.tsx`, `pdfExport.ts` |
| 5.7 | RTL/LTR — HTML `dir` switching | ✅ | `layout.tsx:57,63` — `const direction = locale === 'ar' ? 'rtl' : 'ltr'` on `<html>` element |
| 5.8 | RTL/LTR — CSS logical properties | ✅ | Extensive use of `start-0`, `end-0`, `ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end` — no hardcoded `left`/`right` found in layout CSS |
| 5.9 | RTL/LTR — Icon flipping | ✅ | 35+ instances of `rtl:rotate-180` for chevrons, arrows, pagination |
| 5.10 | RTL/LTR — Font support | ✅ | `IBM_Plex_Sans_Arabic`, `Tajawal`, `Ya Modern Pro` — Arabic display fonts configured |
| 5.11 | RTL/LTR — Arabic typography | ✅ | `globals.css:254-285` — `:lang(ar)` removes letter-spacing, increases line-height, adjusts heading weights |
| 5.12 | RTL/LTR — minor hardcoded directions | ⚠️ | `text-left rtl:text-right` in 2 files instead of `text-start`/`text-end`: `KitchenRequestViewer.tsx:140`, `KitchenRequestForm.tsx:269` |
| 5.13 | Translation system — library | ✅ | `next-intl` fully configured with `createNextIntlPlugin`, `defineRouting`, locale prefix `'always'` |
| 5.14 | Translation system — coverage | ✅ | 2460 keys in both `en.json` and `ar.json` with **perfect key parity** — all authenticated strings translated |
| 5.15 | Translation system — usage | ✅ | 305+ files use `useTranslations('namespace')` — consistent pattern |
| 5.16 | Hardcoded strings | ⚠️ | 1 instance: `FXRateCapture.tsx:95` — Arabic fallback `'تأكيد السعر'` instead of English when translation key fails |
| 5.17 | Unit test coverage — currency | ⚠️ | Currency tests only check `toBeTruthy()` — never validate actual formatted output (currency symbol, decimal places, locale-specific separators) |
| 5.18 | Unit test coverage — date formatting | ❌ **MISSING** | No tests for `formatDate`, `formatDateTime`, `formatTime` |

#### Key File Paths
- `apps/web/src/utils/currency.ts` — All formatting utilities
- `apps/web/src/lib/utils.ts` — Re-export point
- `apps/web/src/components/shared/ClientOnlyTime.tsx` — Hydration-safe date rendering
- `apps/web/src/components/shared/LocaleSwitcher.tsx` — Language toggle
- `apps/web/src/i18n/routing.ts` — Locale routing config
- `apps/web/src/i18n/request.ts` — Message loader
- `apps/web/src/i18n/navigation.ts` — Navigation helpers
- `apps/web/messages/en.json` — English translations (2881 lines, 2460 keys)
- `apps/web/messages/ar.json` — Arabic translations (2877 lines, 2460 keys)
- `apps/web/src/tests/unit/currency.test.ts` — **Weak test coverage**

---

## 3. Actionable Checklist

### 🔴 CRITICAL — Must Fix Before Backend Start

| # | Pillar | Task | File(s) | Estimated Effort |
|---|--------|------|---------|:----------------:|
| C1 | **P1** | **Implement refresh token mechanism** — Parse JWT expiry in AuthProvider, call refresh endpoint, update token in localStorage + cookie. Un-stub `SessionTimeoutModal.tsx` | `AuthProvider.tsx`, `SessionTimeoutModal.tsx`, `client.ts` | 4-6 hours |
| C2 | **P1** | **Build global error interceptor** — Wrap `apiClient.request()` or React Query `QueryCache` to catch 401 (auto-logout), 403 (permission toast), 500 (generic error toast). Remove ~30+ scattered `toast.error()` calls from feature hooks | `client.ts`, all `features/*/hooks/*.ts` | 3-5 hours |
| C3 | **P5** | **Fix `formatNumber()` precision bug** — When `precision` is undefined, omit `minimumFractionDigits`/`maximumFractionDigits` entirely so `Intl.NumberFormat` uses its default behavior | `utils/currency.ts:52-54` | 30 min |
| C4 | **P3** | **Add JS-level qty enforcement in FEFO allocator** — Clamp input value to `lot.qty_available` on `onChange`/`onBlur`. Do not rely solely on HTML `max` attribute | `shared/FEFOLotAllocator/LotRow.tsx:57-58` | 1 hour |

### 🟡 HIGH — Should Fix Before Backend Start

| # | Pillar | Task | File(s) | Estimated Effort |
|---|--------|------|---------|:----------------:|
| H1 | **P1** | **Standardize feature API calls** — Migrate raw `fetch()` in `useCurrencies.ts` and hardcoded `new Promise(setTimeout)` patterns in purchasing/operations/items/warehouses to use the mock adapter via `apiClient` | `features/currencies/hooks/useCurrencies.ts`, `features/purchasing/api/*`, `features/operations/api/*`, `features/items/api/*`, `features/warehouses/api/*` | 4-6 hours |
| H2 | **P3** | **Make Issue form respect warehouse lock during editing** — Destructure `isLocked` from `useWarehouseLock()`, disable form fields and show LockBanner when locked (not just on post error) | `features/operations/components/issue-form.tsx:98` | 1 hour |
| H3 | **P3** | **Consolidate duplicate FEFO component** — Remove hardcoded `MOCK_AVAILABLE_LOTS` from `ui/fefo-lot-allocator.tsx` and route usage to `shared/FEFOLotAllocator/` | `components/ui/fefo-lot-allocator.tsx` | 2 hours |
| H4 | **P5** | **Replace raw `date-fns` usage** — Audit and replace `format()` calls in 6 files with centralized `formatDate()`/`formatDateTime()`/`ClientOnlyTime` | `TransferListClient.tsx`, `AuditLogsClient.tsx`, `LotEntryModal.tsx`, `KitchenRequestsListClient.tsx`, `AdjustmentViewer.tsx`, `pdfExport.ts` | 2 hours |
| H5 | **P4** | **Fix hardcoded `isLoading={false}`** — Replace with actual loading state from hooks so skeletons render during data fetch | `LotBalanceClient.tsx:205`, `StocktakeListClient.tsx:249`, `SupplierProfileClient.tsx:285` | 30 min |

### 🟢 MEDIUM — Fix Within First Backend Sprint

| # | Pillar | Task | File(s) | Estimated Effort |
|---|--------|------|---------|:----------------:|
| M1 | **P3** | **Extract `useBarcodeScanner` hook** — Decouple scanner logic from ScanInput component for reuse in non-input scenarios | `components/shared/ScanInput/ScanInput.tsx` | 2-3 hours |
| M2 | **P2** | **Populate shared package** — Move canonical Zod schemas to `packages/contracts/src/index.ts` for cross-package sharing | `packages/contracts/src/index.ts` | 3-4 hours |
| M3 | **P1** | **Add environment config files** — Create `.env.production`, `.env.staging`, `.env.example` with appropriate defaults | `apps/web/` | 30 min |
| M4 | **P2** | **Align feature-level types** — Eliminate duplicate types, standardize naming convention. Recommended: snake_case for API boundary, camelCase internally | `features/*/types/*.ts` vs `types/*.ts` | 3-4 hours |
| M5 | **P4** | **Add `isError`/`onRetry` to DataTable** — Pass error state to DataTable in pages that currently don't | `MovementsClient.tsx`, `AuditLogsClient.tsx`, `StocktakeVarianceClient.tsx`, `LotBalanceClient.tsx` | 1 hour |
| M6 | **P3** | **Add ActionGuard workflow buttons to PO form** — Wire up approve/reject/submit with role-based guards | `features/purchasing/components/purchase-order-form.tsx` | 2-3 hours |
| M7 | **P4** | **Convert `useCreateItem`/`useDeleteItem` to `useSafeMutation`** — Add conflict detection for item mutations | `features/items/hooks/useItems.ts:53,108` | 30 min |
| M8 | **P5** | **Fix hardcoded Arabic fallback in FXRateCapture** — Replace with English fallback or ensure key always resolves | `components/shared/FXRateCapture.tsx:95` | 15 min |
| M9 | **P3** | **Fix hardcoded Arabic in ExpiredOverrideInline** — Replace with `useTranslations` call | `shared/FEFOLotAllocator/ExpiredOverrideInline.tsx:8` | 15 min |
| M10 | **P2** | **Enrich seed data** — Add line items to purchasing seeds, populate operations seeds (transfers, adjustments, kitchen-requests) with realistic data | `infrastructure/mock/seeds/purchasing.seed.ts`, `operations.seed.ts` | 2 hours |
| M11 | **P5** | **Strengthen unit tests** — Assert actual formatted output (currency symbol, decimal places, locale separators) in currency tests | `tests/unit/currency.test.ts` | 1-2 hours |

### 🔵 LOW — Polish Items

| # | Pillar | Task | File(s) | Estimated Effort |
|---|--------|------|---------|:----------------:|
| L1 | **P5** | Replace `text-left rtl:text-right` with `text-start text-end` | `KitchenRequestViewer.tsx:140`, `KitchenRequestForm.tsx:269` | 15 min |
| L2 | **P1** | Add server-side error handling in ErrorProvider (on 500, on 403) for clearer user feedback | `providers/ErrorProvider.tsx` | 1 hour |
| L3 | **P3** | Add timing-based USB scanner auto-detection to ScanInput | `components/shared/ScanInput/ScanInput.tsx` | 1-2 hours |
| L4 | **P3** | Add `disabled={isPending}` to per-row action buttons in IssueForm | `features/operations/components/issue-form.tsx:228-385` | 30 min |
| L5 | **P3** | Add date formatting unit tests for `formatDate()`, `formatDateTime()`, `formatTime()` | `tests/unit/currency.test.ts` | 1 hour |

---

## 4. Recommended Hardening Sprint Plan

| Day | Focus | Items | Expected Outcome |
|-----|-------|-------|-----------------|
| **Day 1** | Security + Error Handling | **C1** (refresh token), **C2** (global error interceptor) | 401/403/500 handled globally, token auto-refresh working |
| **Day 2** | Business Logic + Formatting | **C3** (precision bug), **C4** (FEFO qty clamp), **H1** (standardize API calls), **H2** (Issue lock), **H4** (date-fns cleanup) | No data loss, FEFO lock solid, all features on `apiClient` |
| **Day 3** | Hardening + Backend Readiness | **H3** (FEFO consolidation), **H5** (loading states), **M1–M6** (high/medium items) | FE at 95%+ readiness, can safely proceed to backend |

**After the sprint:** You can begin backend development with confidence. The front-end has clean abstraction layers, robust error handling, production-ready UX patterns, and solid i18n/RTL support. Remaining items (M7–M11, L1–L5) can be completed alongside backend work as low-priority backlog.

---

*Audit generated: 2026-05-12*

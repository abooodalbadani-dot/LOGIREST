# Phase 0 Research: LogiRest Frontend UI

**Feature Branch**: `001-logirest-frontend-ui`
**Date**: 2026-04-19
**Status**: Complete

---

## 1. Technology Stack Analysis

### 1.1 Next.js 16 + App Router

**Decision**: Use Next.js 16.2.4 (already installed) with App Router exclusively.
**Rationale**: App Router's Server Components (RSC) allow zero-JS data fetching for list/detail pages, reducing client bundle size. The `[locale]` segment + route groups (`(app)`, `(auth)`, etc.) are already scaffolded and align with the spec's multi-module navigation requirements.
**Alternatives Considered**:
- Pages Router: Rejected. Does not support RSC; less capable for layout nesting needed by AppShell.
- Remix: Rejected. Not installed; migration cost unjustified.

**Gotchas (from `node_modules/next/dist/docs/`):**
- `"use client"` directive must be placed at the **top** of files using React hooks; cannot be inside a shared file that also exports Server Components.
- `searchParams` is now an async prop in Next.js 15+ layouts and pages; always `await searchParams`.
- `cookies()` and `headers()` are async in Next.js 15+.

### 1.2 React 19 Compatibility

**Decision**: Use React 19.2.4 (already installed).
**Rationale**: Stable release; Actions API simplifies form mutation pattern used for POST flows.
**Gotchas**:
- `forwardRef` is deprecated in React 19; use direct `ref` prop on function components.
- `ReactDOM.render` removed; not applicable since Next.js handles hydration.

### 1.3 TanStack Query v5

**Decision**: Use TanStack Query v5 (`@tanstack/react-query` ^5.99.0) for all server-state management.
**Rationale**: v5 `useSuspenseQuery` pairs perfectly with RSC boundary / Suspense for loading states. `prefetchQuery` in Server Components + `dehydrate` is the authoritative pattern for avoiding waterfalls.
**Key v5 Changes From v4 (breaking)**:
- `useQuery({ cacheTime })` → `gcTime`
- `onSuccess`, `onError`, `onSettled` callbacks removed from `useQuery`; use `useEffect` or `useMutation` callbacks instead.
- `status: 'loading'` renamed to `status: 'pending'`.
- `keepPreviousData` removed; use `placeholderData: keepPreviousData` from import.

### 1.4 React Hook Form v7 + Zod v4

**Decision**: React Hook Form 7.72.1 with `@hookform/resolvers` 5.2.2 and Zod 4.3.6.
**Rationale**: RHF's uncontrolled pattern minimizes re-renders in dense form screens. Zod v4 is a major rewrite; schema definitions work the same but resolver import path changed.
**Zod v4 Breaking Changes**:
- Import from `zod` directly: `import { z } from 'zod'` (unchanged).
- `z.string().nonempty()` → use `z.string().min(1)`.
- `.refine()` async functions must be wrapped with `z.superRefine()` for complex cross-field validation.

### 1.5 next-intl v4 RTL Strategy

**Decision**: next-intl 4.9.1 for all i18n. Arabic (`ar`) is the default locale.
**Rationale**: v4 supports async `getTranslations()` in Server Components, eliminating client-side translation waterfalls.
**v4 Breaking Changes vs v3**:
- Middleware: `createMiddleware` replaced by a unified `routing` config approach.
- `useTranslations()` is now only valid in Client Components; use `await getTranslations()` in Server Components.
- `NextIntlClientProvider` must be in a Client Component boundary.
**RTL Implementation Pattern**:
- `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` in the root layout
- CSS logical properties (`padding-inline-start`, `margin-inline-end`) instead of `padding-left`/`padding-right` for all spacing
- Lucide icons with directional meaning (arrows, chevrons) need `scale-x-[-1]` in RTL via the `Icon` wrapper
- Numbers always wrapped in `<span dir="ltr">` within RTL context

### 1.6 Tailwind CSS v4

**Decision**: Tailwind CSS v4 (already installed). Dark mode only — no light mode toggle.
**Rationale**: v4's native CSS cascade layers and `@theme` directive replace `tailwind.config.js` token definition. All Operational Nocturne tokens are defined via CSS custom properties.
**v4 Key Differences**:
- Config file is now `optional`; tokens defined in CSS via `@theme {}` block.
- `darkMode: 'class'` → in v4, use `@variant dark` in CSS or the `:root` dark class strategy.
- Built-in CSS variables: all design tokens automatically become `--color-*` CSS variables.
- Utility generation is on-demand (JIT is default and only mode).

### 1.7 shadcn/ui v4 (via `shadcn` CLI 4.3.0)

**Decision**: shadcn CLI-managed components only in `src/components/ui/`.
**Rationale**: shadcn generates fully-owned component files. `base-ui/react` is also installed as an alternative primitive layer for complex components (Dialog, Select) with better RTL support.
**Pattern**: shadcn components customized with Operational Nocturne CSS variables in `globals.css` using `--primary`, `--background`, etc.

---

## 2. Architectural Decisions

### 2.1 RSC vs Client Component Boundary

| Pattern | Server (RSC) | Client (`'use client'`) |
|---------|--------------|------------------------|
| List pages (GRN, PR, Issues) | ✅ Data fetching | ❌ |
| Detail page (read-only header) | ✅ | ❌ |
| Forms (Create/Edit) | ❌ skeleton | ✅ RHF + state |
| Scan Mode | ❌ | ✅ event listeners |
| FEFO Lot Allocator | ❌ | ✅ complex state |
| Notifications bell | ❌ | ✅ polling state |

### 2.2 State Management

- **Server State**: TanStack Query (documents, master data lists)
- **Form State**: React Hook Form (document creation/editing)
- **Scan State**: Local `useReducer` inside `ScanInput` (ephemeral)
- **Auth/Session**: React Context (`AuthProvider`) + httpOnly cookie
- **UI State** (modals, sidebars): Local `useState`; no global store

### 2.3 API Client Pattern

```typescript
// src/lib/api/client.ts
const apiClient = {
  get: <T>(url: string, schema: ZodSchema<T>) => typed fetch,
  post: <T, B>(url: string, body: B, schema: ZodSchema<T>) => typed fetch,
  // ...
}
```
All responses validated with Zod at the API boundary. On validation failure: dev-console warning (non-blocking in prod). `ApiError` carries localized `message` key from i18n for rendering.

### 2.4 RBAC Approach

**Decision**: Derive permissions from JWT claims synchronously. No API call needed per permission check.
**Implementation**: `usePermission(action, resource)` reads `user.scopes` from `AuthContext`. Scopes include `{ branch_id, warehouse_id, department_id }`.

| Role | Scope Level |
|------|-------------|
| ADMIN | All branches, all warehouses |
| INV_MGR | Assigned branches |
| WH_KEEPER | Assigned warehouses |
| PROC_OFFICER | Assigned departments |
| AUDITOR | Read-only all |

**Data visibility**: API server enforces scoping. Frontend uses scope from JWT to pre-filter UI dropdowns and hide empty branches/warehouses before API response arrives.

### 2.5 Barcode Scan Architecture

**Decision**: USB keyboard wedge only (camera deferred per clarification Q2). UI hooks (button + layout slot) designed to accept camera input callback without component changes.
**Pattern**:
```
USB Wedge → keydown events → ScanInput listens for rapid key sequence + Enter terminator
→ onScan(barcode) callback → parent resolves to item/lot
→ UI feedback (cyan border pulse, scan log entry)
```
**Refocus guarantee**: `ScanInput` registers a global `blur` handler that calls `inputRef.current.focus()` after 100ms.

### 2.6 Stocktake Lock Propagation

**Decision**: Query `stocktake/active` on entering any warehouse-specific screen. Cache result in TanStack Query with 30s stale time.
**Implementation**: `useWarehouseLock(warehouseId)` hook. Lock state drives `<LockBanner>` visibility and `disabled` state on all POST buttons. Users may still save drafts (status stays `DRAFT`).

### 2.7 FEFO Logic

**Decision**: Frontend sorts lots by `expiry_date ASC` (FEFO). Server provides raw lot list; client applies sort.
**Rationale**: Allows UI-level near-expiry color coding (≤30 days = amber) without a server round-trip.
**Override flow**: ADMIN/INV_MGR only. Inline textarea per lot row. `onExpiredOverride(lotId, reason)` fires; reason stored in document metadata.

### 2.8 FX Rate Display

**Decision (from clarification)**: Internal table only. UI fetches `/currencies/fx-rates` to populate rates in PO/GRN forms. FX rate at time of GRN posting is captured and stored immutably.
**Pattern**: On GRN Post, if PO is in foreign currency, a mandatory `FXRateCapture` step appears in `PostConfirmDialog` requiring the user to confirm (or adjust) the rate before finalizing.

---

## 3. Testing Strategy

### 3.1 Vitest (Unit)

- All logic hooks: `useFEFOSort`, `usePermission`, `useFXCalculation`, `useScanInput`
- Component snapshots: `StatusBadge` variants, `PostConfirmDialog` states
- API client: interceptor retry logic, Zod validation path
- Tool: Vitest 4.1.4 + Testing Library 16.3.2 + jsdom

### 3.2 Playwright (E2E)

- Happy paths: Issue 10 items via scan → POST; Create GRN with FX → POST
- RBAC validation: AUDITOR cannot access admin routes
- RTL layout: sidebar position, breadcrumb arrow direction, pagination
- Stocktake lock: attempt POST to locked warehouse → assert blocked
- Locale switch: persist across navigation

---

## 4. Performance Targets (from SC-001)

| Metric | Target | Strategy |
|--------|--------|----------|
| Stock issue (10 items, scan mode) | ≤60 seconds total | Optimistic UI on scan; batch line item updates |
| Scan re-focus latency | ≤100ms | `setTimeout(focus, 100)` on blur event |
| Document list load (p95) | ≤800ms | RSC prefetch + TanStack staleTime 60s |
| RTL layout switch | ≤200ms | CSS-driven (no JS re-render) |

---

## 5. Gaps / Risks Identified

| Risk | Mitigation |
|------|------------|
| No real backend (API stubs only) | MSW (Mock Service Worker) or static JSON mocks in `src/lib/api/mocks/` |
| 116 screens — large scope for single branch | Strict build order from `Front_end_execution_tasks.md`; Week 1-8 plan respected |
| RTL Tailwind component overrides | Validate every component in both locales before merge (constitution DoD check) |
| Zod v4 schema changes | Audit all schema definitions when upgrading; v4 resolver already installed |
| TanStack Query v5 callback removals | Use `useMutation.onSuccess` for side-effects; never `useQuery` callbacks |

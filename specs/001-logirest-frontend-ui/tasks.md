# Tasks: LogiRest Frontend UI
# Branch: 001-logirest-frontend-ui | Stack: Next.js 16 · React 19 · TypeScript strict · TanStack Query v5 · React Hook Form 7 · Zod v4 · next-intl v4 · Tailwind v4 · shadcn 4

<!--
  HOW TO READ THESE TASKS
  ───────────────────────
  • Each task is 100 % self-contained: it embeds exact type shapes, imports, API
    endpoints, prop signatures, and acceptance criteria inline.
  • You MUST NOT read any other file to complete a task — everything is here.
  • [P] = safe to work on in parallel with other [P] tasks in the same phase.
  • [USx] = belongs to User Story x (for traceability only).
  • Acceptance Signal at the end of each task = what "done" looks like.

  GLOBAL PROJECT RULES (apply to every task)
  ───────────────────────────────────────────
  1. NEVER use `padding-left` / `margin-left` / `right:` / `left:` —
     use CSS logical properties: `padding-inline-start`, `inset-inline-end`, etc.
     In Tailwind use `ps-*`, `pe-*`, `ms-*`, `me-*` utilities.
  2. NEVER hard-code a user-visible string. Always use t('key') from next-intl.
  3. NEVER use `any` type — TypeScript strict mode is enforced.
  4. All numeric values rendered inside Arabic (RTL) context must be wrapped:
     `<span dir="ltr">{number}</span>`
  5. All Next.js 16 pages must `await searchParams` — it is async.
  6. TanStack Query v5: use `gcTime` (NOT `cacheTime`); no `onSuccess`/`onError`
     on `useQuery`; use `useMutation` callbacks instead.
  7. Zod v4: use `z.string().min(1)` (NOT `.nonempty()`).
  8. React 19: no `forwardRef` — pass `ref` as a normal prop.
  9. next-intl v4: `getTranslations()` in Server Components (async);
     `useTranslations()` in Client Components only.
  10. Posted documents (status === 'POSTED') are IMMUTABLE — all inputs disabled.
  11. Every irreversible POST action must go through `PostConfirmDialog`.
  12. If warehouse is locked (stocktake active), POST buttons are disabled
      site-wide for that warehouse; drafts may still be saved.
  13. Design system: dark-mode only ("Operational Nocturne"); no light-mode toggle.
-->

---

## PHASE 1 — Setup & Infrastructure
**Purpose**: Verify scaffold, configure i18n, auth shell, API client, Tailwind tokens, test runners.
**BLOCKS**: Every other phase. Complete all Phase 1 tasks before Phase 2.

---

- [x] T001 Verify the Next.js 16 development server starts and TypeScript compiles.
  Run `npm run dev` — confirm it starts on port 3000 without errors.
  Run `npx tsc --noEmit` — confirm zero TypeScript errors.
  Also confirm `src/app/[locale]/layout.tsx` exists (it should already from scaffold).
  If either command fails, fix the root cause before continuing.
  **Acceptance**: `npm run dev` prints "ready" and `tsc --noEmit` exits 0.

- [x] T002 [P] Create `src/app/[locale]/layout.tsx` — the root layout for ALL authenticated and unauthenticated pages.
  This is a **Server Component** (no `'use client'`).
  It receives `{ children, params }` where `params: Promise<{ locale: string }>`.
  Await params: `const { locale } = await params`.
  Set `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.
  Load fonts from `src/lib/fonts.ts` (IBM Plex Sans Arabic for AR, Inter for EN) and apply as className on `<body>`.
  Wrap children with `<NextIntlClientProvider>` (import from `next-intl`; pass `locale` and `messages` loaded via `import('@/messages/{locale}.json')`).
  Wrap children with `<QueryProvider>` (to be created in T011).
  Wrap children with `<AuthProvider>` (to be created in T005).
  **Acceptance**: Page renders with `dir="rtl"` when locale=ar, `dir="ltr"` when locale=en.

- [x] T003 Create `src/i18n/config.ts` — next-intl v4 routing configuration.
  Content:
  ```typescript
  import { defineRouting } from 'next-intl/routing';
  export const routing = defineRouting({
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
  });
  ```
  Also create/update `src/middleware.ts` at the repo root (NOT inside src/app):
  ```typescript
  import createMiddleware from 'next-intl/middleware';
  import { routing } from './src/i18n/config';
  export default createMiddleware(routing);
  export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
  ```
  **Acceptance**: Navigating to `/` redirects to `/ar/`; navigating to `/en/` returns 200.

- [x] T004 [P] Create skeleton i18n message files with placeholder keys for all modules.
  File 1: `messages/ar.json` — Arabic translations (default locale).
  File 2: `messages/en.json` — English translations.
  Both files must have the SAME key structure. Values in ar.json are Arabic; in en.json are English.
  Minimum required top-level keys (add empty objects for now, they will be filled per task):
  ```json
  {
    "common": {},
    "auth": {},
    "procurement": { "grn": {}, "pr": {}, "po": {} },
    "operations": { "issue": {}, "transfer": {}, "adjustment": {}, "stocktake": { "warehouse_locked_banner": "المستودع مقفل بسبب جرد مفتوح: {sessionNumber}" } },
    "masterData": { "branches": {}, "warehouses": {}, "items": {}, "suppliers": {}, "currencies": {}, "departments": {}, "uom": {}, "categories": {}, "barcodes": {} },
    "inventory": { "balance": {}, "lots": {}, "movements": {} },
    "notifications": {},
    "reports": {},
    "admin": {}
  }
  ```
  **Acceptance**: `import arMessages from '@/messages/ar.json'` compiles without error.

- [x] T005 [P] Create the auth context and provider in `src/providers/AuthProvider.tsx`.
  This is a **Client Component** (`'use client'` at top).
  Define and export these TypeScript types in this file (or import from `src/types/auth.ts` if it exists):
  ```typescript
  export type UserRole = 'ADMIN' | 'INV_MGR' | 'WH_KEEPER' | 'PROC_OFFICER' | 'AUDITOR';
  export interface UserScope { branch_id: string | null; warehouse_id: string | null; department_id: string | null; }
  export interface AuthUser { id: string; name: string; email: string; role: UserRole; scopes: UserScope[]; locale: 'ar' | 'en'; }
  export interface AuthContextValue { user: AuthUser | null; token: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void; isLoading: boolean; }
  ```
  Create `AuthContext = createContext<AuthContextValue>(...)`.
  `AuthProvider` reads token from `localStorage.getItem('logirest_token')` on mount, decodes the JWT payload (base64 decode without a library) to get `user` fields.
  `login()` calls `POST /api/v1/auth/login` with `{ email, password }`, stores token in `localStorage`, sets `user` state.
  `logout()` clears localStorage, sets user/token to null, redirects to `/[locale]/login`.
  Export `useAuth = () => useContext(AuthContext)`.
  **Acceptance**: `useAuth().user` returns null before login, returns `AuthUser` after login.

- [x] T006 [P] Create `src/hooks/useSession.ts` — convenience hook for session state.
  Client-side only (`'use client'` NOT needed — it's just a hook).
  ```typescript
  import { useAuth } from '@/providers/AuthProvider';
  export function useSession() {
    const { user, token, logout, isLoading } = useAuth();
    return { user, token, logout, isAuthenticated: !!user, isLoading };
  }
  ```
  **Acceptance**: Hook compiles; `useSession().user` is `AuthUser | null`.

- [x] T007 [P] Create `src/types/rbac.ts` — RBAC permission types and the permission matrix constant.
  ```typescript
  import type { UserRole } from '@/providers/AuthProvider';
  export type ResourceType = 'grn' | 'pr' | 'po' | 'issue' | 'transfer' | 'adjustment' | 'stocktake' | 'inventory' | 'master_data' | 'admin' | 'reports';
  export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'post' | 'approve';
  export type PermissionMatrix = Record<UserRole, Partial<Record<ResourceType, ActionType[]>>>;

  export const PERMISSION_MATRIX: PermissionMatrix = {
    ADMIN:        { grn: ['view','create','edit','delete','post'], pr: ['view','create','edit','delete','post','approve'], po: ['view','create','edit','delete','post'], issue: ['view','create','edit','delete','post'], transfer: ['view','create','edit','delete','post'], adjustment: ['view','create','edit','delete','post','approve'], stocktake: ['view','create','edit','post'], inventory: ['view'], master_data: ['view','create','edit','delete'], admin: ['view','create','edit','delete'], reports: ['view'] },
    INV_MGR:      { grn: ['view','create','edit','post'], pr: ['view','create','edit','post','approve'], po: ['view','create','edit','post'], issue: ['view','create','edit','post'], transfer: ['view','create','edit','post'], adjustment: ['view','create','edit','post','approve'], stocktake: ['view','create','edit','post'], inventory: ['view'], master_data: ['view','create','edit'], reports: ['view'] },
    WH_KEEPER:    { grn: ['view','create','edit'], pr: ['view'], po: ['view'], issue: ['view','create','edit','post'], transfer: ['view','create','edit','post'], adjustment: ['view','create'], stocktake: ['view','create'], inventory: ['view'] },
    PROC_OFFICER: { grn: ['view','create','edit'], pr: ['view','create','edit','post'], po: ['view','create','edit'], issue: ['view'], inventory: ['view'], reports: ['view'] },
    AUDITOR:      { grn: ['view'], pr: ['view'], po: ['view'], issue: ['view'], transfer: ['view'], adjustment: ['view'], stocktake: ['view'], inventory: ['view'], reports: ['view'], admin: ['view'] },
  };
  ```
  **Acceptance**: File compiles; `PERMISSION_MATRIX['AUDITOR']['admin']` === `['view']`.

- [x] T008 [P] Create `src/hooks/usePermission.ts` — synchronous RBAC check hook.
  ```typescript
  'use client';
  import { useAuth } from '@/providers/AuthProvider';
  import { PERMISSION_MATRIX, type ResourceType, type ActionType } from '@/types/rbac';

  export function usePermission(action: ActionType, resource: ResourceType): boolean {
    const { user } = useAuth();
    if (!user) return false;
    const allowed = PERMISSION_MATRIX[user.role]?.[resource] ?? [];
    return allowed.includes(action);
  }
  ```
  **Acceptance**: `usePermission('post', 'grn')` returns false for AUDITOR, true for ADMIN.

- [x] T009 [P] Create `src/components/shared/ProtectedRoute.tsx` — wraps pages to enforce role access.
  Client Component (`'use client'`).
  Props: `{ children: React.ReactNode; requiredAction: ActionType; requiredResource: ResourceType }`.
  Uses `usePermission(requiredAction, requiredResource)`.
  If not authenticated (no user): redirect to `/${locale}/login` via `useRouter().replace()`.
  If authenticated but no permission: render `<PermissionDenied />` (see next task).
  If loading: render a full-page loading spinner (`<div class="flex items-center justify-center h-screen">...`).
  **Acceptance**: Wrapping a page with `<ProtectedRoute requiredAction="post" requiredResource="admin">` blocks WH_KEEPER with PermissionDenied screen.

- [x] T010 [P] Create `src/components/shared/PermissionDenied.tsx` — shown when RBAC blocks a page.
  Client Component.
  Renders a centered card with a lock icon, heading from `t('common.permission_denied')`, body from `t('common.permission_denied_body')`, and a "← Back" button that calls `router.back()`.
  Add `messages/ar.json` keys: `"common": { "permission_denied": "غير مصرح", "permission_denied_body": "ليس لديك صلاحية للوصول إلى هذه الصفحة." }`.
  Add `messages/en.json` keys: `"common": { "permission_denied": "Access Denied", "permission_denied_body": "You do not have permission to access this page." }`.
  **Acceptance**: Component renders those strings through `useTranslations('common')`.

- [x] T011 [P] Create `src/providers/QueryProvider.tsx` — TanStack Query v5 provider.
  Client Component (`'use client'`).
  ```typescript
  'use client';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { useState } from 'react';

  export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(() => new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 1 } },
    }));
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  ```
  **Acceptance**: File compiles; component can wrap layout without error.

- [x] T012 Create `src/lib/api/client.ts` — typed fetch wrapper for all API calls.
  The base URL comes from `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api/v1`).
  Token is read from `localStorage.getItem('logirest_token')`.
  ```typescript
  import { z, ZodSchema } from 'zod';
  import type { ApiError } from '@/types/api';

  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

  async function request<T>(method: string, path: string, schema: ZodSchema<T>, body?: unknown): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('logirest_token') : null;
    const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'ar';
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ code: 'NETWORK_ERROR', message: 'errors.network', field_errors: null }));
      throw err; // callers catch ApiError shape
    }
    const data = await res.json();
    return schema.parse(data); // Zod validates at boundary
  }

  export const apiClient = {
    get:    <T>(path: string, schema: ZodSchema<T>) => request<T>('GET', path, schema),
    post:   <T>(path: string, schema: ZodSchema<T>, body: unknown) => request<T>('POST', path, schema, body),
    put:    <T>(path: string, schema: ZodSchema<T>, body: unknown) => request<T>('PUT', path, schema, body),
    del:    <T>(path: string, schema: ZodSchema<T>) => request<T>('DELETE', path, schema),
  };
  ```
  **Acceptance**: `apiClient.get('/procurement/grns', GRNSchema)` returns typed `GRN`. Zod parse failure throws in dev.

- [x] T013 [P] Create `src/types/api.ts` — shared API response wrapper types and Zod schemas.
  ```typescript
  import { z } from 'zod';

  export interface PaginatedResponse<T> {
    data: T[];
    meta: { page: number; page_size: number; total: number; total_pages: number; };
  }

  export interface ApiError {
    code: string;   // e.g. 'WAREHOUSE_LOCKED', 'VALIDATION_ERROR'
    message: string; // i18n key e.g. 'errors.warehouse_locked'
    field_errors: Record<string, string[]> | null;
  }

  export function paginatedSchema<T>(itemSchema: z.ZodSchema<T>) {
    return z.object({
      data: z.array(itemSchema),
      meta: z.object({ page: z.number(), page_size: z.number(), total: z.number(), total_pages: z.number() }),
    });
  }
  ```
  **Acceptance**: `paginatedSchema(GRNSchema).parse(apiResponse)` typechecks and validates.

- [x] T014 Create ALL TypeScript type definition files based on the data model. Create these files exactly:

  **`src/types/auth.ts`** — re-export from AuthProvider plus add Zod schema:
  ```typescript
  export type { UserRole, UserScope, AuthUser } from '@/providers/AuthProvider';
  import { z } from 'zod';
  export const AuthUserSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email(), role: z.enum(['ADMIN','INV_MGR','WH_KEEPER','PROC_OFFICER','AUDITOR']), scopes: z.array(z.object({ branch_id: z.string().nullable(), warehouse_id: z.string().nullable(), department_id: z.string().nullable() })), locale: z.enum(['ar','en']) });
  ```

  **`src/types/master-data.ts`**:
  ```typescript
  import { z } from 'zod';
  export interface Branch { id: string; code: string; name_ar: string; name_en: string; is_active: boolean; created_at: string; }
  export interface Warehouse { id: string; branch_id: string; code: string; name_ar: string; name_en: string; type: 'MAIN'|'DRY'|'COLD'|'VIRTUAL'; is_active: boolean; }
  export interface UoM { id: string; code: string; name_ar: string; name_en: string; }
  export interface UoMConversion { from_uom_id: string; to_uom_id: string; factor: number; }
  export interface Item { id: string; code: string; barcode: string; name_ar: string; name_en: string; category_id: string; primary_uom: UoM; uom_conversions: UoMConversion[]; track_lots: boolean; min_stock_level: number; reorder_point: number; is_active: boolean; }
  export interface Lot { id: string; item_id: string; warehouse_id: string; lot_number: string; expiry_date: string | null; qty_available: number; is_expired: boolean; is_near_expiry: boolean; }
  export interface Supplier { id: string; code: string; name_ar: string; name_en: string; currency_id: string; payment_terms: string; is_active: boolean; }
  export interface Currency { id: string; code: string; name_ar: string; name_en: string; symbol: string; is_base: boolean; }
  export interface FXRate { id: string; from_currency_id: string; to_currency_id: string; rate: number; effective_date: string; }
  export interface Department { id: string; branch_id: string; code: string; name_ar: string; name_en: string; is_active: boolean; }
  export const BranchSchema = z.object({ id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(), is_active: z.boolean(), created_at: z.string() });
  export const WarehouseSchema = z.object({ id: z.string(), branch_id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(), type: z.enum(['MAIN','DRY','COLD','VIRTUAL']), is_active: z.boolean() });
  export const LotSchema = z.object({ id: z.string(), item_id: z.string(), warehouse_id: z.string(), lot_number: z.string(), expiry_date: z.string().nullable(), qty_available: z.number(), is_expired: z.boolean(), is_near_expiry: z.boolean() });
  ```

  **`src/types/documents.ts`**:
  ```typescript
  import { z } from 'zod';
  export type DocumentStatus = 'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'POSTED'|'CANCELLED';
  export type DocumentType = 'GRN'|'ISSUE'|'TRANSFER'|'ADJUSTMENT'|'PR'|'PO';
  export interface BaseDocument { id: string; document_number: string; type: DocumentType; status: DocumentStatus; warehouse_id: string; branch_id: string; notes: string | null; created_by: string; created_at: string; posted_at: string | null; posted_by: string | null; }
  export interface LotAllocation { lot_id: string; lot_number: string; expiry_date: string | null; allocated_qty: number; override_reason: string | null; }
  export interface GRN extends BaseDocument { type: 'GRN'; po_id: string | null; supplier_id: string; currency_id: string; fx_rate: number | null; fx_rate_captured_at: string | null; lines: GRNLineItem[]; }
  export interface GRNLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; po_qty: number | null; received_qty: number; unit_cost_foreign: number; unit_cost_base: number; }
  export interface PurchaseRequest extends BaseDocument { type: 'PR'; requested_by_dept: string; required_by_date: string; lines: PRLineItem[]; }
  export interface PRLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: null; qty: number; uom_id: string; unit_cost: null; requested_qty: number; approved_qty: number | null; }
  export interface PurchaseOrder extends BaseDocument { type: 'PO'; pr_id: string | null; supplier_id: string; currency_id: string; expected_delivery_date: string; lines: POLineItem[]; }
  export interface POLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: null; qty: number; uom_id: string; unit_cost: number | null; ordered_qty: number; unit_price: number; total_price: number; }
  export interface StockIssue extends BaseDocument { type: 'ISSUE'; destination_dept_id: string; requested_by: string; lines: IssueLineItem[]; }
  export interface IssueLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; requested_qty: number; issued_qty: number; lot_allocations: LotAllocation[]; }
  export interface Transfer extends BaseDocument { type: 'TRANSFER'; from_warehouse_id: string; to_warehouse_id: string; transfer_status: 'DRAFT'|'IN_TRANSIT'|'RECEIVED'|'POSTED'; shipped_at: string | null; received_at: string | null; lines: TransferLineItem[]; }
  export interface TransferLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: null; qty: number; uom_id: string; unit_cost: null; shipped_qty: number; received_qty: number | null; }
  export type AdjustmentReason = 'DAMAGE'|'EXPIRY'|'THEFT'|'COUNTING_ERROR'|'OTHER';
  export interface Adjustment extends BaseDocument { type: 'ADJUSTMENT'; reason: AdjustmentReason; approved_by: string | null; lines: AdjustmentLineItem[]; }
  export interface AdjustmentLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: null; qty: number; uom_id: string; unit_cost: null; direction: 'INCREASE'|'DECREASE'; qty_before: number; qty_adjusted: number; reason_notes: string; }
  ```

  **`src/types/stocktake.ts`**:
  ```typescript
  export type StocktakeStatus = 'OPEN'|'COUNTING'|'REVIEW'|'POSTED'|'CANCELLED';
  export interface StocktakeSession { id: string; session_number: string; warehouse_id: string; status: StocktakeStatus; snapshot_at: string; started_by: string; posted_at: string | null; posted_by: string | null; counts: StocktakeCount[]; }
  export interface StocktakeCount { id: string; session_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; }; lot_id: string | null; snapshot_qty: number; counted_qty: number | null; variance: number | null; variance_reason: string | null; }
  export interface WarehouseLockState { is_locked: boolean; session_id: string | null; session_number: string | null; lock_started_at: string | null; }
  ```

  **`src/types/notifications.ts`**:
  ```typescript
  export interface NotificationTemplate { id: string; code: string; subject_ar: string; subject_en: string; body_ar: string; body_en: string; trigger_event: string; is_active: boolean; }
  export interface EmailOutboxEntry { id: string; template_id: string; recipient_email: string; subject: string; sent_at: string | null; status: 'PENDING'|'SENT'|'FAILED'; error_message: string | null; }
  export interface AuditLogEntry { id: string; entity_type: string; entity_id: string; action: 'CREATE'|'UPDATE'|'DELETE'|'POST'|'APPROVE'; user_id: string; user_name: string; changes: { field: string; old_value: unknown; new_value: unknown; }[]; created_at: string; }
  ```
  **Acceptance**: `npx tsc --noEmit` passes with all these files present.

- [x] T015 Configure Tailwind v4 Operational Nocturne design tokens in `src/app/globals.css`.
  Tailwind v4 uses `@theme {}` block — NOT `tailwind.config.js` for tokens.
  Add the following inside `@theme {}`:
  ```css
  @theme {
    /* Surfaces */
    --color-surface-0: #09090f;   /* page background */
    --color-surface-1: #13131c;   /* card / panel */
    --color-surface-2: #1e1e2a;   /* input backgrounds */
    --color-surface-3: #2a2a3a;   /* hover states */

    /* Accents */
    --color-neon-cyan:  #00e5ff;
    --color-neon-amber: #ffba00;
    --color-neon-red:   #ff3d5a;
    --color-neon-green: #00e676;

    /* Text */
    --color-on-surface:       #e8e8f0;
    --color-on-surface-muted: #8888aa;

    /* Brand */
    --color-brand-primary: #00e5ff;
    --color-brand-secondary: #ffba00;

    /* Fonts */
    --font-sans: 'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
  ```
  Set `body { background-color: var(--color-surface-0); color: var(--color-on-surface); }`.
  Set shadcn CSS variable overrides: `--background: var(--color-surface-0); --foreground: var(--color-on-surface); --primary: var(--color-neon-cyan); --primary-foreground: #09090f; --border: var(--color-surface-3); --ring: var(--color-neon-cyan);`.
  **Acceptance**: The page background is near-black `#09090f` when server starts.

- [x] T016 [P] Create `src/lib/fonts.ts` — Google Fonts configuration via `next/font`.
  ```typescript
  import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
  export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
  export const ibmPlexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400','500','700'], variable: '--font-arabic', display: 'swap' });
  ```
  In `src/app/[locale]/layout.tsx` (T002), apply `className={`${inter.variable} ${ibmPlexArabic.variable} font-sans`}` to `<body>`.
  **Acceptance**: Arabic text renders in IBM Plex Sans Arabic; Latin characters in Inter.

- [x] T017 Create `src/components/layouts/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx` — the main authenticated layout shell.

- [x] T018 [P] Create `src/components/shared/Breadcrumb.tsx` and `src/components/shared/PageHeader.tsx`.
  **Breadcrumb**: Client Component. Props: `{ items: { label: string; href?: string }[] }`. Renders items separated by `/` chevron icon. In RTL, wrap the chevron icon with `className="scale-x-[-1]"` to flip direction. Each item is a `<Link>` if `href` provided, else plain `<span>`. Current (last) item is `text-on-surface`; parents are `text-on-surface-muted hover:text-on-surface`.
  **PageHeader**: Server or Client Component. Props: `{ title: string; description?: string; actions?: React.ReactNode }`. Renders a row with title (`<h1>` styled `text-2xl font-bold text-on-surface`) and description below, plus `actions` slot floated to the inline-end via `flex justify-between`.
  **Acceptance**: Breadcrumb renders `Home > GRNs > GRN-001` correctly in both LTR and RTL; chevron flips in RTL.

- [ ] T019 [P] Create `src/components/shared/LocaleSwitcher.tsx` — locale toggle button.
  Client Component. Reads current locale from `useParams().locale` or from `document.documentElement.lang`. Renders a button showing "عر" when current locale is `en` (switch to Arabic) and "EN" when current locale is `ar` (switch to English). On click: replace current path with the other locale prefix using `useRouter().replace(pathname.replace(/^\/(ar|en)/, `/${otherLocale}`))`. Persist locale in a cookie named `NEXT_LOCALE` via `document.cookie = 'NEXT_LOCALE=...; path=/'` before navigation.
  **Acceptance**: Clicking the button navigates to the other locale and the `dir` attribute changes.

- [x] T020 [P] Configure Vitest and Playwright test runners.

---

**PHASE 1 CHECKPOINT** ✅: `npm run dev` runs. `tsc --noEmit` exits 0. `/ar/` renders with `dir="rtl"`. `/en/` renders with `dir="ltr"`. All type files compile.

---

## PHASE 2 — Shared Components (Blocks all screen work)
**Purpose**: Build the 11 reusable business components that every screen depends on.
**CRITICAL**: Complete ALL Phase 2 tasks before starting any Phase 3+ task.

---

- [x] T021 Create `src/utils/fefo.ts` — FEFO sort and expiry utility functions.
  ```typescript
  import type { Lot } from '@/types/master-data';

  /** Sort lots by expiry date ascending (FEFO). Null expiry goes last. */
  export function sortLotsByFEFO(lots: Lot[]): Lot[] {
    return [...lots].sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  }

  /** Returns true if expiry_date is in the past (UTC). */
  export function isExpired(expiry_date: string | null): boolean {
    if (!expiry_date) return false;
    return new Date(expiry_date) < new Date();
  }

  /** Returns true if expiry_date is within `days` days from today (defaults 30). */
  export function isNearExpiry(expiry_date: string | null, days = 30): boolean {
    if (!expiry_date) return false;
    const exp = new Date(expiry_date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return exp <= cutoff && exp >= new Date();
  }
  ```
  Also create `src/tests/unit/fefo.test.ts` with these tests:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { sortLotsByFEFO, isExpired, isNearExpiry } from '@/utils/fefo';
  const makeLot = (expiry: string | null) => ({ id: '1', item_id: '1', warehouse_id: '1', lot_number: 'L1', expiry_date: expiry, qty_available: 10, is_expired: false, is_near_expiry: false });
  describe('sortLotsByFEFO', () => {
    it('sorts oldest expiry first', () => {
      const sorted = sortLotsByFEFO([makeLot('2030-12-01'), makeLot('2025-01-01'), makeLot('2027-06-15')]);
      expect(sorted[0].expiry_date).toBe('2025-01-01');
    });
    it('puts null expiry last', () => {
      const sorted = sortLotsByFEFO([makeLot(null), makeLot('2025-01-01')]);
      expect(sorted[0].expiry_date).toBe('2025-01-01');
    });
  });
  describe('isExpired', () => {
    it('returns true for past dates', () => expect(isExpired('2000-01-01')).toBe(true));
    it('returns false for future dates', () => expect(isExpired('2099-01-01')).toBe(false));
    it('returns false for null', () => expect(isExpired(null)).toBe(false));
  });
  ```
  **Acceptance**: `npm run test:unit` — all 4 tests pass.

- [x] T022 [P] Create `src/utils/currency.ts` — FX and locale-aware number formatting utils.
  ```typescript
  /**
   * Convert an amount from foreign currency to base currency.
   * @example convertToBase(100, 3.75) → 375
   */
  export function convertToBase(foreignAmount: number, fxRate: number): number {
    return Math.round(foreignAmount * fxRate * 100) / 100;
  }

  /**
   * Format a number as currency string for display.
   * Always uses the user's locale for decimal/grouping separators.
   * The calling component wraps the output in <span dir="ltr"> in RTL context.
   */
  export function formatCurrency(amount: number, currencyCode: string, locale: 'ar' | 'en'): string {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format a plain number (qty) with locale separators.
   * Calling component wraps output in <span dir="ltr"> in RTL context.
   */
  export function formatNumber(value: number, locale: 'ar' | 'en'): string {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value);
  }
  ```
  **Acceptance**: File compiles; `convertToBase(100, 3.75)` returns `375`.

- [x] T023 Create `src/components/shared/StatusBadge.tsx` — renders a document status as a colored badge.
  Client Component. Props: `{ status: DocumentStatus | StocktakeStatus | 'IN_TRANSIT' }`.
  Color mapping:
  - `DRAFT` → gray (`bg-surface-3 text-on-surface-muted`)
  - `SUBMITTED` → blue (`bg-blue-900/40 text-blue-300`)
  - `APPROVED` → green (`bg-neon-green/20 text-neon-green`)
  - `POSTED` → cyan (`bg-neon-cyan/20 text-neon-cyan`)
  - `REJECTED` → red (`bg-neon-red/20 text-neon-red`)
  - `CANCELLED` → gray dim (`bg-surface-3 text-on-surface-muted opacity-60`)
  - `IN_TRANSIT` → amber (`bg-neon-amber/20 text-neon-amber`)
  - `OPEN` → amber (`bg-neon-amber/20 text-neon-amber`)
  - `COUNTING` → blue
  - `REVIEW` → orange
  Label text: uses `useTranslations('common')` with key `status.${status.toLowerCase()}`.
  Add those keys to `messages/ar.json` under `"common": { "status": { "draft": "مسودة", "submitted": "مقدم", "approved": "معتمد", "posted": "مرحّل", "rejected": "مرفوض", "cancelled": "ملغي", "in_transit": "في الطريق", "open": "مفتوح", "counting": "جارٍ العد", "review": "قيد المراجعة" } }`.
  Same keys in `messages/en.json`.
  **Acceptance**: `<StatusBadge status="POSTED" />` renders "مرحّل" in cyan badge (AR locale).

- [x] T024 Create `src/components/shared/PostConfirmDialog.tsx` — confirmation dialog for all irreversible POST actions.
  Client Component. Props:
  ```typescript
  interface PostConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;          // already translated by parent
    description: string;    // already translated by parent
    warningText: string;    // shown in amber warning box
    requiresTextConfirmation?: boolean; // if true, user types "تأكيد" / "CONFIRM"
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
    children?: React.ReactNode; // optional slot for FXRateCapture or other steps
  }
  ```
  Implementation:
  - Uses shadcn `<AlertDialog>` components (if not installed, use a `<dialog>` HTML element centered with a backdrop).
  - Non-closable while `isLoading` (Escape key disabled, X button hidden).
  - Amber warning box: `bg-neon-amber/10 border border-neon-amber/30 rounded p-3 text-neon-amber text-sm`.
  - If `requiresTextConfirmation`: show an input; confirm button disabled until value equals `"تأكيد"` (AR) or `"CONFIRM"` (EN) — detect locale via `document.documentElement.lang`.
  - Confirm button: `bg-neon-cyan text-surface-0 hover:bg-neon-cyan/80` with a spinner icon when `isLoading`.
  - Cancel button: `bg-surface-3 text-on-surface` — hidden while `isLoading`.
  Add keys to `messages/ar.json`: `"common": { "confirm": "تأكيد", "cancel": "إلغاء", "posting_irreversible": "هذا الإجراء لا يمكن التراجع عنه." }`.
  **Acceptance**: Dialog opens; confirm button disabled during load; Escape key ignored during load.

- [x] T025 Create `src/components/shared/ScanInput/ScanInput.tsx` and `ScanInput/ScanLog.tsx` and `ScanInput/ScanMode.tsx`.

  **ScanInput.tsx** — Client Component. Props:
  ```typescript
  interface ScanInputProps {
    onScan: (barcode: string) => void;
    onError?: (barcode: string) => void; // called when barcode NOT found
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    onCameraActivate?: () => void; // reserved for future camera support — renders disabled camera button
  }
  ```
  Behavior:
  - Always render an `<input type="text">` with `ref={inputRef}`.
  - On mount, call `inputRef.current?.focus()`.
  - Register a `blur` event on the input: when blurred (and not `disabled`), call `setTimeout(() => inputRef.current?.focus(), 100)`. This guarantees re-focus ≤100ms.
  - Listen for `keydown` with `event.key === 'Enter'` OR for when input value looks complete (length > 4 chars with no key activity for 80ms — debounce for wedge scanners that don't send Enter).
  - On Enter: take trimmed value, call `onScan(value)`, clear input, show cyan border pulse animation for 300ms (`border-neon-cyan ring-2 ring-neon-cyan`).
  - On `onError`: show red border pulse (`border-neon-red ring-2 ring-neon-red`) for 300ms.
  - When `disabled`: input is `disabled`; re-focus timer is NOT registered; renders with opacity-50.
  - Style: `bg-surface-2 border border-surface-3 text-on-surface rounded text-lg px-4 py-3 w-full focus:outline-none focus:border-neon-cyan transition-colors`.

  **ScanLog.tsx** — Client Component. Props: `{ entries: { barcode: string; item_name: string; timestamp: Date; success: boolean }[] }`.
  Renders last 10 entries in reverse (newest first). Green rows for success (success === true), red for error. Timestamps in `HH:MM:SS` format. Numbers in `<span dir="ltr">`.

  **ScanMode.tsx** — Client Component. Props: `{ children: React.ReactNode; isActive: boolean }`.
  When `isActive`, renders children inside a full-screen overlay (`fixed inset-0 bg-surface-0 z-50 p-4`). When not active, renders children inline.

  **Acceptance**: Typing a barcode and pressing Enter calls `onScan`; focus returns to input within 100ms after clicking elsewhere.

- [x] T026 Create `src/components/shared/FEFOLotAllocator/FEFOLotAllocator.tsx`, `LotRow.tsx`, `ExpiredOverrideInline.tsx`.

  **FEFOLotAllocator.tsx** — Client Component. Props:
  ```typescript
  interface FEFOLotAllocatorProps {
    lots: Lot[];              // raw lots from API — this component sorts them FEFO
    requestedQty: number;     // total qty to allocate
    uomLabel: string;         // display label e.g. "كرتون"
    userRole: UserRole;
    onAllocate: (allocations: LotAllocation[]) => void;
    onClose: () => void;
  }
  ```
  Behavior:
  - On mount: sort `lots` using `sortLotsByFEFO()` from `src/utils/fefo.ts`.
  - Auto-allocate: iterate sorted lots, fill each lot's `allocated_qty` from top until `requestedQty` is met. Expired lots (`is_expired === true`) are SKIPPED during auto-allocation (unless `userRole` is ADMIN or INV_MGR).
  - Display lot rows via `<LotRow>` components.
  - Show running total: `Allocated: X / Y` — numbers in `<span dir="ltr">`. Total goes RED if `sum !== requestedQty`.
  - "Confirm Allocation" button disabled if `sum !== requestedQty` or any expired lot without override_reason is included.

  **LotRow.tsx** — Client Component. Props: `{ lot: Lot; allocatedQty: number; onQtyChange: (qty: number) => void; isExpired: boolean; isNearExpiry: boolean; userRole: UserRole; onExpiredOverride: (reason: string) => void }`.
  - Row background: expired → `bg-neon-red/10`; near-expiry → `bg-neon-amber/10`; valid → `bg-surface-2`.
  - Lot number, expiry date (in locale format), available qty: all numbers in `<span dir="ltr">`.
  - `allocated_qty` input: number input, min=0, max=`lot.qty_available`.
  - If `is_expired && userRole` is WH_KEEPER or PROC_OFFICER or AUDITOR: input is `disabled`; show "⛔ منتهي الصلاحية" badge; cannot allocate.
  - If `is_expired && userRole` is ADMIN or INV_MGR: input enabled but shows `<ExpiredOverrideInline>` below.

  **ExpiredOverrideInline.tsx** — Client Component. Props: `{ onReasonChange: (reason: string) => void }`.
  Renders: amber warning banner "تحذير: هذا المنتج منتهي الصلاحية — يجب إدخال سبب الاستخدام"، and a `<textarea>` for the override reason. Required — empty reason blocks parent's confirm.

  **Acceptance**: Auto-allocation fills oldest lots first; expired lots blocked for WH_KEEPER; ADMIN can override with reason.

- [x] T027 [P] Create `src/hooks/useWarehouseLock.ts` — TanStack Query v5 hook for stocktake lock status.
  ```typescript
  'use client';
  import { useQuery } from '@tanstack/react-query';
  import { apiClient } from '@/lib/api/client';
  import { z } from 'zod';
  import type { WarehouseLockState } from '@/types/stocktake';

  const LockSchema = z.object({
    is_locked: z.boolean(),
    session_id: z.string().nullable(),
    session_number: z.string().nullable(),
    lock_started_at: z.string().nullable(),
  });

  export function useWarehouseLock(warehouseId: string | null) {
    return useQuery<WarehouseLockState>({
      queryKey: ['warehouse-lock', warehouseId],
      queryFn: () => apiClient.get(`/inventory/warehouses/${warehouseId}/lock`, LockSchema),
      staleTime: 30_000,
      enabled: !!warehouseId,
    });
  }
  ```
  **Acceptance**: Hook returns `{ data: WarehouseLockState | undefined, isLoading: boolean }`; disabled (no call) when `warehouseId` is null.

- [x] T028 [P] Create `src/components/shared/LockBanner.tsx` — amber warning banner for stocktake lock.
  Client Component. Props: `{ lockState: WarehouseLockState | undefined }`.
  Renders only when `lockState?.is_locked === true`.
  Content: amber banner (`bg-neon-amber/15 border border-neon-amber/40 rounded p-3`) with lock icon, text from `t('operations.stocktake.warehouse_locked_banner', { sessionNumber: lockState.session_number })`, and the lock start time formatted per locale.
  Use `role="alert"` on the banner div for accessibility.
  Add keys to `messages/ar.json`: `"operations": { "stocktake": { "warehouse_locked_banner": "المستودع مقفل بسبب جرد مفتوح: {sessionNumber}" } }`.
  Add equivalent to `messages/en.json`: `"operations": { "stocktake": { "warehouse_locked_banner": "Warehouse locked by active stocktake: {sessionNumber}" } }`.
  **Acceptance**: Banner renders with `role="alert"` when `is_locked: true`; hidden when `is_locked: false`.

- [x] T029 [P] Create `src/components/shared/DocumentReadOnlyOverlay.tsx` — disables all editing when document is POSTED.
  Client Component. Props: `{ isPosted: boolean; children: React.ReactNode }`.
  When `isPosted === true`: wraps children in a `<div>` with `pointer-events-none opacity-80 select-none`, and shows an absolute overlay badge top-right: `bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan px-2 py-1 rounded text-xs` with text from `t('common.posted_read_only')`.
  When `isPosted === false`: renders children unchanged.
  Add keys: `"common": { "posted_read_only": "مرحّل - للقراءة فقط" }` (AR), `"posted_read_only": "Posted – Read Only"` (EN).
  **Acceptance**: All inputs inside the wrapper are unclickable when `isPosted === true`.

- [x] T030 Create `src/components/shared/DataTable/DataTable.tsx`, `FilterPanel.tsx`, `Pagination.tsx`.

  **DataTable.tsx** — Client Component. Props:
  ```typescript
  interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];       // TanStack Table column def
    isLoading?: boolean;
    pagination?: { page: number; pageSize: number; total: number; totalPages: number; onPageChange: (page: number) => void; };
    onExport?: () => void;          // triggers CSV download
    emptyState?: React.ReactNode;   // shown when data is empty and not loading
    filters?: React.ReactNode;      // renders <FilterPanel> content above table
  }
  ```
  Implementation:
  - Use TanStack Table v8 (`@tanstack/react-table`). Initialize with `useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })`.
  - While `isLoading`: show 9 skeleton rows (`bg-surface-3 animate-pulse h-10 rounded`).
  - Empty (not loading, data.length === 0): render `emptyState` prop or a default empty icon.
  - Table style: `w-full text-sm`. Header row: `bg-surface-2 text-on-surface-muted`. Data rows: `border-b border-surface-3 hover:bg-surface-3`.
  - "Export" button shown only when `onExport` prop provided. In RTL, button appears on inline-start.
  - Numeric column cells must be `dir="ltr"` — columns should specify `meta: { numeric: true }` and `DataTable` applies the dir attribute accordingly.

  **Pagination.tsx** — Client Component. Props: `{ page: number; totalPages: number; onPageChange: (p: number) => void }`.
  Renders Prev / Next buttons and current page indicator e.g. "٣ / ١٠" in Arabic numerals (RTL) or "3 / 10" (LTR). Prev/Next arrow icons use `<span className={dir === 'rtl' ? 'scale-x-[-1]' : ''}>` to flip arrows.

  **FilterPanel.tsx** — Client Component. Props: `{ children: React.ReactNode; onReset: () => void }`.
  A collapsible filter bar with a "Reset" button. Children are filter inputs passed from the parent page.

  **Acceptance**: Table shows 9 skeleton rows during loading; pagination prev/next arrows flip in RTL; empty state renders when data is [].

- [x] T031 [P] Create `src/components/shared/FXRateCapture.tsx` — step inside PostConfirmDialog for GRN posting.
  Client Component. Props:
  ```typescript
  interface FXRateCaptureProps {
    fromCurrencyCode: string;  // e.g. 'USD'
    toCurrencyCode: string;    // e.g. 'SAR' (base currency)
    defaultRate?: number;      // pre-filled from latest FX rate API
    onRateConfirmed: (rate: number) => void;
  }
  ```
  Renders:
  - Heading: `t('procurement.grn.fx_capture_title')` = "سعر الصرف عند الترحيل" / "FX Rate at Posting"
  - Fetches `GET /currencies/fx-rates?from={fromCurrencyCode}&to={toCurrencyCode}` on mount to get `defaultRate`. Set as initial input value.
  - Number input for rate: min=0.0001, step=0.0001, no negative values. Input `dir="ltr"` always.
  - Label: `1 {fromCurrencyCode} = __ {toCurrencyCode}`.
  - "تأكيد السعر" / "Confirm Rate" button calls `onRateConfirmed(rate)` — disabled if input is 0 or empty.
  - Amber note: "سيُحفظ هذا السعر مع الوثيقة ولا يمكن تغييره لاحقاً."
  Add i18n keys accordingly.
  **Acceptance**: Rate input pre-filled from API; confirm disabled when rate is 0; `onRateConfirmed` fires with numeric value.

- [x] T032 [P] Create `src/components/shared/DocumentLineItemTable/DocumentLineItemTable.tsx` — reusable line items table for all document types.
  Client Component. Props:
  ```typescript
  interface DocumentLineItemTableProps {
    lines: { id: string; item: { code: string; name_ar: string; name_en: string; primary_uom: { code: string } }; lot?: { lot_number: string; expiry_date: string | null } | null; qty: number; uom_id: string; unit_cost?: number | null; [key: string]: unknown }[];
    extraColumns?: { header: string; cell: (line: unknown) => React.ReactNode }[];
    onRemoveLine?: (lineId: string) => void;   // if provided, renders remove button
    isReadOnly?: boolean;
    locale: 'ar' | 'en';
  }
  ```
  Renders a `<table>` with columns: Item Code, Item Name (locale-aware: `name_ar` in ar, `name_en` in en), Lot Number (— if null), Expiry Date (— if null), Qty (in `<span dir="ltr">`), UoM, and any `extraColumns`. Remove button (×) in last column if `onRemoveLine` provided and `isReadOnly` is false. All numeric cells: `dir="ltr"`.
  **Acceptance**: Renders items correctly in RTL; numeric cells have `dir="ltr"`; remove button absent when `isReadOnly`.

- [x] T033 [P] Create `src/components/shared/AuditDiffViewer.tsx` — shows old vs new values for audit log entries.
  Client Component. Props: `{ changes: { field: string; old_value: unknown; new_value: unknown }[] }`.
  Renders a two-column table: Field | Old Value | New Value.
  Deleted fields (old not null, new null): row background `bg-neon-red/10`.
  Added fields (old null, new not null): row background `bg-neon-green/10`.
  Changed fields: row background `bg-neon-amber/10`.
  Values: JSON.stringify for objects; string for primitives. All numeric values in `<span dir="ltr">`.
  **Acceptance**: Three row types render with correct background colors.

- [x] T034 Create `src/lib/api/mocks/index.ts` and `src/lib/api/mocks/*.ts` — static JSON mock handlers.
  When `process.env.NEXT_PUBLIC_USE_MOCKS === 'true'`, the `apiClient` in `src/lib/api/client.ts` should check this flag and intercept calls to return mock data instead of fetching.
  Update `client.ts` to add at the top of the `request()` function:
  ```typescript
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { getMockResponse } = await import('./mocks/index');
    const mockData = getMockResponse(method, path);
    if (mockData !== undefined) return schema.parse(mockData);
  }
  ```
  Create `src/lib/api/mocks/index.ts`:
  ```typescript
  import { purchasingMocks } from './purchasing';
  import { operationsMocks } from './operations';
  import { masterDataMocks } from './master-data';
  import { inventoryMocks } from './inventory';

  type MockDb = Record<string, Record<string, unknown>>;
  const db: MockDb = { ...purchasingMocks, ...operationsMocks, ...masterDataMocks, ...inventoryMocks };

  export function getMockResponse(method: string, path: string): unknown {
    const key = `${method.toUpperCase()} ${path.split('?')[0]}`;
    return db[key];
  }
  ```
  Create `src/lib/api/mocks/master-data.ts` with sample data for branches, warehouses, items, suppliers, currencies; Create `src/lib/api/mocks/purchasing.ts` with sample GRNs, PRs, POs; Create `src/lib/api/mocks/operations.ts` with sample issues, transfers, adjustments, stocktake sessions; Create `src/lib/api/mocks/inventory.ts` with stock balance and movement data.
  Each mock file exports a flat object keyed by `"GET /procurement/grns"` etc.
  **Acceptance**: With `NEXT_PUBLIC_USE_MOCKS=true`, `apiClient.get('/procurement/grns', ...)` returns mock data without a real server.

---

**PHASE 2 CHECKPOINT** ✅: All shared components render in isolation (`npm run dev`). `tsc --noEmit` passes. FEFO unit tests pass (`npm run test:unit`). Mock API returns data for GRN list.

---

## PHASE 3 — US1: Core Warehouse Operations (GRN + Issue + Stocktake)
**Goal**: A Warehouse Keeper can: (1) receive stock via GRN with FEFO lot allocation, (2) issue stock to a department via barcode scan with FEFO enforcement, (3) manage a stocktake session with warehouse lock visibility.
**BLOCKS Phase 5 (lock hardening)**: Complete Phase 3 stocktake tasks (T050–T056) before Phase 5.

---

### GRN (Goods Received Note)

- [x] T035 [US1] Create `src/lib/api/mocks/purchasing.ts` — mock data for GRN, PR, PO endpoints.
  The mock object must include entries for these paths:
  ```
  "GET /procurement/grns"       → PaginatedResponse<GRN> with 3 sample GRNs in states DRAFT, APPROVED, POSTED
  "GET /procurement/grns/grn-1" → GRN in DRAFT state with 2 line items and a linked PO in USD currency
  "GET /procurement/grns/grn-2" → GRN in POSTED state (fx_rate: 3.75, fx_rate_captured_at set)
  "POST /procurement/grns"      → GRN in DRAFT state (simulate creation)
  "POST /procurement/grns/grn-1/post" → GRN with status: 'POSTED', fx_rate: 3.75
  ```
  Also add a mock for `"GET /inventory/warehouses/wh-1/lock"` returning `{ is_locked: false, session_id: null, session_number: null, lock_started_at: null }` and `"GET /inventory/warehouses/wh-2/lock"` returning a locked state with `session_number: "ST-2026-001"`.
  All mock GRN line items must include valid `item`, `lot`, `received_qty`, `unit_cost_foreign`, `unit_cost_base` fields.
  **Acceptance**: With mocks enabled, `GET /procurement/grns` returns a list of 3 GRNs.

- [x] T036 [US1] Create `src/features/purchasing/hooks/useGRNList.ts` — TanStack Query hook to fetch paginated GRN list.
  ```typescript
  'use client';
  import { useQuery } from '@tanstack/react-query';
  import { apiClient } from '@/lib/api/client';
  import { paginatedSchema } from '@/types/api';
  import { z } from 'zod';
  // Inline GRN schema (abbreviated — just enough for list view)
  const GRNSummarySchema = z.object({ id: z.string(), document_number: z.string(), status: z.string(), supplier_id: z.string(), currency_id: z.string(), warehouse_id: z.string(), created_at: z.string(), posted_at: z.string().nullable() });
  export function useGRNList(filters: { status?: string; warehouse_id?: string; page?: number } = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
    params.set('page', String(filters.page ?? 1));
    return useQuery({
      queryKey: ['grns', filters],
      queryFn: () => apiClient.get(`/procurement/grns?${params}`, paginatedSchema(GRNSummarySchema)),
      staleTime: 60_000,
    });
  }
  ```
  Also create `src/features/purchasing/hooks/useGRN.ts` for fetching a single GRN by ID (full schema including lines).
  Also create `src/features/purchasing/hooks/usePostGRN.ts`:
  ```typescript
  // useMutation for POST /procurement/grns/:id/post
  // body: { fx_rate: number; confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }
  // On success: invalidate ['grns'] and ['grn', id] queries
  // On error: if err.code === 'WAREHOUSE_LOCKED', caller must surface LockBanner
  //           if err.code === 'FX_RATE_REQUIRED', caller must surface FXRateCapture step
  ```
  **Acceptance**: `useGRNList()` returns typed `PaginatedResponse<GRNSummary>` from mock.

- [x] T037 [P] [US1] Build `src/app/[locale]/(app)/(procurement)/goods-received/page.tsx` — GRN List page (Server Component).
  This is a **Server Component** (no `'use client'`).
  It receives `{ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; page?: string }> }`.
  Await both: `const { locale } = await params; const { status, page } = await searchParams;`.
  Use `const t = await getTranslations('procurement.grn')`.
  Renders:
  - `<PageHeader title={t('title')} actions={<Link href={`/${locale}/goods-received/new`}><Button>{t('create_new')}</Button></Link>} />`
  - `<Breadcrumb items={[{ label: t('home') }, { label: t('grns') }]} />`
  - A client component `<GRNListClient initialStatus={status} initialPage={Number(page ?? 1)} locale={locale} />` (to be created below).
  Wrap the page with `<ProtectedRoute requiredAction="view" requiredResource="grn">`.
  Add i18n keys in `messages/ar.json > procurement > grn`: `{ "title": "سندات الاستلام", "create_new": "إنشاء سند جديد", "grns": "سندات الاستلام", "home": "الرئيسية" }`.
  Add equivalent English keys.
  **Acceptance**: Page renders without error; title is "سندات الاستلام" in AR locale.

- [x] T038 [US1] Create `src/app/[locale]/(app)/(procurement)/goods-received/GRNListClient.tsx` — client-side GRN list component.
  Client Component (`'use client'`). Props: `{ initialStatus?: string; initialPage: number; locale: 'ar' | 'en' }`.
  Uses `useGRNList({ status, page })` hook.
  Renders `<LockBanner lockState={lockData} />` (uses `useWarehouseLock` if a warehouse is pre-selected).
  Renders `<DataTable>` with columns:
  - Document Number (link to `/goods-received/{id}`)
  - Status (`<StatusBadge>`)
  - Supplier ID (display name from suppliers list — or just the ID for now)
  - Currency
  - Posted At (or "—" if null; number in `<span dir="ltr">`)
  - Created At (`<span dir="ltr">`)
  Renders `<FilterPanel>` with a status `<select>` dropdown (DRAFT/SUBMITTED/APPROVED/POSTED) and a date range picker.
  Renders `<Pagination>` below the table.
  **Acceptance**: Table shows 3 mock GRNs with correct status badges.

- [x] T039 [US1] Build `src/app/[locale]/(app)/(procurement)/goods-received/[id]/page.tsx` — GRN Detail/Create page.
  This page handles BOTH creating new (`id === 'new'`) and viewing/editing existing GRNs.
  It is a **Client Component** (`'use client'`) because it manages scan state and form state.
  On mount: if `id !== 'new'`, fetch GRN via `useGRN(id)`.
  Header section (always visible): Supplier selector (`<select>`), Currency selector, linked PO number (read-only link if `po_id` set), Status badge, Notes textarea.
  Body: `<DocumentReadOnlyOverlay isPosted={grn?.status === 'POSTED'}>` wrapping:
  - `<ScanInput onScan={handleScan} disabled={grn?.status === 'POSTED'} />` — scans resolve to items via `GET /items?barcode={barcode}` (use mock that returns an item for barcode `"000001"`).
  - `<DocumentLineItemTable lines={lines} extraColumns={[{ header: 'Received Qty', cell: (l) => ... }]} onRemoveLine={removeLine} isReadOnly={grn?.status === 'POSTED'} locale={locale} />`
  - `<FEFOLotAllocator>` drawer (shadcn `<Sheet>`) opened when user clicks a line item's lot cell. Props: `lots` from `GET /operations/lots-available?item_id=...&warehouse_id=...`.
  Footer actions:
  - "حفظ مسودة" → `POST /procurement/grns` (create) or `PUT /procurement/grns/:id` (update).
  - "ترحيل" → opens `<PostConfirmDialog>`. If `currency_id !== base currency`, PostConfirmDialog renders `<FXRateCapture>` inside its `children` slot before confirm button.
  On POST confirm: call `usePostGRN.mutate({ fx_rate, confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' })`. On success: invalidate queries, show toast "تم الترحيل بنجاح". On `WAREHOUSE_LOCKED` error: show `<LockBanner>`.
  **Acceptance**: Can create a GRN draft, scan items, allocate FEFO lots, and post with FX rate captured.

- [x] T040 [P] [US1] Add GRN i18n keys to `messages/ar.json` and `messages/en.json`.
  Add under `procurement.grn`:
  AR: `{ "title": "سندات الاستلام", "create_new": "إنشاء سند جديد", "detail_title": "سند استلام", "save_draft": "حفظ مسودة", "post_grn": "ترحيل السند", "post_confirm_title": "تأكيد ترحيل سند الاستلام", "post_confirm_desc": "بعد الترحيل لا يمكن تعديل السند. تأكد من صحة جميع الكميات والتكاليف.", "post_irreversible": "هذا الإجراء لا يمكن التراجع عنه نهائياً.", "fx_capture_title": "سعر الصرف عند الترحيل", "scan_placeholder": "امسح الباركود أو اكتبه...", "posted_success": "تم ترحيل سند الاستلام بنجاح.", "warehouse_locked": "لا يمكن الترحيل: المستودع مقفل بسبب جرد نشط.", "fx_required": "يجب تحديد سعر الصرف قبل ترحيل هذا السند." }`.
  EN: equivalent English strings.
  **Acceptance**: All keys exist in both files; `useTranslations('procurement.grn')` resolves without missing key warnings.

### Stock Issue

- [x] T041 [US1] Add Issue mock data to `src/lib/api/mocks/operations.ts`.
  Add entries:
  ```
  "GET /operations/issues" → PaginatedResponse with 3 sample issues (DRAFT, POSTED, DRAFT)
  "GET /operations/issues/iss-1" → full StockIssue with 2 line items and lot_allocations
  "POST /operations/issues" → StockIssue { status: 'DRAFT' }
  "POST /operations/issues/iss-1/post" → StockIssue { status: 'POSTED' }
  "GET /operations/lots-available" → Lot[] sorted by expiry ASC; include 1 expired lot, 1 near-expiry lot, 2 valid lots
  "GET /items" (with barcode param) → { data: [Item with barcode '000001'], meta: {...} }
  ```
  **Acceptance**: Mock Issues list returns 3 items; lot-available returns 4 lots in correct FEFO order.

- [x] T042 [US1] Create `src/features/operations/hooks/useIssueList.ts`, `useIssue.ts`, `useCreateIssue.ts`, `usePostIssue.ts`, `useLotsByItem.ts`.
  Pattern (same as GRN hooks — adapt for Issues):
  - `useIssueList(filters)`: `GET /operations/issues?status=...&warehouse_id=...&page=...`
  - `useIssue(id)`: `GET /operations/issues/:id`
  - `useCreateIssue()`: `useMutation` → `POST /operations/issues`
  - `usePostIssue()`: `useMutation` → `POST /operations/issues/:id/post`. Body: `{ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }`. On error `WAREHOUSE_LOCKED`: caller surfaces `LockBanner`. On error `EXPIRED_LOT_BLOCKED`: caller highlights affected rows.
  - `useLotsByItem(itemId, warehouseId)`: `GET /operations/lots-available?item_id=...&warehouse_id=...&include_expired=true`. Returns `Lot[]`.
  **Acceptance**: `useIssueList()` returns 3 mock issues; `useLotsByItem('item-1', 'wh-1')` returns 4 mock lots.

- [x] T043 [P] [US1] Build `src/app/[locale]/(app)/(operations)/issues/page.tsx` — Issues List page (Server Component).
  Same pattern as GRN list page (T037). Key differences:
  - Title: `t('operations.issue.title')` = "سندات الصرف"
  - "Create New" links to `/issues/new`
  - ProtectedRoute: `requiredAction="view" requiredResource="issue"`
  - Client component: `<IssueListClient />`
  **Acceptance**: Page renders; title is "سندات الصرف" in AR locale.

- [x] T044 [US1] Create `src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx` — client-side Issue list.
  Same pattern as `GRNListClient` (T038). DataTable columns: Document Number (link), Status badge, Destination Dept, Requested By, Created At. Includes `<LockBanner>`.
  **Acceptance**: 3 mock issues render in DataTable.

- [x] T046 [US1] Build `src/app/[locale]/(app)/(operations)/issues/[id]/scan-mode/page.tsx` — Scan-only flow.Detail/Create (Client Component).
  Client Component. Handles `id === 'new'` (create) and existing ID (view/edit).
  Header: Department selector (destination), Requested By field, Notes.
  Body: `<DocumentReadOnlyOverlay isPosted={issue?.status === 'POSTED'}>` wrapping `<ScanMode isActive={!isPosted}>`:
  - `<ScanInput onScan={handleScan} disabled={isPosted} />` at the top.
  - `handleScan(barcode)`: calls `GET /items?barcode={barcode}`. If found: add item to `lines` state (or increment qty if duplicate barcode). Show scan log entry. If not found: call `onError(barcode)` — red border pulse + scan log error entry.
  - `<ScanLog entries={scanLog} />` showing last 10 scans.
  - `<DocumentLineItemTable>` with extra columns: "Requested Qty" (numeric input), "Issued Qty" (numeric, read-only), "Lots" button that opens `<FEFOLotAllocator>` in a Sheet.
  - `<LockBanner lockState={useWarehouseLock(warehouseId).data} />`
  Footer: "حفظ مسودة" and "ترحيل" buttons. "ترحيل" disabled if `lockState?.is_locked`.
  `PostConfirmDialog` for "ترحيل" — no FX capture step for Issues.
  **Acceptance**: Scanning barcode `000001` adds Tom & Jerry item to issue lines; FEFO drawer shows 4 lots with correct color coding.

- [x] T046 [US1] Implement expired-item role gate in the `FEFOLotAllocator` for Issues.
  In `LotRow.tsx` (created in T026): ensure WH_KEEPER and PROC_OFFICER and AUDITOR CANNOT allocate expired lots — `<input disabled>` + "⛔ منتهي الصلاحية" badge.
  ADMIN and INV_MGR CAN allocate expired lots but must fill `<ExpiredOverrideInline reason>` — the `override_reason` must be non-empty string before the row contributes to the allocation.
  In `FEFOLotAllocator.tsx`: "Confirm Allocation" button disabled if any expired lot has `allocated_qty > 0` AND `override_reason` is null or empty.
  The `LotAllocation` objects sent to `onAllocate()` must include `override_reason: string | null` per lot.
  **Acceptance**: WH_KEEPER sees expired lot as disabled; ADMIN sees `<ExpiredOverrideInline>`; allocation fails if reason is empty.

- [x] T047 [P] [US1] Add Issue i18n keys to `messages/ar.json` and `messages/en.json`.
  Under `operations.issue`:
  AR: `{ "title": "سندات الصرف", "create_new": "صرف جديد", "save_draft": "حفظ مسودة", "post_issue": "ترحيل الصرف", "post_confirm_title": "تأكيد ترحيل سند الصرف", "post_confirm_desc": "بعد الترحيل لا يمكن تعديل سند الصرف.", "scan_placeholder": "امسح باركود الصنف...", "no_item_found": "لم يُعثر على صنف لهذا الباركود.", "fefo_drawer_title": "تخصيص الدفعات (FEFO)", "posted_success": "تم ترحيل سند الصرف بنجاح." }`.
  EN: equivalent English strings.
  **Acceptance**: All keys present in both locale files.

### Stocktake

- [x] T048 [US1] Add Stocktake mock data to `src/lib/api/mocks/operations.ts`.
  Add:
  ```
  "GET /stocktake/sessions"     → PaginatedResponse with 2 sessions: one OPEN (wh-2), one POSTED
  "GET /stocktake/sessions/st-1" → full StocktakeSession { status:'OPEN', warehouse_id:'wh-2', counts: [4 StocktakeCount items with snapshot_qty set, counted_qty null] }
  "POST /stocktake/sessions"    → StocktakeSession { status: 'OPEN', snapshot_at: '...' }
  "PUT /stocktake/sessions/st-1/counts/count-1" → StocktakeCount with counted_qty and variance set
  "POST /stocktake/sessions/st-1/post" → StocktakeSession { status: 'POSTED' }
  ```
  Also update `"GET /inventory/warehouses/wh-2/lock"` to return `{ is_locked: true, session_id: 'st-1', session_number: 'ST-2026-001', lock_started_at: '2026-04-19T10:00:00Z' }`.
  **Acceptance**: GET sessions returns 2 sessions; GET single session returns 4 count rows.

- [x] T049 [US1] Create Stocktake feature hooks: `src/features/operations/hooks/useStocktakeList.ts`, `useStocktakeSession.ts`, `useStartStocktake.ts`, `useUpdateCount.ts`, `usePostStocktake.ts`.
  - `useStocktakeList(filters)`: `GET /stocktake/sessions?status=...&warehouse_id=...`
  - `useStocktakeSession(id)`: `GET /stocktake/sessions/:id` — returns full session with counts.
  - `useStartStocktake()`: `useMutation` → `POST /stocktake/sessions`. Body: `{ warehouse_id: string }`. On success: invalidate `['warehouse-lock', warehouseId]` and `['stocktake-sessions']`.
  - `useUpdateCount()`: `useMutation` → `PUT /stocktake/sessions/:id/counts/:countId`. Body: `{ counted_qty: number; variance_reason?: string }`. On success: invalidate `['stocktake-session', sessionId]`.
  - `usePostStocktake()`: `useMutation` → `POST /stocktake/sessions/:id/post`. Body: `{ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }`. On success: invalidate `['warehouse-lock']` and `['stocktake-sessions']`.
  **Acceptance**: All hooks compile; `useStartStocktake` invalidates lock cache on success.

- [x] T050 [P] [US1] Build `src/app/[locale]/(app)/(operations)/stocktake/page.tsx` — Stocktake List (Server Component).
  Same pattern as GRN/Issue list. Title `t('operations.stocktake.title')` = "جلسات الجرد". DataTable client component `<StocktakeListClient />`. ProtectedRoute: `requiredAction="view" requiredResource="stocktake"`. "Start New Session" button links to a modal/sheet (not a new page — start flow is inline).
  **Acceptance**: Page renders; 2 mock sessions show in table.

- [x] T051 [US1] Create `src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx` — client-side stocktake list with "Start New Session" flow.
  Client Component. Shows DataTable with columns: Session Number, Warehouse, Status badge, Snapshot At, Started By, Posted At.
  "Start New Session" button opens a `<Dialog>` with:
  - Warehouse selector dropdown (fetches `GET /warehouses`).
  - `<PostConfirmDialog>` warning: "بدء الجلسة سيقفل المستودع ويمنع أي حركة مخزون حتى انتهاء الجرد."
  On confirm: `useStartStocktake.mutate({ warehouse_id })`. On success: navigate to `/stocktake/{newSession.id}`.
  If `GET /inventory/warehouses/:id/lock` returns `is_locked: true`: show error "يوجد جرد نشط بالفعل لهذا المستودع" and disable Start button.
  **Acceptance**: Starting a session for wh-2 fails (already locked); starting for wh-1 succeeds and navigates to detail.

- [x] T052 [US1] Build `src/app/[locale]/(app)/(operations)/stocktake/[id]/page.tsx` — Stocktake Detail/Count page.
  Client Component. Fetches `useStocktakeSession(id)`.
  Header: Session number, Warehouse, Status badge, Snapshot time, Lock banner (always shown for OPEN/COUNTING/REVIEW sessions).
  Count Sheet Table (NOT using DataTable — this is a custom table): Columns: Item Code, Item Name, Lot Number, Snapshot Qty (`dir="ltr"`), Counted Qty (editable `<input type="number">` if status !== POSTED), Variance (= counted - snapshot, auto-computed, red if < 0, green if > 0, — if null), Variance Reason (required `<input>` if variance !== 0 and status !== POSTED).
  On Counted Qty blur: call `useUpdateCount.mutate({ counted_qty, variance_reason })` — show a subtle green checkmark spinner.
  Footer: "إتمام الجرد وترحيله" button. Disabled if ANY count row has `variance !== 0 && !variance_reason`. Opens `PostConfirmDialog("تأكيد ترحيل الجرد", "سيتم إنشاء تسويات تلقائية للفروقات وسيُرفع القفل عن المستودع.")`.
  On post success: navigate back to stocktake list; lock banner disappears.
  **Acceptance**: Count input for an item saves on blur; variance shows -3 in red when counted < snapshot; POST disabled without variance reasons.

- [x] T053 [P] [US1] Add Stocktake i18n keys to both locale files.
  Under `operations.stocktake`: `{ "title": "جلسات الجرد", "start_session": "بدء جلسة جرد", "warehouse_selector": "اختر المستودع", "start_confirm_title": "تأكيد بدء الجرد", "start_confirm_desc": "سيُقفل المستودع حتى انتهاء الجرد.", "already_locked": "يوجد جرد نشط لهذا المستودع.", "count_sheet_title": "ورقة العد", "snapshot_qty": "الكمية عند بدء الجرد", "counted_qty": "الكمية المعدودة", "variance": "الفرق", "variance_reason": "سبب الفرق", "variance_reason_required": "سبب الفرق مطلوب لأي فرق غير صفري.", "post_session": "ترحيل الجرد", "post_confirm_title": "تأكيد ترحيل الجرد", "post_confirm_desc": "سيتم تطبيق تسويات للفروقات ورفع القفل عن المستودع.", "posted_success": "تم ترحيل الجرد بنجاح ورُفع القفل عن المستودع.", "warehouse_locked_banner": "المستودع مقفل بسبب جرد نشط: {sessionNumber}" }`.
  EN equivalents.
  **Acceptance**: All stocktake keys exist in both files.

---

**PHASE 3 CHECKPOINT** ✅: Can scan barcodes into a new Issue → FEFO lot allocator shows correct colors → POST succeeds. Stocktake: start session → warehouse shows locked → enter counts → variance reasons required → post → lock released. GRN: create → scan items → FEFO lots → post with FX rate.

---

## PHASE 4 — US2: Full Procurement Workflow (PR → PO → GRN with FX)
**Goal**: Procurement Officer creates PR → submits for approval → INV_MGR approves → converts to PO in supplier currency → GRN receives stock with FX rate captured at posting.

---

- [x] T054 [US2] Ensure `src/lib/api/mocks/purchasing.ts` includes PR and PO mock data.
  Add:
  ```
  "GET /procurement/prs"         → PaginatedResponse: 3 PRs (DRAFT, SUBMITTED, APPROVED)
  "GET /procurement/prs/pr-1"    → full PR in DRAFT with 2 lines
  "POST /procurement/prs"        → PR { status: 'DRAFT' }
  "POST /procurement/prs/pr-1/submit"   → PR { status: 'SUBMITTED' }
  "POST /procurement/prs/pr-1/approve"  → PR { status: 'APPROVED' }
  "POST /procurement/prs/pr-1/reject"   → PR { status: 'REJECTED' }
  "GET /procurement/pos"         → PaginatedResponse: 2 POs (DRAFT, POSTED)
  "GET /procurement/pos/po-1"    → full PO with supplier, currency_id='usd', 2 lines with unit_price
  "POST /procurement/pos"        → PO { status: 'DRAFT' }
  "POST /procurement/pos/po-1/post" → PO { status: 'POSTED' }
  "GET /currencies/fx-rates"     → [{ from_currency_id: 'usd', to_currency_id: 'sar', rate: 3.75, effective_date: '2026-04-19' }]
  "GET /suppliers"               → PaginatedResponse: [{ id:'sup-1', name_ar:'شركة التوريد', name_en:'Supply Co', currency_id:'usd', ... }]
  "GET /currencies"              → [{ id:'sar', code:'SAR', is_base:true }, { id:'usd', code:'USD', is_base:false }]
  ```
  **Acceptance**: All PR/PO/currency mock endpoints return data.

- [x] T055 [US2] Create PR feature hooks: `src/features/purchasing/hooks/usePRList.ts`, `usePR.ts`, `useCreatePR.ts`, `useSubmitPR.ts`, `useApprovePR.ts`, `useRejectPR.ts`.
  - `usePRList(filters)`: `GET /procurement/prs?status=...&page=...`
  - `usePR(id)`: `GET /procurement/prs/:id`
  - `useCreatePR()`: `POST /procurement/prs`
  - `useSubmitPR()`: `POST /procurement/prs/:id/submit`
  - `useApprovePR()`: `POST /procurement/prs/:id/approve` — requires INV_MGR+ role (caller checks `usePermission('approve', 'pr')`)
  - `useRejectPR()`: `POST /procurement/prs/:id/reject`. Body: `{ reason: string }`. On success: invalidate PR queries.
  **Acceptance**: All hooks compile with correct types.

- [x] T056 [P] [US2] Build `src/app/[locale]/(app)/(procurement)/purchase-requests/page.tsx` + `PRListClient.tsx` — PR List (Server Component + Client).
  Server Component: same pattern as GRN list. Title "طلبات الشراء". ProtectedRoute `view/pr`.
  `<PRListClient>` columns: Document Number (link), Status badge, Requested By Dept, Required By Date, Lines Count, Created At.
  Pending-approval badge: show count of SUBMITTED PRs in amber near "Requests" nav item.
  **Acceptance**: 3 mock PRs render; SUBMITTED count badge shows "1".

- [x] T057 [US2] Build `src/app/[locale]/(app)/(procurement)/purchase-requests/[id]/page.tsx` — PR Detail/Create.
  Client Component. Handles `id === 'new'` and existing.
  Header: Department selector (destination dept), Required By Date picker, Notes.
  Body: `<DocumentReadOnlyOverlay isPosted={['APPROVED','POSTED'].includes(pr?.status ?? '')}>` wrapping `<DocumentLineItemTable>` with extra columns "Requested Qty" (number input) and "Approved Qty" (read-only, shown only when status is APPROVED or later).
  Footer action buttons — shown based on status AND role:
  - Status DRAFT + any role: "حفظ مسودة" button.
  - Status DRAFT + PROC_OFFICER+: "تقديم للاعتماد" → `useSubmitPR.mutate(id)`.
  - Status SUBMITTED + INV_MGR+: "اعتماد" → `useApprovePR.mutate(id)` AND "رفض" → opens a dialog for reject reason → `useRejectPR.mutate({ id, reason })`.
  - Status APPROVED + INV_MGR+: "تحويل إلى أمر شراء" button → navigates to `/purchase-orders/new?pr_id={id}` (pre-fills PO form).
  `<StatusTimeline>` component (create inline or as a separate file `src/components/shared/StatusTimeline.tsx`): renders the history of status changes in descending order with timestamp + user. Props: `{ entries: { status: DocumentStatus; at: string; by: string }[] }`.
  **Acceptance**: PROC_OFFICER sees Submit; INV_MGR sees Approve/Reject; approved PR shows "Convert to PO" button.

- [x] T058 [US2] Create PO feature hooks: `src/features/purchasing/hooks/usePOList.ts`, `usePO.ts`, `useCreatePO.ts`, `usePostPO.ts`, `useCurrencies.ts`, `useFXRates.ts`.
  - `usePOList(filters)`: `GET /procurement/pos?status=...&page=...`
  - `usePO(id)`: `GET /procurement/pos/:id`
  - `useCreatePO()`: `POST /procurement/pos`. Body: `PurchaseOrder` (without id/status).
  - `usePostPO()`: `POST /procurement/pos/:id/post`. Body: `{ confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }`.
  - `useCurrencies()`: `GET /currencies` — returns `Currency[]`. Use `staleTime: Infinity` (currencies rarely change).
  - `useFXRates(fromCurr, toCurr)`: `GET /currencies/fx-rates?from={fromCurr}&to={toCurr}` — returns `FXRate[]`.
  **Acceptance**: `useFXRates('USD', 'SAR')` returns `[{ rate: 3.75, ... }]` from mock.

- [x] T059 [P] [US2] Build `src/app/[locale]/(app)/(procurement)/purchase-orders/page.tsx` + `POListClient.tsx` — PO List.
  Title "أوامر الشراء". DataTable columns: Doc Number, Status badge, Supplier, Currency, Expected Delivery Date, Total (in supplier currency with `<span dir="ltr">`), Created At.
  **Acceptance**: 2 mock POs render; numeric total in `dir="ltr"` span.

- [x] T060 [US2] Build `src/app/[locale]/(app)/(procurement)/purchase-orders/[id]/page.tsx` — PO Detail/Create.
  Client Component. Reads `searchParams.pr_id` on mount (`const sp = await searchParams; const prId = sp.pr_id`) — if present, pre-fill PO lines from the approved PR data (`usePR(prId)`).
  Header: Supplier selector (fetches `GET /suppliers`), Currency selector (`useCurrencies()`), Expected Delivery Date picker, Linked PR (read-only link if pre-filled).
  Body: `<DocumentReadOnlyOverlay isPosted={po?.status === 'POSTED'}>` wrapping `<DocumentLineItemTable>` with extra columns:
  - "Ordered Qty" (number input)
  - "Unit Price ({currencyCode})" (number input, `dir="ltr"`)
  - "Total ({currencyCode})" (= ordered_qty * unit_price, computed in `<span dir="ltr">`)
  Live FX conversion: when supplier currency is not base currency, show below the table: "الإجمالي بالعملة المحلية: {totalBase}" using `useFXRates()`. Update as user types prices.
  Footer: "حفظ مسودة" and "ترحيل" (open `PostConfirmDialog`). On PO post: navigate to `/goods-received/new?po_id={id}`.
  **Acceptance**: Pre-fills from PR when `pr_id` in URL; live total in SAR updates when unit price changes; "Create GRN" button appears after POST.

- [x] T061 [P] [US2] Add PR/PO i18n keys to both locale files.
  Under `procurement.pr`: `{ "title": "طلبات الشراء", "create_new": "طلب شراء جديد", "save_draft": "حفظ مسودة", "submit": "تقديم للاعتماد", "approve": "اعتماد", "reject": "رفض", "reject_reason": "سبب الرفض", "convert_to_po": "تحويل إلى أمر شراء", "approve_confirm": "تأكيد الاعتماد" }`.
  Under `procurement.po`: `{ "title": "أوامر الشراء", "create_new": "أمر شراء جديد", "save_draft": "حفظ مسودة", "post_po": "ترحيل أمر الشراء", "post_confirm_title": "تأكيد ترحيل أمر الشراء", "post_confirm_desc": "بعد الترحيل لا يمكن تعديل الأمر.", "create_grn": "إنشاء سند استلام", "total_base": "الإجمالي بالعملة المحلية" }`.
  EN equivalents.
  **Acceptance**: All keys present.

---

**PHASE 4 CHECKPOINT** ✅: Full PR → PO → GRN flow works; FX rate captured at GRN post; PO total shows live SAR conversion.

---

## PHASE 5 — US3: Stocktake Lock Propagation (Cross-Module Hardening)
**Goal**: Prove that an active stocktake on Warehouse A blocks POST on ALL document types for Warehouse A, but Warehouse B is unaffected.
**Prerequisite**: Phase 3 stocktake tasks (T048–T053) must be complete.

---

- [x] T062 [US3] Add `useWarehouseLock` integration to GRN Detail page (`goods-received/[id]/page.tsx`).
  In the GRN detail page (T039): the warehouse is known from `grn.warehouse_id` or from a warehouse selector.
  Add `const { data: lockState } = useWarehouseLock(warehouseId)` at the top of the component.
  Add `<LockBanner lockState={lockState} />` immediately below the page header.
  The "ترحيل" POST button must be `disabled={lockState?.is_locked ?? false}`. When disabled, show tooltip: `t('procurement.grn.warehouse_locked')`.
  **Acceptance**: GRN for wh-2 (locked) shows amber banner and "ترحيل" button is disabled.

- [x] T063 [US3] Add `useWarehouseLock` integration to Issue Detail page (`issues/[id]/page.tsx`).
  Same pattern as T062. Add `<LockBanner>` and disable "ترحيل" when warehouse locked.
  **Acceptance**: Issue for wh-2 shows amber banner; Issue for wh-1 shows no banner.

- [x] T064 [P] [US3] Add `useWarehouseLock` integration to Transfer Detail page — when created in Phase 6 (T076), ensure this is included from the start. Mark as TODO comment in `transfers/[id]/page.tsx` if Phase 6 not complete yet.
  Acceptance: noted for Phase 6 implementation.

- [x] T065 [P] [US3] Add `useWarehouseLock` integration to Adjustment Detail page — same note as T064 for Phase 6.
  Acceptance: noted for Phase 6 implementation.

---

**PHASE 5 CHECKPOINT** ✅: GRN for locked warehouse (wh-2) shows `<LockBanner>` and POST disabled. GRN for unlocked warehouse (wh-1) has no banner and POST enabled.

---

## PHASE 6 — Operations Complement (Transfers + Adjustments)

---

- [ ] T066 Add Transfer and Adjustment mock data to `src/lib/api/mocks/operations.ts`.
  Transfer mocks:
  ```
  "GET /operations/transfers"         → PaginatedResponse: 2 transfers (DRAFT, IN_TRANSIT)
  "GET /operations/transfers/tr-1"    → Transfer { transfer_status:'DRAFT', from_warehouse_id:'wh-1', to_warehouse_id:'wh-3', lines: [2 items] }
  "POST /operations/transfers"        → Transfer { transfer_status:'DRAFT' }
  "POST /operations/transfers/tr-1/ship"    → Transfer { transfer_status:'IN_TRANSIT', shipped_at:'...' }
  "POST /operations/transfers/tr-1/receive" → Transfer { transfer_status:'RECEIVED', received_qty filled }
  "POST /operations/transfers/tr-1/post"   → Transfer { transfer_status:'POSTED', status:'POSTED' }
  ```
  Adjustment mocks:
  ```
  "GET /operations/adjustments"       → PaginatedResponse: 2 adjustments (DRAFT, POSTED)
  "GET /operations/adjustments/adj-1" → Adjustment { reason:'DAMAGE', lines: [1 line with direction:'DECREASE', qty_before:100, qty_adjusted:5] }
  "POST /operations/adjustments"      → Adjustment { status:'DRAFT' }
  "POST /operations/adjustments/adj-1/approve" → Adjustment { status:'APPROVED', approved_by:'user-1' }
  "POST /operations/adjustments/adj-1/post"    → Adjustment { status:'POSTED' }
  ```
  **Acceptance**: Both endpoints return mock data.

- [ ] T067 Create Transfer hooks: `src/features/operations/hooks/useTransferList.ts`, `useTransfer.ts`, `useCreateTransfer.ts`, `useShipTransfer.ts`, `usePostTransfer.ts`.
  - `useShipTransfer()`: `POST /operations/transfers/:id/ship` — no body. On success: invalidate transfer queries.
  - `usePostTransfer()`: `POST /operations/transfers/:id/post`. Body `{ confirmation }`. On error `WAREHOUSE_LOCKED` (either warehouse): caller shows `LockBanner`.
  **Acceptance**: All hooks compile.

- [ ] T068 [P] Build Transfer List + Detail pages.
  `src/app/[locale]/(app)/(operations)/transfers/page.tsx` (Server Component): title "نقل المخزون". `<TransferListClient>` columns: Doc Number, From WH, To WH, Status (use `transfer_status`), Shipped At, Received At.
  `src/app/[locale]/(app)/(operations)/transfers/[id]/page.tsx` (Client Component):
  - Warehouse selectors: From WH and To WH.
  - `<LockBanner lockState={useWarehouseLock(fromWHId).data} />` AND `<LockBanner lockState={useWarehouseLock(toWHId).data} />` (two separate banners if either is locked).
  - `<DocumentLineItemTable>` with "Shipped Qty" and "Received Qty" columns.
  - Status-based action buttons: DRAFT → "Ship" button → `PostConfirmDialog` → `useShipTransfer.mutate(id)`. IN_TRANSIT → receiving side shows editable "Received Qty" inputs + "Confirm Receipt & Post" → `usePostTransfer.mutate(id, body)`.
  **Acceptance**: DRAFT transfer has "Ship" button; IN_TRANSIT has editable received qty inputs.

- [ ] T069 Create Adjustment hooks: `src/features/operations/hooks/useAdjustmentList.ts`, `useAdjustment.ts`, `useCreateAdjustment.ts`, `useApproveAdjustment.ts`, `usePostAdjustment.ts`.
  - `useApproveAdjustment()`: `POST /operations/adjustments/:id/approve`. Restrict in UI to INV_MGR+ via `usePermission('approve', 'adjustment')`.
  - `usePostAdjustment()`: `POST /operations/adjustments/:id/post`. Body: `{ confirmation }`. Can only post APPROVED adjustments — button disabled if `status !== 'APPROVED'`.
  **Acceptance**: All hooks compile.

- [ ] T070 [P] Build Adjustment List + Detail pages.
  `src/app/[locale]/(app)/(operations)/adjustments/page.tsx`: title "التسويات". `<AdjustmentListClient>` columns: Doc Number, Reason (`<StatusBadge>`-style chip: DAMAGE/EXPIRY/THEFT red, COUNTING_ERROR amber, OTHER gray), Status badge, Approved By, Created At.
  `src/app/[locale]/(app)/(operations)/adjustments/[id]/page.tsx` (Client Component):
  - Reason selector (required): DAMAGE / EXPIRY / THEFT / COUNTING_ERROR / OTHER.
  - `<DocumentLineItemTable>` with extra columns: "Direction" (INCREASE=green ↑, DECREASE=red ↓), "Qty Before", "Qty Adjusted", "Reason Notes" (required textarea per line).
  - Action buttons: DRAFT → "حفظ مسودة"; DRAFT + INV_MGR+ → "اعتماد" → `useApproveAdjustment.mutate(id)`; APPROVED + INV_MGR+ → "ترحيل" → `PostConfirmDialog` → `usePostAdjustment.mutate(id)`.
  - POST button disabled if `status !== 'APPROVED'`.
  **Acceptance**: DRAFT adjustment has Save + Approve buttons (for INV_MGR); APPROVED has Post button; POSTED is read-only.

- [ ] T071 [P] Add Transfer + Adjustment i18n keys to both locale files.
  Under `operations.transfer`: `{ "title": "نقل المخزون", "create_new": "نقل جديد", "from_warehouse": "من مستودع", "to_warehouse": "إلى مستودع", "ship": "شحن", "confirm_receipt": "تأكيد الاستلام والترحيل", "ship_confirm_title": "تأكيد الشحن" }`.
  Under `operations.adjustment`: `{ "title": "التسويات", "reason": "سبب التسوية", "approve": "اعتماد", "post_adjustment": "ترحيل التسوية", "direction_increase": "زيادة", "direction_decrease": "نقص", "reason_notes": "تفاصيل السبب" }`.
  EN equivalents.
  **Acceptance**: All keys present.

---

## PHASE 7 — Master Data (Branches, Warehouses, Items, Suppliers, Currencies, Departments)

---

- [x] T072 Ensure `src/lib/api/mocks/master-data.ts` has CRUD mock data for all 10 entity types.
  Minimum mock entries per entity: `GET /branches` (3 branches), `GET /branches/br-1` (single), `POST /branches`, `PUT /branches/br-1`, `GET /warehouses` (4 warehouses), `GET /warehouses/wh-1`, etc. Add equivalent for warehouses, items, suppliers, currencies, fx-rates, departments, uom, categories, barcodes.
  **Acceptance**: `GET /branches` returns 3 branches from mock.

- [x] T073 Create a shared master data hook factory to reduce repetition: `src/features/master-data/hooks/useMasterDataCRUD.ts`.
  ```typescript
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { apiClient } from '@/lib/api/client';
  import type { ZodSchema } from 'zod';
  import { paginatedSchema } from '@/types/api';

  export function useMasterDataList<T>(entity: string, schema: ZodSchema<T>, filters = {}) {
    const params = new URLSearchParams(filters as Record<string, string>);
    return useQuery({ queryKey: [entity, filters], queryFn: () => apiClient.get(`/${entity}?${params}`, paginatedSchema(schema)), staleTime: 60_000 });
  }
  export function useMasterDataItem<T>(entity: string, id: string | null, schema: ZodSchema<T>) {
    return useQuery({ queryKey: [entity, id], queryFn: () => apiClient.get(`/${entity}/${id}`, schema), enabled: !!id });
  }
  export function useMasterDataCreate<T>(entity: string, schema: ZodSchema<T>) {
    const qc = useQueryClient();
    return useMutation({ mutationFn: (body: unknown) => apiClient.post(`/${entity}`, schema, body), onSuccess: () => qc.invalidateQueries({ queryKey: [entity] }) });
  }
  export function useMasterDataUpdate<T>(entity: string, schema: ZodSchema<T>) {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, body }: { id: string; body: unknown }) => apiClient.put(`/${entity}/${id}`, schema, body), onSuccess: () => qc.invalidateQueries({ queryKey: [entity] }) });
  }
  ```
  **Acceptance**: `useMasterDataList('branches', BranchSchema)` compiles and returns typed `PaginatedResponse<Branch>`.

- [ ] T074 [P] Build Branches CRUD: `src/app/[locale]/(app)/(master-data)/branches/page.tsx` and `branches/[id]/page.tsx`.
  **List page** (Server Component): title "الفروع". `<BranchListClient>` using `useMasterDataList('branches', BranchSchema)`. DataTable columns: Code, Name (AR or EN per locale), Active (✓ / ✗), Created At. "New Branch" button links to `/branches/new`. ProtectedRoute `view/master_data`.
  **Detail/Edit page** (Client Component): React Hook Form + Zod validation:
  ```typescript
  const schema = z.object({ code: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1), is_active: z.boolean() });
  ```
  Fields: Code input, Name AR input, Name EN input, Is Active checkbox. "Save" button calls `useCreate.mutate()` or `useUpdate.mutate()`. On success: navigate back to list. ProtectedRoute `create/master_data` for new, `edit/master_data` for edit. AUDITOR cannot see this page.
  **Acceptance**: Can create a branch with `name_ar` and `name_en`; form validation blocks empty names.

- [ ] T075 [P] Build Warehouses CRUD: `src/app/[locale]/(app)/(master-data)/warehouses/page.tsx` and `warehouses/[id]/page.tsx`.
  Same pattern as Branches. Extra fields: Branch selector dropdown (`useMasterDataList('branches', BranchSchema)`), Type selector (MAIN / DRY / COLD / VIRTUAL), Is Active.
  Form Zod schema: `z.object({ branch_id: z.string().min(1), code: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1), type: z.enum(['MAIN','DRY','COLD','VIRTUAL']), is_active: z.boolean() })`.
  **Acceptance**: Warehouse form requires branch selection.

- [ ] T076 [P] Build Items CRUD: `src/app/[locale]/(app)/(master-data)/items/page.tsx` and `items/[id]/page.tsx`.
  Extra fields: Category selector, Primary UoM selector, `track_lots` checkbox, Min Stock Level number input, Reorder Point number input, Barcode field (`<ScanInput onScan={(barcode) => setValue('barcode', barcode)} />` — user can scan OR type). UoM Conversions: repeating rows (From UoM, To UoM, Factor).
  Form schema: `z.object({ code: z.string().min(1), barcode: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1), category_id: z.string().min(1), primary_uom_id: z.string().min(1), track_lots: z.boolean(), min_stock_level: z.number().min(0), reorder_point: z.number().min(0) })`.
  **Acceptance**: Barcode field accepts scan input; `track_lots` checkbox toggles lot-related fields.

- [ ] T077 [P] Build Suppliers CRUD: `src/app/[locale]/(app)/(master-data)/suppliers/page.tsx` and `suppliers/[id]/page.tsx`.
  Fields: Code, Name AR, Name EN, Currency selector, Payment Terms textarea, Is Active.
  **Acceptance**: Supplier form requires currency selection.

- [ ] T078 [P] Build Currencies & FX Rates: `src/app/[locale]/(app)/(master-data)/currencies/page.tsx` and `currencies/[id]/fx-rates/page.tsx`.
  Currency list: Code, Name AR, Name EN, Symbol, Is Base (only one allowed — show read-only if base).
  FX Rate list for a currency: `GET /currencies/fx-rates?from={code}`. Table: From, To, Rate, Effective Date. "Add Rate" form: From currency (read-only = current), To Currency, Rate (number, `dir="ltr"` input), Effective Date. Rates are immutable once saved (no edit, no delete).
  **Acceptance**: FX rate list shows rate 3.75 for USD→SAR from mock.

- [ ] T079 [P] Build Departments CRUD: `src/app/[locale]/(app)/(master-data)/departments/page.tsx` and `departments/[id]/page.tsx`.
  Fields: Branch selector, Code, Name AR, Name EN, Is Active.
  **Acceptance**: Department requires branch selection.

- [ ] T080 [P] Build UoM, Categories, Barcodes management pages (simple CRUD).
  UoM: `src/app/[locale]/(app)/(master-data)/units-of-measure/page.tsx` — Code, Name AR, Name EN.
  Categories: `src/app/[locale]/(app)/(master-data)/categories/page.tsx` — Name AR, Name EN.
  Barcodes: `src/app/[locale]/(app)/(master-data)/barcodes/page.tsx` — item selector + barcode field (`<ScanInput>`). Renders item-barcode associations table. "Register Barcode" form: scan OR type barcode, select item.
  **Acceptance**: All three pages render with their respective DataTables and create forms.

- [ ] T081 [P] Add Master Data i18n keys for all 10 entities to both locale files.
  Under `masterData.branches`, `masterData.warehouses`, etc.:
  For each entity: `{ "title": "...", "create_new": "...", "name_ar": "الاسم بالعربية", "name_en": "الاسم بالإنجليزية", "code": "الرمز", "is_active": "نشط", "saved_success": "تم الحفظ بنجاح." }`.
  EN equivalents.
  **Acceptance**: All master data keys present in both files.

---

## PHASE 8 — Auth Screens & Dashboard

---

- [ ] T082 Build Login page: `src/app/[locale]/(auth)/login/page.tsx`.
  Client Component. React Hook Form:
  ```typescript
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  ```
  Fields: Email input, Password input (with show/hide toggle). "تسجيل الدخول" / "Sign In" submit button. Error message area (`role="alert"`). `<LocaleSwitcher>` top-right corner.
  On submit: `useAuth().login(email, password)`. On success: `router.replace('/${locale}/dashboard')`. On error: display Arabic/English error from the `ApiError.message` i18n key.
  Also create `src/app/[locale]/(auth)/layout.tsx` — centered card layout: `flex items-center justify-center min-h-screen bg-surface-0`.
  Add auth-related mock: `"POST /auth/login"` → `{ user: { id:'u1', name:'مدير المخزون', email:'admin@demo.com', role:'ADMIN', scopes:[{ branch_id:null, warehouse_id:null, department_id:null }], locale:'ar' }, token:'mock.jwt.token' }`.
  **Acceptance**: Entering `admin@demo.com` + any password logs in and redirects to dashboard.

- [ ] T083 [P] Build Dashboard: `src/app/[locale]/(app)/dashboard/page.tsx` — KPI overview with static mock data.
  Server Component. Renders 4 KPI cards using a `<KPICard>` component:
  1. "رصيد المخزون الكلي" / "Total Stock Value" — mock value "SAR 1,245,300"
  2. "طلبات الشراء المعلقة" / "Pending PRs" — mock value "7"
  3. "جلسات الجرد النشطة" / "Active Stocktakes" — mock value "2"
  4. "أصناف تحت الحد الأدنى" / "Low Stock Items" — mock value "14"
  `<KPICard>` inline component: `{ title: string; value: string; icon?: string; accent?: 'cyan'|'amber'|'red' }`. Style: `bg-surface-1 rounded-lg p-6 border border-surface-3`.
  Numbers wrapped in `<span dir="ltr">`.
  **Acceptance**: Dashboard shows 4 KPI cards with mock values; numeric values have `dir="ltr"`.

- [ ] T084 [P] Build User Profile + Change Password: `src/app/[locale]/(app)/profile/page.tsx` and `profile/change-password/page.tsx`.
  Profile: Client Component. Shows logged-in user's name, email, role, scopes (branch/warehouse/dept assignments as badge list). `<LocaleSwitcher>` for changing preferred locale. Read-only — no edit form.
  Change Password: Client Component. React Hook Form: `z.object({ current_password: z.string().min(1), new_password: z.string().min(8), confirm_password: z.string() }).refine(d => d.new_password === d.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })`.
  **Acceptance**: Profile shows current user's role and scopes.

---

## PHASE 9 — Inventory Views

---

- [ ] T085 Add Inventory mock data to `src/lib/api/mocks/inventory.ts`.
  ```
  "GET /inventory/balance"    → PaginatedResponse: 5 items with qty_on_hand, qty_reserved, qty_available (some below reorder_point)
  "GET /inventory/lots"       → PaginatedResponse: 6 lots (2 expired, 1 near-expiry, 3 valid)
  "GET /inventory/movements"  → PaginatedResponse: 10 movements (mix of GRN/ISSUE/TRANSFER, IN/OUT)
  ```
  **Acceptance**: All 3 inventory endpoints return data.

- [ ] T086 [P] Build Stock Balance page: `src/app/[locale]/(app)/(inventory)/balance/page.tsx`.
  Server Component + `<StockBalanceClient>` Client Component.
  DataTable columns: Item Code, Item Name (locale-aware), Warehouse, On Hand (`dir="ltr"`), Reserved (`dir="ltr"`), Available (`dir="ltr"`).
  Rows where `qty_available < item.reorder_point` → row class `bg-neon-red/5`.
  Filters: warehouse_id, item search (text), date range.
  "Export XLSX" button: on click, download a CSV via `generateCSV(data, columns)` utility function — create `src/utils/export.ts` with `generateCSV()` that converts data array to CSV string and triggers a `<a download>` click.
  **Acceptance**: Low-stock rows have red background; Export CSV downloads file with correct column headers.

- [ ] T087 [P] Build Inventory Movements Ledger: `src/app/[locale]/(app)/(inventory)/movements/page.tsx`.
  Server Component + `<MovementsClient>`.
  DataTable columns: Posted At (`dir="ltr"`), Document Number (link to the source document), Type (`<StatusBadge>`-style chip), Item Code, Item Name, Lot Number, Direction (IN=green ↑, OUT=red ↓), Qty (`dir="ltr"`).
  This is a READ-ONLY page — no action/edit buttons at all, regardless of role. Only `view` permission required.
  Filters: document_type, from_date, to_date, item search.
  **Acceptance**: No edit/delete buttons on any row at any role; IN movements show green badge, OUT red.

- [ ] T088 [P] Build Lot Balances page: `src/app/[locale]/(app)/(inventory)/lots/page.tsx`.
  Server Component + `<LotBalanceClient>`.
  DataTable columns: Item Code, Item Name, Lot Number, Expiry Date, Available Qty, Status (expired=red "منتهي", near-expiry=amber "يقترب الانتهاء", valid=green "صالح").
  Toggle filter: "Show Expired Lots" checkbox — adds `?include_expired=true` to the query.
  **Acceptance**: Expired lots have red status badge; toggle shows/hides them.

---

## PHASE 10 — Notifications, Reports, Admin

---

- [ ] T089 Add Notifications and Admin mock data.
  `src/lib/api/mocks/notifications.ts`:
  ```
  "GET /notifications/templates" → [2 templates with subject_ar/en and body_ar/en]
  "GET /notifications/outbox"    → PaginatedResponse: 3 entries (1 PENDING, 1 SENT, 1 FAILED)
  ```
  `src/lib/api/mocks/admin.ts`:
  ```
  "GET /admin/users"     → PaginatedResponse: 3 users with roles
  "GET /admin/audit-log" → PaginatedResponse: 5 audit log entries with changes arrays
  ```
  **Acceptance**: All mock endpoints return data.

- [ ] T090 [P] Build Notification Templates + Email Outbox.
  Templates list (`src/app/[locale]/(app)/(communications)/notifications/templates/page.tsx`): DataTable columns: Code, Trigger Event, Is Active toggle. Click to open editor.
  Template editor (`templates/[id]/page.tsx`): Client Component. Form with 4 textareas: Subject AR, Body AR (RTL), Subject EN, Body EN (LTR — use `dir="ltr"` on the EN inputs). "Preview AR" / "Preview EN" toggle. Save via `PUT /notifications/templates/:id`. ProtectedRoute `view/admin` (ADMIN + INV_MGR).
  Email Outbox (`src/app/[locale]/(app)/(communications)/email-outbox/page.tsx`): DataTable columns: Recipient, Subject, Status badge, Sent At, Error Message. Status filter (PENDING/SENT/FAILED). FAILED rows show error message inline; "Retry" button (placeholder — calls nothing for now).
  **Acceptance**: Template editor shows 4 separate textareas; EN inputs have `dir="ltr"`.

- [ ] T091 [P] Build Reports Hub: `src/app/[locale]/(app)/(reports)/page.tsx`.
  Server Component. Renders 4 `<ReportCard>` components (create inline):
  ```
  Props: { title: string; description: string; href: string; icon?: string }
  ```
  Cards: Consumption Report, Expiry Tracking Report, Procurement Summary, Stocktake Variance Report.
  Each card shows title, description, and an "Export XLSX" button. For now, button calls a mock `GET /reports/{type}?format=xlsx` which in mock mode returns a placeholder CSV download.
  **Acceptance**: 4 report cards render; Export button triggers file download.

- [ ] T092 [P] Build Admin: User Management + Roles Viewer + Audit Log.
  User Management (`src/app/[locale]/(app)/(admin)/users/page.tsx` + `users/[id]/page.tsx`): DataTable columns: Name, Email, Role badge, Scopes summary. ProtectedRoute: `view/admin` (ADMIN only for create/edit; AUDITOR view-only). Create/Edit form: Name, Email, Role selector, Branch scope multi-select, Warehouse scope multi-select.
  Roles Viewer (`src/app/[locale]/(app)/(admin)/roles/page.tsx`): Read-only matrix table — roles as columns, resources as rows — shows ✓ for each allowed action. Generated from `PERMISSION_MATRIX` constant in `src/types/rbac.ts`. No edit functionality.
  Audit Log (`src/app/[locale]/(app)/(admin)/audit-log/page.tsx`): DataTable columns: Entity Type, Entity ID (link), Action, User Name, Created At. Expandable row: shows `<AuditDiffViewer changes={entry.changes} />`. Export to CSV.
  **Acceptance**: Roles matrix renders `PERMISSION_MATRIX` accurately; AUDITOR cannot access user management create button (hidden).

- [ ] T093 [P] Add Notifications, Reports, Admin i18n keys to both locale files.
  Under `notifications`: `{ "templates": "قوالب الإشعارات", "outbox": "صندوق الصادر", "subject_ar": "الموضوع (عربي)", "body_ar": "النص (عربي)", "preview": "معاينة" }`.
  Under `reports`: `{ "title": "التقارير", "consumption": "تقرير الصرف", "expiry": "تقرير الانتهاء", "procurement": "ملخص المشتريات", "variance": "تقرير فروق الجرد" }`.
  Under `admin`: `{ "users": "المستخدمون", "roles": "الأدوار والصلاحيات", "audit_log": "سجل التدقيق" }`.
  EN equivalents.
  **Acceptance**: All keys present.

---

## PHASE 11 — QA & Constitution Hardening

---

- [ ] T094 Create Vitest unit tests for all utility functions.
  `src/tests/unit/currency.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { convertToBase, formatCurrency } from '@/utils/currency';
  describe('convertToBase', () => {
    it('converts 100 USD at 3.75 to 375 SAR', () => expect(convertToBase(100, 3.75)).toBe(375));
    it('rounds to 2 decimal places', () => expect(convertToBase(1, 3.333)).toBe(3.33));
  });
  ```
  `src/tests/unit/usePermission.test.ts` — test that AUDITOR can view but not post; ADMIN can do all:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { PERMISSION_MATRIX } from '@/types/rbac';
  describe('PERMISSION_MATRIX', () => {
    it('AUDITOR can view grn', () => expect(PERMISSION_MATRIX.AUDITOR.grn).toContain('view'));
    it('AUDITOR cannot post grn', () => expect(PERMISSION_MATRIX.AUDITOR.grn).not.toContain('post'));
    it('ADMIN can post grn', () => expect(PERMISSION_MATRIX.ADMIN.grn).toContain('post'));
    it('WH_KEEPER cannot post adjustment', () => expect(PERMISSION_MATRIX.WH_KEEPER.adjustment ?? []).not.toContain('post'));
  });
  ```
  **Acceptance**: `npm run test:unit` — all 6 unit tests pass.

- [ ] T095 [P] RTL and layout compliance audit — fix any violations found.
  Open each of the following pages in the browser at `/ar/` locale and check:
  1. `goods-received` — sidebar on RIGHT side. Breadcrumb arrows point LEFT (flipped). Pagination arrows flipped. All numeric cells `dir="ltr"`.
  2. `issues` — same checks.
  3. `stocktake` — same checks.
  4. `branches` — same checks.
  If any violation found, fix: in CSS use `padding-inline-start` not `padding-left`; in JSX wrap numbers in `<span dir="ltr">`.
  **Acceptance**: All 4 pages pass visual RTL inspection in AR locale.

- [ ] T096 [P] Run constitution DoD final checklist across ALL pages.
  For each module page (grn, issue, stocktake, transfer, adjustment, pr, po, branches, warehouses, items, suppliers, balance, movements, lots, notifications, reports, users, audit-log), verify:
  - [ ] `t('key')` used for ALL visible strings — zero hard-coded text
  - [ ] Dark background (`surface-0`) rendered — zero white backgrounds
  - [ ] POST buttons wrapped in `PostConfirmDialog`
  - [ ] Locked warehouse shows `LockBanner` and disables POST
  - [ ] Posted documents show `DocumentReadOnlyOverlay`
  - [ ] All numbers in `<span dir="ltr">` in RTL context
  - [ ] `ProtectedRoute` applied to each sensitive page
  - [ ] `tsc --noEmit` exits 0
  - [ ] `npm run lint` exits 0
  Fix any failures found. Track remaining violations as GitHub issues.
  **Acceptance**: `tsc --noEmit` and `npm run lint` both exit 0. All checklist items verified.

---

**FINAL CHECKPOINT** ✅: `npm run dev` starts clean. `tsc --noEmit` exits 0. `npm run lint` exits 0. `npm run test:unit` — 6+ tests pass. All pages accessible per role. RTL layout correct across all modules. Posted docs read-only. Warehouse lock banner visible and POST disabled on locked warehouse.

---

## Dependencies & Execution Order

```
Phase 1 (T001–T020) → BLOCKS everything
Phase 2 (T021–T034) → BLOCKS Phase 3–11
Phase 3 (T035–T053) → US1 core ops            | can start after Phase 2
Phase 4 (T054–T061) → US2 procurement          | can start after Phase 2 (parallel with Phase 3)
Phase 5 (T062–T065) → US3 lock hardening       | REQUIRES Phase 3 stocktake complete
Phase 6 (T066–T071) → Transfers + Adjustments  | can start after Phase 2 (parallel)
Phase 7 (T072–T081) → Master Data              | can start after Phase 2 (parallel)
Phase 8 (T082–T084) → Auth + Dashboard         | can start after Phase 1
Phase 9 (T085–T088) → Inventory Views          | can start after Phase 2
Phase 10 (T089–T093)→ Notifications + Admin    | can start after Phase 2
Phase 11 (T094–T096)→ QA — REQUIRES all phases complete
```

### Parallel Team Split (3 developers)

| Dev | Weeks 3–5 | Weeks 6–7 |
|-----|-----------|-----------|
| A   | Phase 3 (GRN + Issue + Stocktake) + Phase 5 | Phase 9 (Inventory) + Phase 11 |
| B   | Phase 4 (PR + PO) + Phase 6 (Transfer + Adj) | Phase 10 (Notif + Admin) |
| C   | Phase 8 (Auth) + Phase 7 (Master Data) | Phase 11 (QA) |

---

## MVP Scope (Phases 1–3 only, ~2 weeks)

Complete T001–T053 for a demonstration-ready MVP:
- WH_KEEPER can issue stock with FEFO enforcement in ≤60 seconds for 10 items.
- GRN can be created, scanned, lot-allocated, and posted with FX rate.
- Stocktake session starts, locks warehouse, accepts counts with variance reasons, posts and unlocks.
- All in Arabic RTL by default.

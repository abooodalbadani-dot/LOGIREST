# Quick Start: LogiRest Frontend UI

**Feature Branch**: `001-logirest-frontend-ui`
**Date**: 2026-04-19

---

## Prerequisites

- Node.js 20+ (LTS)
- npm 10+
- Git

---

## Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd "Kitchen-Store Inventory System"
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
# NEXT_PUBLIC_DEFAULT_LOCALE=ar

# 3. Start dev server
npm run dev
# App runs at http://localhost:3000
# Default locale: Arabic RTL → http://localhost:3000/ar/
```

---

## Project Conventions

### File & Folder Naming
- **Components**: PascalCase (`PostConfirmDialog.tsx`)
- **Files/Routes**: kebab-case (`goods-received/page.tsx`)
- **Hooks**: camelCase with `use` prefix (`useWarehouseLock.ts`)
- **Types**: PascalCase interfaces in `src/types/`

### Directory Structure

```
src/
├── app/[locale]/
│   ├── (auth)/           ← unauthenticated routes (login)
│   └── (app)/
│       ├── (admin)/      ← users, roles, audit log
│       ├── (master-data)/← branches, warehouses, items, suppliers
│       ├── (operations)/ ← issues, transfers, adjustments, stocktake
│       ├── (procurement)/← pr, po, grn
│       ├── (inventory)/  ← balance, lots, movements
│       ├── (communications)/ ← notifications, email outbox
│       └── (reports)/    ← reports + export
├── components/
│   ├── ui/               ← shadcn primitives (DO NOT add business logic here)
│   ├── shared/           ← business-level reusable components
│   └── layouts/          ← AppShell, Sidebar, Topbar
├── features/             ← feature-scoped logic (hooks + utilities)
│   ├── purchasing/
│   ├── operations/
│   ├── branches/
│   └── ...
├── lib/
│   ├── api/client.ts     ← typed fetch wrapper
│   ├── api/mocks/        ← MSW/static JSON mocks for dev
│   └── fonts.ts
├── hooks/                ← global shared hooks
├── providers/            ← QueryProvider, AuthProvider
├── i18n/                 ← next-intl config
├── types/                ← all shared TypeScript types + Zod schemas
└── utils/                ← pure utility functions
```

### RTL Rules (Constitution IV)

1. Use CSS logical properties everywhere:
   - ✅ `padding-inline-start: 16px` or `ps-4`
   - ❌ `padding-left: 16px` or `pl-4`
2. Numeric values: always `<span dir="ltr">` in Arabic locale
3. Directional icons: use `<Icon>` wrapper which auto-applies `scale-x-[-1]` in RTL
4. Never mix Arabic and English in the same label/input

### i18n Rules

```typescript
// Server Component — use getTranslations()
const t = await getTranslations('grn');

// Client Component — use useTranslations()
const t = useTranslations('grn');

// NEVER hard-code strings:
// ❌ <h1>Goods Received Note</h1>
// ✅ <h1>{t('title')}</h1>
```

### API Query Pattern

```typescript
// src/features/purchasing/hooks/useGRNList.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { GRNListSchema } from '@/types/grn';

export function useGRNList(filters: GRNFilters) {
  return useQuery({
    queryKey: ['grns', filters],
    queryFn: () => apiClient.get('/procurement/grns', GRNListSchema, filters),
    staleTime: 60_000,
  });
}
```

### Posting Pattern (all POST actions)

```typescript
// Always wrap in PostConfirmDialog BEFORE calling post mutation
<PostConfirmDialog
  title={t('post.confirm.title')}
  description={t('post.confirm.description')}
  warningText={t('post.confirm.irreversible_warning')}
  onConfirm={handlePostGRN}
/>
```

---

## Key Commands

```bash
npm run dev        # development server (localhost:3000)
npm run build      # production build (run to validate before PR)
npm run lint       # ESLint
npm run test:unit  # Vitest unit tests
npm run test:e2e   # Playwright E2E tests
npx tsc --noEmit   # TypeScript check (must pass before merge)
```

---

## Constitution Compliance Checklist (run before every PR)

```
[ ] RTL: Does it work in Arabic RTL? (especially breadcrumbs, tables, sidebars)
[ ] Dark Mode: Readable in Operational Nocturne (no white backgrounds)?
[ ] i18n: Every string uses t() — zero hard-coded text?
[ ] POST Guards: Every irreversible action uses PostConfirmDialog?
[ ] Lock: LockBanner shown + POST disabled when warehouse is locked?
[ ] Numbers: All numeric values wrapped in dir="ltr"?
[ ] Types: tsc --noEmit passes? Zero `any` without justification?
[ ] RBAC: ProtectedRoute / usePermission applied to sensitive screens?
```

---

## Development Tips

### Mock API (while backend is unavailable)

The API client checks for `NEXT_PUBLIC_USE_MOCKS=true` and routes requests to `src/lib/api/mocks/handlers.ts`. Add new mock handlers in the corresponding feature file (e.g., `src/lib/api/mocks/purchasing.ts`).

### Testing in RTL

Use the `rtl` helper in Playwright tests:
```typescript
import { assertRTL } from '@/tests/e2e/helpers/rtl';
await assertRTL(page); // asserts document.dir === 'rtl' and sidebar position
```

### Adding a New Screen (pattern)

1. Create `src/app/[locale]/(app)/(module)/feature-name/page.tsx` (Server Component)
2. Add i18n keys to `messages/ar.json` and `messages/en.json`
3. Add the feature hook in `src/features/module/hooks/`
4. Wrap with `<ProtectedRoute roles={[...]} />`
5. Add to Sidebar nav (conditionally based on role)
6. Run the constitution compliance checklist

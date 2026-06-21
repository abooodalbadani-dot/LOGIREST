# Mass Import Plan - Suppliers and Opening Stock

## Overview
LogiRest requires mass import features for Go-Live. We are adding Suppliers and Opening Stock Excel import support under `/master-data/import` in the Next.js app, parsed and posted securely via a new NestJS imports module.

## Project Type
WEB / BACKEND (NestJS API + Next.js App Router Monorepo)

## Success Criteria
- Swiss, dark-mode cards for Suppliers and Opening Stock added to `ImportLandingClient.tsx`.
- Client-side download buttons for blank excel templates.
- NestJS API controllers at `POST /api/imports/suppliers` and `POST /api/imports/opening-stock`.
- Suppliers are imported row-by-row, returning errors individually.
- Opening Stock rows are validated against Warehouse/Item existence, batched by warehouse, and programmatically posted through `AdjustmentPostService.post()` in serializable transactions.

## Tech Stack
- NestJS (Backend API)
- Next.js 15 (Frontend Web)
- Prisma ORM & PostgreSQL
- `exceljs` (in-memory Excel generation and parsing)
- TanStack Query & Tailwind CSS

## File Structure
```plaintext
apps/api/src/modules/imports/
├── imports.module.ts
├── imports.controller.ts
├── suppliers-import.service.ts
└── opening-stock-import.service.ts

apps/web/src/app/[locale]/(app)/master-data/import/
├── suppliers/
│   └── page.tsx
└── opening-stock/
    └── page.tsx
```

## Task Breakdown

### Task 1: Create Imports Module in NestJS
- **Agent**: `backend-specialist`
- **Skills**: `nodejs-best-practices`, `api-patterns`
- **Input**: Current project structure
- **Output**: Created `imports.module.ts`, controller, and basic imports services.
- **Verify**: Files compile cleanly without type errors.

### Task 2: Implement Suppliers Import API
- **Agent**: `backend-specialist`
- **Skills**: `nodejs-best-practices`, `database-design`
- **Input**: `SuppliersService`, Multer Uploaded File
- **Output**: Service parsing code/name/contact from sheet, creating supplier record, accumulating row conflicts.
- **Verify**: Test file uploaded to `/api/imports/suppliers` adds records and reports conflict errors on duplicate codes.

### Task 3: Implement Opening Stock Import API
- **Agent**: `backend-specialist`
- **Skills**: `nodejs-best-practices`, `database-design`
- **Input**: `AdjustmentsService`, `AdjustmentPostService`, Multer Uploaded File
- **Output**: Excel parsing, Warehouse/Item lookup, lot creation/upsert, creating draft adjustment, updating to APPROVED, calling `post()`.
- **Verify**: Excel upload updates `WarehouseItem.qtyOnHand`, WAC values, and inserts stock/cost ledgers.

### Task 4: Template Generation Endpoints
- **Agent**: `backend-specialist`
- **Skills**: `nodejs-best-practices`
- **Input**: Excel headers
- **Output**: `GET` endpoints in controller generating workbook streams in memory.
- **Verify**: Downloading files opens in Excel with correct header names.

### Task 5: Expand Frontend Import UI
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `nextjs-react-expert`
- **Input**: `ImportLandingClient.tsx`
- **Output**: Modifies cards array to display Arabic/English text for Suppliers and Opening Stock, adds page folders, wires React Query mutations to post FormData containing files.
- **Verify**: Clicking cards opens the upload wizard page.

---

## Phase X: Final Verification
- [ ] Backend Lint: `npm run lint --workspace=apps/api`
- [ ] Backend Types: `npx tsc --noEmit --project apps/api/tsconfig.json`
- [ ] Frontend Build: `npm run build --workspace=apps/web`

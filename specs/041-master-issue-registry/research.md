# Research & Design Decisions: LogiRest Phase 1 — Master Issue Registry

This document outlines the detailed architectural and design choices for resolving the Production Blockers and technical debt items identified in Phase 1 — Master Issue Registry.

---

## 1. API Pagination Envelope Standardization (P0-001 / P5-001)

### Context & Problem
The frontend utilizes a strict Zod parser for listing screens that expects a paginated payload structured as follows:
```json
{
  "data": T[],
  "meta": {
    "total": number,
    "page": number,
    "page_size": number,
    "total_pages": number
  }
}
```
Currently, 21 backend list endpoints return non-conforming shapes:
- **Shape A (Flat list)**: Flat array `T[]`.
- **Shape B (Legacy Pagination)**: `{ items, total, page, limit }`.
- **Shape C (Partially Mismatched)**: `{ data, meta }` but with different camelCase/snake_case properties (e.g. `limit`/`totalPages` instead of `page_size`/`total_pages`).

### Resolution Decisions
- **Backend List Wrappers**: Modify all 21 endpoints to wrap returned items in `{ data: T[], meta: { total, page, page_size, total_pages } }`.
- **Renaming Metadata**: Uniformly map database/query pagination metadata parameters inside the NestJS services:
  - `limit` maps to `page_size`.
  - `totalPages` or `last_page` maps to `total_pages`.
- **Deduplicate Frontend Schemas**: Delete inline `PaginatedXxxSchema` schemas inside individual React hooks and query components. Use the centralized `paginatedSchema(XxxSchema)` factory defined in `@/types/api.ts` to ensure consistency.

---

## 2. Warehouse Route Collision (P0-003 / P5-002)

### Context & Problem
Both `warehouses.controller.ts` (legacy) and `warehouses-direct.controller.ts` are bound to the `@Controller('warehouses')` route path in NestJS. This results in route registration overlap, where client requests route non-deterministically depending on module registration sequence.

### Resolution Decisions
- **Consolidation**: Move the unique endpoints from `warehouses.controller.ts` (e.g., standard CRUD updates/archives/deletes) into `warehouses-direct.controller.ts`.
- **API Shape Alignment**: Update all warehouse API responses in the consolidated controller to match the standardized `{ data, meta }` shape (previously, the legacy controller returned a flat array).
- **Cleanup**: Delete `warehouses.controller.ts` and its spec file. Update references inside `master-data.module.ts`.

---

## 3. JWT Secret Hardcoded Fallback (P0-002)

### Context & Problem
`auth.module.ts` registers `JwtModule` with a default secret fallback `'dev-jwt-access-secret-key...'` if `process.env.JWT_ACCESS_SECRET` is undefined. In contrast, `JwtStrategy` constructor strictly checks for this env variable and throws a fatal error at boot time. This mismatch causes environmental inconsistency and session token verification failures.

### Resolution Decisions
- **Async Boot Registration**: Migrate `JwtModule` registration inside `auth.module.ts` to use `registerAsync` injected with NestJS `ConfigService`.
- **Fail-Fast Startup Validation**: Verify environment variables during module registration. If `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing, throw a fatal startup error to prevent unsafe fallback states.

---

## 4. Scope Wipe on User Profile Update (P0-004)

### Context & Problem
`AuthService.updateProfile` returns a user profile response containing `scopes: []`. This hardcoded empty array wipes the active user scopes state in the React client, causing users to lose access to their selected warehouse context or trigger 400/403 errors upon updating profiles.

### Resolution Decisions
- **Include Relations in Update**: Modify the Prisma update operation inside `auth.service.ts` to `include: { warehouseScopes: { include: { warehouse: true } } }`.
- **Map Active Scopes**: Replace `scopes: []` in the return structure with mapped user scopes, consistent with `login` and `getProfile` methods:
  ```typescript
  scopes: (updatedUser.warehouseScopes || []).map((s) => ({
    branch_id: s.warehouse?.branchId ?? null,
    warehouse_id: s.warehouseId,
    department_id: null,
  }))
  ```

---

## 5. Missing Seed Department (P0-005)

### Context & Problem
Default creation of operational records (e.g. inventory issues) requires a valid `departmentId` foreign key. Since `seed.prod.ts` does not provision a default department, first-run setups are functionally blocked from executing operations.

### Resolution Decisions
- **Seed Department**: Modify `seed.prod.ts` to insert a default department:
  - **Name**: `"Main Kitchen"`
  - **Code**: `"MAIN-KIT"`
  - **Branch**: Link to the seeded primary HQ branch.

---

## 6. Page Reload Scoping Race Condition (P1-004)

### Context & Problem
On page reload, the client restores active session context inside `setTimeout(0)`. During this microtask queue delay, React context selector triggers the `useWarehouseLock` hook with a `null` warehouse ID. This issues a bad network call to `/inventory/warehouses/null/lock`.

### Resolution Decisions
- **Query Guarding**: Adjust the `useWarehouseLock` query hook options to enforce `enabled: !!warehouseId`.
- **Global Loading Spinner**: Render a global loader overlay during session/token loading and scope restoration states. Disable rendering core workspace components until the active scope context is fully resolved.

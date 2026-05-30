# Data Model & Seed Details: LogiRest Phase 1 — Master Issue Registry

## Database Schema Changes
No structural database migrations or Prisma schema modifications are required for this phase. The data structures are sufficient as-is.

---

## Seed Data Modifications (`apps/api/prisma/seed.prod.ts`)

To resolve the chicken-and-egg startup issue for operational document validations, a default department will be added to the production seed script.

### Seeding Entity: `Department`

| Attribute | Seed Value | Description |
|-----------|------------|-------------|
| **name** | `"Main Kitchen"` | Readable name for UI dropdown selection |
| **code** | `"MAIN-KIT"` | Unique alphanumeric identifier code |
| **branchId** | Linked to the seeded HQ Branch | Foreign key referencing the primary operational branch |
| **isActive** | `true` | Enables active status validation |

---

## Response Serialization Schemas (Shared Types Alignment)

No shared type schema overrides are required, but Zod schema parsing on the frontend will be consolidated by mapping individual hooks to the unified Zod pagination validation model.

### Centralized Pagination Validation Contract (`types/api.ts`)

```typescript
export function paginatedSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: z.object({
      total: z.number(),
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    }),
  });
}
```
All frontend hook validation layers (`useBranches`, `useWarehouses`, `useDepartments`, etc.) will import and utilize this standardized Zod envelope definition.

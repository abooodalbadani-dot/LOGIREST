# Data Model & Interface Contracts: LogiRest Engineering Recovery & Stabilization

## Database Schema Changes

### Migration 1 — Negative Stock Prevention Constraint

**File**: `apps/api/prisma/migrations/[timestamp]_add_qty_on_hand_check/migration.sql`

```sql
-- Prevent inventory lots from having a negative quantity on hand
ALTER TABLE "InventoryLot"
  ADD CONSTRAINT "chk_qty_non_negative"
  CHECK ("qtyOnHand" >= 0);
```

**Prisma Schema Note**: No changes to `schema.prisma` model definitions are required. The `CHECK` constraint is added at the database level via a raw SQL migration. Prisma will surface it as a constraint violation if the application layer bypasses the service-level abort guard.

---

## Entities (No Schema Changes — Reference Only)

The following entities are consumed by this feature. Their schemas remain unchanged.

### `InventoryLot`

| Field | Type | Constraint |
|-------|------|-----------|
| `id` | UUID | PK |
| `itemId` | UUID | FK → Item |
| `warehouseId` | UUID | FK → Warehouse |
| `qtyOnHand` | Decimal | **≥ 0** (enforced by migration above) |
| `weightedAvgCost` | Decimal | ≥ 0 |
| `expiryDate` | DateTime? | nullable |

### `SystemMeta` (new row, no schema change)

The `SystemMeta` table (already provisioned for system settings) will store backup tracking data:

| Key | Value Format | Description |
|-----|-------------|-------------|
| `last_backup_at` | ISO8601 UTC string | Timestamp of most recent successful S3 backup upload |

---

## API Response Contracts

### Pagination Envelope (applies to ALL list endpoints — FR-001, FR-002)

Shared Zod schema in `packages/shared-types/src/pagination.ts`:

```typescript
import { z } from 'zod';

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
});

export function paginatedSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
```

### Health Endpoint Contract — `GET /health` (FR-011)

```typescript
// Response shape (200 OK always — monitoring checks `status` field)
interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;          // ISO8601 UTC
  checks: {
    database: 'ok' | 'degraded';
    backup: {
      status: 'ok' | 'degraded'; // degraded if ageHours > 26
      lastBackupAt: string | null; // ISO8601 UTC, null if never run
      ageHours: number | null;     // null if never run
    };
  };
}
```

### Negative Stock Error Response — `400 Bad Request` (FR-012)

```typescript
// Standard NestJS exception response for insufficient stock
{
  "statusCode": 400,
  "message": "Insufficient stock: requested quantity exceeds available on hand.",
  "error": "Bad Request"
}
```

---

## Backup Environment Variables

The following environment variables must be set in `.env` for the backup module:

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKUP_S3_BUCKET` | Target S3 bucket name | `logirest-backups` |
| `BACKUP_S3_REGION` | AWS region | `eu-west-1` |
| `BACKUP_S3_ACCESS_KEY_ID` | AWS access key | — |
| `BACKUP_S3_SECRET_ACCESS_KEY` | AWS secret key | — |
| `BACKUP_ENCRYPTION_KEY` | 32-byte AES-256 key (hex) | — |
| `DATABASE_URL` | Used by `pg_dump` connection string | `postgresql://...` |

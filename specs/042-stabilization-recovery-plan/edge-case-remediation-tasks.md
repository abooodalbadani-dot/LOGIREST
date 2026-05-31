# Edge-Case & Vulnerability Remediation Tasks

**Source**: [`edge_case_audit.md`](../../../../brain/80d94cfc-4780-4ede-ba25-db125b968632/edge_case_audit.md)
**Created**: 2026-05-31

> These tasks address **8 edge-case vulnerabilities, data integrity bugs, and calculation inconsistencies** identified by the production edge-case audit.
> All findings are scoped to `apps/api` (NestJS) and `apps/api/prisma` (schema).

---

## Priority Legend

- 🔴 **BLOCKER** — Must fix before production deployment
- 🟠 **HIGH** — Must fix before first user-facing test session
- 🟡 **MEDIUM** — Fix in the immediate follow-up sprint

---

## Phase EC-1 — Security & Authorization (Blockers)

- [ ] EC-001 🔴 [P] Add role guard to master-data write endpoints (branches, warehouses, departments, UoM, items)
- [ ] EC-002 🔴 [P] Fix `WarehouseLockGuard` to detect snake_case payload properties
- [ ] EC-005 🔴 [P] Add scope authorization checks to master-data `findOne` detail endpoints

---

## Phase EC-2 — Data Integrity & Calculation (High)

- [ ] EC-004 🟠 [P] Add `unitCost` field to `TransferLine` schema and snapshot WAC at shipment time
- [ ] EC-006 🟠 [P] Add lot-item cross-validation in GRN posting service
- [ ] EC-003 🟠 [P] Add unique tie-breaker (`id`) to report cursor pagination sorting

---

## Phase EC-3 — Multi-Currency Validation (Medium)

- [ ] EC-007 🟡 [P] Add same-currency validation in `FXRatesController`
- [ ] EC-008 🟡 [P] Change `@@index` to `@@unique` on `FXRate` model for `(fromCurrencyId, toCurrencyId, effectiveFrom)`

---

## Task Specifications

---

### EC-001 — Role Guard on Master-Data Write Endpoints

**Files**:
- `apps/api/src/modules/master-data/branches/branches.controller.ts`
- `apps/api/src/modules/master-data/warehouses/warehouses-direct.controller.ts`
- `apps/api/src/modules/master-data/departments/departments.controller.ts`
- `apps/api/src/modules/master-data/units-of-measure/uom.controller.ts`
- `apps/api/src/modules/master-data/items/items.controller.ts`

**Problem**: `POST`, `PUT`, `DELETE` endpoints for branches, warehouses, departments, units of measure, and items do not check the user's role. Any authenticated user (including `VIEWER` or `KITCHEN_CHIEF`) can mutate system-wide master data via direct HTTP requests.

**Required change**: Inject `@CurrentUser('role') role: Role` on all mutating controller methods and validate against `Role.ADMIN` or `Role.GM`. Follow the pattern already used in `FXRatesController.create()`:

```typescript
// Add to each write endpoint (create, update, remove):
@CurrentUser('role') role: Role

// Early in method body:
if (role !== Role.ADMIN && role !== Role.GM) {
  throw new ForbiddenException(
    'Only ADMIN or GM roles are authorized to modify master data.',
  );
}
```

**Controllers and methods affected**:

| Controller | Methods |
|---|---|
| `branches.controller.ts` | `create()` (L89), `update()` (L153), `remove()` |
| `warehouses-direct.controller.ts` | `create()` (L93), `update()` (L130), `remove()` (L146) |
| `departments.controller.ts` | `create()` (L99), `update()` (L144), `remove()` |
| `uom.controller.ts` | `create()` (L36), `update()` (L52), `remove()` (L69) |
| `items.controller.ts` | `create()` (L51), `update()` (L67), `remove()` (L84) |

**Acceptance test**: `POST /branches` with a `VIEWER`-role JWT → `403 Forbidden`. Verify no branch row is created.

---

### EC-002 — Snake-Case Bypass in `WarehouseLockGuard`

**File**: `apps/api/src/guards/warehouse-lock.guard.ts`
**Lines affected**: 42–53

**Problem**: The guard only inspects `camelCase` properties (`warehouseId`, `fromWarehouseId`, `toWarehouseId`). Since controllers also accept `snake_case` parameters (`warehouse_id`, `from_warehouse_id`) for backward compatibility, a user can bypass the lock by submitting a snake_case request body.

**Required change**: Extend the property extraction loop to check both conventions:

```typescript
for (const source of sources) {
  if (source && typeof source === 'object') {
    const whId = source.warehouseId || source.warehouse_id;
    const fromWhId = source.fromWarehouseId || source.from_warehouse_id;
    const toWhId = source.toWarehouseId || source.to_warehouse_id;

    if (typeof whId === 'string' && whId) warehouseIdsSet.add(whId);
    if (typeof fromWhId === 'string' && fromWhId) warehouseIdsSet.add(fromWhId);
    if (typeof toWhId === 'string' && toWhId) warehouseIdsSet.add(toWhId);
  }
}
```

**Acceptance test**: While a stocktake is active on warehouse A, `POST /transfers` with `{ from_warehouse_id: "A", ... }` → `423 Locked`. Same request with camelCase payload → also `423 Locked`.

---

### EC-003 — Unstable Cursor Pagination in Report Exporting

**File**: `apps/api/src/modules/reports/reports.service.ts`
**Lines affected**: L785 (`postedAt` sort), L842 (`expiryDate` sort)

**Problem**: Cursor-based pagination uses `id` as the cursor but sorts by non-unique fields (`postedAt`, `expiryDate`). Simultaneous ledger entries sharing the exact millisecond timestamp cause non-deterministic ordering — records are duplicated or skipped across pages.

**Required change**: Append `id` as a unique tie-breaker to both `orderBy` clauses:

```typescript
// L785 — stock ledger chunking:
orderBy: [
  { postedAt: 'desc' },
  { id: 'asc' },
],

// L842 — expiry report chunking:
orderBy: [
  { lot: { expiryDate: 'asc' } },
  { id: 'asc' },
],
```

**Acceptance test**: Insert 100 ledger entries with the same `postedAt` timestamp. Paginate through all results and confirm no duplicates or gaps — total unique records equals the count of inserted rows.

---

### EC-004 — Inventory Cost Valuation Fluctuation in Stock Transfers

**Files**:
- `apps/api/prisma/schema.prisma` (L479–L492 — `TransferLine` model)
- `apps/api/src/modules/operations/transfer-post.service.ts` (L410–L412)

**Problem**: `TransferLine` has no `unitCost` field. When a transfer is received, `TransferPostService.receive()` queries the *current* WAC of the source warehouse. If the source WAC changes (e.g., due to GRN postings) between shipment and receipt, the destination records a mismatched valuation, causing balance sheet distortions.

**Required change**:

1. **Schema**: Add `unitCost` to `TransferLine` in `schema.prisma`:
```prisma
model TransferLine {
  id               String   @id @default(uuid())
  transferId       String
  itemId           String
  quantityShipped  Decimal  @db.Decimal(18, 4)
  quantityReceived Decimal? @db.Decimal(18, 4)
  unitCost         Decimal? @db.Decimal(18, 4)    // ADD — snapshot of source WAC at shipment time
  varianceReason   String?

  transfer       Transfer        @relation(fields: [transferId], references: [id], onDelete: Cascade)
  item           Item            @relation(fields: [itemId], references: [id], onDelete: Restrict)
  lotAllocations LotAllocation[]

  @@map("transfer_lines")
}
```

2. **Shipment**: In `TransferPostService.ship()`, record `sourceWhItem.wac` into `line.unitCost` during the shipment transaction.

3. **Receipt**: In `TransferPostService.receive()` (L410), replace the live WAC query with `line.unitCost`:
```typescript
// BEFORE:
const sourceWac = sourceWhItem
  ? new Prisma.Decimal(sourceWhItem.wac)
  : new Prisma.Decimal(0);

// AFTER:
const sourceWac = line.unitCost ?? new Prisma.Decimal(0);
```

**Acceptance test**: Create a transfer, ship it, change the source item's WAC via a GRN, then receive the transfer. Confirm the receiving warehouse's WAC reflects the shipment-time cost, not the current cost.

---

### EC-005 — Scope Authorization on Master-Data Detail Endpoints

**Files**:
- `apps/api/src/modules/master-data/branches/branches.controller.ts` (L78)
- `apps/api/src/modules/master-data/warehouses/warehouses-direct.controller.ts` (L68)
- `apps/api/src/modules/master-data/departments/departments.controller.ts` (L84)

**Problem**: `findOne` endpoints for branches, warehouses, and departments do not validate the requesting user's warehouse scope. While `findAll` filters by `UserWarehouseScope`, any authenticated user can read any entity's details via `GET :id`.

**Required change**: Add scope validation in the `findOne` methods. The exact approach depends on entity hierarchy:

- **Warehouses**: Verify the user has `UserWarehouseScope` for the requested warehouse ID (unless `ADMIN`).
- **Branches/Departments**: Verify the user has scope for at least one warehouse under that branch/department (unless `ADMIN`).

```typescript
// Pattern for warehouse:
@Get(':id')
async findOne(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @CurrentUser('role') role: Role,
) {
  if (role !== Role.ADMIN) {
    const hasScope = await this.prisma.userWarehouseScope.findFirst({
      where: { userId, warehouseId: id },
    });
    if (!hasScope) throw new ForbiddenException('Access to this warehouse is not allowed.');
  }
  // ... existing lookup logic ...
}
```

**Acceptance test**: User A (scoped to warehouse A) calls `GET /warehouses/<warehouse-B-id>` → `403 Forbidden`. User A calls `GET /warehouses/<warehouse-A-id>` → `200 OK` with data.

---

### EC-006 — Lot-Item Mismatch Validation in GRN Lines

**Files**:
- `apps/api/src/modules/purchasing/grn-post.service.ts` (L92)
- `apps/api/prisma/schema.prisma` (L402–L415)

**Problem**: GRN lines accept an arbitrary `lotId` with no validation that the lot belongs to the line's `itemId`. The database has no composite FK on `(itemId, lotId)`, so a client can link item A with item B's lot, permanently corrupting FEFO batch trace reports.

**Required change**: Inside the GRN posting transaction, before the `warehouseItemLot.upsert`, validate lot-item association:

```typescript
// In grn-post.service.ts, inside the transaction, before upserting WarehouseItemLot:
if (line.lotId) {
  const lot = await tx.lot.findUnique({
    where: { id: line.lotId },
    select: { itemId: true },
  });
  if (!lot || lot.itemId !== line.itemId) {
    throw new BadRequestException(
      `Lot ${line.lotId} does not belong to item ${line.itemId}.`,
    );
  }
}
```

**Acceptance test**: `POST /grn` with a line containing `itemId: A` and `lotId: <lot-belongs-to-item-B>` → `400 Bad Request` with message explaining the mismatch.

---

### EC-007 — Same-Currency FX Rate Validation

**File**: `apps/api/src/modules/master-data/fx-rates/fx-rates.controller.ts`
**Lines affected**: L28–L63

**Problem**: The backend does not validate that `fromCurrencyId` and `toCurrencyId` are different. A direct API call can create USD→USD rates (e.g., rate of 1.5), corrupting multi-currency reports. The frontend has a `.refine()` guard, but the API is unprotected.

**Required change**: Add validation after the currency existence checks:

```typescript
// In FXRatesController.create(), after toCurr existence check:
if (dto.fromCurrencyId === dto.toCurrencyId) {
  throw new BadRequestException(
    'Source and target currencies must be different.',
  );
}
```

Alternatively, add a Zod refinement to `CreateFXRateDto` if it uses a Zod schema.

**Acceptance test**: `POST /fx-rates` with `{ fromCurrencyId: "same-id", toCurrencyId: "same-id", rate: 1.5 }` → `400 Bad Request`.

---

### EC-008 — Unique Constraint on FX Rate Tuples

**File**: `apps/api/prisma/schema.prisma`
**Lines affected**: L260–L273 (`FXRate` model)

**Problem**: The `FXRate` model has `@@index([fromCurrencyId, toCurrencyId, effectiveFrom])` but no `@@unique`. Multiple rates can be posted for the same currency pair and effective date, causing non-deterministic resolution in WAC calculations and multi-currency reports.

**Required change**: Replace `@@index` with `@@unique` in the Prisma schema:

```prisma
// BEFORE:
@@index([fromCurrencyId, toCurrencyId, effectiveFrom(sort: Desc)])

// AFTER:
@@unique([fromCurrencyId, toCurrencyId, effectiveFrom])
```

Then generate a new migration:
```bash
npx prisma migrate dev --name add_fx_rate_unique_constraint --schema=apps/api/prisma/schema.prisma
```

**Note**: If existing duplicate rows exist in the database, the migration will fail. Run a pre-migration deduplication query first:
```sql
DELETE FROM fx_rates
WHERE id NOT IN (
  SELECT MIN(id)
  FROM fx_rates
  GROUP BY "fromCurrencyId", "toCurrencyId", "effectiveFrom"
);
```

**Acceptance test**: `POST /fx-rates` with duplicate `(fromCurrencyId, toCurrencyId, effectiveFrom)` → `409 Conflict` (Prisma `P2002`). Query `SELECT COUNT(*) FROM fx_rates GROUP BY "fromCurrencyId", "toCurrencyId", "effectiveFrom" HAVING COUNT(*) > 1` returns 0 rows.

---

## Execution Order & Parallelism

```
Phase EC-1 (all blockers) → Phase EC-2 (data integrity) → Phase EC-3 (validation hardening)
```

Within Phase EC-1 (parallel):
- **EC-001** — 5 controllers, all independent
- **EC-002** — single file, independent
- **EC-005** — 3 controllers, all independent

Within Phase EC-2 (parallel):
- **EC-004** — schema + service (sequential within task)
- **EC-006** — single file, independent
- **EC-003** — single file, independent

Within Phase EC-3 (parallel):
- **EC-007** — controller change only
- **EC-008** — schema change + migration

All phases are independent of `remediation-tasks.md` (R001–R015).

---

## Final Verification

After all tasks are complete:

1. `npm run typecheck --filter=api` — zero errors
2. `npm run lint` — zero errors
3. `npx prisma validate --schema=apps/api/prisma/schema.prisma` — valid schema
4. Manual: `POST /branches` with `VIEWER` JWT → `403`
5. Manual: Stocktake-active warehouse, snake_case payload → `423`
6. Manual: Same-currency FX rate → `400`
7. Manual: Duplicate FX rate tuple → `409`

# Remediation Tasks — Spec 042 Deep Review Findings

**Source**: [`deep_review_report.md`](../../../../brain/a331d170-7cf4-4faa-8e1d-d8987e3212b4/deep_review_report.md)  
**Input**: [plan.md](./plan.md) · [spec.md](./spec.md) · [tasks.md](./tasks.md)  
**Created**: 2026-05-31

---

> These tasks address **bugs, missing implementations, and security issues** identified by the post-implementation deep review.  
> All 5 Blockers must be resolved before any production deployment.

---

## Priority Legend

- 🔴 **BLOCKER** — Must fix before production deployment
- 🟠 **HIGH** — Must fix before first user-facing test session
- 🟡 **MEDIUM** — Fix in the immediate follow-up sprint

---

## Phase R1 — Blockers (Security & Correctness)

**Purpose**: Fix all issues that cause data corruption, scope bypass, or silent boot failures.

**⚠️ CRITICAL**: No user testing or deployment can proceed until all R1 tasks are complete.

- [x] R001 🔴 [P] Fix `OR` clause overwrite in `transfers.service.ts findAll()` — warehouse scope silently erased when `search` param is present
- [x] R002 🔴 [P] Add pre-deduction stock sufficiency check in `issues.service.ts`
- [x] R003 🔴 [P] Add pre-fulfillment stock sufficiency check in `kitchen-requests.service.ts fulfill()`
- [x] R004 🔴 [P] Add pre-deduction stock sufficiency check for `DECREASE` adjustments in `adjustments.service.ts create()`
- [x] R005 🔴 Add `JWT_REFRESH_SECRET` fail-fast boot validation in `auth.module.ts`

**Checkpoint R1**: Run `npm run typecheck --filter=api` — zero errors. Start the API with `JWT_REFRESH_SECRET=` unset and confirm it exits with code 1.

---

## Phase R2 — High Priority (Performance & Reliability)

**Purpose**: Fix performance regressions and reliability issues discovered during the audit.

- [x] R006 🟠 [P] Add `page`/`limit` fields to `InventoryBalanceQuerySchema` in `packages/shared-types/src/schemas/reporting.schema.ts`
- [x] R007 🟠 [P] Add `page`/`limit` fields to `InventoryLotsQuerySchema` in `packages/shared-types/src/schemas/reporting.schema.ts`
- [x] R008 🟠 Add real `skip`/`take` pagination to `inventory.service.ts getBalance()` — replace the current full-table-scan approach
- [x] R009 🟠 Add real `skip`/`take` pagination to `inventory.service.ts getLots()` — replace the current full-table-scan approach
- [x] R010 🟠 Harden `backup.service.ts` constructor: throw a fatal `Error` (not use dev defaults) when `BACKUP_S3_ACCESS_KEY_ID` or `BACKUP_S3_SECRET_ACCESS_KEY` are missing in `NODE_ENV=production`

**Checkpoint R2**: Run `npm run typecheck --filter=api` and `npm run typecheck --filter=web` — zero errors. Navigate to the Inventory Balance page and confirm paginated responses return `meta.total_pages > 1` when the warehouse has more than 10 items.

---

## Phase R3 — Medium Priority (Robustness & Consistency)

**Purpose**: Fix minor bugs and inconsistencies that affect operational reliability.

- [ ] R011 🟡 [P] Fix `backup-restore-drill.sh`: remove undefined `$TEMP_ENC` reference on line 143 and replace it with a correct cleanup of `temp_backup.sql` only
- [ ] R012 🟡 [P] Fix garbled emoji characters in `backup-restore-drill.sh` lines 152–156 (PASS/FAIL output) — replace with ASCII equivalents (`[PASS]` / `[FAIL]`)
- [ ] R013 🟡 [P] Harden `seed.prod.ts` `Main Kitchen` department upsert — replace `findFirst + conditional create` with an `upsert` operation using a unique compound approach to prevent duplicates on re-run
- [ ] R014 🟡 [P] Make `health.controller.ts GET /health/backup` response shape consistent with `GET /health` — return `{ status: 'degraded', ... }` instead of throwing `503 ServiceUnavailableException` for degraded status, to match the contract in `data-model.md`
- [ ] R015 🟡 Make `backup.service.ts` docker container name configurable via `BACKUP_DB_CONTAINER` environment variable instead of hardcoding `logirest-db`

**Checkpoint R3**: Run `npm run lint` — zero errors. Confirm `GET /health` and `GET /health/backup` return consistent `status` field shapes.

---

## Task Specifications

---

### R001 — Fix Transfers `OR` Clause Overwrite (IDOR)

**File**: `apps/api/src/modules/operations/transfers/transfers.service.ts`  
**Lines affected**: 77–87  
**Problem**: When both `warehouseId` and `params.search` are provided to `findAll()`, the second `where.OR = [...]` assignment overwrites the first, silently dropping the warehouse scope filter. A user could retrieve transfers from any warehouse by appending a search query.

**Required change**:
```typescript
// BEFORE (buggy):
if (warehouseId) {
  where.OR = [
    { fromWarehouseId: warehouseId },
    { toWarehouseId: warehouseId },
  ];
}
if (params.search) {
  where.OR = [  // ← overwrites warehouse scope
    { transferNumber: { contains: params.search, mode: 'insensitive' } },
  ];
}

// AFTER (correct):
if (warehouseId) {
  where.AND = [
    {
      OR: [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ],
    },
  ];
}
if (params.search) {
  const searchCondition = {
    OR: [
      { transferNumber: { contains: params.search, mode: 'insensitive' } },
    ],
  };
  if (where.AND) {
    where.AND.push(searchCondition);
  } else {
    where.AND = [searchCondition];
  }
}
```

**Acceptance test**: Call `GET /transfers?search=TR-2026` while authenticated to warehouse A. Confirm the response does NOT include transfers belonging to warehouse B.

---

### R002 — Pre-deduction Check in `issues.service.ts`

**File**: `apps/api/src/modules/operations/issues/issues.service.ts`  
**Problem**: The `create()` method creates a DRAFT issue without any stock availability check. The stock check only fires deep in `AllocationService` during the POST transition. This allows creation of issues that will fail later, and the error message comes from infrastructure rather than the business layer.

**Required change**: Inside `create()`, after fetching the warehouse and before calling `tx.inventoryIssue.create()`, add a stock sufficiency pre-check for each line:

```typescript
// After warehouse lookup, before issue creation:
for (const line of body.lines) {
  const whItem = await tx.warehouseItem.findUnique({
    where: { warehouseId_itemId: { warehouseId: activeWarehouseId, itemId: line.itemId } },
    select: { qtyOnHand: true, isFrozen: true },
  });
  if (!whItem || Number(whItem.qtyOnHand) < line.quantity) {
    throw new BadRequestException(
      `Insufficient stock: requested quantity (${line.quantity}) exceeds available on hand for item ${line.itemId}.`,
    );
  }
  if (whItem.isFrozen) {
    throw new BadRequestException(
      `Cannot create issue: item ${line.itemId} is frozen in this warehouse.`,
    );
  }
}
```

**Note**: This is an optimistic pre-check (not SELECT FOR UPDATE). The authoritative locked check still happens in `AllocationService.allocate()` at posting time. This pre-check provides an early rejection at draft-creation time with a clear error message.

**Acceptance test**: `POST /issues` with a line quantity exceeding available stock → `400 Bad Request` with `"Insufficient stock"` message. Verify no `InventoryIssue` row is created in the DB.

---

### R003 — Pre-fulfillment Check in `kitchen-requests.service.ts`

**File**: `apps/api/src/modules/kitchen-requests/kitchen-requests.service.ts`  
**Lines affected**: `fulfill()` method (L176–L296)  
**Problem**: `fulfill()` creates an `InventoryIssue` and immediately calls `issuePostService.post()` with no pre-check. If stock is insufficient, the failure happens inside the posting transaction after the `KitchenRequestItem` quantities have already been updated.

**Required change**: Add a stock sufficiency loop **before** updating `quantityFulfilled` values and before creating the `InventoryIssue`:

```typescript
// Before updating quantityFulfilled or creating the issue:
const linesToCheck = body.fulfillments ?? kr.items.map(i => ({
  itemId: i.itemId,
  fulfilledQty: Number(i.quantityRequested),
}));

for (const lineInput of linesToCheck) {
  const whItem = await tx.warehouseItem.findUnique({
    where: { warehouseId_itemId: { warehouseId: kr.warehouseId, itemId: lineInput.itemId } },
    select: { qtyOnHand: true },
  });
  const available = Number(whItem?.qtyOnHand ?? 0);
  if (available < lineInput.fulfilledQty) {
    throw new BadRequestException(
      `Insufficient stock: cannot fulfill item ${lineInput.itemId}. ` +
      `Requested: ${lineInput.fulfilledQty}, Available: ${available}.`,
    );
  }
}
```

**Acceptance test**: Attempt to fulfill a kitchen request where `quantityRequested` exceeds `qtyOnHand` → `400 Bad Request`. Verify `KitchenRequest` status remains `SUBMITTED` and no `InventoryIssue` is created.

---

### R004 — Pre-deduction Check in `adjustments.service.ts`

**File**: `apps/api/src/modules/operations/adjustments/adjustments.service.ts`  
**Lines affected**: `create()` method (L25–L83)  
**Problem**: For `DECREASE` direction lines, no stock check is performed at creation time. A DRAFT adjustment can be created with quantities far exceeding available stock. The check only fires during the APPROVE/POST workflow step.

**Required change**: Inside `create()`, after the warehouse lookup and before `tx.adjustment.create()`, add a check for all DECREASE lines:

```typescript
// After warehouse lookup, before adjustment creation:
for (const line of body.lines) {
  if (line.direction === 'OUT') {
    const whItem = await tx.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId: body.warehouseId, itemId: line.itemId } },
      select: { qtyOnHand: true },
    });
    if (!whItem || Number(whItem.qtyOnHand) < line.quantity) {
      throw new BadRequestException(
        `Insufficient stock for DECREASE adjustment: item ${line.itemId} ` +
        `has ${Number(whItem?.qtyOnHand ?? 0)} on hand, requested ${line.quantity}.`,
      );
    }
  }
}
```

**Note**: The `AdjustmentDirection` enum value for a decrease in the schema — verify it is `'OUT'` (matching the `adjustments.service.ts update()` logic at L241 which maps `'DECREASE' → 'OUT'`). If the `create()` DTO uses `AdjustmentDirection.OUT` directly, use that instead.

**Acceptance test**: `POST /adjustments` with `direction: 'OUT'` and `quantity` exceeding stock → `400 Bad Request`. No `Adjustment` row created.

---

### R005 — `JWT_REFRESH_SECRET` Fail-Fast in `auth.module.ts`

**File**: `apps/api/src/auth/auth.module.ts`  
**Lines affected**: `JwtModule.registerAsync` factory (L19–L29)  
**Problem**: Only `JWT_ACCESS_SECRET` is validated at startup. `JWT_REFRESH_SECRET` is silently ignored until a refresh request is made, causing runtime errors under production load.

**Required change**: Add the `JWT_REFRESH_SECRET` validation inside the same `useFactory` block (this fires at module initialization):

```typescript
useFactory: async (configService: ConfigService) => {
  const secret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!secret) {
    throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is missing.');
  }
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!refreshSecret) {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is missing.');
  }
  return {
    secret,
    signOptions: { expiresIn: '15m' },
  };
},
```

**Acceptance test**: Start the API process with `JWT_REFRESH_SECRET` unset → process must exit immediately with a non-zero exit code and log `FATAL: JWT_REFRESH_SECRET environment variable is missing.`

---

### R006 + R007 — Add pagination fields to `InventoryBalanceQuerySchema` and `InventoryLotsQuerySchema`

**File**: `packages/shared-types/src/schemas/reporting.schema.ts`  
**Problem**: `InventoryBalanceQuery` and `InventoryLotsQuery` have no `page` or `limit` fields. The backend services therefore receive no pagination signals and cannot paginate.

**Required change**: Add `page` and `limit` to both schemas, following the same pattern as `InventoryMovementsQuerySchema`:

```typescript
export const InventoryBalanceQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),      // ADD
  limit: z.coerce.number().int().min(1).max(100).default(50), // ADD
});

export const InventoryLotsQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'HOLD', 'EXPIRED', 'QUARANTINE']).optional(),
  page: z.coerce.number().int().min(1).default(1),      // ADD
  limit: z.coerce.number().int().min(1).max(100).default(50), // ADD
});
```

After changing shared-types, run `npm run build --filter=@logirest/shared-types` to regenerate the `.d.ts` declaration files.

---

### R008 — Real Pagination in `inventory.service.ts getBalance()`

**File**: `apps/api/src/modules/inventory/inventory.service.ts`  
**Lines affected**: `getBalance()` method (L18–L69)  
**Problem**: `prisma.warehouseItem.findMany()` is called without `skip` or `take`, fetching the entire table. The `meta` block reports `page: 1` and `page_size: data.length || 1` unconditionally, making it impossible for the frontend to paginate.

**Required change**:
1. Accept `query.page` and `query.limit` (after R006 adds them to the schema).
2. Add `skip` / `take` to `findMany`.
3. Add a parallel `count()` for the `total`.
4. Compute correct `total_pages`.

```typescript
async getBalance(warehouseId: string, query: InventoryBalanceQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const skip = (page - 1) * limit;

  // ...existing whereClause building...

  const [items, total] = await Promise.all([
    this.prisma.warehouseItem.findMany({
      where: whereClause,
      include: { item: { include: { category: true, unitOfMeasure: true } } },
      skip,
      take: limit,
      orderBy: { item: { name: 'asc' } },
    }),
    this.prisma.warehouseItem.count({ where: whereClause }),
  ]);

  const data = items.map((wItem) => ({ /* ...same mapping... */ }));

  return {
    data,
    meta: {
      total,
      page,
      page_size: limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}
```

---

### R009 — Real Pagination in `inventory.service.ts getLots()`

**File**: `apps/api/src/modules/inventory/inventory.service.ts`  
**Lines affected**: `getLots()` method (L71–L117)  
**Problem**: Same as R008 — full table scan with fabricated `meta`.

**Required change**: Apply same pattern as R008 using `query.page` and `query.limit` (after R007 adds them to the schema). Add `skip`/`take` to `findMany` and parallel `count()`.

---

### R010 — Fatal error on missing backup credentials in production

**File**: `apps/api/src/backup/backup.service.ts`  
**Lines affected**: Constructor (L22–L46)  
**Problem**: Missing `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` silently fall back to `'dev-access-key-id'` / `'dev-secret-access-key'`. In production this means backups silently target the wrong endpoint with wrong credentials and fail at runtime.

**Required change**: Add a guard in the constructor:

```typescript
constructor(private readonly prisma: PrismaService) {
  const region = process.env.BACKUP_S3_REGION || 'eu-west-1';
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;

  if (process.env.NODE_ENV === 'production') {
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'FATAL: BACKUP_S3_ACCESS_KEY_ID and BACKUP_S3_SECRET_ACCESS_KEY must be set in production.',
      );
    }
  }

  this.s3Client = new S3Client({
    region,
    endpoint: process.env.BACKUP_S3_ENDPOINT || (
      process.env.NODE_ENV === 'production' ? 'http://minio:9000' : 'http://localhost:9000'
    ),
    forcePathStyle: true,
    credentials: {
      accessKeyId: accessKeyId || 'dev-access-key-id',
      secretAccessKey: secretAccessKey || 'dev-secret-access-key',
    },
  });
}
```

---

### R011 — Fix undefined `$TEMP_ENC` in `backup-restore-drill.sh`

**File**: `scripts/backup-restore-drill.sh`  
**Line affected**: 143  
**Problem**: `rm -f "$TEMP_ENC" "$TEMP_SQL"` references `$TEMP_ENC` which is never defined in this script. The encrypted data is handled entirely inside the inline Node.js script — no `.enc` file is written to disk.

**Required change**:
```bash
# BEFORE:
rm -f "$TEMP_ENC" "$TEMP_SQL"

# AFTER:
rm -f "$TEMP_SQL"
```

---

### R012 — Fix garbled PASS/FAIL output in `backup-restore-drill.sh`

**File**: `scripts/backup-restore-drill.sh`  
**Lines affected**: 152–156  
**Problem**: Emoji characters (`أ¢â‚¬â€‌`) are byte-scrambled due to encoding issues on Windows. The script is a bash script and must use portable ASCII for cross-platform output.

**Required change**:
```bash
# BEFORE:
echo "PASS أ¢â‚¬â€‌ restore completed in $((ELAPSED/60)) minutes (< 240 minutes)"
echo "FAIL أ¢â‚¬â€‌ restore took too long (${ELAPSED}s >= 14400s)"

# AFTER:
echo "[PASS] Restore completed in $((ELAPSED/60)) minutes (< 240 minutes)"
echo "[FAIL] Restore took too long (${ELAPSED}s >= 14400s)"
```

---

### R013 — `seed.prod.ts` Department Upsert Safety

**File**: `apps/api/prisma/seed.prod.ts`  
**Lines affected**: 124–135  
**Problem**: `findFirst + conditional create` pattern is not idempotent under concurrent runs or failed partial executions. On re-run between `findFirst` returning `null` and `create` executing, a race condition can produce duplicate departments.

**Required change**: Convert to a safe deterministic pattern. Since `Department` has no unique constraint on `(name, branchId)`, use a `findFirst` + `update or create` pattern with a try/catch, or add the constraint. The simpler fix is to ensure `name` uniqueness within the branch by catching `P2002`:

```typescript
const existingDept = await prisma.department.findFirst({
  where: { name: 'Main Kitchen', branchId: mainBranch.id },
});
if (!existingDept) {
  try {
    await prisma.department.create({
      data: { name: 'Main Kitchen', code: 'MAIN-KIT', branchId: mainBranch.id },
    });
    console.log('Seeded default "Main Kitchen" department linked to HQ Branch.');
  } catch (e: any) {
    if (e?.code !== 'P2002') throw e; // ignore unique constraint violation on retry
    console.log('"Main Kitchen" department already exists, skipping.');
  }
}
```

> **Note**: The spec (`data-model.md`) defines a `code: 'MAIN-KIT'` field for the department seed. The current `seed.prod.ts` is missing the `code` field in the `create` call (L128–L134). Add it.

---

### R014 — Consistent `/health/backup` Response Shape

**File**: `apps/api/src/health/health.controller.ts`  
**Lines affected**: `checkBackup()` (L45–L71)  
**Problem**: `GET /health/backup` throws `503 ServiceUnavailableException` when degraded, while `GET /health` returns `{ status: 'degraded', ... }` with HTTP 200. Frontend health dashboards expect consistent shape.

**Required change**: Change `checkBackup()` to return the same envelope as `getBackupStatus()` directly, and set HTTP status via `@HttpCode` decorator:

```typescript
@Public()
@Get('backup')
async checkBackup() {
  const backupStatus = await this.backupService.getBackupStatus();
  return {
    status: backupStatus.status,
    lastBackupAt: backupStatus.lastBackupAt,
    ageHours: backupStatus.ageHours,
    timestamp: new Date().toISOString(),
  };
}
```

If a 503 on degraded is a hard requirement, keep the exception but align the response body field name from `status: 'UNHEALTHY'` → `status: 'degraded'`.

---

### R015 — Configurable Docker Container Name for pg_dump Fallback

**File**: `apps/api/src/backup/backup.service.ts`  
**Lines affected**: 98–114  
**Problem**: The docker `exec` fallback hardcodes `logirest-db` as the container name.

**Required change**: Read from `BACKUP_DB_CONTAINER` env var:

```typescript
const containerName = process.env.BACKUP_DB_CONTAINER || 'logirest-db';
const { stdout } = await execPromise(
  `docker exec -i ${containerName} pg_dump -U ${username} -d ${database} -F p`,
  { /* ... */ }
);
```

---

## Execution Order & Parallelism

```
Phase R1 (all blockers) → Phase R2 (performance) → Phase R3 (robustness)
```

Within Phase R1:
- **R001, R002, R003, R004** can run in parallel (different files)
- **R005** can run in parallel with R001–R004

Within Phase R2:
- **R006 + R007** must complete first (schema changes)
- **R008 + R009** depend on R006/R007 respectively
- **R010** is independent

Within Phase R3:
- **R011, R012, R013, R014, R015** are all independent and can run in parallel

---

## Final Verification

After all tasks are complete:

1. `npm run typecheck --filter=api` — zero errors
2. `npm run typecheck --filter=web` — zero errors
3. `npm run lint` — zero errors
4. `npm run build` — full monorepo production build succeeds
5. Manual: Start API with `JWT_REFRESH_SECRET=` unset → exits with code 1
6. Manual: `POST /transfers?search=TR` while scoped to warehouse A → no transfers from warehouse B appear
7. Manual: `POST /issues` with quantity > stock → `400` before issue is created
8. Manual: `GET /inventory/balance?page=1&limit=10` → `meta.total_pages` reflects actual count, not always `1`
9. Manual: `GET /health` and `GET /health/backup` → consistent `status` field naming

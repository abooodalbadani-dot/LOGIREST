# Tasks: Concurrency Control & Consistency (Phase 5)

**Input**: Design documents from `/specs/018-concurrency-control/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md
**Organization**: Tasks are grouped into sequential sub-phases matching Phase 5.1, 5.2, and 5.3 to facilitate atomic implementation and clean test passes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story/sub-phase this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source code: `apps/api/src/`
- Prisma configuration: `apps/api/prisma/`
- Tests: `apps/api/test/` or `src/**/*.spec.ts`

---

## Phase 1: Setup & Exceptions (Phase 5.1 Foundational)

**Purpose**: Establish custom exception and concurrency tracking helper before modifying core status transition logic.

- [x] T001 Create custom version conflict exception in `apps/api/src/exceptions/version-conflict.exception.ts`
  - **Inheritance**: Extends NestJS `ConflictException` (409 status code)
  - **Constructor signature**: `constructor(currentVersion: number, lastModifiedBy: string, lastModifiedAt: Date)`
  - **Body Payload**: Calls `super()` with format:
    ```typescript
    {
      statusCode: 409,
      message: 'Version conflict: Document has been updated by another process.',
      error: 'Conflict',
      currentVersion,
      lastModifiedBy,
      lastModifiedAt
    }
    ```
- [x] T002 Create concurrency service in `apps/api/src/services/concurrency.service.ts`
  - **Dependencies**: Injects `PrismaService` from `../database/prisma.service`
  - **Method**: `async handleConflict(documentId: string, modelName: string, expectedVersion: number): Promise<never>`
  - **Prisma Queries**:
    1. Retrieve the current version:
       ```typescript
       const doc = await this.prisma[modelName].findUnique({
         where: { id: documentId },
         select: { version: true, createdById: true }
       });
       ```
    2. Lookup the latest successful transition in `AuditLog` table to identify who did it and when:
       ```typescript
       const log = await this.prisma.auditLog.findFirst({
         where: {
           targetId: documentId,
           action: { endsWith: '_SUCCESS' }
         },
         orderBy: { createdAt: 'desc' },
         include: { user: { select: { name: true } } }
       });
       ```
  - **Resolution Logic**:
    - `currentVersion = doc?.version ?? 0`
    - If `log` is found: `lastModifiedBy = log.user?.name || log.userId`, `lastModifiedAt = log.createdAt`
    - Else if `doc` has `createdById`: Lookup creator name from `User` table; else fall back to `"System"` and `new Date()`
  - **Return**: Throws `VersionConflictException` with resolved arguments.

- [x] T003 Register `ConcurrencyService` in `apps/api/src/modules/workflow/workflow.module.ts`
  - **Action**: Add `ConcurrencyService` to `providers` and `exports`.

**Checkpoint**: Foundation ready. Custom exception and resolving service compiled.

---

## Phase 2: Optimistic Locking Integration (Phase 5.1 Implementation)

**Purpose**: Wire version verification into workflow engine transitions to strictly reject stale updates.

- [x] T004 Integrate conflict check in `apps/api/src/modules/workflow/workflow.service.ts` at the beginning of status transitions
  - **Action**: Inject `ConcurrencyService` into constructor.
  - **Location 1**: Replace the generic `ConflictException` on line 291 with:
    ```typescript
    await this.concurrencyService.handleConflict(documentId, modelName, clientVersion);
    ```
  - **Location 2**: Replace the generic `ConflictException` on line 307 (when `updateResult.count === 0`) with:
    ```typescript
    await this.concurrencyService.handleConflict(documentId, modelName, currentVersion);
    ```
- [x] T005 Create unit tests for `ConcurrencyService` in `apps/api/src/services/concurrency.service.spec.ts`
  - **Verification**: Mock `PrismaService` to return specific documents and audit logs. Verify `VersionConflictException` is thrown with correct properties.
- [x] T006 Update unit tests for `WorkflowService` in `apps/api/src/modules/workflow/workflow.service.spec.ts`
  - **Verification**: Add test cases for concurrent requests. Verify that transitions throw `VersionConflictException` and fail safely with correct data when versions mismatch.
- [x] T007 Create E2E integration test for concurrency control in `apps/api/test/concurrency.e2e-spec.ts`
  - **Verification**: Simulate duplicate concurrent post actions on a PR. Verify the first request gets `200 OK` (version changes to 2) and the second receives a `409 Conflict` with current version details.

**Checkpoint**: Optimistic Locking (Phase 5.1) is complete and tested.

---

## Phase 3: Idempotency Subsystem (Phase 5.2 Implementation)

**Purpose**: Guard POST document creations against network duplicates via client-provided headers and cached results.

- [x] T008 [P] Create `@Idempotent()` decorator in `apps/api/src/decorators/idempotent.decorator.ts`
  - **Action**: Set metadata key `'isIdempotent'` to `true`.
- [x] T009 Create idempotency service in `apps/api/src/services/idempotency.service.ts`
  - **Prisma Queries**:
    - `getLog(key: string)`: `this.prisma.idempotencyLog.findUnique({ where: { key } })`
    - `createPendingLog(key: string)`: `this.prisma.idempotencyLog.create({ data: { key, responseBody: '{}', statusCode: 102 } })`
    - `updateLog(key: string, statusCode: number, responseBody: string)`: `this.prisma.idempotencyLog.update({ where: { key }, data: { statusCode, responseBody } })`
    - `deleteLog(key: string)`: `this.prisma.idempotencyLog.delete({ where: { key } })`
    - `pruneExpiredLogs()`: `this.prisma.idempotencyLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })`
  - **Cron/Scheduler**: Implement native pruning logic.
    - Set up a standard JS `setInterval` running every 1 hour triggered inside `onModuleInit()` and cleared inside `onModuleDestroy()`.
- [x] T010 Create idempotency guard in `apps/api/src/guards/idempotency.guard.ts`
  - **Imports**: `Reflector`, `IdempotencyService`, `BadRequestException`, `ConflictException`
  - **Method**: `canActivate(context: ExecutionContext): Promise<boolean>`
  - **Logic**:
    1. If target method/class does not have `'isIdempotent'` metadata, return `true`.
    2. Extract header `x-idempotency-key` from `request.headers`.
    3. If header is missing, throw `BadRequestException('Missing x-idempotency-key header')`.
    4. If header is not a valid UUID v4 (match regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`), throw `BadRequestException('Invalid x-idempotency-key format')`.
    5. Fetch log:
       - If exists and `statusCode === 102`, throw `ConflictException('Request is already being processed')`.
       - If exists and `statusCode !== 102`, return `true` (forward to interceptor).
       - If missing, try to create pending log (`102`). Wrap in try/catch; on unique constraint error (`P2002`), throw `ConflictException('Request is already being processed')`.
    6. Attach key: `request.idempotencyKey = key`. Return `true`.
- [x] T011 Create idempotency interceptor in `apps/api/src/interceptors/idempotency.interceptor.ts`
  - **Method**: `intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>`
  - **Logic**:
    1. If no `'isIdempotent'` metadata, return `next.handle()`.
    2. Retrieve `key = request.idempotencyKey`. If missing, return `next.handle()`.
    3. Check log from database:
       - If `log.statusCode !== 102`, bypass handler and return `of(JSON.parse(log.responseBody))` while setting `response.status(log.statusCode)`.
    4. Else, pipe `next.handle()`:
       - On success (`tap`): stringify payload and call `updateLog(key, response.statusCode || 201, JSON.stringify(data))`.
       - On error (`catchError`): call `deleteLog(key)` to clean up the lock, then rethrow.
- [x] T012 Register guards and interceptors in `apps/api/src/app.module.ts`
  - **Action**: Register `IdempotencyService` in `providers` (or import via `WorkflowModule`).
  - **Action**: Register `IdempotencyGuard` as global `APP_GUARD`.
  - **Action**: Register `IdempotencyInterceptor` as global `APP_INTERCEPTOR`.
- [x] T013 Apply `@Idempotent()` decorator to Goods Received Note creation endpoint in `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts` (on `create` route) for validation.
- [x] T014 Create unit tests for `IdempotencyService`, `IdempotencyGuard`, and `IdempotencyInterceptor` inside `src/services/` and `src/guards/`
- [x] T015 Create E2E integration test for idempotency in `apps/api/test/idempotency.e2e-spec.ts`
  - **Verification**: Submit duplicate creation requests with identical keys concurrently (verifies 409 processing block) and sequentially (verifies cached 201 response payload returned without double DB insert).

**Checkpoint**: Idempotency checks (Phase 5.2) are fully functional.

---

## Phase 4: Warehouse Locks & Admin Override (Phase 5.3 Implementation)

**Purpose**: Guard physical stock mutations against active or stale stocktake locks, and expose a restricted manual force-unlock endpoint for administrators.

- [x] T016 Fix stale lock bypass vulnerability in `apps/api/src/modules/workflow/workflow.service.ts`
  - **Action**: Modify `isWarehouseLocked(warehouseId)` (line 108).
  - **Target Change**: Replace the `activeLock` query search on line 118 to ignore the expiration date `expiresAt: { gt: new Date() }`. It must query:
    ```typescript
    const activeLock = await this.prisma.warehouseLock.findFirst({
      where: {
        warehouseId,
        isActive: true,
      },
    });
    ```
- [x] T017 [P] Create `@BypassWarehouseLock()` decorator in `apps/api/src/decorators/bypass-warehouse-lock.decorator.ts`
  - **Action**: Set metadata key `'bypassWarehouseLock'` to `true`.
- [x] T018 Create warehouse lock guard in `apps/api/src/guards/warehouse-lock.guard.ts`
  - **Dependencies**: `Reflector`, `WorkflowService`
  - **Logic**:
    1. If handler or class has `'bypassWarehouseLock'` metadata, return `true`.
    2. If request method is safe (`GET`, `OPTIONS`, `HEAD`), return `true`.
    3. Look for parameters `warehouseId`, `fromWarehouseId`, or `toWarehouseId` in request body (`req.body`), route parameters (`req.params`), or query parameters (`req.query`).
    4. Dedup the warehouse IDs found.
    5. For each ID, call `await this.workflowService.isWarehouseLocked(id)`.
    6. If any warehouse is locked, throw `HttpException('Warehouse is locked. Physical inventory mutations are blocked.', HttpStatus.LOCKED)` (423 Locked).
- [x] T019 Register `WarehouseLockGuard` as global `APP_GUARD` in `apps/api/src/app.module.ts`.
- [x] T020 Create lock override service in `apps/api/src/modules/warehouse-lock/warehouse-lock.service.ts`
  - **Method**: `async forceUnlock(lockId: string, adminId: string, reasonNotes: string, ipAddress?: string): Promise<any>`
  - **Flow**:
    1. Query database for the target lock:
       ```typescript
       const lock = await this.prisma.warehouseLock.findUnique({ where: { id: lockId } });
       ```
    2. If missing, throw `NotFoundException`.
    3. If `lock.isActive === false`, throw `BadRequestException('Lock is not active.')`.
    4. In a Prisma database transaction:
       - Update the `WarehouseLock` set `isActive: false`.
       - Create an `AuditLog` entry detailing the manual override:
         ```typescript
         await tx.auditLog.create({
           data: {
             userId: adminId,
             action: 'FORCE_UNLOCK',
             targetTable: 'warehouse_locks',
             targetId: lockId,
             beforeStateJson: JSON.stringify({
               isActive: true,
               expiresAt: lock.expiresAt,
               warehouseId: lock.warehouseId
             }),
             afterStateJson: JSON.stringify({
               isActive: false,
               reason_notes: reasonNotes
             }),
             ipAddress: ipAddress || null
           }
         });
         ```
- [x] T021 Create lock override controller in `apps/api/src/modules/warehouse-lock/warehouse-lock.controller.ts`
  - **Route**: `POST /api/v1/warehouse-locks/:id/force-unlock` (automatically registers with prefix)
  - **Guards**: `@UseGuards(JwtAuthGuard)`
  - **Method Signature**:
    ```typescript
    @Post(':id/force-unlock')
    async forceUnlock(
      @Param('id') id: string,
      @CurrentUser('id') adminId: string,
      @CurrentUser('role') role: Role,
      @Body() body: { reason_notes: string },
      @Req() req: Request,
    )
    ```
  - **Validators**:
    - Verify role is exactly `Role.ADMIN`; on failure, throw `ForbiddenException('Forbidden resource')`.
    - Verify `body.reason_notes` is a string and has length >= 10; on failure, throw `BadRequestException('reason_notes must be longer than or equal to 10 characters')`.
  - **Execution**: Retrieve request origin IP, run `forceUnlock` service, and return matching contract structure.
- [x] T022 Create modular definition in `apps/api/src/modules/warehouse-lock/warehouse-lock.module.ts`
  - **Providers**: `WarehouseLockService`
  - **Controllers**: `WarehouseLockController`
  - **Imports**: `PrismaModule`
- [x] T023 Import `WarehouseLockModule` inside `AppModule` in `apps/api/src/app.module.ts`.
- [x] T024 Create unit/integration tests for `WarehouseLockGuard`, `WarehouseLockService`, and `WarehouseLockController`.
- [x] T025 Create E2E integration test for lock guard overrides in `apps/api/test/warehouse-lock.e2e-spec.ts`
  - **Verification**: Lock a warehouse. Verify posting a GRN returns `423 Locked`. Change lock expiration to the past (stale state) and verify mutations are still blocked. Execute manual override via POST force-unlock request, verify `AuditLog` entry, and verify subsequent GRN post succeeds.

**Checkpoint**: Physical mutations locking and Admin overrides (Phase 5.3) are complete.

---

## Phase 5: Polish & Quality Checks (Shared Phase)

**Purpose**: Format lint and verify compilation and typescript health.

- [x] T026 Run compilation verification: `npm run typecheck --filter=api`
- [x] T027 Run ESLint quality checks: `npm run lint --filter=api`
- [x] T028 Run test suite suite to verify zero regressions: `npm run test --filter=api`
- [x] T029 Update system documentation mapping in `apps/api/README.md`
- [x] T030 Perform graph update in terminal: `graphify update .`

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup & Exceptions (Phase 1)**: Base dependency for Phase 2.
2. **Optimistic Locking (Phase 2)**: Core logic integration.
3. **Idempotency (Phase 3)**: Isolated subsystem; can be built in parallel.
4. **Warehouse Locks (Phase 4)**: Relies on `WorkflowService` changes in Phase 2.
5. **Polish (Phase 5)**: Requires completion of all other items.

### Parallel Opportunities

- Setup tasks and Decorators (`T001`, `T008`, `T017`) can be scaffolded in parallel.
- Once Phase 1 is done, Phase 2 (Optimistic Locking) and Phase 3 (Idempotency) can be implemented in parallel.

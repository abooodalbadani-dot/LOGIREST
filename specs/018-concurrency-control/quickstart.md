# Developer Quickstart: Concurrency Control (Phase 5)

This guide helps developers integrate and verify the concurrency control mechanisms in local development and testing environments.

---

## 1. Local Testing & Verification

### Optimistic Locking Verification
To verify version-based document lock protection:
1. Fetch a document (e.g. PO) from the DB:
   ```json
   { "id": "po-uuid-1", "version": 1, "status": "DRAFT" }
   ```
2. Trigger two concurrent updates using the same base version (`1`):
   * **Request A**: Updates status to `SUBMITTED`, version `1`.
   * **Request B**: Updates status to `CANCELLED`, version `1`.
3. Expected Behavior:
   * Request A succeeds, updating the record status to `SUBMITTED` and version to `2`.
   * Request B fails with a `409 Conflict` response:
     ```json
     {
       "statusCode": 409,
       "message": "Version conflict: Document has been updated by another process. (Expected: 1, Current: 2)",
       "error": "Conflict"
     }
     ```

### Idempotency Verification
To verify duplicate creation blocking:
1. Submit a creation request (`POST /purchase-requests`) containing the `x-idempotency-key` header with a unique UUID v4 (e.g. `e3d7bb0a-cfc6-43d9-a477-8c46a6f1d07c`).
2. Verify the HTTP response returns `201 Created` and the resource details.
3. Submit the same request again with the exact same header key:
   * Verify it returns the cached response (with the same status code and body).
   * Verify no second record was created in the database.
4. Submit a fast concurrent request with the same key before the first completes:
   * Verify the second request returns `409 Conflict` ("Request is already being processed").

### Warehouse Lock Verification
To verify stocktake write blocking:
1. Active lock: Update or insert `WarehouseLock` for `wh-uuid-1` with `isActive: true` and `expiresAt: now() + 2 hours`.
2. Attempt a goods receipt post (`POST /goods-received-notes/:id/post`).
   * Verify the request fails with a `423 Locked` response:
     ```json
     {
       "statusCode": 423,
       "message": "Warehouse is locked. Physical inventory mutations are blocked.",
       "error": "Locked"
     }
     ```
3. Stale lock: Set `expiresAt: now() - 1 hour` and `isActive: true`.
   * Attempt the mutation again. Verify it is still blocked (stale locks remain locked).
4. Override Lock: Post to the force-unlock endpoint as an Admin:
   ```bash
   curl -X POST http://localhost:3000/api/warehouse-locks/lock-uuid-1/force-unlock \
     -H "Authorization: Bearer <ADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"reason_notes": "Override expired stocktake lock after verification"}'
   ```
   * Verify response is `200 OK`.
   * Verify the warehouse `isLocked` is updated to `false` and lock `isActive` is `false`.
   * Verify a record exists in `audit_logs` table (action: `FORCE_UNLOCK`).
   * Verify the subsequent mutation request now succeeds.

---

## 2. Command Reference

Execute these commands to validate the implementation of Phase 5:

### Run Code Quality Verification
Ensure compilation, type-safety, and formatting rules are clean before push:
```bash
# From workspace root:
npm run lint --filter=api
npm run typecheck --filter=api
```

### Execute Unit & Integration Tests
```bash
# Run NestJS tests for guards and services
npm run test --filter=api -- src/guards/idempotency.guard.spec.ts
npm run test --filter=api -- src/services/concurrency.service.spec.ts
npm run test --filter=api -- src/modules/warehouse-lock/warehouse-lock.controller.spec.ts
```

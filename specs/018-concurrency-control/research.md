# Technical Research: Concurrency Control (Phase 5)

This document maps out the core architectural decisions, rationales, and alternatives evaluated for Phase 5 of the LogiRest inventory management system.

---

## 1. Optimistic Locking (Phase 5.1)

### Decision
Implement strict version-based optimistic locking on all updates to document entities (PR, PO, GRN, Issues, Transfers, Adjustments).
* **Behavior**: Throw a custom `409 Conflict` (inheriting from `ConflictException`) if the database record version does not match the client's provided version.
* **Fields Returned**: The exception must include `currentVersion`, `lastModifiedBy` (User ID/Name if available), and `lastModifiedAt`.
* **Disjoint Field Merge**: Strictly forbidden. Automated merging is rejected to prevent silent inventory and cost ledger corruption.

### Rationale
In high-concurrency kitchen and warehouse environments, allowing automated merging of edits (e.g. merging a description update with a quantity update) obscures the state of the document at the time of posting. For example, if User A reduces a line item quantity from 10 to 5, and User B changes the destination department, auto-merging these changes without User B knowing User A altered the quantity creates severe discrepancy risks. The backend must enforce that a user always saves against the exact state they read.

### Alternatives Considered
* **Eager Last-Write-Wins**: Simple to implement (direct `update`), but causes silent overwrites of user changes, resulting in loss of auditing integrity. Rejected.
* **Disjoint Auto-Merge**: Auto-merge changes on separate fields. Rejected due to the risk of hidden cost and quantity discrepancies.

---

## 2. API Idempotency (Phase 5.2)

### Decision
Utilize a globally unique client-generated UUID v4 as an idempotency key passed via the `x-idempotency-key` request header.
* **Storage**: Store keys in the `idempotency_logs` database table (PK is the key).
* **Check-and-Set**:
  1. The API checks for the key on incoming `POST` creation requests.
  2. If the key exists and is "Processing" (status code `102`), return `409 Conflict` ("Request is already being processed").
  3. If the key exists and is "Completed", return the cached status code and response body.
  4. If the key is missing, atomically insert a record with status `102` (Processing). If insertion fails (unique constraint violation), handle it as a concurrent duplicate request.
* **TTL & Cleanup**: Keys have a 24-hour expiration window. A cron job in the API module runs every hour to prune expired records. If a client attempts to use a key older than 24 hours, the expired log is purged and the request is treated as brand new.

### Rationale
Using database primary keys to manage idempotency locks leverages PostgreSQL's atomic unique constraints, preventing race conditions without needing redis/distributed locks. Caching responses for 24 hours covers the maximum period of client offline-sync retries and network reconnects.

### Alternatives Considered
* **User-Scoped Keys**: Scope the key to `userId` and `key`. Rejected because it introduces schema complexity. A globally unique UUID v4 header is sufficient and easier to index.
* **In-Memory Caching (Redis)**: Low latency, but adds operational dependency overhead. Since we already have a reliable PostgreSQL instance, database-backed idempotency logs keep the deployment simple and reliable.

---

## 3. Warehouse Operational Locks (Phase 5.3)

### Decision
Implement active/stale warehouse locks to block mutating writes (GRN receipt, issue, transfer shipping, and adjustments).
* **Bug Fix**: The current implementation of `WorkflowService.isWarehouseLocked()` auto-expires locks once `expiresAt <= now()`. This must be corrected so that locks remain locked (stale) until manually unlocked by an administrator.
* **Override API**: Create `POST /warehouse-locks/:id/force-unlock` restricted to `ADMIN` role. It must require a body with `reason_notes` (minimum 10 characters).
* **Auditing**: On override, insert an immutable record in `AuditLog` mapping:
  - `action`: `FORCE_UNLOCK`
  - `targetTable`: `warehouse_locks`
  - `targetId`: the lock UUID
  - `beforeStateJson`: `{ isActive: true, expiresAt: lock.expiresAt, warehouseId: lock.warehouseId }`
  - `afterStateJson`: `{ isActive: false, reason_notes: body.reason_notes }`

### Rationale
Automated warehouse unlocking when count sessions run over their expected durations risks allowing staff to post inventory receipts or issues during physical counting. This introduces "ghost stock" or double-counting, destroying inventory accuracy. An administrative manual override ensures human accountability.

### Alternatives Considered
* **Auto-Release with Warning**: Auto-release the warehouse lock at `expiresAt` but send a slack/email alert. Rejected because active inventory mutations are too high-stakes to be left open to human error.

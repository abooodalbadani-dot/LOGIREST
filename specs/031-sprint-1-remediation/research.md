# Phase 0 Research: Sprint 1 Production Readiness Remediation

This document resolves the technical context, design patterns, and engineering choices for all high-priority remediation tasks in Sprint 1.

---

## 1. Redis Low-Stock Alert Debounce Strategy (TASK-010)

* **Decision**: We will implement Redis-based debounce key-value storage using the NestJS `@liaoliaots/nestjs-redis` package or standard `ioredis` injection, replacing the volatile in-memory `Map`.
* **Rationale**: Debounce metadata must survive API server restarts to avoid duplicate low-stock alerts during daily 06:00 AM sweeps.
* **Key Pattern**: `low_stock_debounce:{warehouseId}:{itemId}`
* **Data Structure**: Redis String containing a millisecond timestamp of the last dispatched alert.
* **TTL Policy**: `EX 86400` (24-hour expiration) to align with the daily scan cycle.
* **Fallback Strategy**: If Redis is temporarily unreachable, the job MUST log a `WARN` to standard output, bypass the cache, and continue processing (graceful degradation to prevent blocking critical alerts).

---

## 2. Document Sequence Uniqueness Constraint (TASK-011)

* **Decision**: Implement a database-level composite unique constraint `@@unique([documentType, year, branchId])` on the `DocumentSequence` model in `schema.prisma`.
* **Rationale**: Prevent duplicate document numbers under concurrent generation. PostgreSQL unique indexes throw a specific error (`P2002` in Prisma) that can be handled gracefully at the application layer.
* **Migration Strategy**: 
  1. Audit current rows in the database for composite duplicates.
  2. Apply SQL migration to add the unique index.
  3. Update `sequence.service.ts` to capture `PrismaClientKnownRequestError` with code `P2002` and retry with a backoff strategy up to 3 times.

---

## 3. Lot-Level Balance Drift Verification (TASK-012)

* **Decision**: Integrate a Lot-Level cross-check into the daily `ReconciliationJob` that compares `qty_on_hand` from `warehouse_item_lots` against `SUM(quantity)` from the `stock_ledger` filtered by specific `lotId` and `warehouseId`.
* **Rationale**: Standard reconciliations only check total item qty, leaving lot split drifts undetected. 
* **State Machine Action**: Lot-level drifts create an `ADMIN` and `INV_MANAGER` system notification. Unlike item-level drift, it **does not** automatically freeze the item (`isFrozen: false`) to avoid stopping warehouse operations for simple packaging errors.
* **Schema Impact**: Add `lotDiscrepanciesFound` integer column to the `reconciliation_runs` table to log results.

---

## 4. Zero WAC Prevention for Inventory Adjustments (TASK-013)

* **Decision**: Enforce a strict cost validation logic at DTO and service boundaries for positive `AdjustmentLine` inputs (Adjustments representing stock additions).
* **Rationale**: Posting inventory additions with missing or zero unit costs corrupts the Weighted Average Cost (WAC) ledger history permanently.
* **Implementation Details**:
  - Positive Adjustment (IN) -> `unitCost` MUST be > 0 (validated via custom class-validator or manual check).
  - Negative Adjustment (OUT) -> `unitCost` is optional (defaults to current item WAC).
  - UI Form: Disable/hide the unit cost input for OUT adjustments, and make it a strictly validated required field for IN adjustments.

---

## 5. Operations-Aware Rate Limiting (TASK-014)

* **Decision**: Reconfigure NestJS `ThrottlerModule` with a multi-tiered limit profile, replacing the restrictive 10 req/60s global throttle.
* **Rationale**: Barcode wedge scanning workflows send multiple sequential API requests rapidly, triggering false-positive rate limit screens.
* **Throttler Profiles**:
  * **Short-Term Operations (General API)**: `120 requests per 60 seconds` (accommodates barcode scanning and multiline receipt creation).
  * **Authentication (Login/Refresh)**: `10 requests per 60 seconds` (strictly protects against brute-force/replay sweeps).
* **Implementation**: Annotate operational barcode routes with `@Throttle` overrides.

---

## 6. Transfer Receipt Notification Log (TASK-015)

* **Decision**: Inject a `NotificationLog` entry inside the `executeTransition()` method for the `TRANSFER_RECEIVED` action within the same database transaction.
* **Rationale**: Ensures total operational transparency across multi-branch transfers.
* **Properties**:
  * `targetRole`: `Role.ADMIN` and `Role.INV_MANAGER`.
  * `warehouseId`: Originating warehouse of the transfer.
  * `message`: `"Transfer {number} successfully received at {destination_warehouse}."`

---

## 7. Interactive Reports Hub UI: WAC History & Lot Trace (TASK-016)

* **Decision**: Build two high-density, RTL-compliant reports pages (`wac-history` and `lot-trace`) inside the web dashboard (`apps/web`).
* **Interactive Drill-Downs (Socratic Decision)**:
  - WAC History: Each row features clickable source document hyperlinks mapping to `/goods-receipts/:id`, `/adjustments/:id`, etc.
  - Lot Trace: Clicking a lot history item opens the original PO or GRN detail screen.
* **Theme**: Operational Nocturne (neon cyan and amber accents) utilizing high-density grids to support kitchen/warehouse environment readability.

---

## 8. Memory-Safe Reports Export (TASK-017 & TASK-018)

* **Decision A (TASK-017)**: Implement cursor-based pagination (chunks of 1,000) for all report extractions and enforce `MAX_EXPORT_ROWS = 50000`.
* **Decision B (TASK-018)**: Extract all data-fetching and query logic from `ReportsController` into a modular, unit-tested `ReportsService`.
* **Enterprise UX Safeguard (Socratic Decision)**:
  - The frontend MUST hit a fast `GET /reports/count` API metadata endpoint before initiating the export download.
  - If matching records exceed 50,000, the "Export to Excel" button will be disabled, and an inline alert panel will advise: `"Export limit exceeded (maximum 50,000 rows). Please narrow your selection by applying Date or Warehouse filters to enable export."`

---

## 9. Reversal/Void State Machine for Posted Documents (TASK-019)

* **Decision**: Build a transactional `VOID` state machine for posted GRNs, Stock Issues, and Adjustments using PostgreSQL `Serializable` transaction isolation.
* **Negative Inventory Safeguard (Socratic Decision)**:
  - The service layer MUST query current warehouse stock balances before committing a void.
  - If the void would drop an item's warehouse count below zero, the transaction is immediately rolled back and throws: `"Cannot void GRN: {X} units have already been consumed. Please reverse the downstream issues first."`
* **WAC Recalculation Flow**: WAC must be recalculated sequentially from the timestamp of the voided document forward to preserve the average cost layer integrity.

---

## Alternatives Considered & Rejected

1. **Lot-Level Freeze on Discrepancy (TASK-012)**:
   - *Rejected*: Freezing warehouse items automatically when lot-level drift occurs was rejected because packaging split discrepancies (e.g. correct total units but divided into wrong boxes) shouldn't block physical operations. Instead, a soft notification is dispatched.
2. **Post-Request 413 Handling for Exports (TASK-017)**:
   - *Rejected*: Allowing users to initiate an export and waiting for a server timeout/413 error is a poor user experience. Proactive validation using a fast metadata count check on the frontend is chosen for maximum usability.

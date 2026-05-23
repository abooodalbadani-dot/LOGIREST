# Research & Decisions: Inventory Transactions (Phase 7)

This document maps out key research findings, architectural decisions, and alternatives considered for Phase 7 (Inventory Transactions).

## 1. Concurrency Control & Row Locking

### Decision
Implement raw SQL pessimistic row locking (`SELECT FOR UPDATE`) on mutating `WarehouseItem` and `WarehouseItemLot` tables, wrapped inside a Prisma `$transaction` with `Serializable` isolation level.

### Rationale
- Under high concurrent posting (e.g., multiple keepers posting issues for the same hot-item lot), standard ORM transactions can read stale data and cause negative stock or duplicate updates.
- Executing a raw SQL query `SELECT * FROM "WarehouseItemLot" WHERE ... FOR UPDATE` forces concurrent transactions targeting the same lot to queue sequentially.
- Implementing an order-by sequence (deterministically locking rows sorted by `itemId ASC, lotId ASC`) avoids deadlocks.

### Alternatives Considered
- **Optimistic Locking only**: Rejected for ledger mutations because rolling back and asking users to retry is unacceptable for high-throughput warehouse scan-mode operations. It is kept only for document metadata modifications.
- **Node-level Mutexes**: Rejected because they do not scale across multiple API instances. Database row locking is the only cluster-safe solution.

---

## 2. FEFO/FIFO Lot Allocation Algorithm

### Decision
Allocate stock progressively from available lots.
- For items with `hasExpiry = true`: Sort available lots by `expiryDate ASC, receivedDate ASC` (FEFO).
- For items with `isBatched = true` but no expiry: Sort available lots by `receivedDate ASC` (FIFO).
- For non-batched items: Deduct directly from `WarehouseItem` without lot records.

### Rationale
- FEFO prevents stock wastage from expirations.
- FIFO ensures oldest stock is consumed first when no expiration is tracked.
- Allocations are saved in a junction table `LotAllocation` referencing the specific line and lot.

---

## 3. Weighted Average Cost (WAC) Calculation

### Decision
Recalculate WAC on GRN post and `INCREASE` adjustments.
- Formula: `newWac = (currentQty * currentWac + receivedQty * receivedCost) / (currentQty + receivedQty)`.
- If `currentQty + receivedQty <= 0`, default to `receivedCost` (or preserve current WAC if no new cost is available).
- The WAC value is saved on `WarehouseItem.weightedAvgCost` rounded to 4 decimal places.
- Log WAC history in `CostLedger`.

### Rationale
- Represents the true economic value of the stock on hand.
- Only positive additions alter the WAC; stock deductions (Issues, DECREASE Adjustments) consume stock at the current average, leaving the average cost unchanged.

# Research & Technical Decisions: Prisma Database Models & Migration Setup

## Decisions & Alternatives Analysis

### 1. Decimal Precision Mapping
* **Decision**: All money and quantity fields will use Prisma `@db.Decimal(18, 4)` and FX exchange rates will use `@db.Decimal(18, 6)`.
* **Rationale**: Floating-point data types (e.g. `Float`, `Double`) in relational databases suffer from binary representation rounding errors, which accumulate over large transactions. Standardizing on precise PostgreSQL `Decimal` types ensures 100% currency and stock count alignment.
* **Alternatives considered**:
  - `Float` in Prisma: Rejected because binary float math is non-deterministic for financial and ledger applications.
  - `Int` (storing values in cents/sub-units): Rejected because standard units of measure (UoMs) in restaurant supply chains (such as kilograms, liters) require fractional values beyond simple cents (e.g., 2.3456 kg).

---

### 2. Immutable Ledger Modeling (T5 Models)
* **Decision**: Model `StockLedger` and `CostLedger` as completely independent tables with `@unique` idempotency keys and without cascading deletes or updates.
* **Rationale**: Per the LogiRest Constitution, the ledger is the immutable, single source of truth for stock levels and cost tracking. By separating the ledgers from mutable transactional documents (like draft POs or PRs), we ensure that once a ledger entry is posted, it remains permanent. If corrections are needed, they must be processed via fresh adjustment entries.
* **Alternatives considered**:
  - Direct calculation of stock balances from GRN and Issue rows: Rejected because document edits, draft deletions, or direct updates would cause historical stock balance drift and make auditing impossible.
  - Unified ledger table for both cost and quantity: Rejected because stock movements and cost changes (e.g., Weighted Average Cost adjustments) have different data shapes and query patterns.

---

### 3. Concurrency Safety Infrastructure
* **Decision**: Implement optimistic locking via an integer `version` field (defaults to `1`) on all mutable master data and transaction header tables. Implement database-level indexes on expiration dates for FEFO (`First-Expired, First-Out`) and transaction timestamps for FIFO.
* **Rationale**: In a high-concurrency restaurant environment where multiple branch managers edit documents or post stock movements simultaneously, optimistic locking prevents "lost updates" by validating the version before updating. For stock operations, row-level locks (`SELECT FOR UPDATE`) inside serialized transactions ensure balance updates are processed sequentially.
* **Alternatives considered**:
  - Application-level memory locks (e.g. using local mutexes): Rejected because they fail in a multi-instance API environment.
  - Pessimistic locking for everything: Rejected because locking master data tables (e.g. UoMs, currencies) on read/write would drastically degrade read performance.

---

### 4. Real-time Inventory Balances (T3 & T4 Models)
* **Decision**: Define composite primary keys `@@id([warehouseId, itemId])` on `WarehouseItem` and `@@id([warehouseId, itemId, lotId])` on `WarehouseItemLot`.
* **Rationale**: The stock balance of an item is intrinsically unique per warehouse (and per lot). Modeling this using composite primary keys ensures database-enforced uniqueness, prevents duplication anomalies, and optimizes lookup performance for inventory queries.
* **Alternatives considered**:
  - Auto-incrementing surrogate primary key (`id`) with a separate unique constraint: Rejected as it introduces unnecessary indexes and increases schema complexity without adding functional value.

# Phase 0 Research: Sprint 3 Remediation and System Hardening

This document outlines the technical research, architectural decisions, and alternatives evaluated for Sprint 3.

---

## 1. Lot-Level Reconciliation & Prometheus Metrics

* **Decision**: Implement a database-level reconciliation job that aggregates `StockLedger` quantities by `(warehouseId, itemId, lotId)` and compares the sum against `WarehouseItemLot.qtyOnHand`. When a drift $> 0.001$ is found, increment the `logirest_reconciliation_discrepancies_total` Prometheus counter and freeze the lot.
* **Rationale**: 
  * Ensuring lot-level consistency is crucial for tracking FIFO/FEFO movements.
  * Registering discrepancies via Prometheus enables standard operations alerting.
* **Alternatives Considered**:
  * *Item-level reconciliation only*: Rejected because it misses internal lot-level shifts where the total item count is correct, but lot distributions are corrupted.
  * *In-memory calculations*: Rejected due to high memory footprint. Database-level aggregation is highly optimized.

---

## 2. Document Sequence Uniqueness hard-guard

* **Decision**: Add a database-level composite unique constraint `@@unique([documentType, year, branchId])` to the `DocumentSequence` model in `schema.prisma`.
* **Rationale**: 
  * Providing relational database-level uniqueness is the most robust way to guarantee no duplicate numbering under concurrent request spikes.
* **Alternatives Considered**:
  * *Application-level concurrency locks*: Too slow and introduces synchronization complexity in multi-instance node deployments.
  * *Global sequential IDs*: Violates the business requirement to have sequence numbers scoped and branded per branch and year.

---

## 3. WAC Consistency Job query footprint

* **Decision**: Replace N+1 queries with a single batch raw SQL query using `SELECT DISTINCT ON ("warehouseId", "itemId")` ordered by `postedAt DESC`.
* **Rationale**: 
  * Reduces query complexity from $O(N)$ to $O(2)$ regardless of the size of the warehouse catalog.
  * Prevents connection pool starvation and timeouts during cron cycles.
* **Alternatives Considered**:
  * *Caching intermediate WAC in memory*: Rejected because it risks cache invalidation bugs and state drift.
  * *Prisma relation fetches*: Prisma does not natively support a high-performance `DISTINCT ON` query with descending orders inside relations, necessitating raw SQL.

---

## 4. Progressive Excel report streaming

* **Decision**: Implement `ExcelJS.stream.xlsx.WorkbookWriter` with cursor-based chunk pagination (500 records per chunk).
* **Rationale**: 
  * Progression-streams the data directly to the HTTP response stream instead of buffering the whole dataset in server RAM, solving Out of Memory (OOM) errors.
* **Alternatives Considered**:
  * *Standard in-memory buffers (`ExcelJS.Workbook`)*: Crashes on datasets $> 50,000$ rows.
  * *CSV streaming*: Easier to implement but fails to meet the business requirement for native, branded spreadsheet exports.

---

## 5. Security & Access Void guards

* **Decision**: Strict role checking at the void service execution layer (`GrnVoidService.void()`, etc.) restricting operations to `ADMIN` and `INV_MGR` roles.
* **Rationale**: 
  * Implements defense-in-depth, securing high-stakes operations at the business logic layer even if controller-level route guards are bypassed or modified.
* **Alternatives Considered**:
  * *Controller guards only*: Vulnerable to maintenance mistakes if endpoints are refactored or if internal services call voids.

---

## 6. Manual Stock Adjustment Cost fallback

* **Decision**: In `AdjustmentPostService`, fallback to the warehouse WAC if no unit cost is specified, and throw a `BadRequestException` if WAC is also 0.
* **Rationale**: 
  * Protects WAC consistency from getting corrupted to 0 when users perform manual inventory increases.
* **Alternatives Considered**:
  * *Defaulting to 0*: Corrupts cost calculations and financial reports.
  * *Defaulting to item purchase list price*: Purchase prices vary and are not isolated per warehouse, making them inaccurate for WAC tracking.

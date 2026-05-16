# Persistence Architecture Blueprint
## Kitchen-Store Inventory Management System
**Phase:** Pre-Implementation Design | **Status:** Database-Agnostic

---

## PART 1: ENTITY CLASSIFICATION MODEL

Every entity falls into one of six immutability tiers.

| Tier | Class | Mutability | Example |
|------|-------|-----------|---------|
| T1 | **Core Master** | Fully mutable | Item, Warehouse, Supplier |
| T2 | **Transactional Header** | Mutable until Posted | PO, Issue, Transfer |
| T3 | **Transactional Line** | Mutable until Header Posted | POLine, IssueLine |
| T4 | **Posted Document** | Immutable after posting | Posted PO, Posted GRN |
| T5 | **Ledger Entry** | Append-only, never mutable | StockLedger, CostLedger |
| T6 | **Audit Entry** | Write-once, never mutable | AuditLog, ChangeEvent |

---

## PART 2: CORE ENTITY CATALOG

### 2.1 — Master Data Entities (T1)

#### Entity: `Item`
- **Purpose:** Defines a stockable SKU with costing and tracking rules.
- **Mutable Fields:** `name_ar`, `name_en`, `is_active`, `category_id`, `default_uom_id`, `track_lots`, `reorder_point`, `par_level`
- **Immutable Fields:** `id`, `code`, `barcode` (once assigned to a transaction)
- **Concurrency:** Optimistic — requires `version` integer for all updates
- **Operational Sensitivity:** HIGH — changes to `track_lots` must be blocked if active lots exist

#### Entity: `Warehouse`
- **Purpose:** Defines a physical or virtual storage location.
- **Mutable Fields:** `name_ar`, `name_en`, `type`, `is_active`, `branch_id`
- **Immutable Fields:** `id`, `code`
- **Concurrency:** Optimistic — requires `version` integer
- **Operational Sensitivity:** CRITICAL — cannot be deactivated while holding stock or active locks

#### Entity: `Supplier`
- **Mutable Fields:** All contact and payment fields
- **Immutable Fields:** `id`, `code`

#### Entity: `Department`
- **Purpose:** Defines a consuming unit (e.g., Kitchen, Pastry Lab).
- **Concurrency:** Low-conflict, optimistic lock sufficient

#### Entity: `UnitOfMeasure` + `UOMConversion`
- **Operational Sensitivity:** HIGH — changes to conversion ratios affect historical cost calculations

---

### 2.2 — Inventory Position Entities (T1/T2 Hybrid)

These represent the **live balance** of stock. Mutable only through controlled transactional writes.

#### Entity: `WarehouseItem`
- **Purpose:** Aggregated on-hand balance per Item per Warehouse.
- **Fields:** `warehouse_id`, `item_id`, `on_hand_qty`, `reserved_qty`, `available_qty`, `weighted_avg_cost`, `last_updated_at`
- **Mutation Rule:** **NEVER update directly.** Only updated as a side-effect of a committed `StockLedger` entry.
- **Derived Field:** `available_qty = on_hand_qty - reserved_qty`
- **Concurrency:** CRITICAL — requires **row-level locking** during any stock transaction.
- **Read Strategy:** Hot-path read target. Indexed on `(warehouse_id, item_id)`.

#### Entity: `WarehouseItemLot`
- **Purpose:** Granular on-hand balance per Item per Warehouse per Lot.
- **Fields:** `warehouse_id`, `item_id`, `lot_id`, `on_hand_qty`, `reserved_qty`, `expiry_date`, `received_date`
- **Mutation Rule:** Only mutated via `StockLedger` side effects.
- **FEFO Index:** `(warehouse_id, item_id, expiry_date ASC)`
- **Concurrency:** CRITICAL — requires **row-level locking** per lot row during allocation.

#### Entity: `Lot`
- **Fields:** `id`, `item_id`, `lot_number`, `expiry_date`, `manufacture_date`, `status` (ACTIVE, EXHAUSTED, QUARANTINED)
- **Immutable After Creation:** `lot_number`, `expiry_date`, `item_id`
- **Lifecycle:** ACTIVE → EXHAUSTED (auto, when qty=0) / QUARANTINED (manual)

---

### 2.3 — Procurement Entities (T2 → T4)

#### Entity: `PurchaseOrder`
- **Status FSM:** `DRAFT → PENDING_APPROVAL → APPROVED → OPEN → PARTIALLY_RECEIVED → CLOSED | CANCELLED`
- **Immutability Rule:** T4 once status is `APPROVED` or beyond.
- **Concurrency:** Optimistic lock via `version`

#### Entity: `PurchaseOrderLine`
- **Fields:** `po_id`, `item_id`, `ordered_qty`, `received_qty`, `unit_price`, `uom_id`
- **Immutability:** Locked when parent PO is approved.

#### Entity: `GoodsReceivedNote` (GRN)
- **Status FSM:** `DRAFT → POSTED`
- **Immutability Rule:** T4 after posting — fully immutable.
- **Idempotency:** Must include `idempotency_key`.
- **Posting Effect:** Creates `StockLedger` entries, updates `WarehouseItem`, `WarehouseItemLot`, triggers WAC recalculation.

#### Entity: `GRNLine`
- **Fields:** `grn_id`, `item_id`, `received_qty`, `lot_id`, `unit_cost`, `uom_id`

---

### 2.4 — Operations Entities (T2 → T4)

#### Entity: `InventoryIssue`
- **Status FSM:** `DRAFT → PENDING_APPROVAL → POSTED | CANCELLED`
- **Immutability:** T4 after `POSTED`.
- **Posting Effect:** Deducts `WarehouseItemLot.on_hand_qty`, creates `StockLedger` entries of type `ISSUE`.

#### Entity: `InventoryIssueLine`
- **Fields:** `issue_id`, `item_id`, `requested_qty`, `issued_qty`, `unit_cost`, `uom_id`

#### Entity: `InventoryIssueLotAllocation`
- **Purpose:** Maps specific lots to specific issue lines (FEFO result).
- **Fields:** `line_id`, `lot_id`, `allocated_qty`
- **Immutability:** T4 after parent Issue is posted.

#### Entity: `InventoryTransfer`
- **Status FSM:** `DRAFT → IN_TRANSIT → RECEIVED | CANCELLED`
- **Special Rule:** Two-phase commitment — source deduction and destination addition must be atomic or tracked via `IN_TRANSIT` lot state.

#### Entity: `InventoryAdjustment`
- **Status FSM:** `DRAFT → POSTED`
- **Approval Rule:** Negative adjustments above a configurable threshold require manager approval.

#### Entity: `KitchenRequest`
- **Status FSM:** `DRAFT → SUBMITTED → APPROVED → FULFILLED | REJECTED`
- **Relationship:** May be converted into an `InventoryIssue` upon fulfillment.

---

### 2.5 — Stocktake Entities (T2 → T4 + T5)

#### Entity: `StocktakeSession`
- **Status FSM:** `INITIATED → COUNTING → REVIEW → POSTED | CANCELLED`
- **Immutability:** T4 after `POSTED`.
- **Lock Effect:** Creates a `WarehouseLock` on `COUNTING` transition.

#### Entity: `StocktakeSnapshot` (T5 — Append-Only)
- **Purpose:** Point-in-time capture of system quantities at session start.
- **Fields:** `session_id`, `lot_id`, `item_id`, `system_qty`, `unit_cost`, `snapshot_taken_at`
- **Immutability:** WRITE-ONCE. Never updated after creation. Guarantees tamper-proof audit trail.

#### Entity: `StocktakeCount`
- **Fields:** `session_id`, `lot_id`, `physical_qty`, `counted_by_user_id`, `counted_at`
- **Special Rule:** Supports multiple counts per lot for "double-blind" counting workflow.

#### Entity: `StocktakeVarianceLine`
- **Fields:** `session_id`, `lot_id`, `snapshot_qty`, `physical_qty`, `variance_qty`, `variance_value`, `variance_reason`, `approved_by`
- **Immutability:** T4 after session is `POSTED`.

---

### 2.6 — Ledger Entities (T5 — Append-Only)

#### Entity: `StockLedger` ⭐ MOST CRITICAL
- **Purpose:** Immutable record of every stock movement in the system.
- **Fields:**
  - `id`, `transaction_type` (GRN | ISSUE | TRANSFER_OUT | TRANSFER_IN | ADJUSTMENT | STOCKTAKE_POST)
  - `document_type`, `document_id`, `document_line_id`
  - `warehouse_id`, `item_id`, `lot_id`
  - `qty_change` (signed — positive for in, negative for out)
  - `resulting_qty_on_hand`
  - `unit_cost`, `total_cost`
  - `posted_by_user_id`, `posted_at`, `idempotency_key`
- **Constraint:** `resulting_qty_on_hand >= 0` enforced at DB level.
- **Immutability:** APPEND-ONLY. No UPDATE or DELETE permissions on this table.
- **Index Strategy:** `(warehouse_id, item_id, posted_at DESC)` for history. `(document_id, document_type)` for tracing.

#### Entity: `CostLedger`
- **Fields:** `item_id`, `warehouse_id`, `old_wac`, `new_wac`, `trigger_type`, `trigger_id`, `recorded_at`
- **Immutability:** APPEND-ONLY.

---

### 2.7 — Control / Locking Entities

#### Entity: `WarehouseLock`
- **Fields:** `warehouse_id`, `lock_type` (STOCKTAKE, PERIOD_CLOSE), `session_id`, `locked_by_user_id`, `locked_at`, `expires_at`, `is_active`
- **Lifecycle:** Created on Stocktake COUNTING → Released on POSTED or CANCELLED.
- **Enforcement:** All write operations targeting a warehouse must check this table first.
- **Safety:** `expires_at` auto-releases zombie locks after a configurable duration (e.g., 72 hours).

#### Entity: `IdempotencyLog`
- **Fields:** `idempotency_key`, `operation_type`, `response_status`, `response_body_hash`, `created_at`, `expires_at`
- **Lifecycle:** Entries expire after 24–48 hours.

---

### 2.8 — Audit Entities (T6 — Write-Once)

#### Entity: `AuditLog`
- **Fields:** `id`, `entity_type`, `entity_id`, `action` (CREATE, UPDATE, STATUS_CHANGE, POST, APPROVE, DELETE), `performed_by_user_id`, `performed_at`, `before_state_json`, `after_state_json`, `ip_address`, `session_id`
- **Immutability:** No UPDATE or DELETE. Purge policy defined per compliance requirements.

#### Entity: `ApprovalEvent`
- **Fields:** `document_type`, `document_id`, `step_number`, `action` (SUBMITTED, APPROVED, REJECTED, RECALLED), `approver_user_id`, `comments`, `acted_at`
- **Immutability:** Append-only per document lifecycle.

---

## PART 3: INVENTORY CONSISTENCY MODEL

### 3.1 — Preventing Negative Stock (Guard-then-Lock-then-Write)

1. **Optimistic Pre-Check:** Read `WarehouseItemLot.available_qty`. If insufficient, reject early before acquiring locks.
2. **Pessimistic Lock:** Within the transaction, acquire row-level write lock on target `WarehouseItemLot` rows.
3. **Re-validate:** Re-read quantity under lock. If still sufficient, proceed.
4. **Write:** Deduct quantity and write `StockLedger` entry.
5. **DB Constraint:** `CHECK (on_hand_qty >= 0)` on `WarehouseItemLot` as final safety net.

### 3.2 — Preventing Duplicate Posting (Idempotency Key + Unique Constraint)

- Every transactional POST carries a client-generated `idempotency_key` (UUID).
- System checks `IdempotencyLog` before processing.
- If found with SUCCESS: return cached response immediately.
- If found with PROCESSING: return `409` (in-flight).
- If not found: insert PROCESSING, process, then mark SUCCESS.
- UNIQUE constraint on `StockLedger(idempotency_key)` is the database-level safety net.

### 3.3 — Preventing Stale Updates (Optimistic Concurrency)

- All T1/T2 entities include an integer `version` field.
- Update condition: `WHERE id = :id AND version = :version`.
- If `0 rows affected` → return `409 Conflict` with current server state.
- Frontend `ConflictDialog` prompts user to reload and re-apply.

### 3.4 — Warehouse Lock Enforcement

```
BEFORE any stock write for warehouse W:
  1. Query WarehouseLock WHERE warehouse_id = W AND is_active = TRUE
  2. If lock exists → return 423 Locked (include lock_type, session_id)
  3. If no lock → proceed with operation
```

Lock expiry: If `locked_at + duration > NOW()`, lock is expired. Background job or next write auto-releases and writes AuditLog.

### 3.5 — Immutable Posting

- `status` field on document header is the sentinel.
- All update paths begin with: `IF document.status == POSTED THEN RAISE ImmutableDocumentError`.
- Check occurs at the **service layer** before any DB write.

---

## PART 4: TRANSACTIONAL STRATEGY

### 4.1 — GRN Posting Transaction Boundary

```
BEGIN TRANSACTION
  1. Validate GRN is in DRAFT status
  2. Check WarehouseLock for target warehouse
  3. Check IdempotencyLog for request key
  4. For each GRNLine:
     a. Create/update Lot record
     b. Upsert WarehouseItemLot (add received_qty)
     c. Insert StockLedger entry (type: GRN)
  5. Recalculate WAC for each affected WarehouseItem
  6. Insert CostLedger entries for WAC changes
  7. Update WarehouseItem.on_hand_qty
  8. Set GRN.status = POSTED
  9. If PO fully received → set PO.status = CLOSED
  10. Insert AuditLog entry
  11. Insert IdempotencyLog with SUCCESS
COMMIT → Emit GRN_POSTED notification event
ROLLBACK ON ANY FAILURE → Mark IdempotencyLog FAILED
```

### 4.2 — Issue Posting Transaction Boundary

```
BEGIN TRANSACTION
  1. Validate Issue is in DRAFT or APPROVED status
  2. Check WarehouseLock for source warehouse
  3. Check IdempotencyLog
  4. For each IssueLine + LotAllocation:
     a. SELECT WarehouseItemLot FOR UPDATE (row lock per lot)
     b. Re-validate available_qty >= allocated_qty
     c. Deduct WarehouseItemLot.on_hand_qty
     d. Insert StockLedger entry (type: ISSUE)
  5. Update WarehouseItem.on_hand_qty (aggregate)
  6. Set Issue.status = POSTED
  7. Insert AuditLog entry
COMMIT
```

### 4.3 — Stocktake Posting Transaction Boundary

```
BEGIN TRANSACTION
  1. Validate session is in REVIEW status
  2. Validate all variance lines have reasons (service layer)
  3. For each VarianceLine where variance != 0:
     a. SELECT WarehouseItemLot FOR UPDATE
     b. Set on_hand_qty = physical_qty
     c. Insert StockLedger entry (type: STOCKTAKE_POST)
  4. Update all WarehouseItem.on_hand_qty aggregates
  5. Release WarehouseLock (is_active = FALSE)
  6. Set StocktakeSession.status = POSTED
  7. Insert AuditLog entry
COMMIT
```

### 4.4 — WAC Recalculation Strategy

```
New_WAC = ((Current_qty * Current_WAC) + (Received_qty * Received_cost))
           ÷ (Current_qty + Received_qty)
```

- Calculated within GRN posting transaction.
- If `Current_qty == 0` then `New_WAC = Received_unit_cost`.
- Result stored on `WarehouseItem.weighted_avg_cost`.
- `CostLedger` entry created for each WAC change.
- **Back-dating Protection:** GRNs cannot be posted with `received_date` earlier than the warehouse's last `StocktakeSession.posted_at`.

---

## PART 5: FEFO ALLOCATION STRATEGY

### 5.1 — FEFO Query Model

```
FILTER: warehouse_id = :wh AND item_id = :item AND status = ACTIVE
ORDER:  expiry_date ASC, received_date ASC
SELECT: lot_id, lot_number, expiry_date, available_qty
```

### 5.2 — Allocation Algorithm (Service Layer)

```
FUNCTION allocate_fefo(warehouse_id, item_id, requested_qty):
  remaining = requested_qty
  allocations = []
  FOR each lot in FEFO-ordered lots:
    IF remaining <= 0: BREAK
    take = MIN(lot.available_qty, remaining)
    allocations.append({ lot_id, allocated_qty: take })
    remaining -= take
  IF remaining > 0:
    RAISE InsufficientStockError
  RETURN allocations
```

### 5.3 — Reservation Strategy

- Pre-posting: allocations are **reserved** by incrementing `WarehouseItemLot.reserved_qty`.
- `available_qty = on_hand_qty - reserved_qty`.
- Reservations released if Issue is CANCELLED.
- Reservations converted to actual deductions at posting time.

---

## PART 6: PERFORMANCE STRATEGY

### 6.1 — High-Frequency Read Paths

| Read Type | Source Table | Index |
|-----------|-------------|-------|
| Live stock level | `WarehouseItem` | `(warehouse_id, item_id)` |
| FEFO lot list | `WarehouseItemLot` | `(warehouse_id, item_id, expiry_date ASC)` |
| Document list | Header tables | `(warehouse_id, status, created_at DESC)` |
| Stock history | `StockLedger` | `(warehouse_id, item_id, posted_at DESC)` |

### 6.2 — Aggregation Strategy

- **Balance reads** served from pre-aggregated `WarehouseItem`, not recomputed from ledger.
- **Financial reports** computed from `StockLedger` with date-range filters.
- **Dashboard KPIs** may use a `DashboardSnapshot` cache entity, refreshed on posting events.

### 6.3 — Pagination Rules

- Large datasets (StockLedger): **cursor-based pagination**.
- Master data lists (Items, Warehouses): offset pagination acceptable.

---

## PART 7: DATABASE SELECTION GUIDANCE

### 7.1 — Requirements Evaluation Matrix

| Requirement | PostgreSQL | MySQL 8+ | SQL Server |
|-------------|-----------|----------|------------|
| ACID transactions | ✅ Full | ✅ Full | ✅ Full |
| Row-level locking (`SELECT FOR UPDATE`) | ✅ Excellent | ✅ Good | ✅ Good |
| Partial indexes | ✅ Native | ❌ Limited | ❌ No |
| JSONB for audit state | ✅ Native | ⚠️ JSON only | ⚠️ Limited |
| CHECK constraints enforced | ✅ Full | ⚠️ Ignored pre-8.0 | ✅ Full |
| Materialized Views (reporting) | ✅ Native | ❌ No | ✅ Indexed Views |
| Advisory/App Locks | ✅ `pg_advisory_lock` | ❌ Manual | ⚠️ App locks |
| Serializable isolation (true SSI) | ✅ True SSI | ⚠️ Limited | ✅ Full |
| Open source / no license cost | ✅ Free | ✅ Free | ❌ Licensed |
| Full-text search | ✅ Native | ⚠️ Limited | ✅ Good |
| ORM ecosystem maturity | ✅ Excellent | ✅ Good | ✅ Good |
| `SKIP LOCKED` for queues | ✅ Native | ✅ MySQL 8+ | ✅ Good |
| `LISTEN/NOTIFY` pub-sub | ✅ Native | ❌ No | ❌ No |

### 7.2 — Final Recommendation: PostgreSQL

> **PostgreSQL is the definitive recommendation for this system.**

**Justification:**

1. **True SSI (Serializable Snapshot Isolation):** Critical for ledger correctness. PostgreSQL's true SSI detects serialization anomalies that MySQL's gap-lock approach can miss.
2. **`SELECT FOR UPDATE SKIP LOCKED`:** Required for lot-level allocation queues. Allows multiple workers to claim lots without blocking, enabling horizontal posting service scaling.
3. **Partial Indexes:** Enable targeted performance on filtered queries (e.g., `WHERE status = 'ACTIVE'`), reducing index bloat on large operational tables.
4. **JSONB Columns:** `AuditLog.before_state_json / after_state_json` benefit from JSONB compression and queryability.
5. **`CHECK` Constraints Always Enforced:** `on_hand_qty >= 0` as a true database-level constraint, not a soft advisory.
6. **`pg_advisory_lock`:** Application-level distributed locking for FEFO allocation phase, preventing two concurrent sessions from over-allocating the same lot.
7. **`LISTEN/NOTIFY`:** Native pub/sub enables real-time posting event notifications without a separate message broker for internal use cases.
8. **Zero Licensing Cost:** No vendor lock-in, optimal for self-hosted or cloud (Supabase, Neon, RDS PostgreSQL) deployments.

---

## PART 8: ENTITY RESPONSIBILITY SUMMARY

| Entity | Tier | Mutability | Lock Strategy | Key Constraint |
|--------|------|-----------|--------------|----------------|
| Item | T1 | Optimistic | Version | `track_lots` frozen with active lots |
| Warehouse | T1 | Optimistic | Version | Cannot deactivate with stock |
| WarehouseItem | T1/T2 | Ledger-Driven | Row-level write lock | Auto-maintained, never direct edit |
| WarehouseItemLot | T1/T2 | Ledger-Driven | `SELECT FOR UPDATE` | `on_hand_qty >= 0` |
| PurchaseOrder | T2→T4 | Optimistic → Frozen | Version | Immutable after approval |
| GRN | T2→T4 | Frozen after post | Idempotency key | WAC recalculated at post |
| InventoryIssue | T2→T4 | Frozen after post | Warehouse lock + Idempotency | FEFO enforced at post |
| StocktakeSession | T2→T4 | Frozen after post | WarehouseLock entity | Snapshot taken at COUNTING |
| StocktakeSnapshot | T5 | WRITE-ONCE | None needed | Never updated after creation |
| StockLedger | T5 | APPEND-ONLY | None needed | `resulting_qty >= 0` enforced |
| CostLedger | T5 | APPEND-ONLY | None needed | WAC audit trail |
| AuditLog | T6 | WRITE-ONCE | None needed | No UPDATE/DELETE grants |
| WarehouseLock | Control | Active/Inactive | Checked before writes | `expires_at` prevents zombies |
| IdempotencyLog | Control | Append + Expire | Unique key constraint | 24–48hr TTL |

# Data Model Design: Sprint 0 Readiness Hardening

This document outlines the persistence design, field definitions, and database constraints introduced for Sprint 0 readiness.

---

## 1. Inventory & Stock Consistency (TASK-007)

We are introducing strict database-level positive check constraints on inventory tables to safeguard physical stock records against negative quantities.

### Entity: `WarehouseItem` (`warehouse_items`)

Represents the total inventory level of a specific item within a specific warehouse.

- **Primary Key**: `(warehouseId, itemId)`
- **Fields**:
  - `warehouseId` (String, foreign key)
  - `itemId` (String, foreign key)
  - `qtyOnHand` (Decimal, default 0, precision 18, scale 4)
  - `qtyAllocated` (Decimal, default 0, precision 18, scale 4)
  - `wac` (Decimal, default 0, precision 18, scale 4)
  - `isFrozen` (Boolean, default false)
- **Database CHECK Constraints**:
  - `warehouse_items_qty_on_hand_nonneg`: `qtyOnHand >= 0`
  - `warehouse_items_qty_allocated_nonneg`: `qtyAllocated >= 0`

### Entity: `WarehouseItemLot` (`warehouse_item_lots`)

Represents lot-specific stock splits within a warehouse.

- **Primary Key**: `(warehouseId, itemId, lotId)`
- **Fields**:
  - `warehouseId` (String, foreign key)
  - `itemId` (String, foreign key)
  - `lotId` (String, foreign key)
  - `qtyOnHand` (Decimal, default 0, precision 18, scale 4)
  - `qtyAllocated` (Decimal, default 0, precision 18, scale 4)
- **Database CHECK Constraints**:
  - `warehouse_item_lots_qty_on_hand_nonneg`: `qtyOnHand >= 0`

---

## 2. Background Event System & Logging (TASK-006)

We are adding database constraints to the transactional outbox system and tracking notification messages targeted at specific system roles.

### Entity: `OutboxEvent` (`outbox_events`)

Tracks asynchronous events generated inside main business transactions to be processed in the background (e.g. emails, system alerts).

- **Primary Key**: `id` (String)
- **Fields**:
  - `id` (String)
  - `eventType` (String)
  - `payload` (Json)
  - `status` (String, default "PENDING")
  - `attempts` (Int, default 0)
  - `lastError` (String, nullable)
  - `processedAt` (DateTime, nullable)
  - `createdAt` (DateTime)
  - `expiresAt` (DateTime)
- **Database CHECK Constraints**:
  - `outbox_events_status_valid`: `status IN ('PENDING', 'SUCCEEDED', 'FAILED')`
- **Validation**:
  - Unconfigured SMTP dispatches transition `status` to `FAILED` with `lastError = 'SMTP_NOT_CONFIGURED'`.

### Entity: `NotificationLog` (`notification_logs`)

Stores in-system alert records targeting specific roles.

- **Primary Key**: `id` (String)
- **Fields**:
  - `id` (String)
  - `targetRole` (Role enum)
  - `warehouseId` (String, nullable)
  - `message` (String)
  - `isRead` (Boolean, default false)
  - `createdAt` (DateTime)
  - `documentType` (DocumentType enum, nullable)
  - `documentId` (String, nullable)

---

## 3. Workflow & Document Lifecycle (TASK-009)

We are introducing document cancellation terminal states to the state machines.

### Entity: `PurchaseRequest` (`purchase_requests`)

Tracks draft and active procurement requests.

- **Primary Key**: `id` (String)
- **Fields**:
  - `id` (String)
  - `requestNumber` (String, unique)
  - `branchId` (String)
  - `warehouseId` (String)
  - `status` (String, default "DRAFT")
  - `createdById` (String)
  - `version` (Int, default 1)
- **Lifecycle Transitions (Phase 1)**:
  - `DRAFT` -> `CANCELLED` (Terminal State)
  - Authorized actors: Creator or `ADMIN`.
  - Action writes an `ApprovalEvent` with `fromStatus="DRAFT"` and `toStatus="CANCELLED"`.

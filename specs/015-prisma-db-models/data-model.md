# Data Model Specification: Prisma Database Models & Migration Setup

This document specifies the database schemas and relationships for the LogiRest system, grouped into six Tiers (T1 to T6).

## Database Dialect
* **Engine**: PostgreSQL (via InsForge)
* **ORM**: Prisma

---

## Tier 1: Master Data Models

These tables store foundational entities that rarely change and are referenced throughout transactions.

### 1. `User`
Stores system user credentials, status, and role.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `email`: `String`, Unique
  - `passwordHash`: `String`
  - `name`: `String`
  - `role`: `Role` (Enum: `ADMIN`, `GM`, `INV_MGR`, `WH_KEEPER`, `PROC_OFFICER`, `APPROVER`, `AUDITOR`, `VIEWER`, `KITCHEN_CHIEF`, `STORE_MGR`)
  - `isActive`: `Boolean` (default: `true`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)
  - `updatedAt`: `DateTime` (updated dynamically)

### 2. `UserWarehouseScope`
Binds users to authorized warehouses to enforce IDOR scopes.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `userId`: `String` (FK to `User.id`, Cascade Delete)
  - `warehouseId`: `String` (FK to `Warehouse.id`, Cascade Delete)
  - `version`: `Int` (default: `1`)
* **Constraints**:
  - `@@unique([userId, warehouseId])`

### 3. `Branch`
Represents physical operating branches.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `name`: `String`, Unique
  - `code`: `String`, Unique
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 4. `Warehouse`
Inventory storage locations belonging to a branch.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `branchId`: `String` (FK to `Branch.id`, Restrict Delete)
  - `name`: `String`
  - `code`: `String`, Unique
  - `isLocked`: `Boolean` (default: `false` - set during stocktake)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 5. `Department`
Operating departments within a branch (e.g. Hot Kitchen, Bakery).
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `branchId`: `String` (FK to `Branch.id`, Restrict Delete)
  - `name`: `String`
  - `version`: `Int` (default: `1`)

### 6. `Category`
Product category hierarchy.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `name`: `String`, Unique
  - `version`: `Int` (default: `1`)

### 7. `UnitOfMeasure` (UoM)
Measurement definitions for quantities.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `name`: `String`, Unique
  - `code`: `String`, Unique (e.g., `KG`, `LTR`, `PCS`)
  - `version`: `Int` (default: `1`)

### 8. `Supplier`
Vendor entity definitions.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `name`: `String`
  - `code`: `String`, Unique
  - `contactEmail`: `String`?
  - `version`: `Int` (default: `1`)

### 9. `Currency`
Standard base and foreign currencies.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `code`: `String`, Unique (e.g., `SAR`, `USD`)
  - `name`: `String`
  - `isBase`: `Boolean` (default: `false`)
  - `version`: `Int` (default: `1`)

### 10. `FXRate`
Exchange rates relative to the base currency.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `fromCurrencyId`: `String` (FK to `Currency.id`, Restrict)
  - `toCurrencyId`: `String` (FK to `Currency.id`, Restrict)
  - `rate`: `Decimal` (18, 6)
  - `effectiveFrom`: `DateTime`
  - `version`: `Int` (default: `1`)
* **Indexes**:
  - `@@index([fromCurrencyId, toCurrencyId, effectiveFrom DESC])`

### 11. `Item`
Stores individual product metadata.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `categoryId`: `String` (FK to `Category.id`, Restrict)
  - `uomId`: `String` (FK to `UnitOfMeasure.id`, Restrict)
  - `name`: `String`
  - `sku`: `String`, Unique
  - `isBatched`: `Boolean` (default: `false`)
  - `hasExpiry`: `Boolean` (default: `false`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 12. `BarcodeMapping`
Supports multi-barcode mapping for items.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `itemId`: `String` (FK to `Item.id`, Cascade Delete)
  - `barcode`: `String`, Unique
  - `version`: `Int` (default: `1`)

---

## Tier 2: Transaction Document Models

These tables store documents mapping workflow state transitions.

### 1. `PurchaseRequest` (PR)
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `requestNumber`: `String`, Unique
  - `branchId`: `String` (FK to `Branch.id`, Restrict)
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`)
  - `createdById`: `String` (FK to `User.id`, Restrict)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 2. `PRLine`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `prId`: `String` (FK to `PurchaseRequest.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantity`: `Decimal` (18, 4)

### 3. `PurchaseOrder` (PO)
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `poNumber`: `String`, Unique
  - `prId`: `String`? (FK to `PurchaseRequest.id`, SetNull)
  - `supplierId`: `String` (FK to `Supplier.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `PARTIAL`, `FULFILLED`)
  - `currencyId`: `String` (FK to `Currency.id`, Restrict)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 4. `POLine`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `poId`: `String` (FK to `PurchaseOrder.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantity`: `Decimal` (18, 4)
  - `unitPrice`: `Decimal` (18, 4)

### 5. `GoodsReceivedNote` (GRN)
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `grnNumber`: `String`, Unique
  - `poId`: `String` (FK to `PurchaseOrder.id`, Restrict)
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `RECEIVED`, `POSTED`, `CANCELLED`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 6. `GRNLine`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `grnId`: `String` (FK to `GoodsReceivedNote.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantityReceived`: `Decimal` (18, 4)
  - `unitPrice`: `Decimal` (18, 4)
  - `lotId`: `String`? (FK to `Lot.id`, SetNull)

### 7. `InventoryIssue`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `issueNumber`: `String`, Unique
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `departmentId`: `String` (FK to `Department.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `SUBMITTED`, `POSTED`, `CANCELLED`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 8. `InventoryIssueLine`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `issueId`: `String` (FK to `InventoryIssue.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantity`: `Decimal` (18, 4)

### 9. `LotAllocation`
Tracks the allocation order of lots for stock mutations (FIFO/FEFO).
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `issueLineId`: `String`? (FK to `InventoryIssueLine.id`, Cascade)
  - `transferLineId`: `String`? (FK to `TransferLine.id`, Cascade)
  - `lotId`: `String` (FK to `Lot.id`, Restrict)
  - `quantityAllocated`: `Decimal` (18, 4)

### 10. `Transfer`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `transferNumber`: `String`, Unique
  - `fromWarehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `toWarehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `IN_TRANSIT`, `RECEIVED`, `POSTED`, `CANCELLED`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 11. `TransferLine`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `transferId`: `String` (FK to `Transfer.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantityShipped`: `Decimal` (18, 4)
  - `quantityReceived`: `Decimal` (18, 4)?

### 12. `Adjustment`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `adjustmentNumber`: `String`, Unique
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `POSTED`, `CANCELLED`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 13. `AdjustmentLine`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `adjustmentId`: `String` (FK to `Adjustment.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `lotId`: `String`? (FK to `Lot.id`, Restrict)
  - `quantity`: `Decimal` (18, 4)
  - `direction`: `AdjustmentDirection` (Enum: `IN`, `OUT`)
  - `reason`: `AdjustmentReason` (Enum: `THEFT`, `DAMAGE`, `SPOILAGE`, `CORRECTION`, `ADMIN_OVERRIDE`)

### 14. `KitchenRequest`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `requestNumber`: `String`, Unique
  - `departmentId`: `String` (FK to `Department.id`, Restrict)
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `status`: `String` (e.g. `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `FULFILLED`, `CANCELLED`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 15. `KitchenRequestItem`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `requestId`: `String` (FK to `KitchenRequest.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantityRequested`: `Decimal` (18, 4)
  - `quantityFulfilled`: `Decimal` (18, 4)

### 16. `ApprovalEvent`
Logs workflow transition approvals and rejections.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `documentId`: `String` (Polymorphic/Loose string identifier to reference target transaction doc)
  - `documentType`: `DocumentType`
  - `fromStatus`: `String`
  - `toStatus`: `String`
  - `actionPerformed`: `String`
  - `userId`: `String` (FK to `User.id`, Restrict)
  - `createdAt`: `DateTime` (default: `now()`)

---

## Tier 3 & Tier 4: Live Inventory Position & Lots

### 1. `Lot`
Represents concrete batches of items with expiration dates.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `lotNumber`: `String`, Unique
  - `receivedDate`: `DateTime` (default: `now()`)
  - `expiryDate`: `DateTime`?
  - `status`: `LotStatus` (Enum: `ACTIVE`, `HOLD`, `EXPIRED`, `QUARANTINE`)
  - `createdAt`: `DateTime` (default: `now()`)
* **Indexes**:
  - `@@index([itemId, expiryDate ASC])`

### 2. `WarehouseItem`
Live stock balance of items per warehouse.
* **Fields**:
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `qtyOnHand`: `Decimal` (18, 4) (default: `0.0000`)
  - `qtyAllocated`: `Decimal` (18, 4) (default: `0.0000`)
  - `wac`: `Decimal` (18, 4) (default: `0.0000`)
  - `updatedAt`: `DateTime` (updated dynamically)
* **Constraints**:
  - `@@id([warehouseId, itemId])`

### 3. `WarehouseItemLot`
Live stock balance per warehouse, item, and lot batch.
* **Fields**:
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `lotId`: `String` (FK to `Lot.id`, Restrict)
  - `qtyOnHand`: `Decimal` (18, 4) (default: `0.0000`)
  - `qtyAllocated`: `Decimal` (18, 4) (default: `0.0000`)
  - `updatedAt`: `DateTime` (updated dynamically)
* **Constraints**:
  - `@@id([warehouseId, itemId, lotId])`
* **Indexes**:
  - `@@index([warehouseId, itemId, lotId])` (implicitly covered by PK, but added if needed)
  - For FIFO: `@@index([warehouseId, itemId])` (ordering handled via relation to `Lot.receivedDate`)
  - For FEFO: `@@index([warehouseId, itemId])` (ordering handled via relation to `Lot.expiryDate`)

---

## Tier 5: Immutable Ledgers

These are append-only tables storing detailed inventory history. No update or delete operations are permitted.

### 1. `StockLedger`
Authoritative ledger for physical stock movements.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `postedAt`: `DateTime` (default: `now()`)
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `lotId`: `String`? (FK to `Lot.id`, Restrict)
  - `quantity`: `Decimal` (18, 4) (positive for receipt, negative for issues/adjustments)
  - `documentId`: `String` (String reference to source transaction ID)
  - `documentType`: `DocumentType`
  - `idempotencyKey`: `String`, Unique
* **Indexes**:
  - `@@index([warehouseId, itemId, postedAt DESC])`

### 2. `CostLedger`
Authoritative ledger for unit costs and Weighted Average Cost changes.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `postedAt`: `DateTime` (default: `now()`)
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `quantity`: `Decimal` (18, 4)
  - `unitPrice`: `Decimal` (18, 4)
  - `newWac`: `Decimal` (18, 4)
  - `documentId`: `String`
  - `documentType`: `DocumentType`
  - `idempotencyKey`: `String`, Unique
* **Indexes**:
  - `@@index([warehouseId, itemId, postedAt DESC])`

---

## Tier 6: Control & Security Models

### 1. `WarehouseLock`
Tracks active locks on warehouses during stocktaking or manual operations.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `lockType`: `LockType` (Enum: `STOCKTAKE`, `MANUAL`)
  - `lockedById`: `String` (FK to `User.id`, Restrict)
  - `expiresAt`: `DateTime`
  - `createdAt`: `DateTime` (default: `now()`)

### 2. `IdempotencyLog`
Ensures that duplicate API requests do not trigger duplicate mutations.
* **Fields**:
  - `key`: `String`, Primary Key
  - `responseBody`: `String`
  - `statusCode`: `Int`
  - `createdAt`: `DateTime` (default: `now()`)

### 3. `AuditLog`
Immutable tracking for security compliance.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `userId`: `String` (FK to `User.id`, Restrict)
  - `action`: `String`
  - `targetTable`: `String`
  - `targetId`: `String`
  - `beforeStateJson`: `String`
  - `afterStateJson`: `String`
  - `ipAddress`: `String`?
  - `createdAt`: `DateTime` (default: `now()`)

### 4. `StocktakeSession`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `sessionNumber`: `String`, Unique
  - `warehouseId`: `String` (FK to `Warehouse.id`, Restrict)
  - `status`: `StocktakeStatus` (e.g. `DRAFT`, `STARTED`, `COUNTING`, `REVIEW`, `APPROVED`, `POSTED`, `CLOSED`, `CANCELLED`)
  - `version`: `Int` (default: `1`)
  - `createdAt`: `DateTime` (default: `now()`)

### 5. `StocktakeCount`
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `sessionId`: `String` (FK to `StocktakeSession.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `lotId`: `String`? (FK to `Lot.id`, Restrict)
  - `qtyCounted`: `Decimal` (18, 4)
  - `countedById`: `String` (FK to `User.id`, Restrict)
  - `countedAt`: `DateTime` (default: `now()`)

### 6. `StocktakeSnapshot`
Pre-stocktake frozen balances.
* **Fields**:
  - `id`: `String` (UUID), Primary Key
  - `sessionId`: `String` (FK to `StocktakeSession.id`, Cascade)
  - `itemId`: `String` (FK to `Item.id`, Restrict)
  - `lotId`: `String`? (FK to `Lot.id`, Restrict)
  - `qtySnapshot`: `Decimal` (18, 4)
  - `wacSnapshot`: `Decimal` (18, 4)

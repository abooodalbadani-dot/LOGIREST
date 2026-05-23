# API Contracts & Internal Interfaces: Phase 2 Hardening

This document outlines the internal service contracts and any API endpoints related to document numbering and inventory reconciliation.

---

## 1. Document Sequence Generation Interface

### Internal Service Contract (`DocumentSequenceService`)

```typescript
export interface IDocumentSequenceService {
  /**
   * Generates a sequential document number matching the pattern:
   * {DOC_TYPE}-{YYYY}-{BRANCH_CODE}-{SEQUENCE_5_DIGITS}
   * e.g. PR-2026-HQ-00042
   *
   * This method runs in a transaction with database-level atomic increments.
   */
  generateSequenceNumber(
    tx: Prisma.TransactionClient,
    documentType: DocumentType,
    branchId: string,
  ): Promise<string>;
}
```

### Parameter Mapping

- `documentType`: One of the supported document types (`PURCHASE_REQUEST`, `PURCHASE_ORDER`, `GOODS_RECEIVED_NOTE`, `INVENTORY_ISSUE`, `TRANSFER`, `ADJUSTMENT`, `KITCHEN_REQUEST`, `STOCKTAKE`).
- `branchId`: The database UUID identifier of the associated branch.

---

## 2. Reconciliation Discrepancy & Locking Contract

The daily reconciliation job executes internally. If a discrepancy is found, it issues a database lock on the specific SKU.

### Mutating Operations Restriction Guard

All mutation endpoints (GRN Post, Issue Post, Adjustment Post, Transfer Ship/Receive) must perform the following validation:

```typescript
// For each item in the transaction:
const warehouseItem = await tx.warehouseItem.findUnique({
  where: {
    warehouseId_itemId: { warehouseId, itemId }
  }
});

if (warehouseItem?.isFrozen) {
  throw new BadRequestException(
    `SKU ${itemId} is currently frozen in warehouse ${warehouseId} due to inventory reconciliation drift. Please post a Stock Adjustment to resolve.`
  );
}
```

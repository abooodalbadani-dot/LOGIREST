# Research Notes: API Controllers (Phase 8)

**Feature**: API Controllers (Phase 8)  
**Date**: 2026-05-23

## Research & Decisions

### Decision 1: Warehouse Deletion and Archiving Policy

* **Decision**: Implement Option B - Support soft-deletion / archiving by utilizing the existing `isActive` boolean field on the `Warehouse` model.
* **Rationale**: In a strict zero-trust monorepo with an immutable ledger, hard-deleting a warehouse that has historical transactions would irreparably corrupt the referential integrity of `StockLedger`, `CostLedger`, and `AuditLog` records. To preserve this historical data for reporting, the warehouse cannot be physically deleted. Instead, it will be soft-deleted/archived by setting `isActive = false`.
* **Archiving Constraints**:
  1. A warehouse can only be archived (`isActive = false`) if its current stock balance is exactly zero. Archiving is blocked if there is non-zero stock.
  2. Archived warehouses must be excluded from active operational queries (e.g. dropdown lists for new documents, transfers, or inventory operations) but remain fully accessible for read-only reporting and audit logs.
* **Alternatives Considered**:
  - *Option A (Block deletion completely)*: Prevents archiving or deletion of any warehouse with transaction history. This was rejected because it does not allow operational housekeeping (e.g. archiving old or closed warehouses), causing clutter in the active UI dropdowns.
  - *Option C (Block only if current stock is non-zero, hard delete otherwise)*: Allows physically deleting a warehouse with historical transactions if its stock is zero. This was rejected because it violates the immutable ledger constraint by breaking historical ledger foreign keys.

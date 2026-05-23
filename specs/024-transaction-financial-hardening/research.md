# Technical Research & Decisions: Phase 2 Hardening

This document records the research, design patterns, and decisions made for the Phase 2 Transactional & Financial Hardening.

---

## 1. Weighted Average Cost (WAC) Arithmetic Precision

### Decision
Use Prisma Client's built-in `Prisma.Decimal` class for all calculations and rounding within the WacService and TransferPostService.

### Rationale
Prisma uses a subset of the `decimal.js` library under the hood for its Decimal properties. `Prisma.Decimal` supports exact decimal math operations (`add`, `sub`, `mul`, `div`, `toDecimalPlaces`) without converting values into JavaScript floating-point numbers. Rounding is enforced to 4 decimal places using `Prisma.Decimal.ROUND_HALF_UP` to match database schema precision.

### Alternatives Considered
- **Native Floating Point Numbers (`Number`)**: Rejected due to compounding precision errors during high-volume transactions, leading to asset value drift.
- **External `decimal.js` or `bignumber.js` package**: Rejected because `Prisma.Decimal` is already bundled and fully typed within the project's node modules.

---

## 2. Atomic Sequential Document Numbering

### Decision
Implement sequential generation via database-backed updates using Prisma's atomic increment feature (`currentSequence: { increment: 1 }`) on a dedicated `DocumentSequence` model, backed by a compound unique constraint on `[documentType, year, branchId]`.

### Rationale
By placing a database-level unique constraint on `[documentType, year, branchId]`, we guarantee that only one sequence counter can exist for any given document type, branch, and year. Performing an `update` with `increment: 1` utilizes row-level locking at the database level, ensuring sequence numbers are generated atomically and sequentially without gaps or collision risks under concurrent execution.

### Alternatives Considered
- **UUIDs/Random Numbers**: Rejected due to auditing compliance requirements requiring sequential, gap-free series.
- **Application-Level Mutex (e.g., async-lock)**: Rejected because it does not support multi-instance (horizontally scaled) API nodes.

---

## 3. SKU-level Lock (Drift Prevention)

### Decision
Add an `isFrozen` boolean field to the `WarehouseItem` model. Add validation checks inside mutation handlers (GRN post, stock adjustments, issues, transfers) to verify if `isFrozen` is active for any associated SKU, rejecting mutations if set.

### Rationale
Freezing only the affected item/SKU stops corrupt data states from propagating while allowing all other products in the warehouse to be picked, transferred, and received as usual, protecting the warehouse's operational throughput.

### Alternatives Considered
- **Locking the entire warehouse**: Rejected because blocking all operations across a warehouse due to a single SKU discrepancy causes severe business disruption.

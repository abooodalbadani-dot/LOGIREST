# Implementation Plan: Inventory Locking & Valuation (Phase 6)

**Branch**: `019-inventory-locking` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/019-inventory-locking/spec.md`

## Summary

This feature implements the core inventory locking engine, batch allocation service (FEFO/FIFO), and Weighted Average Cost (WAC) recalculation engine for the LogiRest monorepo. It guarantees data integrity, prevents concurrent stock race conditions/negative stock, and ensures accurate financial inventory valuations.

The implementation is broken down into three services in `apps/api/src/modules/ledger/`:
1. **Pessimistic Row Lock Engine (Phase 6.1)**: Obtains raw SQL `SELECT FOR UPDATE` database locks on `WarehouseItem` and `WarehouseItemLot` rows inside transactional contexts. Ensures deterministic ordering (by item ID, then lot ID) to eliminate deadlocks.
2. **FEFO/FIFO Allocation Service (Phase 6.2)**: Performs progressive batch allocation based on item configurations. Expired lots are excluded from allocation.
3. **WAC Calculator Service (Phase 6.3)**: Recalculates Weighted Average Cost on receipt (GRN) and logs cost mutations in the `CostLedger`.

---

## Technical Context

- **Language/Version**: TypeScript, Node.js v20+
- **Primary Dependencies**: NestJS v10+, Prisma ORM v5+, `@logirest/shared-types`
- **Storage**: PostgreSQL (Prisma Client)
- **Testing**: Jest (Unit & Integration tests)
- **Target Platform**: Docker-packaged NestJS Server (`apps/api`)
- **Project Type**: Backend services & database operations
- **Performance Goals**: 
  - Pessimistic lock acquisition overhead < 10ms
  - Allocation decisions processed in < 15ms
  - WAC recalculation executed in < 5ms
- **Constraints**: 
  - All stock mutations MUST lock rows in sorting order `ORDER BY itemId ASC, lotId ASC` to prevent deadlocks.
  - Zero-tolerance negative stock check must run post-lock within the transaction.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitutional Rule | Compliance Verification | Status |
| :--- | :--- | :--- |
| **Backend Authority** | Enforced entirely on the server side (`apps/api`) using raw PostgreSQL locking within Prisma transactions. | ✅ PASS |
| **Pessimistic Locking** | Enforces raw SQL `SELECT FOR UPDATE` on both global balances (`WarehouseItem`) and lot-specific balances (`WarehouseItemLot`). | ✅ PASS |
| **Waste Reduction** | Default allocation is set to FEFO for items with expiry dates, and expired lots are auto-excluded from allocation. | ✅ PASS |
| **No Negative Stock** | Validates post-lock quantities; rolls back the transaction and throws `422` if deduction exceeds available balance. | ✅ PASS |
| **Auditability** | Recalculated WAC updates are logged in the append-only `CostLedger` database table. | ✅ PASS |

---

## Project Structure

### Documentation (this feature)

```text
specs/019-inventory-locking/
├── plan.md              # This file
├── research.md          # Technical decisions and rationales
├── data-model.md        # Database schema models and invariant rules
├── quickstart.md        # Seed data configuration and local testing guide
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
apps/api/src/
└── modules/
    └── ledger/
        ├── ledger.module.ts             # Module compiling all ledger services
        ├── ledger-lock.service.ts       # Raw SQL SELECT FOR UPDATE locking service
        ├── allocation.service.ts        # FEFO/FIFO batch allocation service
        └── wac.service.ts               # Weighted Average Cost recalculation service
```

**Structure Decision**: The files are organized under the unified NestJS `ledger` module (`apps/api/src/modules/ledger/`), isolating database locking, lot allocations, and WAC recalculations into cohesive, modular services.

---

## Complexity Tracking

*No violations of the Constitution detected. The architecture strictly implements zero-trust PostgreSQL pessimistic locking constraints.*

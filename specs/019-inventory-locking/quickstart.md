# Quickstart: Inventory Locking & Valuation

**Feature Branch**: `019-inventory-locking` | **Date**: 2026-05-23

This quickstart guide outlines how to configure, seed, and verify the pessimistic locking, batch allocation, and WAC recalculation subsystems for Phase 6.

---

## 1. Local Environment Verification

Ensure you are inside the correct project directory and your environment variables are set up in `apps/api/.env`:

```bash
# Verify NestJS build works
npm run build --filter=api

# Verify Prisma schema is valid
npx prisma validate --schema=apps/api/prisma/schema.prisma
```

---

## 2. Seed Test Inventory Data

To validate FEFO, FIFO, and WAC behaviors, seed a development set of items with varied expiry dates and purchase prices.

1. Ensure the PostgreSQL container is running.
2. Run database migrations:
   ```bash
   npx prisma migrate dev --schema=apps/api/prisma/schema.prisma
   ```
3. Run the database seed script:
   ```bash
   npx prisma db seed --schema=apps/api/prisma/schema.prisma
   ```

The seeding process creates:
- Perishable items (e.g., milk, eggs) with active expiry batches.
- Batched non-perishables (e.g., olive oil) with varied receipt dates.
- Standard items (e.g., salt) without lot tracking.

---

## 3. Running Validation Tests

### Unit Tests
Validate the allocation algorithm logic and WAC calculation formula:

```bash
# Run Allocation & WAC Service unit tests
npm run test --filter=api -- src/modules/ledger/allocation.service.spec.ts
npm run test --filter=api -- src/modules/ledger/wac.service.spec.ts
```

### Concurrency Integration Tests
Simulate concurrent execution to verify raw SQL pessimistic locking and deadlock prevention:

```bash
# Run concurrency tests
npm run test:e2e --filter=api -- src/modules/ledger/ledger-lock.e2e-spec.ts
```

*Note: These tests spawn parallel threads simulating simultaneous issue postings for the same batch, verifying that one transaction succeeds while the other is queued sequentially and eventually fails without race condition bugs.*

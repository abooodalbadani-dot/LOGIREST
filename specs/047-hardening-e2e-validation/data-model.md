# Data Model Design & Masking: Hardening & E2E Validation (Sprint 4)

This document maps out the data masking, anonymization logic, and log schemas required to configure the staging environment for transaction load testing safely.

---

## 🎭 Staging Anonymization Masking Map

The staging database seeder (`apps/api/src/database/seed.anonymized.ts`) applies masking maps to sanitize production backups:

### 1. Cost & Valuations Masking (Item-Constant Jitter)
For every unique `Item` ID in the database:
1. Generate a single randomized `ItemFactor`:
   $$\text{ItemFactor} \sim \text{Uniform}(0.85, 1.15)$$
2. Multiply all cost and pricing fields across the schema for that `Item` by its `ItemFactor`. This includes:
   * `WarehouseItem.wac`
   * `GRNLine.unitPrice`
   * `POLine.unitPrice`
   * `TransferLine.unitCost`
   * `AdjustmentLine.unitCost`
   * `CostLedger.unitPrice` and `CostLedger.newWac`
   * `StocktakeSnapshot.wacSnapshot`

This ensures that relative value distributions are preserved perfectly, preventing division-by-zero errors in pro-rata landed cost calculations, while completely concealing real cost values.

### 2. PII Sanitization Mapping
All personal, supplier, and financial identity columns are replaced with static/mock values:

| Table | Original Column | Masking Rule | Staging Mock Example |
| :--- | :--- | :--- | :--- |
| **User** | `name` | Faker Name | `"John Doe"` |
| **User** | `email` | Faker Email | `"user_123@logirest-staging.com"` |
| **User** | `passwordHash` | Static Hash | `"$2b$10$StaticHashForStagingTestingOnly..."` |
| **Supplier** | `name` | Mock Supplier Name | `"Supplier Branch A"` |
| **Supplier** | `contactEmail` | Mock Email | `"supply_branch_a@suppliers.com"` |
| **Supplier** | `contactPhone` | Mock Phone | `"+966 50 000 0000"` |

---

## 🗃️ Preserved Schemas (No Masking)

To verify concurrent transactional locks under load accurately, the following tables and relationships are preserved **100% intact**:
* **Quantities**: All physical balances (`qtyOnHand`, `qtyAllocated`, `quantityShipped`, `quantityReceived`) are untouched.
* **Dates**: Transaction dates, expiration dates, and posted timestamps are preserved to verify FEFO (First-Expired, First-Out) operations.
* **Lot Structures**: Lot numbers, relations, and batch properties are kept intact to simulate realistic lot allocations.
* **Warehouse Relationships**: Physical branch, warehouse, and department boundaries are preserved.
* **Workflow States**: All document statuses (`DRAFT`, `POSTED`, `VOIDED`, `APPROVED`) are left as-is to preserve state transitions.

---

## 🪵 Staging Load Test Logs

The load test simulator logs metrics to `BackupLog` or a static JSON output file (`tests/results/load-test-run.json`) with this structure:

```json
{
  "runId": "ltr-20260601-224500",
  "timestamp": "2026-06-01T22:45:00.000Z",
  "concurrencyRPS": 50,
  "durationSeconds": 60,
  "metrics": {
    "totalRequests": 3000,
    "successfulRequests": 3000,
    "failedRequests": 0,
    "p50LatencyMS": 45,
    "p95LatencyMS": 120,
    "p99LatencyMS": 240,
    "deadlocksCount": 0
  },
  "status": "SUCCESS"
}
```

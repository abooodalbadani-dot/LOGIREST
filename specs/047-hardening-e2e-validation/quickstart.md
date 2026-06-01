# Quickstart Guide: Hardening & E2E Validation (Sprint 4)

Welcome to **Sprint 4: Hardening & E2E Validation**! This guide details how to seed anonymized data, execute transaction load tests, perform database rollback drills, and verify diagnostics route hardening.

---

## 🎭 1. Database Anonymized Seeding

To sanitize production data for staging load testing, execute the anonymization seeder:

```bash
# 1. Boot local Postgres instance and check connection
npx prisma db ping --schema=apps/api/prisma/schema.prisma

# 2. Run the anonymization seeder script
npx ts-node apps/api/src/database/seed.anonymized.ts
```

Verify that all costs are masked by a single random multiplier per item while supplier/customer PII names are faker-sanitized.

---

## 🚦 2. Staging Load Test Simulation

To simulate parallel transfers and issues at a peak rate of 50 transactions per second (RPS), run the load test suite:

```bash
# 1. Compile load testing dependencies
npm run build --filter=shared-types

# 2. Start Redis server for background workers (if queue verification is active)
redis-cli ping

# 3. Launch simulated load test suite
npx ts-node scripts/staging-load-test.ts --concurrency=50 --duration=60
```

*Criteria for Failure*:
* Any SQL transaction deadlock encountered.
* Request p95 latencies exceed 500ms under load.
* Verification balance drifts detected between the `StockLedger` and `WarehouseItem` tables.

---

## 🔄 3. Automated Database Rollback Drill

Execute the staging rollback scripts to verify disaster recovery restoration:

```bash
# 1. Trigger a simulated migration failure & recovery rollback run
bash scripts/database-rollback.sh --simulate-failure --backup-file=db-backup-staging-baseline.sql.gz
```

Verify that database re-reconciles perfectly in under 3 minutes with 0% data discrepancies.

---

## 🧪 4. Running Automated Playwright E2E Tests

Verify that the kitchen request void and CSRF validation handshakes function perfectly:

```bash
# 1. Install Playwright browser engines
npx playwright install chromium

# 2. Execute kitchen requests Playwright workflow tests
npm run test:e2e --filter=web -- e2e/kitchen-request.spec.ts

# 3. Execute CSRF guard handshake integration tests
npm run test --filter=api -- integration/csrf.spec.ts
```

Ensure all tests pass successfully.

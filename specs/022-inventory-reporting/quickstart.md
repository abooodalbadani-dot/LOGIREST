# Developer Quickstart: Inventory Query, Reporting, & Administrative Jobs

This document outlines instructions for setting up, running, and testing the Phase 9 features locally.

## 1. Setup & Environment Configurations

Ensure NestJS Dev Scheduler is configured in `apps/api/.env` if you want to test the background lock cleanup job:
```env
# Enable scheduled background tasks
ENABLE_BACKGROUND_JOBS=true
```

## 2. Seed Data Execution

To test queries and reporting KPIs, seed the database with mock lookups, item lots, active and stale locks:
```bash
# From workspace root
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

## 3. Running Background Cleanups Locally

Start the NestJS API application in watch mode:
```bash
npm run dev --filter=api
```
The background job in `LockCleanupJob` is executed periodically on module initialization and will check database active locks every minute.

## 4. Verification & Testing

### 4.1 Running Unit and Integration Tests

Run the test suite specifically targeting Phase 9 controllers and services:
```bash
# Run NestJS tests
npm run test --filter=api -- src/modules/inventory/
npm run test --filter=api -- src/modules/reports/
npm run test --filter=api -- src/jobs/lock-cleanup.job.spec.ts
```

### 4.2 Endpoint Verification via curl

**Scan Item Barcode**:
```bash
curl -H "Authorization: Bearer <jwt-token>" \
     -H "x-warehouse-id: <warehouse-uuid>" \
     -H "x-branch-id: <branch-uuid>" \
     "http://localhost:3000/api/v1/items/scan?barcode=9780201379624"
```

**Deactivate Expired/Stale Lock**:
```bash
curl -X POST \
     -H "Authorization: Bearer <jwt-token>" \
     -H "x-warehouse-id: <warehouse-uuid>" \
     -H "x-branch-id: <branch-uuid>" \
     "http://localhost:3000/api/v1/warehouse-locks/<lock-uuid>/unlock"
```

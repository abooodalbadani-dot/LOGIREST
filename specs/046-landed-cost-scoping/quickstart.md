# Quickstart Guide: Landed Cost & Scoping (Sprint 3)

Welcome to **Sprint 3: Landed Cost & Scoping**! This guide outlines how to bootstrap the environment, develop allocation calculations, verify scope validations, and test UI changes.

---

## 🛠️ 1. Environment Setup

Verify the Monorepo dependencies are fully installed and database migrations are synchronized:

```bash
# 1. Install dependencies
npm install

# 2. Reset database and run baseline seeders
npx prisma migrate reset --force --schema=apps/api/prisma/schema.prisma

# 3. Compile shared Zod schemas & types
npm run build --filter=shared-types
```

---

## 🚀 2. Developer Workflow & Run Commands

### Start API Backend and Web Client
```bash
# Start backend in development mode (with hot reloading)
npm run dev --filter=api

# Start client in development mode
npm run dev --filter=web
```

### Run BullMQ Background Workers
Landed Cost WAC calculations are offloaded to BullMQ background workers. Ensure a local Redis server is active:
```bash
# Check local redis status
redis-cli ping

# Start NestJS task runner queues
npm run start:prod --filter=api -- -m queue
```

---

## 🧪 3. Verification & Validation Manual

### A. Testing Landed Cost Calculations
To test pro-rata allocations, compile the Zod schema and run Jest tests:
```bash
# Run unit tests for landed cost allocation calculations
npm run test --filter=api -- modules/procurement/landed-cost/landed-cost.spec.ts
```

### B. Simulating Asynchronous Revaluation Hooks
Verify background queue job dispatching using the local playground CLI:
```bash
# Dispatch a simulation job to allocate 200 SAR to LCV-001
npx ts-node apps/api/src/modules/procurement/landed-cost/simulate-post.ts --voucher=LCV-001 --amount=200
```
Check that item WAC adjusts retrospectively in PostgreSQL:
```sql
SELECT warehouse_id, item_id, wac, qty_on_hand FROM warehouse_items WHERE item_id = 'target-item-uuid';
```

### C. Auditing Warehouse Scopes & Data Isolation
Perform a security curl query mapping custom headers to simulate user roles:
```bash
# 1. Scoped User Query (returns Warehouse A records only)
curl -H "x-warehouse-id: warehouse-a-uuid" http://localhost:3000/api/search/items

# 2. Global Role User Query (returns all warehouse records)
curl -H "Authorization: Bearer ADMIN_JWT" http://localhost:3000/api/search/items
```

### D. Changing System Currencies
1. Navigate to `/settings` in the UI and toggle base currency from `SAR` to `USD`.
2. Open the dashboard and verify that all inventory summary values display `$ [Value]` instead of `SAR [Value]`.

---

## 🛡️ 4. Code Quality & Pre-Commit Gates

Before opening a pull request, you **must** compile all components successfully:

```bash
# Typecheck Next.js client
npm run typecheck --filter=web

# Run linter across the whole codebase
npm run lint

# Build production monorepo bundles
npm run build
```

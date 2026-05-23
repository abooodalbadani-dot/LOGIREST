# Quickstart: Inventory Transactions (Phase 7)

This guide helps you test and verify the Phase 7 inventory transaction post logic.

## 1. Prerequisites
Ensure you have the backend dependencies and database migrations applied:
```bash
npm run bootstrap
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma
```

## 2. Running Unit & Integration Tests
Run tests targeting the transaction services and ledger components:
```bash
# Run all tests in NestJS backend
npm run test --filter=api

# Run only ledger/transaction service tests (when created)
npx jest apps/api/test/ledger
```

## 3. Manual Verification Steps
You can run manual verification against the transaction endpoints:
1. Login to get a JWT cookie:
   ```bash
   POST http://localhost:4000/api/v1/auth/login
   ```
2. Set headers:
   - `x-warehouse-id`: Authorized warehouse UUID
   - `x-branch-id`: Authorized branch UUID
3. Perform posting actions by sending POST requests to the respective endpoints.
4. Verify changes in PostgreSQL database:
   ```sql
   SELECT * FROM "StockLedger" ORDER BY "postedAt" DESC LIMIT 10;
   SELECT * FROM "WarehouseItem" WHERE "itemId" = 'your-item-uuid';
   ```

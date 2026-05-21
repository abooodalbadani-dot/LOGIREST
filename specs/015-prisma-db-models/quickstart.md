# Database Quickstart: Prisma Models & Migration Setup

This quickstart guide provides developers with the step-by-step instructions needed to configure the database, run migrations, validate the Prisma schema, and seed initial lookup data.

## Prerequisites
- A running PostgreSQL database instance (provisioned via InsForge or running locally).
- Connection string to the PostgreSQL database.

---

## 1. Configure the Environment
Ensure your environment variables are configured in the API module. Create or edit `apps/api/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/logirest_db?schema=public"
```

---

## 2. Validate the Schema
Before generating migrations, validate the `schema.prisma` syntax and relations:

```bash
npx prisma validate --schema=apps/api/prisma/schema.prisma
```

---

## 3. Generate and Apply Migrations
Create a migration based on schema changes and apply it to the database instance:

```bash
npx prisma migrate dev --name init_core_schema --schema=apps/api/prisma/schema.prisma
```

This command will:
1. Generate a SQL migration file in `apps/api/prisma/migrations/`.
2. Apply the migration to the configured database.
3. Automatically run `prisma generate` to update the Prisma Client build inside `apps/api/node_modules/`.

---

## 4. Run Lookup Data Seeding
Seed base data (Standard UoMs, default branch and warehouse, base currency SAR/USD, and default system roles):

```bash
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

Alternatively, if a package runner or specific seed command is mapped inside the API folder:

```bash
npm run seed --workspace=apps/api
```

---

## 5. Verify the Tables
You can verify the database state using Prisma Studio or directly querying tables:

```bash
npx prisma studio --schema=apps/api/prisma/schema.prisma
```

Expected tables in PostgreSQL:
- **T1 Models**: `User`, `UserWarehouseScope`, `Branch`, `Warehouse`, `Department`, `Category`, `UnitOfMeasure`, `Supplier`, `Currency`, `FXRate`, `Item`, `BarcodeMapping`
- **T2 Models**: `PurchaseRequest`, `PRLine`, `PurchaseOrder`, `POLine`, `GoodsReceivedNote`, `GRNLine`, `InventoryIssue`, `InventoryIssueLine`, `LotAllocation`, `Transfer`, `TransferLine`, `Adjustment`, `AdjustmentLine`, `KitchenRequest`, `KitchenRequestItem`, `ApprovalEvent`
- **T3/T4 Models**: `Lot`, `WarehouseItem`, `WarehouseItemLot`
- **T5 Models**: `StockLedger`, `CostLedger`
- **T6 Models**: `WarehouseLock`, `IdempotencyLog`, `AuditLog`, `StocktakeSession`, `StocktakeCount`, `StocktakeSnapshot`

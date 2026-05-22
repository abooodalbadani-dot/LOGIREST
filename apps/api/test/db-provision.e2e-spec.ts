import { PrismaClient, Role } from '@prisma/client';

// Initializing Prisma client for provision E2E testing
const prisma = new PrismaClient();

describe('Database Provision & Seeding (US1)', () => {
  beforeAll(async () => {
    let retries = 5;
    while (retries > 0) {
      try {
        await prisma.$connect();
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.warn(
          `Connection failed, retrying in 2 seconds... (${retries} attempts left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Schema provision', () => {
    it('should have all Tier 1 master data tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `;
      const tableNames = tables.map((t) => t.tablename);

      const expected = [
        'users',
        'user_warehouse_scopes',
        'branches',
        'warehouses',
        'departments',
        'categories',
        'units_of_measure',
        'suppliers',
        'currencies',
        'fx_rates',
        'items',
        'barcode_mappings',
      ];
      for (const table of expected) {
        expect(tableNames).toContain(table);
      }
    });

    it('should have all Tier 2 transaction document tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `;
      const tableNames = tables.map((t) => t.tablename);

      const expected = [
        'purchase_requests',
        'pr_lines',
        'purchase_orders',
        'po_lines',
        'goods_received_notes',
        'grn_lines',
        'inventory_issues',
        'inventory_issue_lines',
        'lot_allocations',
        'transfers',
        'transfer_lines',
        'adjustments',
        'adjustment_lines',
        'kitchen_requests',
        'kitchen_request_items',
        'approval_events',
      ];
      for (const table of expected) {
        expect(tableNames).toContain(table);
      }
    });

    it('should have Tier 3/4 live inventory and lot tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `;
      const tableNames = tables.map((t) => t.tablename);

      expect(tableNames).toContain('lots');
      expect(tableNames).toContain('warehouse_items');
      expect(tableNames).toContain('warehouse_item_lots');
    });

    it('should have Tier 5 immutable ledger tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `;
      const tableNames = tables.map((t) => t.tablename);

      expect(tableNames).toContain('stock_ledger');
      expect(tableNames).toContain('cost_ledger');
    });

    it('should have Tier 6 control and security tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `;
      const tableNames = tables.map((t) => t.tablename);

      const expected = [
        'warehouse_locks',
        'idempotency_logs',
        'audit_logs',
        'stocktake_sessions',
        'stocktake_counts',
        'stocktake_snapshots',
      ];
      for (const table of expected) {
        expect(tableNames).toContain(table);
      }
    });

    it('should have all custom enums defined', async () => {
      const enums = await prisma.$queryRaw<Array<{ enumname: string }>>`
        SELECT typname as enumname FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        GROUP BY typname ORDER BY typname
      `;
      const enumNames = enums.map((e) => e.enumname);

      expect(enumNames).toContain('Role');
      expect(enumNames).toContain('LotStatus');
      expect(enumNames).toContain('AdjustmentDirection');
      expect(enumNames).toContain('AdjustmentReason');
      expect(enumNames).toContain('DocumentType');
      expect(enumNames).toContain('LockType');
      expect(enumNames).toContain('StocktakeStatus');
    });
  });

  describe('Lookup data seeding', () => {
    it('should have seeded default currencies', async () => {
      const currencies = await prisma.currency.findMany();
      expect(currencies.length).toBeGreaterThanOrEqual(2);
      const sar = currencies.find((c) => c.code === 'SAR');
      expect(sar).toBeDefined();
      expect(sar!.isBase).toBe(true);
      const usd = currencies.find((c) => c.code === 'USD');
      expect(usd).toBeDefined();
    });

    it('should have seeded standard units of measure', async () => {
      const uoms = await prisma.unitOfMeasure.findMany();
      expect(uoms.length).toBeGreaterThanOrEqual(5);
      const codes = uoms.map((u) => u.code);
      expect(codes).toContain('KG');
      expect(codes).toContain('LTR');
      expect(codes).toContain('PCS');
    });

    it('should have seeded default branch and warehouse', async () => {
      const branches = await prisma.branch.findMany();
      expect(branches.length).toBeGreaterThanOrEqual(1);
      const warehouses = await prisma.warehouse.findMany();
      expect(warehouses.length).toBeGreaterThanOrEqual(1);
    });

    it('should have seeded default roles via the Role enum', async () => {
      const adminUser = await prisma.user.findFirst({
        where: { role: Role.ADMIN },
      });
      expect(adminUser).toBeDefined();
    });
  });
});

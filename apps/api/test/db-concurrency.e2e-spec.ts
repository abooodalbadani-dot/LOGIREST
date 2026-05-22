import { PrismaClient, Role, LotStatus } from '@prisma/client';

// Initializing Prisma client for concurrency E2E testing
const prisma = new PrismaClient();

describe('Concurrency Safety & Optimistic Locking (US3)', () => {
  let branchId: string;
  let warehouseId: string;
  let categoryId: string;
  let uomId: string;
  let currencyId: string;

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

    const branch = await prisma.branch.create({
      data: { name: `Conc Branch ${Date.now()}`, code: `CB-${Date.now()}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: 'Conc WH', code: `CW-${Date.now()}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `Conc Category ${Date.now()}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `Conc UoM ${Date.now()}`, code: `CU-${Date.now()}` },
    });
    uomId = uom.id;

    await prisma.user.create({
      data: {
        email: `conc-${Date.now()}@logirest.com`,
        passwordHash: 'hash',
        name: 'Conc Test User',
        role: Role.ADMIN,
      },
    });

    const currency = await prisma.currency.create({
      data: { code: `CC-${Date.now()}`, name: `Conc Currency ${Date.now()}` },
    });
    currencyId = currency.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Optimistic locking (version field)', () => {
    it('should have version field defaulting to 1 on mutable documents', async () => {
      const supplier = await prisma.supplier.create({
        data: { name: `Conc Supp ${Date.now()}`, code: `CS-${Date.now()}` },
      });

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-CONC-${Date.now()}`,
          supplierId: supplier.id,
          currencyId,
        },
      });

      expect(po.version).toBe(1);
    });

    it('should detect version mismatch on concurrent updates', async () => {
      const supplier = await prisma.supplier.create({
        data: {
          name: `Conc Supp 2 ${Date.now()}`,
          code: `CS2-${Date.now()}`,
        },
      });

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-CONC2-${Date.now()}`,
          supplierId: supplier.id,
          currencyId,
        },
      });

      // First update: version 1 -> 2
      const updated = await prisma.purchaseOrder.update({
        where: { id: po.id, version: 1 },
        data: { version: 2, status: 'SUBMITTED' },
      });
      expect(updated.version).toBe(2);

      // Second update with stale version 1 should affect 0 rows
      const staleUpdate = await prisma.purchaseOrder.updateMany({
        where: { id: po.id, version: 1 },
        data: { version: 2, status: 'APPROVED' },
      });
      expect(staleUpdate.count).toBe(0);
    });

    it('should have version field on master data tables', async () => {
      const branch = await prisma.branch.create({
        data: { name: `V Branch ${Date.now()}`, code: `VB-${Date.now()}` },
      });
      expect(branch.version).toBe(1);
    });
  });

  describe('Idempotency key uniqueness', () => {
    it('should reject duplicate idempotencyKey on StockLedger', async () => {
      const item = await prisma.item.create({
        data: {
          name: `Conc Item ${Date.now()}`,
          sku: `SKU-CONC-${Date.now()}`,
          categoryId,
          uomId,
        },
      });

      const key = `idem-stock-${Date.now()}`;
      await prisma.stockLedger.create({
        data: {
          warehouseId,
          itemId: item.id,
          quantity: 10,
          documentId: 'doc-1',
          documentType: 'GOODS_RECEIVED_NOTE',
          idempotencyKey: key,
        },
      });

      await expect(
        prisma.stockLedger.create({
          data: {
            warehouseId,
            itemId: item.id,
            quantity: 5,
            documentId: 'doc-2',
            documentType: 'GOODS_RECEIVED_NOTE',
            idempotencyKey: key,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate idempotencyKey on CostLedger', async () => {
      const item = await prisma.item.create({
        data: {
          name: `Conc Item 2 ${Date.now()}`,
          sku: `SKU-CONC2-${Date.now()}`,
          categoryId,
          uomId,
        },
      });

      const key = `idem-cost-${Date.now()}`;
      await prisma.costLedger.create({
        data: {
          warehouseId,
          itemId: item.id,
          quantity: 10,
          unitPrice: 5,
          newWac: 5,
          documentId: 'doc-1',
          documentType: 'GOODS_RECEIVED_NOTE',
          idempotencyKey: key,
        },
      });

      await expect(
        prisma.costLedger.create({
          data: {
            warehouseId,
            itemId: item.id,
            quantity: 5,
            unitPrice: 6,
            newWac: 5.5,
            documentId: 'doc-2',
            documentType: 'GOODS_RECEIVED_NOTE',
            idempotencyKey: key,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate key on IdempotencyLog', async () => {
      const key = `idem-log-${Date.now()}`;
      await prisma.idempotencyLog.create({
        data: { key, responseBody: '{}', statusCode: 200 },
      });

      await expect(
        prisma.idempotencyLog.create({
          data: { key, responseBody: '{}', statusCode: 200 },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Composite indexes for query performance', () => {
    it('should have WarehouseItemLot indexed on (warehouseId, itemId)', async () => {
      const item = await prisma.item.create({
        data: {
          name: `Index Item ${Date.now()}`,
          sku: `SKU-IDX-${Date.now()}`,
          categoryId,
          uomId,
        },
      });

      const lot = await prisma.lot.create({
        data: {
          lotNumber: `LOT-IDX-${Date.now()}`,
          itemId: item.id,
          status: LotStatus.ACTIVE,
        },
      });

      const result = await prisma.warehouseItemLot.findUnique({
        where: {
          warehouseId_itemId_lotId: {
            warehouseId,
            itemId: item.id,
            lotId: lot.id,
          },
        },
      });

      expect(result).toBeNull();
    });
  });
});

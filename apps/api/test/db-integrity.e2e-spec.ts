import { PrismaClient, Role, LotStatus } from '@prisma/client';

// Initializing Prisma client for integrity E2E testing
const prisma = new PrismaClient();

describe('Database Integrity Constraints (US2)', () => {
  let branchId: string;
  let warehouseId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;
  let userId: string;
  let supplierId: string;
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
      data: { name: `Test Branch ${Date.now()}`, code: `TB-${Date.now()}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: 'Test WH', code: `TW-${Date.now()}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `Test Category ${Date.now()}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `Test UoM ${Date.now()}`, code: `TU-${Date.now()}` },
    });
    uomId = uom.id;

    const item = await prisma.item.create({
      data: {
        name: 'Test Item',
        sku: `SKU-${Date.now()}`,
        categoryId,
        uomId,
      },
    });
    itemId = item.id;

    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@logirest.com`,
        passwordHash: 'hash',
        name: 'Test User',
        role: Role.ADMIN,
      },
    });
    userId = user.id;

    const supplier = await prisma.supplier.create({
      data: { name: `Test Supplier ${Date.now()}`, code: `TS-${Date.now()}` },
    });
    supplierId = supplier.id;

    const currency = await prisma.currency.create({
      data: { code: `TC-${Date.now()}`, name: `Test Currency ${Date.now()}` },
    });
    currencyId = currency.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Unique constraints', () => {
    it('should reject duplicate barcode for an item', async () => {
      const barcode = `BC-${Date.now()}`;
      await prisma.barcodeMapping.create({
        data: { barcode, itemId, version: 1 },
      });

      await expect(
        prisma.barcodeMapping.create({
          data: { barcode, itemId, version: 1 },
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate email for a user', async () => {
      const email = `dup-${Date.now()}@logirest.com`;
      await prisma.user.create({
        data: { email, passwordHash: 'hash', name: 'First', role: Role.ADMIN },
      });

      await expect(
        prisma.user.create({
          data: {
            email,
            passwordHash: 'hash',
            name: 'Second',
            role: Role.VIEWER,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Composite primary keys', () => {
    it('should enforce unique (warehouseId, itemId) on WarehouseItem', async () => {
      await prisma.warehouseItem.create({
        data: { warehouseId, itemId },
      });

      await expect(
        prisma.warehouseItem.create({
          data: { warehouseId, itemId },
        }),
      ).rejects.toThrow();
    });

    it('should enforce unique (warehouseId, itemId, lotId) on WarehouseItemLot', async () => {
      const lot = await prisma.lot.create({
        data: {
          lotNumber: `LOT-${Date.now()}`,
          itemId,
          status: LotStatus.ACTIVE,
        },
      });

      await prisma.warehouseItemLot.create({
        data: { warehouseId, itemId, lotId: lot.id },
      });

      await expect(
        prisma.warehouseItemLot.create({
          data: { warehouseId, itemId, lotId: lot.id },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Cascade delete behavior', () => {
    it('should cascade delete PRLine when PurchaseRequest is deleted', async () => {
      const pr = await prisma.purchaseRequest.create({
        data: {
          requestNumber: `PR-${Date.now()}`,
          branchId,
          warehouseId,
          createdById: userId,
          lines: {
            create: [{ itemId, quantity: 10 }],
          },
        },
      });

      const lines = await prisma.pRLine.findMany({
        where: { prId: pr.id },
      });
      expect(lines.length).toBe(1);

      await prisma.purchaseRequest.delete({ where: { id: pr.id } });

      const remaining = await prisma.pRLine.findMany({
        where: { prId: pr.id },
      });
      expect(remaining.length).toBe(0);
    });

    it('should cascade delete POLine when PurchaseOrder is deleted', async () => {
      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-${Date.now()}`,
          supplierId,
          currencyId,
          lines: {
            create: [{ itemId, quantity: 5, unitPrice: 10 }],
          },
        },
      });

      await prisma.purchaseOrder.delete({ where: { id: po.id } });

      const remaining = await prisma.pOLine.findMany({
        where: { poId: po.id },
      });
      expect(remaining.length).toBe(0);
    });
  });

  describe('Check constraints — non-negative quantities', () => {
    it('should reject negative qty_on_hand on WarehouseItem', async () => {
      const item = await prisma.item.create({
        data: { name: 'Item NH', sku: `SKU-NH-${Date.now()}`, categoryId, uomId },
      });
      await expect(
        prisma.warehouseItem.create({
          data: { warehouseId, itemId: item.id, qtyOnHand: -1 },
        }),
      ).rejects.toThrow();
    });

    it('should reject negative qty_allocated on WarehouseItem', async () => {
      const item = await prisma.item.create({
        data: { name: 'Item NA', sku: `SKU-NA-${Date.now()}`, categoryId, uomId },
      });
      await expect(
        prisma.warehouseItem.create({
          data: { warehouseId, itemId: item.id, qtyAllocated: -5 },
        }),
      ).rejects.toThrow();
    });

    it('should reject negative qty_on_hand on WarehouseItemLot', async () => {
      const item = await prisma.item.create({
        data: { name: 'Item Lot NQ', sku: `SKU-LNQ-${Date.now()}`, categoryId, uomId },
      });
      const lot = await prisma.lot.create({
        data: {
          lotNumber: `LOT-CHK-${Date.now()}`,
          itemId: item.id,
          status: LotStatus.ACTIVE,
        },
      });

      await expect(
        prisma.warehouseItemLot.create({
          data: { warehouseId, itemId: item.id, lotId: lot.id, qtyOnHand: -1 },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Check constraints — valid outbox status', () => {
    it('should reject invalid status on OutboxEvent', async () => {
      await expect(
        prisma.outboxEvent.create({
          data: {
            eventType: 'TEST',
            payload: {},
            status: 'INVALID_STATUS',
            expiresAt: new Date(),
          },
        }),
      ).rejects.toThrow();
    });

    it('should accept valid statuses on OutboxEvent', async () => {
      const event = await prisma.outboxEvent.create({
        data: {
          eventType: 'TEST',
          payload: {},
          status: 'PENDING',
          expiresAt: new Date(),
        },
      });
      expect(event.status).toBe('PENDING');
      await prisma.outboxEvent.delete({ where: { id: event.id } });
    });
  });

  describe('Delete restrictions on master data', () => {
    it('should restrict deleting a Branch that has Warehouses', async () => {
      await expect(
        prisma.branch.delete({ where: { id: branchId } }),
      ).rejects.toThrow();
    });

    it('should restrict deleting a Category that has Items', async () => {
      await expect(
        prisma.category.delete({ where: { id: categoryId } }),
      ).rejects.toThrow();
    });
  });
});

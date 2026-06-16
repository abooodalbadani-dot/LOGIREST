import { PrismaService } from '../src/database/prisma.service';
import { LedgerLockService } from '../src/modules/ledger/ledger-lock.service';

describe('LedgerLockService E2E Concurrency Safety', () => {
  let prisma: PrismaService;
  let lockService: LedgerLockService;

  let branchId: string;
  let warehouseId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    lockService = new LedgerLockService(prisma);

    // Setup seed data
    const branch = await prisma.branch.create({
      data: {
        name: `Lock E2E Branch ${Date.now()}`,
        code: `LEB-${Date.now()}`,
      },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: 'Lock E2E WH', code: `LEW-${Date.now()}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `Lock E2E Cat ${Date.now()}`, code: `LC-${Date.now()}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `Lock E2E UoM ${Date.now()}`, code: `LEU-${Date.now()}` },
    });
    uomId = uom.id;

    const item = await prisma.item.create({
      data: {
        name: `Lock E2E Item ${Date.now()}`,
        sku: `SKU-LE-${Date.now()}`,
        categoryId,
        uomId,
      },
    });
    itemId = item.id;

    // Create WarehouseItem balance row
    await prisma.warehouseItem.create({
      data: {
        warehouseId,
        itemId,
        qtyOnHand: 10,
        wac: 5.0,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('should block concurrent lock requests on the same WarehouseItem sequentially', async () => {
    const transactionAHistory: string[] = [];
    const transactionBHistory: string[] = [];

    // Transaction A starts, locks, sleeps for 300ms, then completes
    const txAPromise = prisma.$transaction(
      async (tx) => {
        transactionAHistory.push('A_START');
        await lockService.lockItem(tx, warehouseId, itemId);
        transactionAHistory.push('A_LOCKED');
        await new Promise((resolve) => setTimeout(resolve, 300));
        transactionAHistory.push('A_COMPLETE');
      },
      { maxWait: 10000, timeout: 10000 },
    );

    // Transaction B starts after 50ms delay, locks, and completes
    await new Promise((resolve) => setTimeout(resolve, 50));
    const txBPromise = prisma.$transaction(
      async (tx) => {
        transactionBHistory.push('B_START');
        await lockService.lockItem(tx, warehouseId, itemId);
        transactionBHistory.push('B_LOCKED');
        transactionBHistory.push('B_COMPLETE');
      },
      { maxWait: 10000, timeout: 10000 },
    );

    await Promise.all([txAPromise, txBPromise]);

    // Assert that B did not acquire lock until A was complete
    // Order should be: A_START -> A_LOCKED -> B_START -> A_COMPLETE -> B_LOCKED -> B_COMPLETE
    expect(transactionAHistory).toEqual(['A_START', 'A_LOCKED', 'A_COMPLETE']);
    expect(transactionBHistory).toEqual(['B_START', 'B_LOCKED', 'B_COMPLETE']);

    const aCompleteIndex = transactionAHistory.indexOf('A_COMPLETE');
    const bLockedIndex = transactionBHistory.indexOf('B_LOCKED');

    expect(transactionAHistory[aCompleteIndex]).toBe('A_COMPLETE');
    expect(transactionBHistory[bLockedIndex]).toBe('B_LOCKED');
  });
});

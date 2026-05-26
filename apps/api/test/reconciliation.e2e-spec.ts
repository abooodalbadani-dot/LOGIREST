import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ReconciliationJob } from '../src/modules/ledger/reconciliation.job';
import { Role } from '@prisma/client';

describe('Reconciliation Drift (e2e)', () => {
  jest.setTimeout(180000);
  let app: INestApplication;
  let prisma: PrismaService;
  let reconciliationJob: ReconciliationJob;

  let branchId: string;
  let warehouseId: string;
  let categoryId: string;
  let uomId: string;
  let itemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    reconciliationJob = app.get(ReconciliationJob);

    const suffix = `recon-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const branch = await prisma.branch.create({
      data: { name: `Branch ${suffix}`, code: `BR-${suffix}` },
    });
    branchId = branch.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: `Warehouse ${suffix}`, code: `WH-${suffix}`, branchId },
    });
    warehouseId = warehouse.id;

    const category = await prisma.category.create({
      data: { name: `Category ${suffix}` },
    });
    categoryId = category.id;

    const uom = await prisma.unitOfMeasure.create({
      data: { name: `UOM ${suffix}`, code: `UOM-${suffix}` },
    });
    uomId = uom.id;

    const item = await prisma.item.create({
      data: { name: `Item ${suffix}`, sku: `SKU-${suffix}`, categoryId, uomId },
    });
    itemId = item.id;
  }, 180000);

  afterAll(async () => {
    if (prisma) {
      await prisma.notificationLog.deleteMany({ where: { warehouseId } });
      await prisma.stockLedger.deleteMany({ where: { itemId } });
      await prisma.warehouseItem.deleteMany({ where: { itemId } });
      await prisma.item.deleteMany({ where: { categoryId } });
      await prisma.unitOfMeasure.delete({ where: { id: uomId } });
      await prisma.category.delete({ where: { id: categoryId } });
      await prisma.warehouse.delete({ where: { id: warehouseId } });
      await prisma.branch.delete({ where: { id: branchId } });
      await prisma.reconciliationRun.deleteMany({
        where: {
          frozenItems: {
            hasSome: [`SKU-${itemId}`], // won't exactly match but clean up runs
          },
        },
      });
      await prisma.$disconnect();
    }
    await app.close();
  }, 180000);

  it('should detect stock drift, freeze the item, log discrepancies, and notify admin', async () => {
    // 1. Initialize WarehouseItem with qtyOnHand = 10, WAC = 5
    await prisma.warehouseItem.create({
      data: {
        warehouseId,
        itemId,
        qtyOnHand: 10,
        qtyAllocated: 0,
        wac: 5,
        isFrozen: false,
      },
    });

    // 2. Insert matching StockLedger entry of 10
    await prisma.stockLedger.create({
      data: {
        warehouseId,
        itemId,
        quantity: 10,
        documentId: 'INITIAL',
        documentType: 'GOODS_RECEIVED_NOTE',
      },
    });

    // 3. Run reconciliation. Expect no discrepancies.
    let beforeRuns = await prisma.reconciliationRun.findMany();
    await reconciliationJob.runReconciliation();
    let afterRuns = await prisma.reconciliationRun.findMany();

    expect(afterRuns.length - beforeRuns.length).toBe(1);
    const run1 = afterRuns.reduce(
      (prev, curr) => (curr.ranAt > prev.ranAt ? curr : prev),
      afterRuns[0],
    );
    expect(run1.discrepanciesFound).toBe(0);

    let whItem = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      include: { item: true },
    });
    expect(whItem?.isFrozen).toBe(false);

    // 4. Manually edit database to introduce drift (set qtyOnHand to 15, while ledger sums to 10)
    await prisma.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { qtyOnHand: 15 },
    });

    // 5. Run reconciliation. Expect discrepancy detected, item frozen, and admin notification created.
    beforeRuns = await prisma.reconciliationRun.findMany();
    await reconciliationJob.runReconciliation();
    afterRuns = await prisma.reconciliationRun.findMany();

    expect(afterRuns.length - beforeRuns.length).toBe(1);
    const run2 = afterRuns.reduce(
      (prev, curr) => (curr.ranAt > prev.ranAt ? curr : prev),
      afterRuns[0],
    );
    expect(run2.discrepanciesFound).toBe(1);
    expect(run2.frozenItems).toContain(whItem?.item?.sku || `SKU-${itemId}`);

    // Verify item is frozen
    whItem = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      include: { item: true },
    });
    expect(whItem?.isFrozen).toBe(true);

    // Verify notification is created for ADMIN
    const notifications = await prisma.notificationLog.findMany({
      where: {
        warehouseId,
        targetRole: Role.ADMIN,
      },
    });
    expect(notifications.length).toBeGreaterThan(0);
    const matchedNotification = notifications.find((n) =>
      n.message.includes(
        `CRITICAL: Stock reconciliation discrepancy for SKU ${whItem?.item.sku}`,
      ),
    );
    expect(matchedNotification).toBeDefined();
  });
});

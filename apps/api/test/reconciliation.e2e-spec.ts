import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ReconciliationJob } from '../src/modules/ledger/reconciliation.job';
import { Role, Prisma } from '@prisma/client';

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
  let suffix: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    reconciliationJob = app.get(ReconciliationJob);

    suffix = `recon-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
      try {
        await prisma.notificationLog.deleteMany({ where: { warehouseId } });
      } catch (err: unknown) {
        console.warn('Failed to delete notificationLog:', err instanceof Error ? err.message : String(err));
      }

      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE stock_ledger DISABLE TRIGGER stock_ledger_immutable;`,
        );
        await prisma.stockLedger.deleteMany({ where: { itemId } });
      } catch (err: unknown) {
        console.warn(
          'Could not disable trigger or delete stockLedger:',
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE stock_ledger ENABLE TRIGGER stock_ledger_immutable;`,
          );
        } catch (err: unknown) {
          console.warn(
            'Failed to re-enable stock_ledger trigger:',
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      try {
        await prisma.warehouseItem.deleteMany({ where: { itemId } });
      } catch (err: unknown) {
        console.warn('Failed to delete warehouseItem:', err instanceof Error ? err.message : String(err));
      }
      try {
        await prisma.item.deleteMany({ where: { categoryId } });
      } catch (err: unknown) {
        console.warn('Failed to delete item:', err instanceof Error ? err.message : String(err));
      }
      try {
        await prisma.unitOfMeasure.delete({ where: { id: uomId } });
      } catch (err: unknown) {
        console.warn('Failed to delete unitOfMeasure:', err instanceof Error ? err.message : String(err));
      }
      try {
        await prisma.category.delete({ where: { id: categoryId } });
      } catch (err: unknown) {
        console.warn('Failed to delete category:', err instanceof Error ? err.message : String(err));
      }
      try {
        await prisma.warehouse.delete({ where: { id: warehouseId } });
      } catch (err: unknown) {
        console.warn('Failed to delete warehouse:', err instanceof Error ? err.message : String(err));
      }
      try {
        await prisma.branch.delete({ where: { id: branchId } });
      } catch (err: unknown) {
        console.warn('Failed to delete branch:', err instanceof Error ? err.message : String(err));
      }
      try {
        await prisma.reconciliationRun.deleteMany({
          where: {
            frozenItems: {
              hasSome: [`SKU-${itemId}`], // won't exactly match but clean up runs
            },
          },
        });
      } catch (err: unknown) {
        console.warn('Failed to delete reconciliationRun:', err instanceof Error ? err.message : String(err));
      }
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
        idempotencyKey: `INITIAL-TEST-KEY-${suffix}`,
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

    let whItem = await prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      include: { item: true },
    });
    expect(run1.frozenItems).not.toContain(
      whItem?.item?.sku || `SKU-${itemId}`,
    );
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

  it('should ignore concurrent writes during reconciliation run thanks to REPEATABLE READ isolation', async () => {
    // Create a new item for this test to avoid conflicts
    const testItemId = `${itemId}-iso`;
    const testSku = `SKU-${itemId}-iso`;

    await prisma.item.create({
      data: {
        id: testItemId,
        name: `Item Iso ${suffix}`,
        sku: testSku,
        categoryId,
        uomId,
      },
    });

    // 1. Initialize WarehouseItem with qtyOnHand = 10
    await prisma.warehouseItem.create({
      data: {
        warehouseId,
        itemId: testItemId,
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
        itemId: testItemId,
        quantity: 10,
        documentId: 'INITIAL-ISO',
        documentType: 'GOODS_RECEIVED_NOTE',
        idempotencyKey: `INITIAL-ISO-KEY-${suffix}`,
      },
    });

    // 3. Wrap prisma.$transaction to intercept lotAllocation.findMany on the dynamic tx client
    const originalTransaction = prisma.$transaction.bind(prisma);
    let concurrentWriteDone = false;

    const transactionSpy = jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async function (
        this: unknown,
        arg1: unknown,
        arg2: unknown,
      ) {
        const transFn = originalTransaction as (
          arg1: unknown,
          arg2?: unknown,
        ) => Promise<unknown>;

        if (typeof arg1 === 'function') {
          const originalCallback = arg1 as (tx: Prisma.TransactionClient) => Promise<unknown>;
          const wrappedCallback = async (tx: Prisma.TransactionClient) => {
            const txObj = tx as unknown as Record<
              string,
              Record<string, (...args: unknown[]) => Promise<unknown>>
            >;
            const originalFindMany = txObj.lotAllocation.findMany;
            txObj.lotAllocation.findMany = async function (
              this: unknown,
              ...args: unknown[]
            ) {
              const res = await originalFindMany.apply(this, args);

              if (!concurrentWriteDone) {
                concurrentWriteDone = true;

                // Perform concurrent write (increment qtyOnHand to 15, and insert a new StockLedger entry of 5)
                // These run on the main prisma client, committing in a separate transaction session.
                await prisma.stockLedger.create({
                  data: {
                    warehouseId,
                    itemId: testItemId,
                    quantity: 5,
                    documentId: 'CONCURRENT-POST',
                    documentType: 'GOODS_RECEIVED_NOTE',
                    idempotencyKey: `CONCURRENT-ISO-KEY-${suffix}`,
                  },
                });

                await prisma.warehouseItem.update({
                  where: {
                    warehouseId_itemId: { warehouseId, itemId: testItemId },
                  },
                  data: { qtyOnHand: 15 },
                });
              }

              return res;
            };
            return originalCallback(tx);
          };
          return transFn(wrappedCallback, arg2);
        }
        return transFn(arg1, arg2);
      });

    try {
      // 4. Run reconciliation
      await reconciliationJob.runReconciliation();

      // 5. Verify the item was NOT frozen (meaning snapshot read matched 10 = 10, and ignored the concurrent 15)
      const whItem = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: testItemId } },
      });

      expect(whItem?.isFrozen).toBe(false);
      expect(Number(whItem?.qtyOnHand)).toBe(15); // The concurrent write succeeded in the DB
    } finally {
      transactionSpy.mockRestore();
      // Clean up the new item
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE stock_ledger DISABLE TRIGGER stock_ledger_immutable;`,
        );
        await prisma.stockLedger.deleteMany({ where: { itemId: testItemId } });
      } catch (err: unknown) {
        console.warn(
          'Failed to clean up stockLedger for iso test:',
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE stock_ledger ENABLE TRIGGER stock_ledger_immutable;`,
          );
        } catch (err: unknown) {
          // ignore
        }
      }
      try {
        await prisma.warehouseItem.deleteMany({
          where: { itemId: testItemId },
        });
      } catch (err: unknown) {
        // ignore
      }
      try {
        await prisma.item.delete({ where: { id: testItemId } });
      } catch (err: unknown) {
        // ignore
      }
    }
  });

  it('should reconcile lot totals per item (warehouseId, itemId, lotId) and avoid merging different items with the same lotId', async () => {
    const itemAId = `${itemId}-lota`;
    const itemASku = `SKU-${itemId}-lota`;
    const itemBId = `${itemId}-lotb`;
    const itemBSku = `SKU-${itemId}-lotb`;

    // Create Item A and Item B
    await prisma.item.create({
      data: {
        id: itemAId,
        name: `Item A ${suffix}`,
        sku: itemASku,
        categoryId,
        uomId,
      },
    });
    await prisma.item.create({
      data: {
        id: itemBId,
        name: `Item B ${suffix}`,
        sku: itemBSku,
        categoryId,
        uomId,
      },
    });

    // Create a shared Lot record
    const sharedLotId = `lot-${suffix}`;
    await prisma.lot.create({
      data: {
        id: sharedLotId,
        itemId: itemAId,
        lotNumber: `LOT-NUM-${suffix}`,
        status: 'ACTIVE',
      },
    });

    // Create WarehouseItem parent records
    await prisma.warehouseItem.create({
      data: {
        warehouseId,
        itemId: itemAId,
        qtyOnHand: 10,
        qtyAllocated: 0,
        wac: 5,
        isFrozen: false,
      },
    });
    await prisma.warehouseItem.create({
      data: {
        warehouseId,
        itemId: itemBId,
        qtyOnHand: 20,
        qtyAllocated: 0,
        wac: 10,
        isFrozen: false,
      },
    });

    // Create WarehouseItemLot records pointing to the same lotId
    await prisma.warehouseItemLot.create({
      data: {
        warehouseId,
        itemId: itemAId,
        lotId: sharedLotId,
        qtyOnHand: 10,
      },
    });
    await prisma.warehouseItemLot.create({
      data: {
        warehouseId,
        itemId: itemBId,
        lotId: sharedLotId,
        qtyOnHand: 20,
      },
    });

    // Create matching StockLedger entries for both items with the same lotId
    await prisma.stockLedger.create({
      data: {
        warehouseId,
        itemId: itemAId,
        lotId: sharedLotId,
        quantity: 10,
        documentId: 'INITIAL-A',
        documentType: 'GOODS_RECEIVED_NOTE',
        idempotencyKey: `INITIAL-A-KEY-${suffix}`,
      },
    });
    await prisma.stockLedger.create({
      data: {
        warehouseId,
        itemId: itemBId,
        lotId: sharedLotId,
        quantity: 20,
        documentId: 'INITIAL-B',
        documentType: 'GOODS_RECEIVED_NOTE',
        idempotencyKey: `INITIAL-B-KEY-${suffix}`,
      },
    });

    try {
      // Run reconciliation
      const beforeRuns = await prisma.reconciliationRun.findMany();
      await reconciliationJob.runReconciliation();
      const afterRuns = await prisma.reconciliationRun.findMany();

      expect(afterRuns.length - beforeRuns.length).toBe(1);
      const run = afterRuns.reduce(
        (prev, curr) => (curr.ranAt > prev.ranAt ? curr : prev),
        afterRuns[0],
      );

      // Verify that neither Item A nor Item B is marked as frozen or drift detected
      const whItemA = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: itemAId } },
      });
      const whItemB = await prisma.warehouseItem.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: itemBId } },
      });

      expect(whItemA?.isFrozen).toBe(false);
      expect(whItemB?.isFrozen).toBe(false);

      // Verify no lot discrepancies were found for our specific lot and items
      expect(run.frozenItems).not.toContain(itemASku);
      expect(run.frozenItems).not.toContain(itemBSku);
    } finally {
      // Clean up
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE stock_ledger DISABLE TRIGGER stock_ledger_immutable;`,
        );
        await prisma.stockLedger.deleteMany({
          where: { itemId: { in: [itemAId, itemBId] } },
        });
      } catch (err: unknown) {
        console.warn(
          'Failed to clean up stockLedger for lot test:',
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE stock_ledger ENABLE TRIGGER stock_ledger_immutable;`,
          );
        } catch (err: unknown) {
          // ignore
        }
      }

      try {
        await prisma.warehouseItemLot.deleteMany({
          where: { itemId: { in: [itemAId, itemBId] } },
        });
      } catch (err: unknown) {
        // ignore
      }
      try {
        await prisma.warehouseItem.deleteMany({
          where: { itemId: { in: [itemAId, itemBId] } },
        });
      } catch (err: unknown) {
        // ignore
      }
      try {
        await prisma.lot.delete({ where: { id: sharedLotId } });
      } catch (err) {
        // ignore
      }
      try {
        await prisma.item.deleteMany({
          where: { id: { in: [itemAId, itemBId] } },
        });
      } catch (err) {
        // ignore
      }
    }
  });
});

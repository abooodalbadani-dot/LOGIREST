/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationJob } from './reconciliation.job';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { Prisma, Role } from '@prisma/client';

describe('ReconciliationJob', () => {
  let job: ReconciliationJob;

  const mockStockLedgerGroupBy = jest.fn();
  const mockWarehouseItemFindMany = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockCreateNotification = jest.fn();

  const mockPrismaTx = {
    warehouseItem: {
      update: mockWarehouseItemUpdate,
    },
  } as unknown as Prisma.TransactionClient;

  const mockPrisma = {
    stockLedger: {
      groupBy: mockStockLedgerGroupBy,
    },
    warehouseItem: {
      findMany: mockWarehouseItemFindMany,
    },
    $transaction: jest
      .fn()
      .mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          cb(mockPrismaTx),
      ),
  } as unknown as PrismaService;

  const mockNotificationService = {
    createNotification: mockCreateNotification,
  } as unknown as NotificationService;

  beforeEach(async () => {
    // Avoid running scheduleNextRun immediately on test initialization
    jest
      .spyOn(ReconciliationJob.prototype, 'scheduleNextRun')
      .mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationJob,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    job = module.get<ReconciliationJob>(ReconciliationJob);
    jest.clearAllMocks();
  });

  it('should run reconciliation and do nothing if no discrepancy is found', async () => {
    // Mock ledger grouped totals: Item 1 has total of 15 quantity
    mockStockLedgerGroupBy.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        _sum: {
          quantity: new Prisma.Decimal(15),
        },
      },
    ]);

    // Mock warehouse items: Item 1 has 15 on hand
    mockWarehouseItemFindMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        qtyOnHand: new Prisma.Decimal(15),
        item: { sku: 'SKU1' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    await job.runReconciliation();

    expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('should freeze SKU and log notification if discrepancy is detected', async () => {
    // Mock ledger: Item 1 has total of 10 quantity
    mockStockLedgerGroupBy.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        _sum: {
          quantity: new Prisma.Decimal(10),
        },
      },
    ]);

    // Mock warehouse items: Item 1 has 15 on hand (discrepancy!)
    mockWarehouseItemFindMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        qtyOnHand: new Prisma.Decimal(15),
        item: { sku: 'SKU1' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    await job.runReconciliation();

    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId: 'wh-1',
          itemId: 'item-1',
        },
      },
      data: {
        isFrozen: true,
      },
    });

    expect(mockCreateNotification).toHaveBeenCalledWith({
      targetRole: Role.ADMIN,
      warehouseId: 'wh-1',
      message: expect.stringContaining(
        'CRITICAL: Stock reconciliation discrepancy for SKU SKU1 in Warehouse HQ',
      ),
    });
  });
});

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
  const mockLotAllocationFindMany = jest.fn();
  const mockReconciliationRunCreate = jest.fn();
  const mockWarehouseItemLotFindMany = jest.fn();

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
    lotAllocation: {
      findMany: mockLotAllocationFindMany,
    },
    reconciliationRun: {
      create: mockReconciliationRunCreate,
    },
    warehouseItemLot: {
      findMany: mockWarehouseItemLotFindMany,
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationJob,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    job = module.get<ReconciliationJob>(ReconciliationJob);
    jest.clearAllMocks();
    mockWarehouseItemLotFindMany.mockResolvedValue([]);
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
        qtyAllocated: new Prisma.Decimal(0),
        item: { sku: 'SKU1' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    // Mock in-transit allocations: none
    mockLotAllocationFindMany.mockResolvedValue([]);

    await job.runReconciliation();

    expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();

    expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
      data: {
        itemsChecked: 1,
        discrepanciesFound: 0,
        lotDiscrepanciesFound: 0,
        frozenItems: [],
        durationMs: expect.any(Number),
      },
    });
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
        qtyAllocated: new Prisma.Decimal(0),
        item: { sku: 'SKU1' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    // Mock in-transit allocations: none
    mockLotAllocationFindMany.mockResolvedValue([]);

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

    expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
      data: {
        itemsChecked: 1,
        discrepanciesFound: 1,
        lotDiscrepanciesFound: 0,
        frozenItems: ['SKU1'],
        durationMs: expect.any(Number),
      },
    });
  });

  it('should trigger soft warning notification if allocation discrepancy is detected', async () => {
    // Mock ledger: Item 1 has total of 15 quantity
    mockStockLedgerGroupBy.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        _sum: {
          quantity: new Prisma.Decimal(15),
        },
      },
    ]);

    // Mock warehouse items: Item 1 has 15 on hand, but qtyAllocated is 5 (discrepancy!)
    mockWarehouseItemFindMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        qtyOnHand: new Prisma.Decimal(15),
        qtyAllocated: new Prisma.Decimal(5),
        item: { sku: 'SKU1' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    // Mock in-transit allocations: none (expected qtyAllocated is 0)
    mockLotAllocationFindMany.mockResolvedValue([]);

    await job.runReconciliation();

    // Should NOT freeze (update isFrozen)
    expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();

    // Should create soft warning notification
    expect(mockCreateNotification).toHaveBeenCalledWith({
      targetRole: Role.ADMIN,
      warehouseId: 'wh-1',
      message: expect.stringContaining(
        'WARNING: Stock allocation discrepancy for SKU SKU1 in Warehouse HQ',
      ),
    });

    expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
      data: {
        itemsChecked: 1,
        discrepanciesFound: 0,
        lotDiscrepanciesFound: 0,
        frozenItems: [],
        durationMs: expect.any(Number),
      },
    });
  });

  it('should not trigger warning if allocation matches active allocations', async () => {
    // Mock ledger: Item 1 has total of 15 quantity
    mockStockLedgerGroupBy.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        _sum: {
          quantity: new Prisma.Decimal(15),
        },
      },
    ]);

    // Mock warehouse items: Item 1 has 15 on hand, qtyAllocated is 5
    mockWarehouseItemFindMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        qtyOnHand: new Prisma.Decimal(15),
        qtyAllocated: new Prisma.Decimal(5),
        item: { sku: 'SKU1' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    // Mock in-transit allocations: total of 5 for wh-1 and item-1
    mockLotAllocationFindMany.mockResolvedValue([
      {
        quantityAllocated: new Prisma.Decimal(5),
        transferLine: {
          itemId: 'item-1',
          transfer: {
            toWarehouseId: 'wh-1',
          },
        },
      },
    ]);

    await job.runReconciliation();

    // No freeze, no warnings
    expect(mockWarehouseItemUpdate).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();

    expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
      data: {
        itemsChecked: 1,
        discrepanciesFound: 0,
        lotDiscrepanciesFound: 0,
        frozenItems: [],
        durationMs: expect.any(Number),
      },
    });
  });
});

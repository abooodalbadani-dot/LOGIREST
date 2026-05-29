/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationJob } from './reconciliation.job';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { Prisma, Role } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';
import { RedisLockService } from '../../redis/redis-lock.service';

describe('ReconciliationJob', () => {
  let job: ReconciliationJob;

  const mockQueryRaw = jest.fn();
  const mockWarehouseItemFindMany = jest.fn();
  const mockWarehouseItemUpdateMany = jest.fn();
  const mockCreateNotification = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockReconciliationRunCreate = jest.fn();
  const mockWarehouseItemLotFindMany = jest.fn();
  const mockGrnFindMany = jest.fn().mockResolvedValue([]);
  const mockCostLedgerCount = jest.fn().mockResolvedValue(0);
  const mockStockLedgerCount = jest.fn().mockResolvedValue(0);

  const mockMetricsService = {
    reconciliationDiscrepanciesCounter: {
      inc: jest.fn(),
    },
    reconciliationDurationHistogram: {
      observe: jest.fn(),
    },
  };

  const mockRedisLockService = {
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaTx = {
    warehouseItem: {
      updateMany: mockWarehouseItemUpdateMany,
    },
  } as unknown as Prisma.TransactionClient;

  const mockPrisma = {
    $queryRaw: mockQueryRaw,
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
    goodsReceivedNote: {
      findMany: mockGrnFindMany,
    },
    costLedger: {
      count: mockCostLedgerCount,
    },
    stockLedger: {
      count: mockStockLedgerCount,
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
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: RedisLockService, useValue: mockRedisLockService },
      ],
    }).compile();

    job = module.get<ReconciliationJob>(ReconciliationJob);
    jest.clearAllMocks();
    mockWarehouseItemLotFindMany.mockResolvedValue([]);
    mockGrnFindMany.mockResolvedValue([]);
  });

  it('should run reconciliation and do nothing if no discrepancy is found', async () => {
    // Mock ledger: Item 1 has total of 15 quantity
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          total: '15',
        },
      ])
      .mockResolvedValueOnce([]) // lotLedgerTotals
      .mockResolvedValueOnce([]); // orphanedLots

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

    expect(mockWarehouseItemUpdateMany).not.toHaveBeenCalled();
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
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          total: '10',
        },
      ])
      .mockResolvedValueOnce([]) // lotLedgerTotals
      .mockResolvedValueOnce([]); // orphanedLots

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

    expect(mockWarehouseItemUpdateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            warehouseId: 'wh-1',
            itemId: 'item-1',
          },
        ],
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
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          total: '15',
        },
      ])
      .mockResolvedValueOnce([]) // lotLedgerTotals
      .mockResolvedValueOnce([]); // orphanedLots

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
    expect(mockWarehouseItemUpdateMany).not.toHaveBeenCalled();

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
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          total: '15',
        },
      ])
      .mockResolvedValueOnce([]) // lotLedgerTotals
      .mockResolvedValueOnce([]); // orphanedLots

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
    expect(mockWarehouseItemUpdateMany).not.toHaveBeenCalled();
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

  it('should detect lot-level discrepancy and notify admin', async () => {
    // Mock ledger: Item 1 has total of 15 quantity, Lot has total of 10 quantity
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          total: '15',
        },
      ])
      .mockResolvedValueOnce([
        {
          warehouseId: 'wh-1',
          lotId: 'lot-1',
          total: '10',
        },
      ]) // lotLedgerTotals
      .mockResolvedValueOnce([]); // orphanedLots

    // Mock warehouse items: matches
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

    // Mock warehouse item lot: qtyOnHand is 15 but ledger sums to 10 (discrepancy!)
    mockWarehouseItemLotFindMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        lotId: 'lot-1',
        qtyOnHand: new Prisma.Decimal(15),
        item: { sku: 'SKU1' },
        lot: { lotNumber: 'LOT-A', status: 'ACTIVE' },
        warehouse: { name: 'HQ', code: 'HQ-01' },
      },
    ]);

    await job.runReconciliation();

    // Verify notification is sent for lot drift
    expect(mockCreateNotification).toHaveBeenCalledWith({
      targetRole: Role.ADMIN,
      warehouseId: 'wh-1',
      message: expect.stringContaining(
        'Lot drift detected: Lot LOT-A (SKU: SKU1) in Warehouse HQ (HQ-01) has qty_on_hand 15 but stock_ledger sums to 10.',
      ),
    });

    // Verify run logged 1 lot discrepancy
    expect(mockReconciliationRunCreate).toHaveBeenCalledWith({
      data: {
        itemsChecked: 1,
        discrepanciesFound: 0,
        lotDiscrepanciesFound: 1,
        frozenItems: [],
        durationMs: expect.any(Number),
      },
    });

    // Verify counter incremented
    expect(mockMetricsService.reconciliationDiscrepanciesCounter.inc).toHaveBeenCalledWith(1);
  });
});

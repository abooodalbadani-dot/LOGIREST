/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { StocktakePostService } from './stocktake-post.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType, StocktakeStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';

describe('StocktakePostService', () => {
  let service: StocktakePostService;

  const mockMetricsService = {
    postingOperationsCounter: {
      inc: jest.fn(),
    },
  };

  const mockSessionFindUnique = jest.fn();
  const mockSessionUpdate = jest.fn();
  const mockSnapshotFindMany = jest.fn();
  const mockCountFindMany = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpsert = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockWarehouseLockUpdateMany = jest.fn();
  const mockWarehouseUpdate = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    stocktakeSession: {
      findUnique: mockSessionFindUnique,
      update: mockSessionUpdate,
    },
    stocktakeSnapshot: {
      findMany: mockSnapshotFindMany,
    },
    stocktakeCount: {
      findMany: mockCountFindMany,
    },
    warehouseItemLot: {
      upsert: mockWarehouseItemLotUpsert,
      update: mockWarehouseItemLotUpdate,
    },
    warehouseItem: {
      upsert: mockWarehouseItemUpsert,
      update: mockWarehouseItemUpdate,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
    },
    warehouseLock: {
      updateMany: mockWarehouseLockUpdateMany,
    },
    warehouse: {
      update: mockWarehouseUpdate,
    },
    approvalEvent: {
      count: mockApprovalEventCount,
      create: mockApprovalEventCreate,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
  } as unknown as Prisma.TransactionClient;

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          cb(mockPrismaTx),
      ),
  } as unknown as PrismaService;

  const mockLockService = {
    lockLots: jest.fn(),
    lockItem: jest.fn(),
  } as unknown as LedgerLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocktakePostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<StocktakePostService>(StocktakePostService);
    jest.clearAllMocks();
  });

  it('should post APPROVED stocktake session successfully with variances', async () => {
    const sessionId = 'session-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockSessionFindUnique.mockResolvedValue({
      id: sessionId,
      warehouseId,
      status: StocktakeStatus.APPROVED,
      version: 1,
    });

    mockSnapshotFindMany.mockResolvedValue([
      {
        itemId: 'item-1',
        lotId: 'lot-1',
        qtySnapshot: new Prisma.Decimal(10),
        item: { id: 'item-1', sku: 'SKU1', isBatched: true },
      },
    ]);

    mockCountFindMany.mockResolvedValue([
      {
        itemId: 'item-1',
        lotId: 'lot-1',
        qtyCounted: new Prisma.Decimal(12), // positive variance (+2)
      },
    ]);

    mockSessionUpdate.mockResolvedValue({ id: sessionId, status: 'POSTED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.post(sessionId, userId, Role.INV_MGR, 1);

    expect(result).toBeDefined();
    expect(mockLockService.lockLots).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
      ['lot-1'],
    );
    expect(mockWarehouseItemLotUpsert).toHaveBeenCalled();
    expect(mockWarehouseItemUpsert).toHaveBeenCalled();
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: 2,
        documentId: sessionId,
        documentType: DocumentType.STOCKTAKE,
      },
    });
    expect(mockWarehouseLockUpdateMany).toHaveBeenCalledWith({
      where: { warehouseId, isActive: true },
      data: { isActive: false },
    });
    expect(mockWarehouseUpdate).toHaveBeenCalledWith({
      where: { id: warehouseId },
      data: { isLocked: false },
    });
  });

  it('should throw BadRequestException if status is not APPROVED', async () => {
    mockSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      status: StocktakeStatus.STARTED,
    });

    await expect(
      service.post('session-1', 'user-1', Role.INV_MGR),
    ).rejects.toThrow(BadRequestException);
  });
});

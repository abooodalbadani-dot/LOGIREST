/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AdjustmentPostService } from './adjustment-post.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { WacService } from '../ledger/wac.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  Prisma,
  Role,
  DocumentType,
  AdjustmentDirection,
  AdjustmentReason,
} from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('AdjustmentPostService', () => {
  let service: AdjustmentPostService;

  const mockAdjFindUnique = jest.fn();
  const mockAdjUpdate = jest.fn();
  const mockAdjUpdateMany = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpsert = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockStockLedgerFindFirst = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    adjustment: {
      findUnique: mockAdjFindUnique,
      update: mockAdjUpdate,
      updateMany: mockAdjUpdateMany,
    },
    warehouseItemLot: {
      upsert: mockWarehouseItemLotUpsert,
      update: mockWarehouseItemLotUpdate,
    },
    warehouseItem: {
      upsert: mockWarehouseItemUpsert,
      update: mockWarehouseItemUpdate,
      findUnique: mockWarehouseItemFindUnique,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
      findFirst: mockStockLedgerFindFirst,
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
    assertItemBalance: jest.fn(),
    assertLotBalance: jest.fn(),
    lockDocument: jest.fn(),
  } as unknown as LedgerLockService;

  const mockWacService = {
    handlePositiveAdjustment: jest.fn(),
  } as unknown as WacService;

  const mockMetricsService = {
    postingOperationsCounter: {
      inc: jest.fn(),
    },
  } as unknown as MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustmentPostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
        { provide: WacService, useValue: mockWacService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<AdjustmentPostService>(AdjustmentPostService);
    jest.clearAllMocks();
    mockWarehouseItemFindUnique.mockResolvedValue(null);
    mockLockService.lockDocument = jest.fn().mockResolvedValue({
      id: 'adj-1',
      status: 'APPROVED',
      version: 1,
      warehouseId: 'wh-1',
    });
    mockAdjUpdateMany.mockResolvedValue({ count: 1 });
    mockStockLedgerFindFirst.mockResolvedValue(null);
  });

  it('should post APPROVED INCREASE adjustment successfully', async () => {
    const adjId = 'adj-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'APPROVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          reason: AdjustmentReason.CORRECTION,
          unitCost: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'POSTED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.post(adjId, userId, Role.INV_MGR, 1);

    expect(result).toBeDefined();
    expect(mockLockService.lockLots).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
      ['lot-1'],
    );
    expect(mockWarehouseItemLotUpsert).toHaveBeenCalled();
    expect(mockWarehouseItemUpsert).toHaveBeenCalled();
    expect(mockWacService.handlePositiveAdjustment).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
      5,
      10,
      adjId,
      'ADJUSTMENT:cost:adj-1:item-1:line-1',
    );
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: 5,
        documentId: adjId,
        documentType: DocumentType.ADJUSTMENT,
        idempotencyKey: 'ADJUSTMENT:stock:adj-1:item-1:line-1',
      },
    });
  });

  it('should post APPROVED DECREASE adjustment successfully', async () => {
    const adjId = 'adj-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'APPROVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.OUT,
          reason: AdjustmentReason.DAMAGE,
          unitCost: null,
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockLots = jest
      .fn()
      .mockResolvedValue([
        { lotId: 'lot-1', qtyOnHand: new Prisma.Decimal(10) },
      ]);
    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(10),
    });

    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'POSTED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.post(adjId, userId, Role.INV_MGR, 1);

    expect(result).toBeDefined();
    expect(mockLockService.lockLots).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
      ['lot-1'],
    );
    expect(mockLockService.assertLotBalance).toHaveBeenCalled();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalled();
    expect(mockWarehouseItemUpdate).toHaveBeenCalled();
    expect(mockWacService.handlePositiveAdjustment).not.toHaveBeenCalled();
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: -5,
        documentId: adjId,
        documentType: DocumentType.ADJUSTMENT,
        idempotencyKey: 'ADJUSTMENT:stock:adj-1:item-1:line-1',
      },
    });
  });

  it('should throw BadRequestException if status is not APPROVED', async () => {
    mockLockService.lockDocument = jest.fn().mockResolvedValue({
      id: 'adj-1',
      status: 'DRAFT',
      version: 1,
    });
    mockAdjFindUnique.mockResolvedValue({
      id: 'adj-1',
      status: 'DRAFT',
    });

    await expect(service.post('adj-1', 'user-1', Role.INV_MGR)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if direction is IN and unitCost is zero or negative', async () => {
    mockAdjFindUnique.mockResolvedValue({
      id: 'adj-1',
      status: 'APPROVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          reason: AdjustmentReason.CORRECTION,
          unitCost: new Prisma.Decimal(0),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    await expect(service.post('adj-1', 'user-1', Role.INV_MGR, 1)).rejects.toThrow(
      new BadRequestException('Unit cost is required and must be greater than zero for manual Adjustment IN (Item SKU: SKU1).'),
    );
  });

  it('should throw BadRequestException if direction is IN and unitCost is missing', async () => {
    mockAdjFindUnique.mockResolvedValue({
      id: 'adj-1',
      status: 'APPROVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          reason: AdjustmentReason.CORRECTION,
          unitCost: null,
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    await expect(service.post('adj-1', 'user-1', Role.INV_MGR, 1)).rejects.toThrow(
      new BadRequestException('Unit cost is required and must be greater than zero for manual Adjustment IN (Item SKU: SKU1).'),
    );
  });

  it('should throw BadRequestException if item is frozen and role is not ADMIN', async () => {
    const adjId = 'adj-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'APPROVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          reason: AdjustmentReason.CORRECTION,
          unitCost: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockWarehouseItemFindUnique.mockResolvedValue({
      isFrozen: true,
    });

    await expect(
      service.post(adjId, userId, Role.INV_MGR, 1),
    ).rejects.toThrow(new BadRequestException('Cannot post adjustment: Item SKU1 is frozen/locked. Only an Admin can post a reconciling adjustment.'));
  });

  it('should allow posting and unfreeze item if item is frozen and role is ADMIN', async () => {
    const adjId = 'adj-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'APPROVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          reason: AdjustmentReason.CORRECTION,
          unitCost: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockWarehouseItemFindUnique.mockResolvedValue({
      isFrozen: true,
    });

    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'POSTED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.post(adjId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemUpsert).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      create: {
        warehouseId,
        itemId: 'item-1',
        qtyOnHand: 5,
        qtyAllocated: 0,
        wac: 0,
        isFrozen: false,
      },
      update: {
        qtyOnHand: { increment: 5 },
        isFrozen: false,
      },
    });
  });
});

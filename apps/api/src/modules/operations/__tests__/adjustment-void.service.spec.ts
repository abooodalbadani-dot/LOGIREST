import { Test, TestingModule } from '@nestjs/testing';
import { AdjustmentVoidService } from '../adjustment-void.service';
import { PrismaService } from '../../../database/prisma.service';
import { LedgerLockService } from '../../ledger/ledger-lock.service';
import {
  Prisma,
  Role,
  DocumentType,
  AdjustmentDirection,
  AdjustmentReason,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdjustmentVoidService', () => {
  let service: AdjustmentVoidService;

  const mockAdjFindUnique = jest.fn();
  const mockAdjUpdate = jest.fn();
  const mockAdjustmentFindFirst = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockCostLedgerFindMany = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockCostLedgerFindFirst = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();
  const mockGoodsReceivedNoteFindFirst = jest.fn();
  const mockTransferFindFirst = jest.fn();

  const mockPrismaTx = {
    goodsReceivedNote: {
      findFirst: mockGoodsReceivedNoteFindFirst,
    },
    adjustment: {
      findUnique: mockAdjFindUnique,
      update: mockAdjUpdate,
      findFirst: mockAdjustmentFindFirst,
    },
    transfer: {
      findFirst: mockTransferFindFirst,
    },
    stocktakeSession: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    landedCostVoucher: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    warehouseItemLot: {
      update: mockWarehouseItemLotUpdate,
    },
    warehouseItem: {
      update: mockWarehouseItemUpdate,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
    },
    costLedger: {
      findMany: mockCostLedgerFindMany,
      create: mockCostLedgerCreate,
      findFirst: mockCostLedgerFindFirst,
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
        AdjustmentVoidService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<AdjustmentVoidService>(AdjustmentVoidService);
    jest.clearAllMocks();
    mockCostLedgerFindMany.mockResolvedValue([]);
    mockGoodsReceivedNoteFindFirst.mockResolvedValue(null);
    mockAdjustmentFindFirst.mockResolvedValue(null);
    mockTransferFindFirst.mockResolvedValue(null);
    mockCostLedgerFindFirst.mockResolvedValue(null);
  });

  it('should void a POSTED INCREASE adjustment successfully (unbatched item)', async () => {
    const adjId = 'adj-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          reason: AdjustmentReason.CORRECTION,
          lotId: null,
          unitCost: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: false,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(10),
    });

    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(adjId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { decrement: 5 } },
    });
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: null,
        quantity: -5,
        documentId: adjId,
        documentType: DocumentType.ADJUSTMENT,
        idempotencyKey: 'ADJUSTMENT:stock_void:adj-1:item-1:line-1',
      },
    });
    expect(mockAdjUpdate).toHaveBeenCalledWith({
      where: { id: adjId },
      data: { status: 'VOIDED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('should void a POSTED DECREASE adjustment successfully (unbatched item)', async () => {
    const adjId = 'adj-2';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(3),
          direction: AdjustmentDirection.OUT,
          reason: AdjustmentReason.DAMAGE,
          lotId: null,
          unitCost: null,
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: false,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(5),
    });

    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(adjId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { increment: 3 } },
    });
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: null,
        quantity: 3,
        documentId: adjId,
        documentType: DocumentType.ADJUSTMENT,
        idempotencyKey: 'ADJUSTMENT:stock_void:adj-2:item-1:line-1',
      },
    });
  });

  it('should throw BadRequestException if IN adjustment stock has been consumed', async () => {
    const adjId = 'adj-3';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(5),
          direction: AdjustmentDirection.IN,
          lotId: null,
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: false,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(2),
    });

    await expect(service.void(adjId, 'user-1', Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should void a POSTED INCREASE adjustment for batched item with lot', async () => {
    const adjId = 'adj-4';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(8),
          direction: AdjustmentDirection.IN,
          lotId: 'lot-1',
          item: {
            id: 'item-1',
            sku: 'SKU-BATCH',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockLots = jest
      .fn()
      .mockResolvedValue([
        { lotId: 'lot-1', qtyOnHand: new Prisma.Decimal(8) },
      ]);
    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(8),
    });

    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(adjId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId: 'item-1',
          lotId: 'lot-1',
        },
      },
      data: { qtyOnHand: { decrement: 8 } },
    });
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { decrement: 8 } },
    });
  });

  it('should void a POSTED DECREASE adjustment for batched item restoring stock', async () => {
    const adjId = 'adj-5';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockAdjFindUnique.mockResolvedValue({
      id: adjId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(4),
          direction: AdjustmentDirection.OUT,
          lotId: 'lot-1',
          item: {
            id: 'item-1',
            sku: 'SKU-BATCH',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockLots = jest.fn().mockResolvedValue([]);
    mockAdjUpdate.mockResolvedValue({ id: adjId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(adjId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId: 'item-1',
          lotId: 'lot-1',
        },
      },
      data: { qtyOnHand: { increment: 4 } },
    });
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { increment: 4 } },
    });
  });

  it('should throw NotFoundException if Adjustment does not exist', async () => {
    mockAdjFindUnique.mockResolvedValue(null);

    await expect(service.void('invalid', 'user-1', Role.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if Adjustment is not POSTED', async () => {
    mockAdjFindUnique.mockResolvedValue({
      id: 'adj-1',
      status: 'DRAFT',
    });

    await expect(service.void('adj-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException on version conflict', async () => {
    mockAdjFindUnique.mockResolvedValue({
      id: 'adj-1',
      status: 'POSTED',
      version: 2,
    });

    await expect(
      service.void('adj-1', 'user-1', Role.ADMIN, 1),
    ).rejects.toThrow(BadRequestException);
  });
});

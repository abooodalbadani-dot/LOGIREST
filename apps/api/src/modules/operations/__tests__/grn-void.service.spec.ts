/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { GrnVoidService } from '../grn-void.service';
import { PrismaService } from '../../../database/prisma.service';
import { LedgerLockService } from '../../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('GrnVoidService', () => {
  let service: GrnVoidService;

  const mockGrnFindUnique = jest.fn();
  const mockGrnUpdate = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockCostLedgerFindMany = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockCostLedgerFindFirst = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    goodsReceivedNote: {
      findUnique: mockGrnFindUnique,
      update: mockGrnUpdate,
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
        GrnVoidService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<GrnVoidService>(GrnVoidService);
    jest.clearAllMocks();
  });

  it('should void a POSTED GRN successfully (unbatched item)', async () => {
    const grnId = 'grn-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockGrnFindUnique.mockResolvedValue({
      id: grnId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantityReceived: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(5),
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
      qtyOnHand: new Prisma.Decimal(15),
    });

    mockCostLedgerFindFirst.mockResolvedValue({
      id: 'cost-2',
      quantity: new Prisma.Decimal(15),
      unitPrice: new Prisma.Decimal(12),
      newWac: new Prisma.Decimal(12),
      documentId: 'grn-other',
      documentType: DocumentType.GOODS_RECEIVED_NOTE,
    });

    mockGrnUpdate.mockResolvedValue({ id: grnId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(grnId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemUpdate).toHaveBeenCalled();
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: null,
        quantity: -10,
        documentId: grnId,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
      },
    });
    expect(mockGrnUpdate).toHaveBeenCalledWith({
      where: { id: grnId },
      data: { status: 'VOIDED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('should throw NotFoundException if GRN does not exist', async () => {
    mockGrnFindUnique.mockResolvedValue(null);

    await expect(service.void('invalid', 'user-1', Role.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if GRN is not POSTED', async () => {
    mockGrnFindUnique.mockResolvedValue({
      id: 'grn-1',
      status: 'DRAFT',
    });

    await expect(service.void('grn-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if version mismatch', async () => {
    mockGrnFindUnique.mockResolvedValue({
      id: 'grn-1',
      status: 'POSTED',
      version: 2,
    });

    await expect(
      service.void('grn-1', 'user-1', Role.ADMIN, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if stock has been consumed for unbatched item', async () => {
    const grnId = 'grn-1';
    const warehouseId = 'wh-1';

    mockGrnFindUnique.mockResolvedValue({
      id: grnId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantityReceived: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(5),
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
      qtyOnHand: new Prisma.Decimal(3),
    });

    await expect(service.void(grnId, 'user-1', Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should void a POSTED GRN for batched item with lot', async () => {
    const grnId = 'grn-2';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockGrnFindUnique.mockResolvedValue({
      id: grnId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantityReceived: new Prisma.Decimal(5),
          unitPrice: new Prisma.Decimal(10),
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
        { lotId: 'lot-1', qtyOnHand: new Prisma.Decimal(5) },
      ]);
    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(5),
    });

    mockCostLedgerFindFirst.mockResolvedValue(null);
    mockGrnUpdate.mockResolvedValue({ id: grnId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(grnId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalled();
    expect(mockWarehouseItemUpdate).toHaveBeenCalled();
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: -5,
        documentId: grnId,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
      },
    });
  });
});

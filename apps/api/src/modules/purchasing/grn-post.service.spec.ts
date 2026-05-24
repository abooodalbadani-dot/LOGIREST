/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { GrnPostService } from './grn-post.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { WacService } from '../ledger/wac.service';
import { Prisma, Role } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('GrnPostService', () => {
  let service: GrnPostService;

  const mockGrnFindUnique = jest.fn();
  const mockGrnUpdate = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemUpsert = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    goodsReceivedNote: {
      findUnique: mockGrnFindUnique,
      update: mockGrnUpdate,
    },
    warehouseItemLot: {
      upsert: mockWarehouseItemLotUpsert,
    },
    warehouseItem: {
      upsert: mockWarehouseItemUpsert,
      findUnique: mockWarehouseItemFindUnique,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
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

  const mockWacService = {
    recalculate: jest.fn(),
  } as unknown as WacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrnPostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
        { provide: WacService, useValue: mockWacService },
      ],
    }).compile();

    service = module.get<GrnPostService>(GrnPostService);
    jest.clearAllMocks();
  });

  it('should post RECEIVED GRN successfully', async () => {
    const grnId = 'grn-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockGrnFindUnique.mockResolvedValue({
      id: grnId,
      warehouseId,
      status: 'RECEIVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantityReceived: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(5.0),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockGrnUpdate.mockResolvedValue({ id: grnId, status: 'POSTED' });
    mockWarehouseItemFindUnique.mockResolvedValue({
      qtyOnHand: new Prisma.Decimal(10),
    });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.post(grnId, userId, Role.PROC_OFFICER, 1);

    expect(result).toBeDefined();
    expect(mockGrnFindUnique).toHaveBeenCalledWith({
      where: { id: grnId },
      include: { lines: { include: { item: true } } },
    });
    expect(mockLockService.lockLots).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
      ['lot-1'],
    );
    expect(mockWarehouseItemLotUpsert).toHaveBeenCalled();
    expect(mockLockService.lockItem).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
    );
    expect(mockWarehouseItemUpsert).toHaveBeenCalled();
    expect(mockWacService.recalculate).toHaveBeenCalled();
    expect(mockStockLedgerCreate).toHaveBeenCalled();
    expect(mockGrnUpdate).toHaveBeenCalledWith({
      where: { id: grnId },
      data: { status: 'POSTED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('should throw NotFoundException if GRN does not exist', async () => {
    mockGrnFindUnique.mockResolvedValue(null);
    await expect(
      service.post('invalid', 'user-1', Role.PROC_OFFICER),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if GRN is not RECEIVED', async () => {
    mockGrnFindUnique.mockResolvedValue({
      id: 'grn-1',
      status: 'DRAFT',
    });
    await expect(
      service.post('grn-1', 'user-1', Role.PROC_OFFICER),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if version mismatch occurs', async () => {
    mockGrnFindUnique.mockResolvedValue({
      id: 'grn-1',
      status: 'RECEIVED',
      version: 2,
    });
    await expect(
      service.post('grn-1', 'user-1', Role.PROC_OFFICER, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if item is frozen in destination warehouse', async () => {
    const grnId = 'grn-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockGrnFindUnique.mockResolvedValue({
      id: grnId,
      warehouseId,
      status: 'RECEIVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantityReceived: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(5.0),
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
      service.post(grnId, userId, Role.PROC_OFFICER, 1),
    ).rejects.toThrow(new BadRequestException('Cannot post GRN: Item SKU1 is frozen/locked in destination warehouse'));
  });
});

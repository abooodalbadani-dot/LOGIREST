import { Test, TestingModule } from '@nestjs/testing';
import { TransferVoidService } from '../transfer-void.service';
import { PrismaService } from '../../../database/prisma.service';
import { LedgerLockService } from '../../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransferVoidService', () => {
  let service: TransferVoidService;

  const mockTransferFindUnique = jest.fn();
  const mockTransferUpdate = jest.fn();
  const mockTransferFindFirst = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockCostLedgerFindMany = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockCostLedgerFindFirst = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockWarehouseFindUnique = jest.fn();
  const mockGoodsReceivedNoteFindFirst = jest.fn();
  const mockAdjustmentFindFirst = jest.fn();

  const mockPrismaTx = {
    goodsReceivedNote: {
      findFirst: mockGoodsReceivedNoteFindFirst,
    },
    adjustment: {
      findFirst: mockAdjustmentFindFirst,
    },
    transfer: {
      findUnique: mockTransferFindUnique,
      update: mockTransferUpdate,
      findFirst: mockTransferFindFirst,
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    stocktakeSession: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    landedCostVoucher: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    warehouseItemLot: {
      upsert: mockWarehouseItemLotUpsert,
      update: mockWarehouseItemLotUpdate,
    },
    warehouseItem: {
      update: mockWarehouseItemUpdate,
      findUnique: mockWarehouseItemFindUnique,
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
    lotAllocation: {
      findMany: mockLotAllocationFindMany,
    },
    warehouse: {
      findUnique: mockWarehouseFindUnique,
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
    lockDocument: jest.fn(),
  } as unknown as LedgerLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferVoidService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<TransferVoidService>(TransferVoidService);
    jest.clearAllMocks();
    mockLockService.lockDocument = jest
      .fn()
      .mockImplementation(() => mockTransferFindUnique());
  });

  it('should void a RECEIVED Transfer successfully (unbatched item)', async () => {
    const transferId = 'transfer-1';
    const userId = 'user-1';

    mockTransferFindUnique.mockResolvedValue({
      id: transferId,
      fromWarehouseId: 'wh-from',
      toWarehouseId: 'wh-to',
      status: 'RECEIVED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantityShipped: new Prisma.Decimal(10),
          quantityReceived: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: false,
            hasExpiry: false,
          },
        },
      ],
    });

    mockWarehouseItemFindUnique.mockResolvedValue({
      warehouseId: 'wh-from',
      itemId: 'item-1',
      wac: new Prisma.Decimal(5),
    });

    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(10),
    });

    mockGoodsReceivedNoteFindFirst.mockResolvedValue(null);
    mockAdjustmentFindFirst.mockResolvedValue(null);
    mockTransferFindFirst.mockResolvedValue(null);
    mockCostLedgerFindFirst.mockResolvedValue({
      id: 'cost-prev',
      newWac: new Prisma.Decimal(5),
    });

    mockCostLedgerFindMany.mockResolvedValue([]);
    mockTransferUpdate.mockResolvedValue({ id: transferId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(transferId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemUpdate).toHaveBeenCalled();
    expect(mockStockLedgerCreate).toHaveBeenCalled();
    expect(mockPrismaTx.transfer.updateMany).toHaveBeenCalledWith({
      where: { id: transferId, version: 1 },
      data: { status: 'VOIDED', version: 2 },
    });
  });

  it('should throw NotFoundException if Transfer does not exist', async () => {
    mockTransferFindUnique.mockResolvedValue(null);

    await expect(service.void('invalid', 'user-1', Role.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if Transfer is not RECEIVED', async () => {
    mockTransferFindUnique.mockResolvedValue({
      id: 'transfer-1',
      status: 'DRAFT',
    });

    await expect(
      service.void('transfer-1', 'user-1', Role.ADMIN),
    ).rejects.toThrow(BadRequestException);
  });
});

/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { GrnVoidService } from './grn-void.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('GrnVoidService', () => {
  let service: GrnVoidService;

  const mockGrnFindUnique = jest.fn();
  const mockGrnUpdate = jest.fn();
  const mockGrnUpdateMany = jest.fn();
  const mockGrnFindFirst = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockCostLedgerFindMany = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockCostLedgerFindFirst = jest.fn();
  const mockLandedCostAllocationLineFindFirst = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    goodsReceivedNote: {
      findUnique: mockGrnFindUnique,
      update: mockGrnUpdate,
      updateMany: mockGrnUpdateMany,
      findFirst: mockGrnFindFirst,
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
    landedCostAllocationLine: {
      findFirst: mockLandedCostAllocationLineFindFirst,
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
    lockDocument: jest.fn(),
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
    mockLockService.lockDocument = jest.fn().mockResolvedValue({
      id: 'grn-1',
      status: 'POSTED',
      version: 1,
      warehouseId: 'wh-1',
    });
    mockGrnUpdateMany.mockResolvedValue({ count: 1 });
    mockLandedCostAllocationLineFindFirst.mockResolvedValue(null);
    mockGrnFindFirst.mockResolvedValue(null);
  });

  it('should void a POSTED GRN successfully and recalculate WAC', async () => {
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
          lotId: 'lot-1',
          quantityReceived: new Prisma.Decimal(5),
          unitPrice: new Prisma.Decimal(10),
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

    // Mock costLedger entries to trigger WAC recalculation
    mockCostLedgerFindFirst.mockResolvedValue({
      id: 'cost-2',
      quantity: new Prisma.Decimal(15),
      unitPrice: new Prisma.Decimal(12),
      newWac: new Prisma.Decimal(12),
      documentId: 'grn-other',
      documentType: DocumentType.GOODS_RECEIVED_NOTE,
    });

    mockGrnUpdate.mockResolvedValue({ id: grnId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.void(grnId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId: 'item-1',
          lotId: 'lot-1',
        },
      },
      data: { qtyOnHand: { decrement: 5 } },
    });

    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { decrement: 5 } },
    });

    // Check WAC update to WarehouseItem (excluding grn-1, so 15 @ 12 = WAC 12)
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { wac: new Prisma.Decimal(12) },
    });

    // Check compensating CostLedger entry creation
    expect(mockCostLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        quantity: -5,
        unitPrice: 10,
        newWac: new Prisma.Decimal(12),
        documentId: grnId,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
        idempotencyKey: 'GOODS_RECEIVED_NOTE:cost:grn-1:item-1:line-1:void',
      },
    });

    // Check StockLedger creation (negative)
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: -5,
        documentId: grnId,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
        idempotencyKey: 'GOODS_RECEIVED_NOTE:stock:grn-1:item-1:line-1:void',
      },
    });
  });

  it('should throw BadRequestException if status is not POSTED', async () => {
    mockLockService.lockDocument = jest.fn().mockResolvedValue({
      id: 'grn-1',
      status: 'DRAFT',
      version: 1,
    });
    mockGrnFindUnique.mockResolvedValue({
      id: 'grn-1',
      status: 'DRAFT',
    });

    await expect(service.void('grn-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if stock has been consumed', async () => {
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
          lotId: 'lot-1',
          quantityReceived: new Prisma.Decimal(5),
          unitPrice: new Prisma.Decimal(10),
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
        { lotId: 'lot-1', qtyOnHand: new Prisma.Decimal(2) }, // Less than required 5
      ]);

    await expect(service.void(grnId, userId, Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ForbiddenException if userRole is not ADMIN or INV_MGR', async () => {
    await expect(
      service.void('grn-1', 'user-1', Role.WH_KEEPER),
    ).rejects.toThrow('Only System Administrators or Inventory Managers can void documents');
  });

  it('should deduct baseQuantity (12 BAGs) instead of transaction quantity (1 BOX) when voiding GRN line', async () => {
    const grnId = 'grn-uom-void-test';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockGrnFindUnique.mockResolvedValue({
      id: grnId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-uom-void',
          itemId: 'item-uom-void',
          uomId: 'uom-box-id',
          quantityReceived: new Prisma.Decimal(1), // 1 BOX
          unitPrice: new Prisma.Decimal(100),
          item: {
            id: 'item-uom-void',
            sku: 'UOMSKU01',
            uomId: 'uom-bag-id',
            isBatched: false,
            hasExpiry: false,
            uomConversions: [
              { fromUomId: 'uom-box-id', toUomId: 'uom-bag-id', factor: new Prisma.Decimal(12) },
            ],
          },
        },
      ],
    });

    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-uom-void',
      qtyOnHand: new Prisma.Decimal(84),
    });

    mockCostLedgerFindFirst.mockResolvedValue({
      id: 'cost-prev',
      newWac: new Prisma.Decimal(41.4467),
    });

    mockGrnUpdate.mockResolvedValue({ id: grnId, status: 'VOIDED' });

    await service.void(grnId, userId, Role.ADMIN, 1);

    // Decrement should be baseQuantity = 12 BAGs, NOT 1 BOX!
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-uom-void',
        },
      },
      data: { qtyOnHand: { decrement: 12 } },
    });

    // Stock ledger should log -12
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quantity: -12,
      }),
    });
  });
});

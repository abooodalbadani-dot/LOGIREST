/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { TransferVoidService } from './transfer-void.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransferVoidService', () => {
  let service: TransferVoidService;

  const mockTransferFindUnique = jest.fn();
  const mockTransferUpdate = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockCostLedgerFindMany = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockWarehouseFindUnique = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    transfer: {
      findUnique: mockTransferFindUnique,
      update: mockTransferUpdate,
    },
    warehouseItemLot: {
      update: mockWarehouseItemLotUpdate,
      upsert: mockWarehouseItemLotUpsert,
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
    },
    lotAllocation: {
      findMany: mockLotAllocationFindMany,
    },
    warehouse: {
      findUnique: mockWarehouseFindUnique,
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
        TransferVoidService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<TransferVoidService>(TransferVoidService);
    jest.clearAllMocks();
  });

  it('should void a RECEIVED transfer successfully', async () => {
    const transferId = 'transfer-1';
    const userId = 'user-1';

    mockTransferFindUnique.mockResolvedValue({
      id: transferId,
      fromWarehouseId: 'wh-source',
      toWarehouseId: 'wh-dest',
      status: 'RECEIVED',
      version: 2,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantityShipped: new Prisma.Decimal(5),
          quantityReceived: new Prisma.Decimal(5),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLotAllocationFindMany.mockResolvedValue([
      {
        id: 'alloc-1',
        transferLineId: 'line-1',
        lotId: 'lot-1',
        quantityAllocated: new Prisma.Decimal(5),
      },
    ]);

    mockLockService.lockLots = jest
      .fn()
      .mockResolvedValue([
        { lotId: 'lot-1', qtyOnHand: new Prisma.Decimal(10) },
      ]);
    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(10),
    });

    mockWarehouseItemFindUnique.mockResolvedValue({
      wac: new Prisma.Decimal(10),
    });

    // Mock cost ledger entries for destination warehouse (excluding this transfer, WAC recalculation)
    mockCostLedgerFindMany.mockResolvedValue([
      {
        id: 'cost-1',
        quantity: new Prisma.Decimal(5),
        unitPrice: new Prisma.Decimal(10),
        documentId: transferId,
        documentType: DocumentType.TRANSFER,
      },
      {
        id: 'cost-2',
        quantity: new Prisma.Decimal(15),
        unitPrice: new Prisma.Decimal(12),
        documentId: 'grn-other',
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
      },
    ]);

    mockTransferUpdate.mockResolvedValue({ id: transferId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.void(transferId, userId, Role.ADMIN, 2);

    expect(result).toBeDefined();
    // Origin receives stock back
    expect(mockWarehouseItemLotUpsert).toHaveBeenCalled();
    // Destination loses stock
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId_lotId: {
          warehouseId: 'wh-dest',
          itemId: 'item-1',
          lotId: 'lot-1',
        },
      },
      data: { qtyOnHand: { decrement: 5 } },
    });

    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId: 'wh-dest',
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { decrement: 5 } },
    });

    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId: 'wh-source',
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: 5,
        documentId: transferId,
        documentType: DocumentType.TRANSFER,
      },
    });

    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId: 'wh-dest',
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: -5,
        documentId: transferId,
        documentType: DocumentType.TRANSFER,
      },
    });
  });

  it('should throw BadRequestException if status is not RECEIVED', async () => {
    mockTransferFindUnique.mockResolvedValue({
      id: 'transfer-1',
      status: 'IN_TRANSIT',
    });

    await expect(service.void('transfer-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ForbiddenException if userRole is not ADMIN or INV_MGR', async () => {
    await expect(
      service.void('transfer-1', 'user-1', Role.WH_KEEPER),
    ).rejects.toThrow('Only System Administrators or Inventory Managers can void documents');
  });
});

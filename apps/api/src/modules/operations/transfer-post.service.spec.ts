/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { TransferPostService } from './transfer-post.service';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TransferPostService', () => {
  let service: TransferPostService;

  const mockTransferFindUnique = jest.fn();
  const mockTransferUpdate = jest.fn();
  const mockTransferLineUpdate = jest.fn();
  const mockLotAllocationCreate = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemUpsert = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    transfer: {
      findUnique: mockTransferFindUnique,
      update: mockTransferUpdate,
    },
    transferLine: {
      update: mockTransferLineUpdate,
    },
    lotAllocation: {
      create: mockLotAllocationCreate,
      findMany: mockLotAllocationFindMany,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
    },
    warehouseItemLot: {
      upsert: mockWarehouseItemLotUpsert,
    },
    warehouseItem: {
      upsert: mockWarehouseItemUpsert,
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

  const mockAllocationService = {
    allocate: jest.fn(),
  } as unknown as AllocationService;

  const mockLockService = {
    lockLots: jest.fn(),
    lockItem: jest.fn(),
  } as unknown as LedgerLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferPostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AllocationService, useValue: mockAllocationService },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<TransferPostService>(TransferPostService);
    jest.clearAllMocks();
  });

  describe('ship', () => {
    it('should ship a transfer successfully', async () => {
      const transferId = 'transfer-1';
      const userId = 'user-1';

      mockTransferFindUnique.mockResolvedValue({
        id: transferId,
        fromWarehouseId: 'wh-source',
        toWarehouseId: 'wh-dest',
        status: 'DRAFT',
        version: 1,
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            quantityShipped: new Prisma.Decimal(5),
            item: {
              id: 'item-1',
              sku: 'SKU1',
              isBatched: true,
              hasExpiry: false,
            },
          },
        ],
      });

      mockTransferUpdate.mockResolvedValue({
        id: transferId,
        status: 'IN_TRANSIT',
      });
      (mockAllocationService.allocate as jest.Mock).mockResolvedValue([
        { lotId: 'lot-1', quantityAllocated: 5 },
      ]);
      mockApprovalEventCount.mockResolvedValue(0);

      const result = await service.ship(transferId, userId, Role.INV_MGR, 1);

      expect(result).toBeDefined();
      expect(mockTransferFindUnique).toHaveBeenCalledWith({
        where: { id: transferId },
        include: { lines: { include: { item: true } } },
      });
      expect(mockAllocationService.allocate).toHaveBeenCalledWith(
        mockPrismaTx,
        'wh-source',
        'item-1',
        5,
      );
      expect(mockLotAllocationCreate).toHaveBeenCalledWith({
        data: {
          transferLineId: 'line-1',
          lotId: 'lot-1',
          quantityAllocated: 5,
        },
      });
      expect(mockStockLedgerCreate).toHaveBeenCalledWith({
        data: {
          warehouseId: 'wh-source',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: -5,
          documentId: transferId,
          documentType: DocumentType.TRANSFER,
        },
      });
      expect(mockTransferUpdate).toHaveBeenCalledWith({
        where: { id: transferId },
        data: { status: 'IN_TRANSIT', version: 2 },
      });
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      mockTransferFindUnique.mockResolvedValue({
        id: 'transfer-1',
        status: 'IN_TRANSIT',
      });

      await expect(
        service.ship('transfer-1', 'user-1', Role.INV_MGR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('receive', () => {
    it('should receive a transfer successfully without variance', async () => {
      const transferId = 'transfer-1';
      const userId = 'user-1';

      mockTransferFindUnique.mockResolvedValue({
        id: transferId,
        fromWarehouseId: 'wh-source',
        toWarehouseId: 'wh-dest',
        status: 'IN_TRANSIT',
        version: 2,
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            quantityShipped: new Prisma.Decimal(5),
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

      mockTransferUpdate.mockResolvedValue({
        id: transferId,
        status: 'RECEIVED',
      });
      mockApprovalEventCount.mockResolvedValue(1);

      const result = await service.receive(
        transferId,
        userId,
        Role.INV_MGR,
        2,
        undefined,
        [{ lineId: 'line-1', quantityReceived: 5 }],
      );

      expect(result).toBeDefined();
      expect(mockTransferLineUpdate).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          quantityReceived: 5,
          varianceReason: null,
        },
      });
      expect(mockLockService.lockLots).toHaveBeenCalledWith(
        mockPrismaTx,
        'wh-dest',
        'item-1',
        ['lot-1'],
      );
      expect(mockWarehouseItemLotUpsert).toHaveBeenCalled();
      expect(mockWarehouseItemUpsert).toHaveBeenCalled();
      expect(mockStockLedgerCreate).toHaveBeenCalledWith({
        data: {
          warehouseId: 'wh-dest',
          itemId: 'item-1',
          lotId: 'lot-1',
          quantity: 5,
          documentId: transferId,
          documentType: DocumentType.TRANSFER,
        },
      });
    });

    it('should receive a transfer successfully with variance and varianceReason', async () => {
      const transferId = 'transfer-1';
      const userId = 'user-1';

      mockTransferFindUnique.mockResolvedValue({
        id: transferId,
        fromWarehouseId: 'wh-source',
        toWarehouseId: 'wh-dest',
        status: 'IN_TRANSIT',
        version: 2,
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            quantityShipped: new Prisma.Decimal(5),
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

      mockTransferUpdate.mockResolvedValue({
        id: transferId,
        status: 'RECEIVED',
      });
      mockApprovalEventCount.mockResolvedValue(1);

      const result = await service.receive(
        transferId,
        userId,
        Role.INV_MGR,
        2,
        undefined,
        [
          {
            lineId: 'line-1',
            quantityReceived: 3,
            varianceReason: 'Damaged in transit',
          },
        ],
      );

      expect(result).toBeDefined();
      expect(mockTransferLineUpdate).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          quantityReceived: 3,
          varianceReason: 'Damaged in transit',
        },
      });
    });

    it('should throw BadRequestException if variance exists but no varianceReason is provided', async () => {
      const transferId = 'transfer-1';
      const userId = 'user-1';

      mockTransferFindUnique.mockResolvedValue({
        id: transferId,
        fromWarehouseId: 'wh-source',
        toWarehouseId: 'wh-dest',
        status: 'IN_TRANSIT',
        version: 2,
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            quantityShipped: new Prisma.Decimal(5),
            item: {
              id: 'item-1',
              sku: 'SKU1',
              isBatched: true,
              hasExpiry: false,
            },
          },
        ],
      });

      await expect(
        service.receive(transferId, userId, Role.INV_MGR, 2, undefined, [
          { lineId: 'line-1', quantityReceived: 3 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

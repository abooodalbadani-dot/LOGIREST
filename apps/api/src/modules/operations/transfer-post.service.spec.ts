/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { TransferPostService } from './transfer-post.service';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OutboxService } from '../outbox/outbox.service';
import { MetricsService } from '../metrics/metrics.service';
import { WacService } from '../ledger/wac.service';

describe('TransferPostService', () => {
  const mockWacService = {
    handleTransferReceipt: jest.fn(),
  };
  let service: TransferPostService;

  const mockTransferFindUnique = jest.fn();
  const mockTransferUpdate = jest.fn();
  const mockTransferLineUpdate = jest.fn();
  const mockLotAllocationCreate = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockWarehouseItemLotUpsert = jest.fn();
  const mockWarehouseItemUpsert = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockWarehouseFindUnique = jest.fn();
  const mockWarehouseCreate = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();
  const mockUserWarehouseScopeFindUnique = jest.fn();
  const mockNotificationLogCreate = jest.fn();

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
    costLedger: {
      create: mockCostLedgerCreate,
    },
    warehouseItemLot: {
      upsert: mockWarehouseItemLotUpsert,
    },
    warehouseItem: {
      upsert: mockWarehouseItemUpsert,
      findUnique: mockWarehouseItemFindUnique,
    },
    warehouse: {
      findUnique: mockWarehouseFindUnique,
      create: mockWarehouseCreate,
    },
    userWarehouseScope: {
      findUnique: mockUserWarehouseScopeFindUnique,
    },
    approvalEvent: {
      count: mockApprovalEventCount,
      create: mockApprovalEventCreate,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
    notificationLog: {
      create: mockNotificationLogCreate,
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

  const mockOutboxService = {
    writeEvent: jest.fn().mockResolvedValue({ id: 'event-outbox-1' }),
  };

  const mockMetricsService = {
    postingOperationsCounter: {
      inc: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferPostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AllocationService, useValue: mockAllocationService },
        { provide: LedgerLockService, useValue: mockLockService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: WacService, useValue: mockWacService },
      ],
    }).compile();

    service = module.get<TransferPostService>(TransferPostService);
    jest.clearAllMocks();
    mockWarehouseItemFindUnique.mockResolvedValue({ wac: new Prisma.Decimal(10.0), isFrozen: false });
    mockWarehouseFindUnique.mockResolvedValue({ id: 'wh-loss-id', branchId: 'branch-1' });
    mockWarehouseCreate.mockResolvedValue({ id: 'wh-loss-id', branchId: 'branch-1' });
    mockUserWarehouseScopeFindUnique.mockResolvedValue({ id: 'scope-1' });
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
      expect(mockWacService.handleTransferReceipt).toHaveBeenCalledWith(
        mockPrismaTx,
        'wh-dest',
        'item-1',
        5,
        10.0,
        transferId,
      );
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

      expect(mockOutboxService.writeEvent).toHaveBeenCalledWith(
        mockPrismaTx,
        'TRANSFER_RECEIVED',
        expect.objectContaining({
          id: transferId,
          fromWarehouseId: 'wh-source',
          toWarehouseId: 'wh-dest',
        }),
      );

      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetRole: Role.WH_KEEPER,
          warehouseId: 'wh-source',
          documentType: DocumentType.TRANSFER,
          documentId: transferId,
        }),
      });

      expect(mockNotificationLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetRole: Role.WH_KEEPER,
          warehouseId: 'wh-dest',
          documentType: DocumentType.TRANSFER,
          documentId: transferId,
        }),
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

    it('should recalculate destination WAC correctly and log transit loss on receipt discrepancy', async () => {
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
            itemId: 'item-rice',
            quantityShipped: new Prisma.Decimal(10),
            item: {
              id: 'item-rice',
              sku: 'RICE',
              isBatched: false,
              hasExpiry: false,
            },
          },
        ],
      });

      mockWarehouseItemFindUnique.mockImplementation(async (args) => {
        if (args.where.warehouseId_itemId.warehouseId === 'wh-source') {
          return { wac: new Prisma.Decimal(10.00), isFrozen: false };
        }
        return { wac: new Prisma.Decimal(4.00), isFrozen: false };
      });

      (mockLockService.lockItem as jest.Mock).mockResolvedValue({
        qtyOnHand: new Prisma.Decimal(5),
        wac: new Prisma.Decimal(4.00),
      });

      mockWarehouseFindUnique.mockResolvedValue({ id: 'wh-loss-id' });

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
            quantityReceived: 8,
            varianceReason: 'Lost in transit',
          },
        ],
      );

      expect(result).toBeDefined();

      expect(mockWacService.handleTransferReceipt).toHaveBeenCalledWith(
        mockPrismaTx,
        'wh-dest',
        'item-rice',
        8,
        10.0,
        transferId,
      );

      expect(mockStockLedgerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          warehouseId: 'wh-loss-id',
          itemId: 'item-rice',
          quantity: new Prisma.Decimal(2),
          documentType: DocumentType.TRANSFER,
        }),
      });
    });

    it('should throw BadRequestException if item is frozen in destination warehouse', async () => {
      const transferId = 'transfer-1';
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
            item: { id: 'item-1', sku: 'SKU1', isBatched: false, hasExpiry: false },
          },
        ],
      });
      mockWarehouseItemFindUnique.mockImplementation(async (args) => {
        if (args.where.warehouseId_itemId.warehouseId === 'wh-dest') {
          return { isFrozen: true };
        }
        return { isFrozen: false };
      });

      await expect(
        service.receive(transferId, 'user-1', Role.INV_MGR, 2, undefined, [
          { lineId: 'line-1', quantityReceived: 5 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ship - frozen check', () => {
    it('should throw BadRequestException if item is frozen in source warehouse', async () => {
      const transferId = 'transfer-1';
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
            item: { id: 'item-1', sku: 'SKU1', isBatched: false, hasExpiry: false },
          },
        ],
      });
      mockWarehouseItemFindUnique.mockResolvedValue({
        isFrozen: true,
      });

      await expect(
        service.ship(transferId, 'user-1', Role.INV_MGR, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

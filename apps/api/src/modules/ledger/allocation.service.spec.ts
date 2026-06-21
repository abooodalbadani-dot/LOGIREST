import { Test, TestingModule } from '@nestjs/testing';
import { AllocationService } from './allocation.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from './ledger-lock.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma, WarehouseItem, WarehouseItemLot } from '@prisma/client';
import { OutboxService } from '../outbox/outbox.service';

describe('AllocationService', () => {
  let service: AllocationService;

  const mockItemFindUnique = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockWarehouseItemUpdate = jest.fn().mockImplementation((args) => {
    return {
      warehouseId: 'wh-1',
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(5),
      item: {
        reorderPoint: null,
        name: 'Tomato Paste',
        sku: 'TOM-PAS-01',
        unitOfMeasure: { code: 'KG' },
      },
      warehouse: { name: 'Main Kitchen' },
    };
  });
  const mockWarehouseItemLotFindMany = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();

  const mockPrismaTx = {
    item: {
      findUnique: mockItemFindUnique,
    },
    warehouseItem: {
      findUnique: mockWarehouseItemFindUnique,
      update: mockWarehouseItemUpdate,
    },
    warehouseItemLot: {
      findMany: mockWarehouseItemLotFindMany,
      update: mockWarehouseItemLotUpdate,
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
    lockItem: jest
      .fn()
      .mockImplementation(
        async (tx: Prisma.TransactionClient, whId: string, itemId: string) => {
          const result = (await mockWarehouseItemFindUnique({
            where: { warehouseId_itemId: { warehouseId: whId, itemId } },
          })) as unknown;
          return result as WarehouseItem | null;
        },
      ),
    lockLots: jest
      .fn()
      .mockImplementation(
        async (
          tx: Prisma.TransactionClient,
          whId: string,
          itemId: string,
          lotIds: string[],
        ) => {
          const allLots = (await mockWarehouseItemLotFindMany({
            where: { warehouseId: whId, itemId },
          })) as WarehouseItemLot[];
          return allLots.filter((l) => lotIds.includes(l.lotId));
        },
      ),
    assertItemBalance: jest
      .fn()
      .mockImplementation(
        (
          warehouseItem: WarehouseItem | null,
          requiredQty: number,
          itemId: string,
        ) => {
          if (!warehouseItem) {
            throw new BadRequestException(
              `Warehouse item balance not found for item ${itemId}`,
            );
          }
          const currentQty = Number(warehouseItem.qtyOnHand);
          if (currentQty < requiredQty) {
            throw new BadRequestException(
              `Insufficient stock for item ${itemId}. Available: ${currentQty}, Required: ${requiredQty}`,
            );
          }
        },
      ),
    assertLotBalance: jest
      .fn()
      .mockImplementation(
        (
          warehouseItemLot: WarehouseItemLot | null,
          requiredQty: number,
          lotId: string,
        ) => {
          if (!warehouseItemLot) {
            throw new BadRequestException(
              `Warehouse item lot balance not found for lot ${lotId}`,
            );
          }
          const currentQty = Number(warehouseItemLot.qtyOnHand);
          if (currentQty < requiredQty) {
            throw new BadRequestException(
              `Insufficient stock for lot ${lotId}. Available: ${currentQty}, Required: ${requiredQty}`,
            );
          }
        },
      ),
  } as unknown as LedgerLockService;

  const mockOutboxService = {
    writeEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllocationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<AllocationService>(AllocationService);
    jest.clearAllMocks();
  });

  describe('allocate', () => {
    const whId = 'wh-1';
    const itemId = 'item-1';

    it('should allocate directly from WarehouseItem for unbatched items (Case A)', async () => {
      mockItemFindUnique.mockResolvedValue({
        id: itemId,
        isBatched: false,
        hasExpiry: false,
      });
      mockWarehouseItemFindUnique.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(10),
      });

      const result = await service.allocate(mockPrismaTx, whId, itemId, 5);

      expect(result).toEqual([]);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { qtyOnHand: { decrement: 5 } },
        include: {
          item: {
            include: {
              unitOfMeasure: true,
            },
          },
          warehouse: true,
        },
      });
    });

    it('should throw BadRequestException if unbatched item has insufficient stock', async () => {
      mockItemFindUnique.mockResolvedValue({
        id: itemId,
        isBatched: false,
        hasExpiry: false,
      });
      mockWarehouseItemFindUnique.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(3),
      });

      await expect(
        service.allocate(mockPrismaTx, whId, itemId, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allocate in FEFO order for expired items, excluding expired lots (Case B)', async () => {
      mockItemFindUnique.mockResolvedValue({
        id: itemId,
        isBatched: true,
        hasExpiry: true,
      });
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeDate1 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const activeDate2 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      mockWarehouseItemLotFindMany.mockResolvedValue([
        {
          warehouseId: whId,
          itemId: itemId,
          lotId: 'lot-expired',
          qtyOnHand: new Prisma.Decimal(10),
          lot: { expiryDate: expiredDate, receivedDate: now },
        },
        {
          warehouseId: whId,
          itemId: itemId,
          lotId: 'lot-active-1',
          qtyOnHand: new Prisma.Decimal(8),
          lot: { expiryDate: activeDate1, receivedDate: now },
        },
        {
          warehouseId: whId,
          itemId: itemId,
          lotId: 'lot-active-2',
          qtyOnHand: new Prisma.Decimal(12),
          lot: { expiryDate: activeDate2, receivedDate: now },
        },
      ]);

      const result = await service.allocate(mockPrismaTx, whId, itemId, 12);

      expect(result).toEqual([
        { lotId: 'lot-active-1', quantityAllocated: 8 },
        { lotId: 'lot-active-2', quantityAllocated: 4 },
      ]);

      expect(mockWarehouseItemLotUpdate).toHaveBeenCalledTimes(2);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { qtyOnHand: { decrement: 12 } },
        include: {
          item: {
            include: {
              unitOfMeasure: true,
            },
          },
          warehouse: true,
        },
      });
    });

    it('should allocate in FIFO order for batched items without expiry (Case C)', async () => {
      mockItemFindUnique.mockResolvedValue({
        id: itemId,
        isBatched: true,
        hasExpiry: false,
      });
      const now = new Date();
      const receivedOld = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const receivedNew = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      mockWarehouseItemLotFindMany.mockResolvedValue([
        {
          warehouseId: whId,
          itemId: itemId,
          lotId: 'lot-old',
          qtyOnHand: new Prisma.Decimal(10),
          lot: { expiryDate: null, receivedDate: receivedOld },
        },
        {
          warehouseId: whId,
          itemId: itemId,
          lotId: 'lot-new',
          qtyOnHand: new Prisma.Decimal(20),
          lot: { expiryDate: null, receivedDate: receivedNew },
        },
      ]);

      const result = await service.allocate(mockPrismaTx, whId, itemId, 15);

      expect(result).toEqual([
        { lotId: 'lot-old', quantityAllocated: 10 },
        { lotId: 'lot-new', quantityAllocated: 5 },
      ]);

      expect(mockWarehouseItemLotUpdate).toHaveBeenCalledTimes(2);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { qtyOnHand: { decrement: 15 } },
        include: {
          item: {
            include: {
              unitOfMeasure: true,
            },
          },
          warehouse: true,
        },
      });
    });

    it('should throw BadRequestException if batched item has insufficient active stock', async () => {
      mockItemFindUnique.mockResolvedValue({
        id: itemId,
        isBatched: true,
        hasExpiry: false,
      });
      mockWarehouseItemLotFindMany.mockResolvedValue([
        {
          warehouseId: whId,
          itemId: itemId,
          lotId: 'lot-1',
          qtyOnHand: new Prisma.Decimal(5),
          lot: { expiryDate: null, receivedDate: new Date() },
        },
      ]);

      await expect(
        service.allocate(mockPrismaTx, whId, itemId, 10),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trigger low stock alert when qty falls below reorderPoint', async () => {
      mockItemFindUnique.mockResolvedValue({
        id: itemId,
        isBatched: false,
        hasExpiry: false,
      });
      mockWarehouseItemFindUnique.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(10),
      });
      mockWarehouseItemUpdate.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(1),
        item: {
          reorderPoint: new Prisma.Decimal(3),
          name: 'Tomato Paste',
          sku: 'TOM-PAS-01',
          unitOfMeasure: { code: 'KG' },
        },
        warehouse: { name: 'Main Kitchen' },
      });

      await service.allocate(mockPrismaTx, whId, itemId, 9);

      expect(mockOutboxService.writeEvent).toHaveBeenCalledWith(
        mockPrismaTx,
        'LOW_STOCK_ALERT',
        expect.objectContaining({
          itemId,
          qtyOnHand: 1,
          reorderPoint: 3,
        }),
      );
    });
  });
});

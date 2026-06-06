import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    warehouseItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    warehouseItemLot: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    stockLedger: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    barcodeMapping: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest
      .fn()
      .mockImplementation((cb: any) => cb(mockPrismaService)),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should query live balance for a warehouse with optional category and search filters', async () => {
      mockPrismaService.warehouseItem.findMany.mockResolvedValue([
        {
          itemId: 'item-1',
          warehouseId: 'wh-1',
          qtyOnHand: 120.5,
          qtyAllocated: 10.0,
          wac: 2.5,
          warehouse: { name: 'Main Warehouse' },
          item: {
            sku: 'ITEM-001',
            name: 'Fresh Tomato',
            reorderPoint: 5.0,
            category: { name: 'Vegetables' },
            unitOfMeasure: { code: 'kg' },
          },
        },
      ]);
      mockPrismaService.warehouseItem.count.mockResolvedValue(1);

      const result = await service.getBalance('wh-1', {
        itemId: 'item-1',
        categoryId: 'cat-1',
        search: 'tomato',
        page: 1,
        limit: 50,
      });

      expect(result).toEqual({
        data: [
          {
            itemId: 'item-1',
            itemCode: 'ITEM-001',
            itemName: 'Fresh Tomato',
            warehouseId: 'wh-1',
            warehouseName: 'Main Warehouse',
            qtyOnHand: 120.5,
            qtyReserved: 10.0,
            qtyAvailable: 110.5,
            reorderPoint: 5.0,
          },
        ],
        meta: {
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
      });

      expect(mockPrismaService.warehouseItem.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          item: {
            categoryId: 'cat-1',
            OR: [
              { name: { contains: 'tomato', mode: 'insensitive' } },
              { sku: { contains: 'tomato', mode: 'insensitive' } },
            ],
          },
        },
        include: {
          warehouse: true,
          item: {
            include: {
              category: true,
              unitOfMeasure: true,
            },
          },
        },
        skip: 0,
        take: 50,
        orderBy: {
          item: {
            name: 'asc',
          },
        },
      });

      expect(mockPrismaService.warehouseItem.count).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          item: {
            categoryId: 'cat-1',
            OR: [
              { name: { contains: 'tomato', mode: 'insensitive' } },
              { sku: { contains: 'tomato', mode: 'insensitive' } },
            ],
          },
        },
      });
    });
  });

  describe('getLots', () => {
    it('should query active lot allocations for a warehouse and order by expiry date', async () => {
      const mockExpiry = new Date('2026-06-01T00:00:00Z');
      mockPrismaService.warehouseItemLot.findMany.mockResolvedValue([
        {
          lotId: 'lot-1',
          itemId: 'item-1',
          qtyOnHand: 50.0,
          item: { sku: 'ITEM-001', name: 'Fresh Tomato' },
          lot: {
            lotNumber: 'LOT-01',
            expiryDate: mockExpiry,
            status: 'AVAILABLE',
          },
        },
      ]);
      mockPrismaService.warehouseItemLot.count.mockResolvedValue(1);

      const result = await service.getLots('wh-1', {
        itemId: 'item-1',
        status: 'AVAILABLE' as any,
        page: 1,
        limit: 50,
      });

      expect(result).toEqual({
        data: [
          {
            lotId: 'lot-1',
            lotNumber: 'LOT-01',
            itemId: 'item-1',
            itemCode: 'ITEM-001',
            itemName: 'Fresh Tomato',
            onHandQty: 50.0,
            expiryDate: mockExpiry,
            status: 'AVAILABLE',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
      });

      expect(mockPrismaService.warehouseItemLot.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          lot: { status: 'AVAILABLE' },
        },
        include: {
          item: true,
          lot: true,
        },
        skip: 0,
        take: 50,
        orderBy: {
          lot: { expiryDate: 'asc' },
        },
      });

      expect(mockPrismaService.warehouseItemLot.count).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          lot: { status: 'AVAILABLE' },
        },
      });
    });
  });

  describe('getMovements', () => {
    it('should return paginated movements with metadata', async () => {
      const mockTimestamp = new Date();
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'ledger-1',
            timestamp: mockTimestamp,
            itemId: 'item-1',
            itemName: 'Fresh Tomato',
            transactionType: 'GRN_IN',
            documentReference: 'GRN-01',
            quantity: 50.0,
            balanceAfter: 50.0,
            performedByUserName: 'System User',
          },
        ])
        .mockResolvedValueOnce([
          {
            count: 10n,
          },
        ]);

      const result = await service.getMovements('wh-1', {
        page: 2,
        limit: 5,
        itemId: 'item-1',
      });

      expect(result).toEqual({
        data: [
          {
            id: 'ledger-1',
            timestamp: mockTimestamp,
            itemId: 'item-1',
            itemName: 'Fresh Tomato',
            transactionType: 'GRN_IN',
            documentReference: 'GRN-01',
            quantity: 50.0,
            balanceAfter: 50.0,
            performedByUserName: 'System User',
          },
        ],
        meta: {
          total: 10,
          page: 2,
          pageSize: 5,
          totalPages: 2,
        },
      });

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('scanBarcode', () => {
    it('should resolve item and active lots for a valid scanned barcode', async () => {
      const mockExpiry = new Date();
      mockPrismaService.barcodeMapping.findUnique.mockResolvedValue({
        itemId: 'item-1',
        item: {
          sku: 'ITEM-001',
          name: 'Fresh Tomato',
          uomId: 'uom-1',
          unitOfMeasure: { code: 'kg' },
        },
      });
      mockPrismaService.warehouseItemLot.findMany.mockResolvedValue([
        {
          lotId: 'lot-1',
          qtyOnHand: 35.0,
          lot: {
            lotNumber: 'LOT-01',
            expiryDate: mockExpiry,
          },
        },
      ]);

      const result = await service.scanBarcode('wh-1', '9780201379624');

      expect(result).toEqual({
        itemId: 'item-1',
        itemCode: 'ITEM-001',
        itemName: 'Fresh Tomato',
        uomId: 'uom-1',
        uomSymbol: 'kg',
        conversionFactor: 1.0,
        activeLots: [
          {
            lotId: 'lot-1',
            lotNumber: 'LOT-01',
            onHandQty: 35.0,
            expiryDate: mockExpiry,
          },
        ],
      });

      expect(mockPrismaService.barcodeMapping.findUnique).toHaveBeenCalledWith({
        where: { barcode: '9780201379624' },
        include: {
          item: {
            include: { unitOfMeasure: true },
          },
        },
      });
      expect(mockPrismaService.warehouseItemLot.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          qtyOnHand: { gt: 0 },
        },
        include: { lot: true },
        orderBy: { lot: { expiryDate: 'asc' } },
      });
    });

    it('should throw NotFoundException if barcode mapping does not exist', async () => {
      mockPrismaService.barcodeMapping.findUnique.mockResolvedValue(null);

      await expect(
        service.scanBarcode('wh-1', '9780201379624'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unfreeze', () => {
    it('should successfully unfreeze a frozen item and write audit logs', async () => {
      const mockWhItem = {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        qtyOnHand: 100.0,
        qtyAllocated: 5.0,
        wac: 10.0,
        isFrozen: true,
      };

      const mockUpdatedItem = {
        ...mockWhItem,
        isFrozen: false,
      };

      mockPrismaService.warehouseItem.findUnique.mockResolvedValue(mockWhItem);
      mockPrismaService.warehouseItem.update.mockResolvedValue(mockUpdatedItem);

      const result = await service.unfreeze(
        'item-1',
        'wh-1',
        'user-1',
        'Reconciliation correction',
        '127.0.0.1',
      );

      expect(result).toEqual(mockUpdatedItem);
      expect(mockPrismaService.warehouseItem.update).toHaveBeenCalledWith({
        where: {
          warehouseId_itemId: {
            warehouseId: 'wh-1',
            itemId: 'item-1',
          },
        },
        data: {
          isFrozen: false,
        },
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'INVENTORY_UNFREEZE',
          targetTable: 'warehouse_items',
          targetId: 'wh-1_item-1',
          beforeStateJson: JSON.stringify({
            qtyOnHand: 100,
            qtyAllocated: 5,
            wac: 10,
            isFrozen: true,
          }),
          afterStateJson: JSON.stringify({
            qtyOnHand: 100,
            qtyAllocated: 5,
            wac: 10,
            isFrozen: false,
            unfreezeReason: 'Reconciliation correction',
          }),
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('should throw NotFoundException if warehouse item does not exist', async () => {
      mockPrismaService.warehouseItem.findUnique.mockResolvedValue(null);

      await expect(
        service.unfreeze('item-1', 'wh-1', 'user-1', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if item is not frozen', async () => {
      const mockWhItem = {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        isFrozen: false,
      };
      mockPrismaService.warehouseItem.findUnique.mockResolvedValue(mockWhItem);

      await expect(
        service.unfreeze('item-1', 'wh-1', 'user-1', 'Reason'),
      ).rejects.toThrow(
        expect.objectContaining({ message: 'Warehouse item is not frozen.' }),
      );
    });
  });
});

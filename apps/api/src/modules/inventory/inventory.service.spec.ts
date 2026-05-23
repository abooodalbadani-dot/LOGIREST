import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    warehouseItem: {
      findMany: jest.fn(),
    },
    warehouseItemLot: {
      findMany: jest.fn(),
    },
    stockLedger: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    barcodeMapping: {
      findUnique: jest.fn(),
    },
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
          qtyOnHand: 120.5,
          wac: 2.5,
          item: {
            sku: 'ITEM-001',
            name: 'Fresh Tomato',
            category: { name: 'Vegetables' },
            unitOfMeasure: { code: 'kg' },
          },
        },
      ]);

      const result = await service.getBalance('wh-1', {
        itemId: 'item-1',
        categoryId: 'cat-1',
        search: 'tomato',
      });

      expect(result).toEqual([
        {
          itemId: 'item-1',
          itemCode: 'ITEM-001',
          itemName: 'Fresh Tomato',
          categoryName: 'Vegetables',
          onHandQty: 120.5,
          weightedAvgCost: 2.5,
          defaultUomSymbol: 'kg',
        },
      ]);

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
          item: {
            include: {
              category: true,
              unitOfMeasure: true,
            },
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

      const result = await service.getLots('wh-1', {
        itemId: 'item-1',
        status: 'AVAILABLE' as any,
      });

      expect(result).toEqual([
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
      ]);

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
        orderBy: {
          lot: { expiryDate: 'asc' },
        },
      });
    });
  });

  describe('getMovements', () => {
    it('should return paginated movements with metadata', async () => {
      const mockTimestamp = new Date();
      mockPrismaService.stockLedger.count.mockResolvedValue(10);
      mockPrismaService.stockLedger.findMany.mockResolvedValue([
        {
          id: 'ledger-1',
          postedAt: mockTimestamp,
          itemId: 'item-1',
          documentType: 'GRN_IN',
          documentId: 'GRN-01',
          quantity: 50.0,
          item: { name: 'Fresh Tomato' },
          lot: { lotNumber: 'LOT-01' },
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
            balanceAfter: 0,
            performedByUserName: 'System User',
          },
        ],
        meta: {
          total: 10,
          page: 2,
          limit: 5,
          totalPages: 2,
        },
      });

      expect(mockPrismaService.stockLedger.count).toHaveBeenCalled();
      expect(mockPrismaService.stockLedger.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-1', itemId: 'item-1' },
        include: { item: true, lot: true },
        orderBy: { postedAt: 'desc' },
        skip: 5,
        take: 5,
      });
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

      await expect(service.scanBarcode('wh-1', '9780201379624')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

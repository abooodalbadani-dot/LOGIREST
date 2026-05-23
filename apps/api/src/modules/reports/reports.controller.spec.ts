import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { PrismaService } from '../../database/prisma.service';

describe('ReportsController', () => {
  let controller: ReportsController;

  const mockPrismaService = {
    warehouseItem: {
      findMany: jest.fn(),
    },
    warehouseLock: {
      count: jest.fn(),
    },
    purchaseRequest: {
      count: jest.fn(),
    },
    purchaseOrder: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    transfer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    adjustment: {
      groupBy: jest.fn(),
    },
    approvalEvent: {
      findFirst: jest.fn(),
    },
    warehouseItemLot: {
      findMany: jest.fn(),
    },
    stocktakeSession: {
      findFirst: jest.fn(),
    },
    stocktakeSnapshot: {
      findMany: jest.fn(),
    },
    stocktakeCount: {
      findMany: jest.fn(),
    },
    currency: {
      findFirst: jest.fn(),
    },
    fXRate: {
      findFirst: jest.fn(),
    },
    stockLedger: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    jest.clearAllMocks();
  });

  describe('getKpis', () => {
    it('should calculate correct KPIs for a warehouse', async () => {
      mockPrismaService.warehouseItem.findMany.mockResolvedValue([
        { qtyOnHand: 10, wac: 5.5 },
        { qtyOnHand: 0, wac: 2.0 },
        { qtyOnHand: 5, wac: 10.0 },
      ]);
      mockPrismaService.warehouseLock.count.mockResolvedValue(1);

      const result = await controller.getKpis('wh-1');
      expect(result).toEqual({
        totalItems: 3,
        totalValue: 105, // 10*5.5 (55) + 0*2 (0) + 5*10 (50) = 105
        outOfStockCount: 1,
        activeLocks: 1,
      });
    });
  });

  describe('getDashboard', () => {
    it('should calculate correct counts for dashboard reports', async () => {
      mockPrismaService.purchaseRequest.count.mockResolvedValue(4);
      mockPrismaService.purchaseOrder.count.mockResolvedValue(2);
      mockPrismaService.transfer.count.mockResolvedValue(3);

      // Setup overdue transfer checks
      mockPrismaService.transfer.findMany.mockResolvedValue([
        {
          id: 'transfer-1',
          transferNumber: 'TR-0025',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          fromWarehouse: { name: 'Source' },
          toWarehouse: { name: 'Dest' },
        },
      ]);
      mockPrismaService.approvalEvent.findFirst.mockResolvedValue(null); // Fallback to createdAt

      const result = await controller.getDashboard('wh-1');
      expect(result).toEqual({
        pendingPurchaseRequests: 4,
        openPurchaseOrders: 2,
        inTransitTransfers: 3,
        overdueTransfers: 1,
      });
    });
  });

  describe('getAdjustmentsSummary', () => {
    it('should query stock adjustment totals grouped by status', async () => {
      mockPrismaService.adjustment.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { status: 2 } },
        { status: 'POSTED', _count: { status: 15 } },
      ]);

      const result = await controller.getAdjustmentsSummary('wh-1');
      expect(result).toEqual([
        { status: 'DRAFT', count: 2 },
        { status: 'POSTED', count: 15 },
      ]);
      expect(mockPrismaService.adjustment.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { warehouseId: 'wh-1' },
        _count: { status: true },
      });
    });
  });

  describe('getOverdueTransfers', () => {
    it('should return overdue transfers exceeding thresholds', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      mockPrismaService.transfer.findMany.mockResolvedValue([
        {
          id: 'transfer-1',
          transferNumber: 'TR-0025',
          createdAt: tenDaysAgo,
          fromWarehouse: { name: 'Source' },
          toWarehouse: { name: 'Dest' },
        },
      ]);
      mockPrismaService.approvalEvent.findFirst.mockResolvedValue(null);

      const result = await controller.getOverdueTransfers('wh-1');
      expect(result).toEqual([
        {
          transferId: 'transfer-1',
          transferNumber: 'TR-0025',
          sourceWarehouseName: 'Source',
          destinationWarehouseName: 'Dest',
          shippedAt: tenDaysAgo,
          daysInTransit: 10,
        },
      ]);
    });
  });

  describe('getAvailableInventory', () => {
    it('should aggregate available inventory by category', async () => {
      mockPrismaService.warehouseItem.findMany.mockResolvedValue([
        {
          qtyOnHand: 100,
          qtyAllocated: 10,
          item: {
            category: { id: 'cat-1', name: 'Veg' },
          },
        },
        {
          qtyOnHand: 50,
          qtyAllocated: 5,
          item: {
            category: { id: 'cat-1', name: 'Veg' },
          },
        },
        {
          qtyOnHand: 200,
          qtyAllocated: 0,
          item: {
            category: { id: 'cat-2', name: 'Meat' },
          },
        },
      ]);

      const result = await controller.getAvailableInventory('wh-1');
      expect(result).toEqual([
        {
          categoryName: 'Veg',
          qtyOnHand: 150,
          qtyAllocated: 15,
          qtyAvailable: 135,
        },
        {
          categoryName: 'Meat',
          qtyOnHand: 200,
          qtyAllocated: 0,
          qtyAvailable: 200,
        },
      ]);
    });
  });

  describe('getMovements', () => {
    it('should return paginated and filtered movements', async () => {
      mockPrismaService.stockLedger.count.mockResolvedValue(100);
      mockPrismaService.stockLedger.findMany.mockResolvedValue([
        {
          id: '1',
          quantity: 10,
          postedAt: new Date(),
          item: { name: 'Item A' },
        },
      ]);

      const result = await controller.getMovements(
        'wh-1',
        '1',
        '10',
        'item-a',
        '2026-05-01',
        '2026-05-23',
        'GOODS_RECEIVED_NOTE',
      );
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data.length).toBe(1);
    });
  });

  describe('getExpiryReport', () => {
    it('should return expiring lots ordered by expiry date', async () => {
      const futureDate1 = new Date('2026-06-01');
      const futureDate2 = new Date('2026-07-01');
      mockPrismaService.warehouseItemLot.findMany.mockResolvedValue([
        {
          itemId: 'item-1',
          qtyOnHand: 50,
          item: { name: 'Milk', sku: 'SKU-1' },
          lot: { lotNumber: 'LOT-1', expiryDate: futureDate1 },
        },
        {
          itemId: 'item-2',
          qtyOnHand: 20,
          item: { name: 'Cheese', sku: 'SKU-2' },
          lot: { lotNumber: 'LOT-2', expiryDate: futureDate2 },
        },
      ]);

      const result = await controller.getExpiryReport('wh-1');
      expect(result).toEqual([
        {
          itemId: 'item-1',
          itemName: 'Milk',
          sku: 'SKU-1',
          lotNumber: 'LOT-1',
          expiryDate: futureDate1,
          qtyOnHand: 50,
        },
        {
          itemId: 'item-2',
          itemName: 'Cheese',
          sku: 'SKU-2',
          lotNumber: 'LOT-2',
          expiryDate: futureDate2,
          qtyOnHand: 20,
        },
      ]);
    });
  });

  describe('getStocktakeVariance', () => {
    it('should calculate variance for stocktake session', async () => {
      mockPrismaService.stocktakeSession.findFirst.mockResolvedValue({
        id: 'session-1',
        warehouseId: 'wh-1',
      });
      mockPrismaService.stocktakeSnapshot.findMany.mockResolvedValue([
        {
          itemId: 'item-1',
          lotId: 'lot-1',
          qtySnapshot: 10,
          item: { name: 'Item A', sku: 'SKU-A' },
          lot: { lotNumber: 'LOT-A' },
        },
      ]);
      mockPrismaService.stocktakeCount.findMany.mockResolvedValue([
        { itemId: 'item-1', lotId: 'lot-1', qtyCounted: 9.5 },
      ]);

      const result = await controller.getStocktakeVariance('wh-1', 'session-1');
      expect(result).toEqual([
        {
          itemId: 'item-1',
          itemName: 'Item A',
          sku: 'SKU-A',
          lotNumber: 'LOT-A',
          qtySnapshot: 10,
          qtyCounted: 9.5,
          variance: -0.5,
        },
      ]);
    });

    it('should throw BadRequestException if sessionId is not provided', async () => {
      await expect(async () => {
        await controller.getStocktakeVariance('wh-1', '');
      }).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if stocktake session is not found in active warehouse', async () => {
      mockPrismaService.stocktakeSession.findFirst.mockResolvedValue(null);
      await expect(async () => {
        await controller.getStocktakeVariance('wh-1', 'session-other');
      }).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getProcurementStatus', () => {
    it('should return purchase order summary grouped by status', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        { status: 'APPROVED', lines: [{ quantity: 5, unitPrice: 10 }] },
        { status: 'APPROVED', lines: [{ quantity: 2, unitPrice: 50 }] },
        { status: 'DRAFT', lines: [{ quantity: 1, unitPrice: 100 }] },
      ]);

      const result = await controller.getProcurementStatus('wh-1');
      expect(result).toEqual([
        { status: 'APPROVED', count: 2, totalValue: 150 },
        { status: 'DRAFT', count: 1, totalValue: 100 },
      ]);
    });
  });

  describe('getCurrencySummaries', () => {
    it('should return aggregated purchase orders grouped by currency with base equivalents', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        {
          currencyId: 'sar-id',
          currency: { code: 'SAR', isBase: true },
          lines: [{ quantity: 100, unitPrice: 1 }],
        },
        {
          currencyId: 'usd-id',
          currency: { code: 'USD', isBase: false },
          lines: [{ quantity: 10, unitPrice: 5 }],
        },
      ]);
      mockPrismaService.currency.findFirst.mockResolvedValue({
        id: 'sar-id',
        code: 'SAR',
        isBase: true,
      });
      mockPrismaService.fXRate.findFirst.mockResolvedValue({ rate: 3.75 });

      const result = await controller.getCurrencySummaries('wh-1');
      expect(result).toEqual([
        { currencyCode: 'SAR', amount: 100, baseAmount: 100 },
        { currencyCode: 'USD', amount: 50, baseAmount: 187.5 },
      ]);
    });
  });
});

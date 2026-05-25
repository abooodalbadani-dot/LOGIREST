import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../database/prisma.service';
import type { Response } from 'express';

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
      findMany: jest.fn(),
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
      findMany: jest.fn(),
    },
    stockLedger: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    costLedger: {
      findMany: jest.fn(),
    },
    lot: {
      findFirst: jest.fn(),
    },
    lotAllocation: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        ReportsService,
      ],
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
      mockPrismaService.approvalEvent.findMany.mockResolvedValue([]);

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
    it('should return overdue transfers exceeding thresholds without N+1 query', async () => {
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
      mockPrismaService.approvalEvent.findMany.mockResolvedValue([
        {
          documentId: 'transfer-1',
          toStatus: 'IN_TRANSIT',
          createdAt: tenDaysAgo,
        },
      ]);

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
    it('should return detailed item-level available inventory balances', async () => {
      mockPrismaService.warehouseItem.findMany.mockResolvedValue([
        {
          qtyOnHand: 100,
          qtyAllocated: 10,
          wac: 5.5,
          item: {
            sku: 'SKU-001',
            name: 'Item 1',
            category: { id: 'cat-1', name: 'Veg' },
            unitOfMeasure: { code: 'PCS' },
          },
        },
      ]);

      const result = await controller.getAvailableInventory('wh-1');
      expect(result).toEqual([
        {
          sku: 'SKU-001',
          name: 'Item 1',
          category: 'Veg',
          uom: 'PCS',
          qty_physical: 100,
          qty_reserved: 10,
          qty_available: 90,
          wac: 5.5,
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
    it('should return expiring lots ordered by expiry date with remaining days and status', async () => {
      const futureDate1 = new Date('2026-06-01');
      mockPrismaService.warehouseItemLot.findMany.mockResolvedValue([
        {
          itemId: 'item-1',
          qtyOnHand: 50,
          item: { name: 'Milk', sku: 'SKU-1' },
          lot: { lotNumber: 'LOT-1', expiryDate: futureDate1 },
        },
      ]);

      const result = await controller.getExpiryReport('wh-1');
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          sku: 'SKU-1',
          name: 'Milk',
          lot_no: 'LOT-1',
          qtyOnHand: 50,
        }),
      );
    });
  });

  describe('getStocktakeVariance', () => {
    it('should calculate variance for stocktake session matching client keys', async () => {
      mockPrismaService.stocktakeSession.findFirst.mockResolvedValue({
        id: 'session-1',
        warehouseId: 'wh-1',
      });
      mockPrismaService.stocktakeSnapshot.findMany.mockResolvedValue([
        {
          itemId: 'item-1',
          lotId: 'lot-1',
          qtySnapshot: 10,
          wacSnapshot: 5.0,
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
          sku: 'SKU-A',
          name: 'Item A',
          system_qty: 10,
          counted_qty: 9.5,
          variance: -0.5,
          reason: '',
          lotNumber: 'LOT-A',
          wac: 5.0,
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
    it('should return detailed itemized purchase order status', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        {
          poNumber: 'PO-0001',
          createdAt: new Date(),
          supplier: { name: 'ABC Supplier' },
          currency: { code: 'USD' },
          status: 'APPROVED',
          lines: [{ quantity: 5, unitPrice: 10 }],
        },
      ]);

      const result = await controller.getProcurementStatus('wh-1');
      expect(result).toEqual([
        {
          po_no: 'PO-0001',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          date: expect.any(String),
          supplier: 'ABC Supplier',
          currency: 'USD',
          total: 50,
          status: 'APPROVED',
        },
      ]);
    });
  });

  describe('getCurrencySummaries', () => {
    it('should return aggregated purchase orders grouped by currency with base equivalents without N+1 query', async () => {
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
      mockPrismaService.fXRate.findMany.mockResolvedValue([
        { fromCurrencyId: 'usd-id', rate: 3.75 },
      ]);

      const result = await controller.getCurrencySummaries('wh-1');
      expect(result).toEqual([
        { currency: 'SAR', total: 100, total_base: 100, last_rate: 1 },
        { currency: 'USD', total: 50, total_base: 187.5, last_rate: 3.75 },
      ]);
    });
  });

  describe('getWacHistory', () => {
    it('should query cost ledger for WAC history filtered by warehouse and item', async () => {
      mockPrismaService.costLedger.findMany.mockResolvedValue([
        {
          id: '1',
          postedAt: new Date(),
          warehouseId: 'wh-1',
          itemId: 'item-1',
          quantity: 10,
          unitPrice: 5,
          newWac: 5,
          documentId: 'doc-1',
          documentType: 'GOODS_RECEIVED_NOTE',
          item: { sku: 'SKU-1', name: 'Item 1' },
        },
      ]);

      const result = await controller.getWacHistory('wh-1', 'item-1');
      expect(result.length).toBe(1);
      expect(result[0].newWac).toBe(5);
    });

    it('should throw BadRequestException if itemId is missing', async () => {
      await expect(async () => {
        await controller.getWacHistory('wh-1', '');
      }).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLotTrace', () => {
    it('should trace lot receipt and issue allocations', async () => {
      mockPrismaService.lot.findFirst.mockResolvedValue({
        id: 'lot-1',
        lotNumber: 'LOT-001',
        receivedDate: new Date(),
        expiryDate: null,
        status: 'ACTIVE',
        item: { sku: 'SKU-1', name: 'Item 1' },
      });

      mockPrismaService.lotAllocation.findMany.mockResolvedValue([
        {
          id: 'alloc-1',
          quantityAllocated: 5,
          issueLine: {
            inventoryIssue: {
              issueNumber: 'ISSUE-0001',
              createdAt: new Date(),
              status: 'POSTED',
            },
          },
          transferLine: null,
        },
      ]);

      const result = await controller.getLotTrace('wh-1', 'lot-1');
      expect(result.lotNumber).toBe('LOT-001');
      expect(result.allocations.length).toBe(1);
      expect(result.allocations[0].documentNumber).toBe('ISSUE-0001');
    });

    it('should throw BadRequestException if lotId is missing', async () => {
      await expect(async () => {
        await controller.getLotTrace('wh-1', '');
      }).rejects.toThrow(BadRequestException);
    });
  });

  describe('Excel Export Endpoints', () => {
    const mockRes = {
      setHeader: jest.fn(),
      write: jest.fn((chunk: unknown, encoding?: unknown, cb?: unknown) => {
        const callback =
          typeof cb === 'function'
            ? cb
            : typeof encoding === 'function'
              ? encoding
              : null;
        if (typeof callback === 'function') {
          (callback as () => void)();
        }
        return true;
      }),
      end: jest.fn(),
    };

    it('should set headers and return valid movements spreadsheet', async () => {
      mockPrismaService.stockLedger.count.mockResolvedValue(1);
      mockPrismaService.stockLedger.findMany.mockResolvedValue([
        {
          postedAt: new Date(),
          item: { name: 'Item 1', sku: 'SKU-1' },
          documentType: 'GOODS_RECEIVED_NOTE',
          documentId: 'grn-1',
          quantity: 10,
        },
      ]);

      await controller.exportMovements(
        'wh-1',
        'Admin',
        mockRes as unknown as Response,
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
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
});

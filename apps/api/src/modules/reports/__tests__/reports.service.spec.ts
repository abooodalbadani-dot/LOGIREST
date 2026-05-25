import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportsService } from '../reports.service';
import { PrismaService } from '../../../database/prisma.service';
import { MAX_EXPORT_ROWS } from '../reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrismaService = {
    warehouseItem: { findMany: jest.fn() },
    warehouseLock: { count: jest.fn() },
    purchaseRequest: { count: jest.fn() },
    purchaseOrder: { count: jest.fn(), findMany: jest.fn() },
    transfer: { count: jest.fn(), findMany: jest.fn() },
    adjustment: { groupBy: jest.fn() },
    approvalEvent: { findFirst: jest.fn(), findMany: jest.fn() },
    warehouseItemLot: { count: jest.fn(), findMany: jest.fn() },
    stocktakeSession: { findFirst: jest.fn() },
    stocktakeSnapshot: { count: jest.fn(), findMany: jest.fn() },
    stocktakeCount: { findMany: jest.fn() },
    currency: { findFirst: jest.fn() },
    fXRate: { findFirst: jest.fn(), findMany: jest.fn() },
    stockLedger: { count: jest.fn(), findMany: jest.fn() },
    costLedger: { count: jest.fn(), findMany: jest.fn() },
    lot: { findFirst: jest.fn() },
    lotAllocation: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getKpis', () => {
    it('should calculate KPIs for a warehouse', async () => {
      mockPrismaService.warehouseItem.findMany.mockResolvedValue([
        { qtyOnHand: 10, wac: 5.5 },
        { qtyOnHand: 0, wac: 2.0 },
        { qtyOnHand: 5, wac: 10.0 },
      ]);
      mockPrismaService.warehouseLock.count.mockResolvedValue(1);

      const result = await service.getKpis('wh-1');
      expect(result.totalItems).toBe(3);
      expect(result.totalValue).toBe(105);
      expect(result.outOfStockCount).toBe(1);
      expect(result.activeLocks).toBe(1);
    });
  });

  describe('getMovements', () => {
    it('should return paginated movements with total count', async () => {
      mockPrismaService.stockLedger.count.mockResolvedValue(100);
      mockPrismaService.stockLedger.findMany.mockResolvedValue([
        { id: '1', quantity: 10, postedAt: new Date(), item: { name: 'Item A', sku: 'SKU-A' } },
      ]);

      const result = await service.getMovements('wh-1', '1', '10');
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data.length).toBe(1);
    });
  });

  describe('getWacHistory', () => {
    it('should throw BadRequestException if itemId is missing', async () => {
      await expect(service.getWacHistory('wh-1', '')).rejects.toThrow(BadRequestException);
    });

    it('should query cost ledger with correct filters', async () => {
      mockPrismaService.costLedger.findMany.mockResolvedValue([
        { id: '1', postedAt: new Date(), warehouseId: 'wh-1', itemId: 'item-1', quantity: 10, unitPrice: 5, newWac: 5, documentId: 'doc-1', documentType: 'GOODS_RECEIVED_NOTE', item: { sku: 'SKU-1', name: 'Item 1' } },
      ]);

      const result = await service.getWacHistory('wh-1', 'item-1');
      expect(result.length).toBe(1);
      expect(result[0].newWac).toBe(5);
    });
  });

  describe('getLotTrace', () => {
    it('should throw BadRequestException if lotId is missing', async () => {
      await expect(service.getLotTrace('wh-1', '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if lot not found', async () => {
      mockPrismaService.lot.findFirst.mockResolvedValue(null);
      await expect(service.getLotTrace('wh-1', 'invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReportCount', () => {
    it('should count movements with filters', async () => {
      mockPrismaService.stockLedger.count.mockResolvedValue(150);
      const result = await service.getReportCount('movements', 'wh-1', {});
      expect(result.count).toBe(150);
      expect(result.limit).toBe(MAX_EXPORT_ROWS);
      expect(result.isExportable).toBe(true);
    });

    it('should return isExportable false when count exceeds limit', async () => {
      mockPrismaService.stockLedger.count.mockResolvedValue(MAX_EXPORT_ROWS + 1);
      const result = await service.getReportCount('movements', 'wh-1', {});
      expect(result.isExportable).toBe(false);
    });

    it('should count expiry report rows', async () => {
      mockPrismaService.warehouseItemLot.count.mockResolvedValue(25);
      const result = await service.getReportCount('expiry', 'wh-1', {});
      expect(result.count).toBe(25);
    });

    it('should throw BadRequestException for unknown report type', async () => {
      await expect(service.getReportCount('unknown', 'wh-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkExportLimit', () => {
    it('should not throw when count is within limit', () => {
      expect(() => service.checkExportLimit(MAX_EXPORT_ROWS)).not.toThrow();
    });

    it('should throw HttpException 413 when count exceeds MAX_EXPORT_ROWS', () => {
      try {
        service.checkExportLimit(MAX_EXPORT_ROWS + 1);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
        expect((error as HttpException).message).toContain('Payload Too Large');
        expect((error as HttpException).message).toContain('50');
      }
    });
  });

  describe('exportMovementsCursor', () => {
    it('should return first chunk with cursor when hasMore is true', async () => {
      const items = Array.from({ length: 1001 }, (_, i) => ({
        id: `id-${i}`,
        postedAt: new Date(),
        item: { name: `Item ${i}`, sku: `SKU-${i}` },
        documentType: 'GOODS_RECEIVED_NOTE',
        documentId: `doc-${i}`,
        quantity: i + 1,
      }));
      mockPrismaService.stockLedger.findMany.mockResolvedValue(items);

      const result = await service.exportMovementsCursor('wh-1');
      expect(result.data.length).toBe(1000);
      expect(result.nextCursor).toBe('id-999');
      expect(result.hasMore).toBe(true);
    });

    it('should return last chunk without cursor when hasMore is false', async () => {
      const items = Array.from({ length: 500 }, (_, i) => ({
        id: `id-${i}`,
        postedAt: new Date(),
        item: { name: `Item ${i}`, sku: `SKU-${i}` },
        documentType: 'GOODS_RECEIVED_NOTE',
        documentId: `doc-${i}`,
        quantity: i + 1,
      }));
      mockPrismaService.stockLedger.findMany.mockResolvedValue(items);

      const result = await service.exportMovementsCursor('wh-1', 'id-250');
      expect(result.data.length).toBe(500);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.stockLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'id-250' }, skip: 1 }),
      );
    });
  });

  describe('exportExpiryCursor', () => {
    it('should return expiry data with cursor-based pagination', async () => {
      const lots = Array.from({ length: 10 }, (_, i) => ({
        id: `lot-${i}`,
        qtyOnHand: i + 10,
        item: { sku: `SKU-${i}`, name: `Item ${i}` },
        lot: { lotNumber: `LOT-${i}`, expiryDate: new Date(Date.now() + (i + 1) * 86400000) },
      }));
      mockPrismaService.warehouseItemLot.findMany.mockResolvedValue(lots);

      const result = await service.exportExpiryCursor('wh-1');
      expect(result.data.length).toBe(10);
      expect(result.data[0]).toHaveProperty('sku');
      expect(result.data[0]).toHaveProperty('lot_no');
      expect(result.data[0]).toHaveProperty('days_remaining');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('exportLotTraceCursor', () => {
    it('should return lot trace allocations as a single chunk', async () => {
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
          issueLine: { inventoryIssue: { issueNumber: 'ISSUE-0001', createdAt: new Date(), status: 'POSTED' } },
          transferLine: null,
        },
      ]);

      const result = await service.exportLotTraceCursor('wh-1', 'lot-1');
      expect(result.data.length).toBe(1);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getExpiryReport', () => {
    it('should return expiry report with computed status', async () => {
      const futureDate = new Date(Date.now() + 30 * 86400000);
      mockPrismaService.warehouseItemLot.findMany.mockResolvedValue([
        {
          qtyOnHand: 50,
          item: { sku: 'SKU-1', name: 'Milk' },
          lot: { lotNumber: 'LOT-1', expiryDate: futureDate },
        },
      ]);

      const result = await service.getExpiryReport('wh-1');
      expect(result.length).toBe(1);
      expect(result[0].sku).toBe('SKU-1');
      expect(result[0].status).toBe('ACTIVE');
    });
  });
});

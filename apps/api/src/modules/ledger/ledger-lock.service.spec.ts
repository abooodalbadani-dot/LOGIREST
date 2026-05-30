import { Test, TestingModule } from '@nestjs/testing';
import { LedgerLockService } from './ledger-lock.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma, WarehouseItem, WarehouseItemLot } from '@prisma/client';

describe('LedgerLockService', () => {
  let service: LedgerLockService;

  const mockQueryRaw = jest.fn();
  const mockPrismaTx = {
    $queryRaw: mockQueryRaw,
  } as unknown as Prisma.TransactionClient;

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          cb(mockPrismaTx),
      ),
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerLockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LedgerLockService>(LedgerLockService);
    jest.clearAllMocks();
  });

  describe('lockItem', () => {
    it('should acquire raw SQL FOR UPDATE lock on warehouse_items', async () => {
      mockQueryRaw.mockResolvedValue([
        { warehouseId: 'wh-1', itemId: 'item-1', qtyOnHand: 10 },
      ]);

      const result = await service.lockItem(mockPrismaTx, 'wh-1', 'item-1');

      expect(result).toEqual({
        warehouseId: 'wh-1',
        itemId: 'item-1',
        qtyOnHand: 10,
      });
      expect(mockQueryRaw).toHaveBeenCalled();
      const mockCalls = mockQueryRaw.mock.calls as Array<
        [TemplateStringsArray, ...unknown[]]
      >;
      const sqlCall = mockCalls[0][0];
      expect(sqlCall.join(' ')).toContain('SELECT * FROM "warehouse_items"');
      expect(sqlCall.join(' ')).toContain('FOR UPDATE');
      expect(mockCalls[0][1]).toBe('wh-1');
      expect(mockCalls[0][2]).toBe('item-1');
    });
  });

  describe('lockLots', () => {
    it('should acquire raw SQL FOR UPDATE locks on warehouse_item_lots in sorted order', async () => {
      mockQueryRaw.mockResolvedValue([
        { warehouseId: 'wh-1', itemId: 'item-1', lotId: 'lot-a', qtyOnHand: 5 },
      ]);

      // Lock two lots, unsorted: 'lot-b' and 'lot-a'
      await service.lockLots(mockPrismaTx, 'wh-1', 'item-1', [
        'lot-b',
        'lot-a',
      ]);

      // Should have been sorted to lock 'lot-a' first, then 'lot-b'
      expect(mockQueryRaw).toHaveBeenCalledTimes(2);

      const mockCalls = mockQueryRaw.mock.calls as Array<
        [TemplateStringsArray, ...unknown[]]
      >;
      const firstCallSql = mockCalls[0][0].join(' ');
      const secondCallSql = mockCalls[1][0].join(' ');

      expect(firstCallSql).toContain('FOR UPDATE');
      expect(secondCallSql).toContain('FOR UPDATE');

      // Verify parameters order
      expect(mockCalls[0][1]).toBe('wh-1');
      expect(mockCalls[0][2]).toBe('item-1');
      expect(mockCalls[0][3]).toBe('lot-a'); // First sorted

      expect(mockCalls[1][1]).toBe('wh-1');
      expect(mockCalls[1][2]).toBe('item-1');
      expect(mockCalls[1][3]).toBe('lot-b'); // Second sorted
    });
  });

  describe('assertItemBalance', () => {
    it('should not throw if stock is sufficient', () => {
      const item = {
        qtyOnHand: new Prisma.Decimal(10),
      } as unknown as WarehouseItem;
      expect(() => service.assertItemBalance(item, 5, 'item-1')).not.toThrow();
    });

    it('should throw BadRequestException if warehouseItem is null/undefined', () => {
      expect(() => service.assertItemBalance(null, 5, 'item-1')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if stock is insufficient', () => {
      const item = {
        qtyOnHand: new Prisma.Decimal(3),
      } as unknown as WarehouseItem;
      expect(() => service.assertItemBalance(item, 5, 'item-1')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertLotBalance', () => {
    it('should not throw if lot stock is sufficient', () => {
      const lot = {
        qtyOnHand: new Prisma.Decimal(10),
        lotId: 'lot-1',
      } as unknown as WarehouseItemLot;
      expect(() => service.assertLotBalance(lot, 5, 'lot-1')).not.toThrow();
    });

    it('should throw BadRequestException if warehouseItemLot is null/undefined', () => {
      expect(() => service.assertLotBalance(null, 5, 'lot-1')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if lot stock is insufficient', () => {
      const lot = {
        qtyOnHand: new Prisma.Decimal(3),
        lotId: 'lot-1',
      } as unknown as WarehouseItemLot;
      expect(() => service.assertLotBalance(lot, 5, 'lot-1')).toThrow(
        BadRequestException,
      );
    });
  });
});

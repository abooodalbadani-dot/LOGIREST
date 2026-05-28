import { Test, TestingModule } from '@nestjs/testing';
import { WacService } from './wac.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from './ledger-lock.service';
import { DocumentType, Prisma } from '@prisma/client';

describe('WacService', () => {
  let service: WacService;

  const mockWarehouseItemUpdate = jest.fn();
  const mockCostLedgerCreate = jest.fn();
  const mockLockItem = jest.fn();

  const mockPrismaTx = {
    warehouseItem: {
      update: mockWarehouseItemUpdate,
    },
    costLedger: {
      create: mockCostLedgerCreate,
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
    lockItem: mockLockItem,
  } as unknown as LedgerLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WacService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<WacService>(WacService);
    jest.clearAllMocks();
  });

  describe('recalculate', () => {
    const whId = 'wh-1';
    const itemId = 'item-1';
    const docId = 'doc-1';

    it('should recalculate WAC correctly when current qty is positive', async () => {
      mockLockItem.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(20),
        wac: new Prisma.Decimal(5.0),
      });

      const newWac = await service.recalculate(
        mockPrismaTx,
        whId,
        itemId,
        10,
        7.0,
        docId,
      );

      expect(newWac).toBe(6.0);
      expect(mockLockItem).toHaveBeenCalledWith(mockPrismaTx, whId, itemId);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { wac: new Prisma.Decimal(6.0) },
      });
      expect(mockCostLedgerCreate).toHaveBeenCalledWith({
        data: {
          warehouseId: whId,
          itemId: itemId,
          quantity: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(7.0),
          newWac: new Prisma.Decimal(6.0),
          documentId: docId,
          documentType: DocumentType.GOODS_RECEIVED_NOTE,
          idempotencyKey: undefined,
        },
      });
    });

    it('should set new WAC to received unit price if current qty is 0', async () => {
      mockLockItem.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(10),
        wac: new Prisma.Decimal(5.0),
      });

      const newWac = await service.recalculate(
        mockPrismaTx,
        whId,
        itemId,
        10,
        8.0,
        docId,
      );

      expect(newWac).toBe(8.0);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { wac: new Prisma.Decimal(8.0) },
      });
    });

    it('should set new WAC to received unit price if current qty is negative', async () => {
      mockLockItem.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(5),
        wac: new Prisma.Decimal(4.0),
      });

      const newWac = await service.recalculate(
        mockPrismaTx,
        whId,
        itemId,
        10,
        10.0,
        docId,
      );

      expect(newWac).toBe(10.0);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { wac: new Prisma.Decimal(10.0) },
      });
    });
  });

  describe('handlePositiveAdjustment', () => {
    const whId = 'wh-1';
    const itemId = 'item-1';
    const docId = 'doc-1';

    it('should recalculate WAC correctly when positive adjustment is posted', async () => {
      mockLockItem.mockResolvedValue({
        warehouseId: whId,
        itemId: itemId,
        qtyOnHand: new Prisma.Decimal(20),
        wac: new Prisma.Decimal(5.0),
      });

      const wacResult = await service.handlePositiveAdjustment(
        mockPrismaTx,
        whId,
        itemId,
        10,
        7.0,
        docId,
      );

      expect(wacResult).toBe(6.0);
      expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
        where: { warehouseId_itemId: { warehouseId: whId, itemId } },
        data: { wac: new Prisma.Decimal(6.0) },
      });
      expect(mockCostLedgerCreate).toHaveBeenCalledWith({
        data: {
          warehouseId: whId,
          itemId: itemId,
          quantity: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(7.0),
          newWac: new Prisma.Decimal(6.0),
          documentId: docId,
          documentType: DocumentType.ADJUSTMENT,
          idempotencyKey: undefined,
        },
      });
    });
  });
});

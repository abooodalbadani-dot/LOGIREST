import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '../../database/prisma.service';

describe('InventoryController', () => {
  let controller: InventoryController;

  const mockPrismaService = {
    warehouseItem: {
      findMany: jest.fn(),
    },
    stockLedger: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    jest.clearAllMocks();
  });

  it('should get balances for a warehouse', async () => {
    mockPrismaService.warehouseItem.findMany.mockResolvedValue([]);

    const result = await controller.getBalances('wh-1');
    expect(result).toEqual([]);
    expect(mockPrismaService.warehouseItem.findMany).toHaveBeenCalledWith({
      where: { warehouseId: 'wh-1' },
      include: { item: true },
    });
  });

  it('should get movements for a warehouse without item filter', async () => {
    mockPrismaService.stockLedger.findMany.mockResolvedValue([]);

    const result = await controller.getMovements('wh-1');
    expect(result).toEqual([]);
    expect(mockPrismaService.stockLedger.findMany).toHaveBeenCalledWith({
      where: { warehouseId: 'wh-1' },
      include: { item: true, lot: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should get movements with item filter', async () => {
    mockPrismaService.stockLedger.findMany.mockResolvedValue([]);

    const result = await controller.getMovements('wh-1', 'item-1');
    expect(result).toEqual([]);
    expect(mockPrismaService.stockLedger.findMany).toHaveBeenCalledWith({
      where: { warehouseId: 'wh-1', itemId: 'item-1' },
      include: { item: true, lot: true },
      orderBy: { createdAt: 'desc' },
    });
  });
});

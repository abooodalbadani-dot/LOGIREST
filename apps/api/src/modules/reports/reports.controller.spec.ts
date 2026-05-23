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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    jest.clearAllMocks();
  });

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

    expect(mockPrismaService.warehouseItem.findMany).toHaveBeenCalledWith({
      where: { warehouseId: 'wh-1' },
      select: { qtyOnHand: true, wac: true },
    });
    expect(mockPrismaService.warehouseLock.count).toHaveBeenCalledWith({
      where: { warehouseId: 'wh-1', isActive: true },
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WacConsistencyJob } from './wac-consistency.job';
import { PrismaService } from '../database/prisma.service';
import { NotificationService } from '../modules/notifications/notification.service';

describe('WacConsistencyJob', () => {
  let job: WacConsistencyJob;

  const mockPrismaService = {
    warehouseItem: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WacConsistencyJob,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    job = module.get<WacConsistencyJob>(WacConsistencyJob);
    jest.clearAllMocks();
  });

  it('should detect WAC discrepancy when positive WAC exists but no CostLedger entries found', async () => {
    mockPrismaService.warehouseItem.findMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        wac: 12.5,
        item: { sku: 'SKU-001' },
        warehouse: { name: 'Warehouse 1', code: 'WH1' },
      },
    ]);
    mockPrismaService.$queryRaw.mockResolvedValue([]); // No ledger entries

    await job.checkWacConsistency();

    expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
      targetRole: 'ADMIN',
      warehouseId: 'wh-1',
      message: expect.stringContaining('WAC Discrepancy: Item SKU SKU-001'),
    });
  });

  it('should not detect discrepancy when WAC is 0 and no CostLedger entries exist', async () => {
    mockPrismaService.warehouseItem.findMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        wac: 0,
        item: { sku: 'SKU-001' },
        warehouse: { name: 'Warehouse 1', code: 'WH1' },
      },
    ]);
    mockPrismaService.$queryRaw.mockResolvedValue([]);

    await job.checkWacConsistency();

    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('should not detect discrepancy when WAC matches the latest CostLedger entry', async () => {
    mockPrismaService.warehouseItem.findMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        wac: 15.0,
        item: { sku: 'SKU-001' },
        warehouse: { name: 'Warehouse 1', code: 'WH1' },
      },
    ]);
    mockPrismaService.$queryRaw.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        newWac: 15.0,
      },
    ]);

    await job.checkWacConsistency();

    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('should raise critical drift notification when WAC variance exceeds 0.01%', async () => {
    mockPrismaService.warehouseItem.findMany.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        wac: 15.1, // Drifts significantly from 15.0
        item: { sku: 'SKU-001' },
        warehouse: { name: 'Warehouse 1', code: 'WH1' },
      },
    ]);
    mockPrismaService.$queryRaw.mockResolvedValue([
      {
        warehouseId: 'wh-1',
        itemId: 'item-1',
        newWac: 15.0,
      },
    ]);

    await job.checkWacConsistency();

    expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
      targetRole: 'ADMIN',
      warehouseId: 'wh-1',
      message: expect.stringContaining('CRITICAL WAC DRIFT: Item SKU SKU-001'),
    });
  });
});

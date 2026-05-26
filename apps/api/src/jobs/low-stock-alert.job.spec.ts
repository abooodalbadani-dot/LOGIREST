import { Test, TestingModule } from '@nestjs/testing';
import { LowStockAlertJob } from './low-stock-alert.job';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../modules/outbox/outbox.service';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('LowStockAlertJob', () => {
  let job: LowStockAlertJob;
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockPrisma: {
    warehouseItem: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mockOutbox: {
    writeEvent: jest.Mock;
  };

  const redisStore = new Map<string, string>();

  beforeEach(async () => {
    redisStore.clear();
    mockRedis = {
      get: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(redisStore.get(key) || null);
      }),
      set: jest.fn().mockImplementation((key: string, value: string) => {
        redisStore.set(key, value);
        return Promise.resolve('OK');
      }),
    };
    mockPrisma = {
      warehouseItem: {
        findMany: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          async (
            callback: (tx: unknown) => Promise<unknown>,
          ): Promise<unknown> => {
            return await callback(mockPrisma);
          },
        ),
    };

    mockOutbox = {
      writeEvent: jest.fn().mockResolvedValue({ id: 'event-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LowStockAlertJob,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: OutboxService,
          useValue: mockOutbox,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    job = module.get<LowStockAlertJob>(LowStockAlertJob);
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  it('should do nothing if there are no items with reorderPoint configured', async () => {
    mockPrisma.warehouseItem.findMany.mockResolvedValue([]);

    await job.checkLowStockThresholds();

    expect(mockOutbox.writeEvent).not.toHaveBeenCalled();
  });

  it('should not trigger alert if qtyOnHand is greater than reorderPoint', async () => {
    const mockWhItem = {
      warehouseId: 'wh-1',
      itemId: 'item-1',
      qtyOnHand: 10,
      item: {
        sku: 'SKU-001',
        name: 'Item 1',
        reorderPoint: 5,
        unitOfMeasure: { code: 'PCS' },
      },
      warehouse: {
        code: 'WH01',
        name: 'Main Warehouse',
      },
    };

    mockPrisma.warehouseItem.findMany.mockResolvedValue([mockWhItem]);

    await job.checkLowStockThresholds();

    expect(mockOutbox.writeEvent).not.toHaveBeenCalled();
  });

  it('should trigger alert if qtyOnHand is less than or equal to reorderPoint', async () => {
    const mockWhItem = {
      warehouseId: 'wh-1',
      itemId: 'item-1',
      qtyOnHand: 3,
      item: {
        sku: 'SKU-001',
        name: 'Item 1',
        reorderPoint: 5,
        unitOfMeasure: { code: 'PCS' },
      },
      warehouse: {
        code: 'WH01',
        name: 'Main Warehouse',
      },
    };

    mockPrisma.warehouseItem.findMany.mockResolvedValue([mockWhItem]);

    await job.checkLowStockThresholds();

    expect(mockOutbox.writeEvent).toHaveBeenCalledWith(
      expect.any(Object),
      'LOW_STOCK_ALERT',
      expect.objectContaining({
        itemId: 'item-1',
        sku: 'SKU-001',
        qtyOnHand: 3,
        reorderPoint: 5,
      }) as unknown,
    );
  });

  it('should enforce 24-hour debounce registry', async () => {
    const mockWhItem = {
      warehouseId: 'wh-1',
      itemId: 'item-1',
      qtyOnHand: 3,
      item: {
        sku: 'SKU-001',
        name: 'Item 1',
        reorderPoint: 5,
        unitOfMeasure: { code: 'PCS' },
      },
      warehouse: {
        code: 'WH01',
        name: 'Main Warehouse',
      },
    };

    mockPrisma.warehouseItem.findMany.mockResolvedValue([mockWhItem]);

    // 1st run: Alert should be written
    await job.checkLowStockThresholds();
    expect(mockOutbox.writeEvent).toHaveBeenCalledTimes(1);

    // 2nd run immediately after: Alert should be debounced and NOT written again
    await job.checkLowStockThresholds();
    expect(mockOutbox.writeEvent).toHaveBeenCalledTimes(1);

    // Clear redis store to simulate TTL expiry (24h passed)
    redisStore.clear();

    // 3rd run: Alert should be written again after 24h debounce expires
    await job.checkLowStockThresholds();
    expect(mockOutbox.writeEvent).toHaveBeenCalledTimes(2);
  });
});

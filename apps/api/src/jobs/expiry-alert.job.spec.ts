import { Test, TestingModule } from '@nestjs/testing';
import { ExpiryAlertJob } from './expiry-alert.job';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../modules/outbox/outbox.service';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('ExpiryAlertJob', () => {
  let job: ExpiryAlertJob;
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockPrisma: {
    warehouseItemLot: {
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
      warehouseItemLot: {
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
        ExpiryAlertJob,
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

    job = module.get<ExpiryAlertJob>(ExpiryAlertJob);
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  it('should do nothing if there are no expiring lots within the 7-day window', async () => {
    mockPrisma.warehouseItemLot.findMany.mockResolvedValue([]);

    await job.checkExpiringLots();

    expect(mockOutbox.writeEvent).not.toHaveBeenCalled();
  });

  it('should trigger alert if expiring lot is found', async () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    const mockWhLot = {
      warehouseId: 'wh-1',
      lotId: 'lot-1',
      itemId: 'item-1',
      qtyOnHand: 10,
      item: {
        sku: 'SKU-001',
        name: 'Milk 1L',
        unitOfMeasure: { code: 'PCS' },
      },
      lot: {
        lotNumber: 'LOT-2026-05',
        expiryDate,
      },
      warehouse: {
        code: 'WH01',
        name: 'Main Warehouse',
      },
    };

    mockPrisma.warehouseItemLot.findMany.mockResolvedValue([mockWhLot]);

    await job.checkExpiringLots();

    expect(mockOutbox.writeEvent).toHaveBeenCalledWith(
      expect.any(Object),
      'EXPIRY_WARNING',
      expect.objectContaining({
        lotId: 'lot-1',
        lotNumber: 'LOT-2026-05',
        itemId: 'item-1',
        itemName: 'Milk 1L',
        sku: 'SKU-001',
        qtyOnHand: 10,
        expiryDate,
      }) as unknown,
    );
  });

  it('should enforce 24-hour debounce on lot expiry alerts', async () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    const mockWhLot = {
      warehouseId: 'wh-1',
      lotId: 'lot-1',
      itemId: 'item-1',
      qtyOnHand: 10,
      item: {
        sku: 'SKU-001',
        name: 'Milk 1L',
        unitOfMeasure: { code: 'PCS' },
      },
      lot: {
        lotNumber: 'LOT-2026-05',
        expiryDate,
      },
      warehouse: {
        code: 'WH01',
        name: 'Main Warehouse',
      },
    };

    mockPrisma.warehouseItemLot.findMany.mockResolvedValue([mockWhLot]);

    // 1st run: Alert should be written
    await job.checkExpiringLots();
    expect(mockOutbox.writeEvent).toHaveBeenCalledTimes(1);

    // 2nd run immediately after: Alert should be debounced and NOT written again
    await job.checkExpiringLots();
    expect(mockOutbox.writeEvent).toHaveBeenCalledTimes(1);

    // Clear redis store to simulate TTL expiry (24h passed)
    redisStore.clear();

    // 3rd run: Alert should be written again after 24h debounce expires
    await job.checkExpiringLots();
    expect(mockOutbox.writeEvent).toHaveBeenCalledTimes(2);
  });
});

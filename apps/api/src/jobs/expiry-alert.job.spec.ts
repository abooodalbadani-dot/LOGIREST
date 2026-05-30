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
    lot: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
    notificationLog: {
      create: jest.Mock;
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
      lot: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      notificationLog: {
        create: jest.fn(),
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

  it('should transition expired lots to EXPIRED status, write audit logs, and trigger critical notification if stock is positive', async () => {
    const expiredLot = {
      id: 'expired-lot-1',
      lotNumber: 'LOT-EXP-1',
      status: 'ACTIVE',
      expiryDate: new Date(Date.now() - 1000),
      item: { name: 'Expired Milk' },
      warehouseItemLots: [
        {
          warehouseId: 'wh-1',
          qtyOnHand: 5,
          warehouse: { code: 'WH1' },
        },
      ],
    };

    mockPrisma.lot.findMany.mockResolvedValue([expiredLot]);
    mockPrisma.warehouseItemLot.findMany.mockResolvedValue([]);

    await job.checkExpiringLots();

    expect(mockPrisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'expired-lot-1' },
      data: { status: 'EXPIRED' },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOT_EXPIRED',
        targetTable: 'lots',
        targetId: 'expired-lot-1',
      }),
    });
    expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetRole: 'INV_MGR',
        warehouseId: 'wh-1',
        message: expect.stringContaining('CRITICAL: Expired lot LOT-EXP-1'),
      }),
    });
  });
});

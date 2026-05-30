import { Test, TestingModule } from '@nestjs/testing';
import { OutboxSweepJob } from './outbox-sweep.job';
import { PrismaService } from '../../database/prisma.service';
import { RedisLockService } from '../../redis/redis-lock.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('OutboxSweepJob', () => {
  let job: OutboxSweepJob;
  let prismaMock: any;
  let lockServiceMock: any;
  let queueMock: any;

  beforeEach(async () => {
    prismaMock = {
      outboxEvent: {
        findMany: jest.fn(),
      },
    };

    lockServiceMock = {
      runWithLock: jest.fn().mockImplementation(async (key, ttl, fn) => {
        return await fn();
      }),
    };

    queueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxSweepJob,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisLockService, useValue: lockServiceMock },
        { provide: getQueueToken('outbox'), useValue: queueMock },
      ],
    }).compile();

    job = module.get<OutboxSweepJob>(OutboxSweepJob);
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  it('should skip re-enqueueing if no stale outbox events are found', async () => {
    prismaMock.outboxEvent.findMany.mockResolvedValue([]);

    await job.sweepStaleOutboxEvents();

    expect(lockServiceMock.runWithLock).toHaveBeenCalledWith(
      'outbox-sweep',
      250,
      expect.any(Function),
    );
    expect(prismaMock.outboxEvent.findMany).toHaveBeenCalled();
    expect(queueMock.add).not.toHaveBeenCalled();
  });

  it('should re-enqueue stale PENDING events to BullMQ outbox queue', async () => {
    const mockEvents = [
      {
        id: 'event-1',
        eventType: 'GRN_POSTED',
        status: 'PENDING',
        attempts: 0,
      },
      {
        id: 'event-2',
        eventType: 'LOW_STOCK_ALERT',
        status: 'PENDING',
        attempts: 1,
      },
    ];
    prismaMock.outboxEvent.findMany.mockResolvedValue(mockEvents);

    await job.sweepStaleOutboxEvents();

    expect(prismaMock.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PENDING',
          attempts: { lt: 5 },
          createdAt: { lt: expect.any(Date) },
        },
        take: 50,
      }),
    );

    expect(queueMock.add).toHaveBeenCalledTimes(2);
    expect(queueMock.add).toHaveBeenNthCalledWith(
      1,
      'process-event',
      expect.objectContaining({ eventId: 'event-1' }),
      expect.any(Object),
    );
    expect(queueMock.add).toHaveBeenNthCalledWith(
      2,
      'process-event',
      expect.objectContaining({ eventId: 'event-2' }),
      expect.any(Object),
    );
  });
});

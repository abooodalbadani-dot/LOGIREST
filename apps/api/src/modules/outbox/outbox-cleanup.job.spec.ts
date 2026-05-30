import { Test, TestingModule } from '@nestjs/testing';
import { OutboxCleanupJob } from './outbox-cleanup.job';
import { PrismaService } from '../../database/prisma.service';

describe('OutboxCleanupJob', () => {
  let job: OutboxCleanupJob;
  let mockPrisma: {
    outboxEvent: {
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      outboxEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxCleanupJob,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    job = module.get<OutboxCleanupJob>(OutboxCleanupJob);
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  it('should purge succeeded outbox events older than 7 days', async () => {
    await job.purgeExpiredOutboxLogs();

    expect(mockPrisma.outboxEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        status: 'SUCCEEDED',
        processedAt: {
          lt: expect.any(Date),
        },
      },
    });
  });
});

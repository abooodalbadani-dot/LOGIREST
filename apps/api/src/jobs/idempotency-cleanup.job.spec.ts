import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyCleanupJob } from './idempotency-cleanup.job';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('IdempotencyCleanupJob', () => {
  let job: IdempotencyCleanupJob;

  const mockPrismaService = {
    idempotencyLog: {
      deleteMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(24),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyCleanupJob,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    job = module.get<IdempotencyCleanupJob>(IdempotencyCleanupJob);
    jest.clearAllMocks();
  });

  it('should purge idempotency logs older than configured IDEMPOTENCY_TTL_HOURS', async () => {
    mockPrismaService.idempotencyLog.deleteMany.mockResolvedValue({ count: 5 });

    await job.purgeExpiredIdempotencyLogs();

    expect(mockConfigService.get).toHaveBeenCalledWith('IDEMPOTENCY_TTL_HOURS');
    expect(mockPrismaService.idempotencyLog.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: expect.any(Date),
        },
      },
    });
  });
});

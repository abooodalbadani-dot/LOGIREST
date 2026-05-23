import { Test, TestingModule } from '@nestjs/testing';
import { LockCleanupJob } from './lock-cleanup.job';
import { PrismaService } from '../database/prisma.service';

describe('LockCleanupJob', () => {
  let job: LockCleanupJob;

  const mockPrismaService = {
    warehouseLock: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockCleanupJob,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    job = module.get<LockCleanupJob>(LockCleanupJob);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    job.onModuleDestroy();
  });

  it('should do nothing if no expired locks are found', async () => {
    mockPrismaService.warehouseLock.findMany.mockResolvedValue([]);

    await job.cleanupExpiredLocks();
    expect(mockPrismaService.warehouseLock.findMany).toHaveBeenCalled();
    expect(mockPrismaService.warehouseLock.updateMany).not.toHaveBeenCalled();
  });

  it('should transition expired locks to STALE status', async () => {
    const expiredLocks = [
      { id: 'lock-1', warehouseId: 'wh-1', status: 'ACTIVE' },
      { id: 'lock-2', warehouseId: 'wh-2', status: 'ACTIVE' },
    ];
    mockPrismaService.warehouseLock.findMany.mockResolvedValue(expiredLocks);
    mockPrismaService.warehouseLock.updateMany.mockResolvedValue({ count: 2 });

    await job.cleanupExpiredLocks();

    expect(mockPrismaService.warehouseLock.findMany).toHaveBeenCalled();
    expect(mockPrismaService.warehouseLock.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['lock-1', 'lock-2'],
        },
      },
      data: {
        status: 'STALE',
      },
    });
  });
});

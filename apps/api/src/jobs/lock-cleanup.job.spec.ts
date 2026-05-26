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
    warehouse: {
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
  });

  afterEach(() => {
    // Timers removed
  });

  it('should do nothing if no expired locks are found', async () => {
    mockPrismaService.warehouseLock.findMany.mockResolvedValue([]);

    await job.cleanupExpiredLocks();
    expect(mockPrismaService.warehouseLock.findMany).toHaveBeenCalled();
    expect(mockPrismaService.warehouseLock.updateMany).not.toHaveBeenCalled();
    expect(mockPrismaService.warehouse.updateMany).not.toHaveBeenCalled();
  });

  it('should transition expired locks to STALE and reset Warehouse.isLocked', async () => {
    const expiredLocks = [
      { id: 'lock-1', warehouseId: 'wh-1', status: 'ACTIVE' },
      { id: 'lock-2', warehouseId: 'wh-2', status: 'ACTIVE' },
    ];
    mockPrismaService.warehouseLock.findMany.mockResolvedValue(expiredLocks);
    mockPrismaService.warehouseLock.updateMany.mockResolvedValue({ count: 2 });
    mockPrismaService.warehouse.updateMany.mockResolvedValue({ count: 2 });

    await job.cleanupExpiredLocks();

    expect(mockPrismaService.warehouseLock.findMany).toHaveBeenCalled();

    // Lock rows must be marked STALE with isActive: false
    expect(mockPrismaService.warehouseLock.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['lock-1', 'lock-2'] } },
      data: { status: 'STALE', isActive: false },
    });

    // Warehouse.isLocked must be reset for all affected warehouses
    expect(mockPrismaService.warehouse.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['wh-1', 'wh-2'] } },
      data: { isLocked: false },
    });
  });
});

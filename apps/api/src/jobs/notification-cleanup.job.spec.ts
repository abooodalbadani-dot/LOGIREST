import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCleanupJob } from './notification-cleanup.job';
import { PrismaService } from '../database/prisma.service';

describe('NotificationCleanupJob', () => {
  let job: NotificationCleanupJob;

  const mockPrismaService = {
    notificationLog: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationCleanupJob,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    job = module.get<NotificationCleanupJob>(NotificationCleanupJob);
    jest.clearAllMocks();
  });

  it('should purge read and unread notifications based on correct thresholds', async () => {
    mockPrismaService.notificationLog.deleteMany.mockResolvedValue({
      count: 12,
    });

    await job.purgeExpiredNotifications();

    expect(mockPrismaService.notificationLog.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { isRead: true, createdAt: { lt: expect.any(Date) } },
          { isRead: false, createdAt: { lt: expect.any(Date) } },
        ],
      },
    });
  });
});

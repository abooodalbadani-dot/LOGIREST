import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupJob } from './token-cleanup.job';
import { PrismaService } from '../database/prisma.service';

describe('TokenCleanupJob', () => {
  let job: TokenCleanupJob;

  const mockPrismaService = {
    refreshToken: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupJob,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    job = module.get<TokenCleanupJob>(TokenCleanupJob);
    jest.clearAllMocks();
  });

  it('should purge expired or revoked refresh tokens older than 7 days', async () => {
    mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 18 });

    await job.purgeExpiredTokens();

    expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { isRevoked: true, createdAt: { lt: expect.any(Date) } },
        ],
      },
    });
  });
});

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LockCleanupJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LockCleanupJob.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Run lock cleanup check every 60 seconds
    this.intervalId = setInterval(() => this.cleanupExpiredLocks(), 60000);
    // Execute immediate cleanup check on startup
    void this.cleanupExpiredLocks();
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async cleanupExpiredLocks() {
    try {
      this.logger.log('Running expired stocktake locks cleanup...');
      const now = new Date();

      const expiredLocks = await this.prisma.warehouseLock.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
          expiresAt: {
            lt: now,
          },
        },
      });

      if (expiredLocks.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiredLocks.length} expired locks to mark STALE.`);

      await this.prisma.warehouseLock.updateMany({
        where: {
          id: {
            in: expiredLocks.map((l) => l.id),
          },
        },
        data: {
          status: 'STALE',
        },
      });

      this.logger.log('Successfully marked expired locks as STALE.');
    } catch (error) {
      this.logger.error('Failed to cleanup expired locks', error);
    }
  }
}

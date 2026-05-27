import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { RedisLockService } from '../redis/redis-lock.service';

@Injectable()
export class LockCleanupJob {
  private readonly logger = new Logger(LockCleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: RedisLockService,
  ) {}

  @Cron('*/1 * * * *', { name: 'lock-cleanup' })
  async cleanupExpiredLocks() {
    // Run protected by a 50-second mutex lock (cron runs every 60 seconds)
    await this.lockService.runWithLock('lock-cleanup', 50, async () => {
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

        this.logger.log(
          `Found ${expiredLocks.length} expired locks to mark STALE.`,
        );

        await this.prisma.warehouseLock.updateMany({
          where: {
            id: {
              in: expiredLocks.map((l) => l.id),
            },
          },
          data: {
            status: 'STALE',
            isActive: false,
          },
        });

        const affectedWarehouseIds = [
          ...new Set(expiredLocks.map((l) => l.warehouseId)),
        ];
        await this.prisma.warehouse.updateMany({
          where: { id: { in: affectedWarehouseIds } },
          data: { isLocked: false },
        });

        this.logger.log(
          `Successfully marked ${expiredLocks.length} expired locks as STALE and unlocked ${affectedWarehouseIds.length} warehouse(s).`,
        );
      } catch (error) {
        this.logger.error('Failed to cleanup expired locks', error);
      }
    });
  }
}

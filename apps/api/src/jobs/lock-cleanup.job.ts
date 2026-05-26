import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LockCleanupJob {
  private readonly logger = new Logger(LockCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/1 * * * *', { name: 'lock-cleanup' })
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

      // Reset Warehouse.isLocked for all affected warehouses so inventory
      // mutations are unblocked after the stocktake lock expires.
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
  }
}

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
          expiresAt: {
            lt: now,
          },
        },
      });

      if (expiredLocks.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiredLocks.length} expired locks to release.`);

      await this.prisma.$transaction(async (tx) => {
        // Set expired locks to inactive
        await tx.warehouseLock.updateMany({
          where: {
            id: {
              in: expiredLocks.map((l) => l.id),
            },
          },
          data: {
            isActive: false,
          },
        });

        // Set isLocked to false on the corresponding Warehouses
        const warehouseIds = Array.from(
          new Set(expiredLocks.map((l) => l.warehouseId)),
        );
        await tx.warehouse.updateMany({
          where: {
            id: {
              in: warehouseIds,
            },
          },
          data: {
            isLocked: false,
          },
        });
      });

      this.logger.log('Successfully cleaned up expired locks.');
    } catch (error) {
      this.logger.error('Failed to cleanup expired locks', error);
    }
  }
}

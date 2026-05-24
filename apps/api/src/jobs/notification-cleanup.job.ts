import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationCleanupJob {
  private readonly logger = new Logger(NotificationCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scheduled job running daily at 03:00 AM.
   * Purges read notifications older than 30 days and unread notifications older than 90 days.
   */
  @Cron('0 3 * * *')
  async purgeExpiredNotifications() {
    this.logger.log('Starting expired notification logs cleanup...');

    try {
      const now = new Date();
      const readThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const unreadThreshold = new Date(
        now.getTime() - 90 * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.notificationLog.deleteMany({
        where: {
          OR: [
            { isRead: true, createdAt: { lt: readThreshold } },
            { isRead: false, createdAt: { lt: unreadThreshold } },
          ],
        },
      });

      this.logger.log(
        `Successfully purged ${result.count} expired notification logs.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to purge expired notifications: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

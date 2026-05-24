import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OutboxCleanupJob {
  private readonly logger = new Logger(OutboxCleanupJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs daily at 02:00 AM.
   * Purges successfully processed outbox events older than 7 days
   * to prevent log table bloat in production.
   */
  @Cron('0 2 * * *')
  async purgeExpiredOutboxLogs() {
    this.logger.log('Starting daily outbox logs cleanup job...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const deleteResult = await this.prisma.outboxEvent.deleteMany({
        where: {
          status: 'SUCCEEDED',
          processedAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      this.logger.log(
        `Successfully purged ${deleteResult.count} successfully processed outbox log(s) older than 7 days.`,
      );
    } catch (error) {
      this.logger.error(
        `Outbox cleanup job failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

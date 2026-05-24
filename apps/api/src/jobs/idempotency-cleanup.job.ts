import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class IdempotencyCleanupJob {
  private readonly logger = new Logger(IdempotencyCleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Scheduled job running hourly.
   * Purges idempotency records older than IDEMPOTENCY_TTL_HOURS.
   */
  @Cron('0 * * * *')
  async purgeExpiredIdempotencyLogs() {
    this.logger.log('Starting idempotency logs cleanup...');

    try {
      const ttlHours =
        this.configService.get<number>('IDEMPOTENCY_TTL_HOURS') || 24;
      const threshold = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

      const result = await this.prisma.idempotencyLog.deleteMany({
        where: {
          createdAt: {
            lt: threshold,
          },
        },
      });

      this.logger.log(
        `Successfully purged ${result.count} expired idempotency logs (older than ${ttlHours} hours).`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to purge expired idempotency logs: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

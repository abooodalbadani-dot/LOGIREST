import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private pruneIntervalId: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves an idempotency log entry by key.
   */
  async getLog(key: string) {
    return this.prisma.idempotencyLog.findUnique({
      where: { key },
    });
  }

  /**
   * Creates a pending log entry with a 102 status code.
   */
  async createPendingLog(key: string) {
    return this.prisma.idempotencyLog.create({
      data: {
        key,
        responseBody: '{}',
        statusCode: 102, // 102 Processing
      },
    });
  }

  /**
   * Updates an idempotency log with the final status code and response body.
   */
  async updateLog(key: string, statusCode: number, responseBody: string) {
    return this.prisma.idempotencyLog.update({
      where: { key },
      data: {
        statusCode,
        responseBody,
      },
    });
  }

  /**
   * Deletes a log entry (typically used to release the lock when an execution fails).
   */
  async deleteLog(key: string) {
    return this.prisma.idempotencyLog.delete({
      where: { key },
    });
  }

  /**
   * Prunes all logs older than 24 hours.
   */
  async pruneExpiredLogs() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.idempotencyLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });
    if (result.count > 0) {
      this.logger.log(`Pruned ${result.count} expired idempotency logs.`);
    }
  }

  onModuleInit() {
    this.logger.log(
      'Initializing Idempotency Log Pruner scheduler (hourly)...',
    );
    // Run pruning immediately on start, then every hour
    this.pruneExpiredLogs().catch((err) => {
      this.logger.error('Failed to run initial idempotency logs pruning', err);
    });

    this.pruneIntervalId = setInterval(
      () => {
        this.pruneExpiredLogs().catch((err) => {
          this.logger.error(
            'Failed to run idempotency logs pruning cron job',
            err,
          );
        });
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  onModuleDestroy() {
    if (this.pruneIntervalId) {
      this.logger.log('Clearing Idempotency Log Pruner scheduler.');
      clearInterval(this.pruneIntervalId);
    }
  }
}

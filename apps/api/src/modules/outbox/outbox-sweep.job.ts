import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { RedisLockService } from '../../redis/redis-lock.service';
import { correlationStorage } from '../../common/correlation.context';

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes stale threshold

@Injectable()
export class OutboxSweepJob {
  private readonly logger = new Logger(OutboxSweepJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: RedisLockService,
    @InjectQueue('outbox') private readonly outboxQueue: Queue,
  ) {}

  /**
   * Runs every 5 minutes.
   * Finds PENDING outbox events that have been stuck for longer than 2 minutes
   * (e.g. if the BullMQ worker crashed or the Redis job was lost) and re-enqueues them.
   */
  @Cron('*/5 * * * *', { name: 'outbox-sweep' })
  async sweepStaleOutboxEvents() {
    // Run protected by a 250-second mutex lock in Redis (cron runs every 5 minutes)
    await this.lockService.runWithLock('outbox-sweep', 250, async () => {
      try {
        this.logger.log('Starting transactional outbox sweep job...');
        const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

        const staleEvents = await this.prisma.outboxEvent.findMany({
          where: {
            status: 'PENDING',
            attempts: { lt: 5 },
            createdAt: { lt: staleThreshold },
          },
          take: 50,
        });

        if (staleEvents.length === 0) {
          return;
        }

        this.logger.warn(
          `Found ${staleEvents.length} stale PENDING outbox event(s) to re-enqueue.`,
        );

        const correlationId = correlationStorage.getStore();

        for (const event of staleEvents) {
          this.logger.log(
            `Re-enqueueing stale outbox event: ${event.id} (type: ${event.eventType})`,
          );

          await this.outboxQueue.add(
            'process-event',
            { eventId: event.id, correlationId },
            {
              delay: 1000,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
              removeOnComplete: true,
            },
          );
        }

        this.logger.log(
          `Outbox sweep successfully re-enqueued ${staleEvents.length} stale outbox event(s).`,
        );
      } catch (error) {
        this.logger.error(
          `Outbox sweep job execution failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    });
  }
}

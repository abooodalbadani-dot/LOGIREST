import { Injectable, Logger } from '@nestjs/common';
import { Prisma, OutboxEvent } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';

import { correlationStorage } from '../../common/correlation.context';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(@InjectQueue('outbox') private readonly outboxQueue: Queue) {}

  /**
   * Writes an event to the outbox table inside an existing transaction,
   * and enqueues a background job in BullMQ to process it after a short delay.
   */
  async writeEvent(
    tx: Prisma.TransactionClient,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<OutboxEvent> {
    this.logger.log(`Writing outbox event of type: ${eventType}`);

    const documentId =
      payload && typeof payload === 'object' && 'id' in payload && payload.id
        ? typeof payload.id === 'string' || typeof payload.id === 'number'
          ? String(payload.id)
          : ''
        : null;

    const eventHash = createHash('sha256')
      .update(eventType + JSON.stringify(payload))
      .digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days TTL

    const existing = await tx.outboxEvent.findFirst({
      where: { eventHash },
    });
    if (existing) {
      this.logger.warn(
        `Concurrent duplicate outbox event prevented for type ${eventType} with eventHash ${eventHash}.`,
      );
      return existing;
    }

    const event = await tx.outboxEvent.create({
      data: {
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: 'PENDING',
        attempts: 0,
        expiresAt,
        documentId,
        eventHash,
      },
    });

    const correlationId = correlationStorage.getStore();

    // Enqueue background processing job in BullMQ.
    await this.outboxQueue.add(
      'process-event',
      { eventId: event.id, correlationId },
      {
        delay: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );

    return event;
  }
}

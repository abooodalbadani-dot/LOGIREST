import {
  Controller,
  Get,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue('outbox') private readonly outboxQueue: Queue,
  ) {}

  private async checkWithTimeout<T>(
    check: Promise<T>,
    timeoutMs: number,
    name: string,
  ): Promise<T> {
    return Promise.race([
      check,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${name} health check timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  @Public()
  @Get()
  async check(): Promise<{
    status: string;
    db: string;
    redis: string;
    bullmq: string;
    stockLedger: string;
    timestamp: string;
  }> {
    const checks = {
      db: 'disconnected',
      redis: 'disconnected',
      bullmq: 'disconnected',
      stockLedger: 'disconnected',
    };

    let allHealthy = true;

    try {
      await this.checkWithTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        2000,
        'database',
      );
      checks.db = 'connected';
    } catch {
      allHealthy = false;
    }

    try {
      await this.checkWithTimeout(this.redis.ping(), 2000, 'redis');
      checks.redis = 'connected';
    } catch {
      allHealthy = false;
    }

    try {
      await this.checkWithTimeout(this.outboxQueue.isPaused(), 2000, 'bullmq');
      checks.bullmq = 'connected';
    } catch {
      allHealthy = false;
    }

    try {
      await this.checkWithTimeout(
        this.prisma.stockLedger.count(),
        3000,
        'stock_ledger',
      );
      checks.stockLedger = 'connected';
    } catch {
      allHealthy = false;
    }

    if (!allHealthy) {
      throw new ServiceUnavailableException({
        status: 'ERROR',
        ...checks,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'OK',
      ...checks,
      timestamp: new Date().toISOString(),
    };
  }
}

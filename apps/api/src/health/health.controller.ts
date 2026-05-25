import { Controller, Get, ServiceUnavailableException, Inject } from '@nestjs/common';
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

  @Public()
  @Get()
  async check() {
    const checks: Record<string, string> = {
      db: 'disconnected',
      redis: 'disconnected',
      bullmq: 'disconnected',
    };

    let allHealthy = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'connected';
    } catch {
      allHealthy = false;
    }

    try {
      await this.redis.ping();
      checks.redis = 'connected';
    } catch {
      allHealthy = false;
    }

    try {
      await this.outboxQueue.isPaused();
      checks.bullmq = 'connected';
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

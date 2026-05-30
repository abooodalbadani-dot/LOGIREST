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
import * as fs from 'fs';
import * as path from 'path';

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
          () =>
            reject(
              new Error(`${name} health check timed out after ${timeoutMs}ms`),
            ),
          timeoutMs,
        ),
      ),
    ]);
  }

  @Public()
  @Get('backup')
  async checkBackup(): Promise<{
    status: string;
    lastSuccess: string;
    ageHours: number;
  }> {
    const backupDir = process.env.BACKUP_DIR || '/backups';
    const lastSuccessPath = path.join(backupDir, 'last_success');

    let exists = false;
    let content = '';

    if (fs.existsSync(lastSuccessPath)) {
      exists = true;
      content = fs.readFileSync(lastSuccessPath, 'utf8').trim();
    } else {
      const localFallback = path.join(process.cwd(), 'backups', 'last_success');
      if (fs.existsSync(localFallback)) {
        exists = true;
        content = fs.readFileSync(localFallback, 'utf8').trim();
      }
    }

    if (!exists) {
      throw new ServiceUnavailableException({
        status: 'UNHEALTHY',
        message:
          'No backup records found. The initial backup has not run or failed.',
        timestamp: new Date().toISOString(),
      });
    }

    // Parse the timestamp YYYYMMDD_HHMMSS
    if (content.length < 15) {
      throw new ServiceUnavailableException({
        status: 'UNHEALTHY',
        message: 'Invalid last_success backup timestamp format.',
        timestamp: new Date().toISOString(),
      });
    }

    const year = content.substring(0, 4);
    const month = content.substring(4, 6);
    const day = content.substring(6, 8);
    const hour = content.substring(9, 11);
    const minute = content.substring(11, 13);
    const second = content.substring(13, 15);

    const lastBackupDate = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    );
    if (isNaN(lastBackupDate.getTime())) {
      throw new ServiceUnavailableException({
        status: 'UNHEALTHY',
        message: 'Failed to parse last successful backup timestamp.',
        timestamp: new Date().toISOString(),
      });
    }

    const now = new Date();
    const ageMs = now.getTime() - lastBackupDate.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours > 26) {
      throw new ServiceUnavailableException({
        status: 'UNHEALTHY',
        message: `Last successful backup was ${ageHours.toFixed(1)} hours ago (exceeds 26h threshold).`,
        lastSuccess: lastBackupDate.toISOString(),
        ageHours: Number(ageHours.toFixed(1)),
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'HEALTHY',
      lastSuccess: lastBackupDate.toISOString(),
      ageHours: Number(ageHours.toFixed(1)),
    };
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

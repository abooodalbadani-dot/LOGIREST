import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { BackupService } from '../backup/backup.service';

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string; // ISO8601 UTC
  checks: {
    database: 'ok' | 'degraded';
    backup: {
      status: 'ok' | 'degraded'; // degraded if ageHours > 26
      lastBackupAt: string | null; // ISO8601 UTC, null if never run
      ageHours: number | null; // null if never run
    };
  };
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly backupService: BackupService,
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
  async checkBackup() {
    const backupStatus = await this.backupService.getBackupStatus();
    return {
      status: backupStatus.status,
      lastBackupAt: backupStatus.lastBackupAt,
      ageHours: backupStatus.ageHours,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    let dbStatus: 'ok' | 'degraded' = 'ok';

    try {
      await this.checkWithTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        2000,
        'database',
      );
    } catch {
      dbStatus = 'degraded';
    }

    const backupStatus = await this.backupService.getBackupStatus();
    const overallStatus =
      dbStatus === 'degraded' || backupStatus.status === 'degraded'
        ? 'degraded'
        : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        backup: backupStatus,
      },
    };
  }
}

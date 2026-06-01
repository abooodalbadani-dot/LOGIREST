import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from '../backup/backup.service';
import { BackupCalculatorService } from '../modules/health/backup-calculator.service';
import { Role } from '@prisma/client';

@Controller('health')
export class HealthController {
  constructor(
    private readonly backupService: BackupService,
    private readonly backupCalculator: BackupCalculatorService,
  ) {}

  @Public()
  @Get()
  async check(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  @Get('backup')
  @Roles(Role.ADMIN, Role.AUDITOR)
  async checkBackup() {
    const backupStatus = await this.backupService.getBackupStatus();
    const details = this.backupCalculator.formatBackupDetails(
      backupStatus.lastBackupAt,
      [],
    );
    return details;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupService } from './backup.service';

@Injectable()
export class BackupCron {
  private readonly logger = new Logger(BackupCron.name);

  constructor(private readonly backupService: BackupService) {}

  @Cron('0 2 * * *')
  async handleDailyBackup() {
    this.logger.log('Cron triggered: Starting daily database backup...');
    try {
      const result = await this.backupService.runBackup();
      this.logger.log(
        `Cron: Daily backup completed successfully. S3 Key: ${result.key}, Size: ${result.size} bytes.`,
      );
    } catch (e: any) {
      this.logger.error(
        `Cron: Daily database backup failed: ${e.message}`,
        e.stack,
      );
    }
  }
}

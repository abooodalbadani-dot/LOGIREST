import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupService } from './backup.service';

@Injectable()
export class BackupCron {
  private readonly logger = new Logger(BackupCron.name);

  constructor(private readonly backupService: BackupService) {}

  // @Cron('0 2 * * *')
  async handleDailyBackup() {
    this.logger.log(
      'Daily database backup is disabled on the API node (runs inside the dedicated db-backup container).',
    );
    return;
  }
}

import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupCron } from './backup.cron';
import { BackupController } from './backup.controller';

@Module({
  providers: [BackupService, BackupCron],
  controllers: [BackupController],
  exports: [BackupService],
})
export class BackupModule {}

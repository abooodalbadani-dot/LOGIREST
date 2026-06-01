import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { PrismaModule } from '../database/database.module';
import { BackupModule } from '../backup/backup.module';
import { BackupCalculatorService } from '../modules/health/backup-calculator.service';

@Module({
  imports: [
    PrismaModule,
    BackupModule,
    BullModule.registerQueue({ name: 'outbox' }),
  ],
  controllers: [HealthController],
  providers: [BackupCalculatorService],
})
export class HealthModule {}

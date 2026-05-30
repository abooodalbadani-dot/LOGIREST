import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { PrismaModule } from '../database/database.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [
    PrismaModule,
    BackupModule,
    BullModule.registerQueue({ name: 'outbox' }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { PrismaModule } from '../database/database.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'outbox' }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../database/database.module';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import { EmailService } from './email.service';
import { OutboxCleanupJob } from './outbox-cleanup.job';
import { OutboxSweepJob } from './outbox-sweep.job';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'outbox',
    }),
  ],
  providers: [
    OutboxService,
    OutboxWorker,
    EmailService,
    OutboxCleanupJob,
    OutboxSweepJob,
  ],
  exports: [OutboxService, EmailService],
})
export class OutboxModule {}

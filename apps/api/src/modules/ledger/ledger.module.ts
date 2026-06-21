import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerLockService } from './ledger-lock.service';
import { AllocationService } from './allocation.service';
import { WacService } from './wac.service';
import { NotificationModule } from '../notifications/notification.module';
import { ReconciliationJob } from './reconciliation.job';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, NotificationModule, OutboxModule],
  providers: [
    LedgerLockService,
    AllocationService,
    WacService,
    ReconciliationJob,
  ],
  exports: [
    LedgerLockService,
    AllocationService,
    WacService,
    ReconciliationJob,
  ],
})
export class LedgerModule {}

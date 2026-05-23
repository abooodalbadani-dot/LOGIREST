import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerLockService } from './ledger-lock.service';
import { AllocationService } from './allocation.service';
import { WacService } from './wac.service';

@Module({
  imports: [PrismaModule],
  providers: [LedgerLockService, AllocationService, WacService],
  exports: [LedgerLockService, AllocationService, WacService],
})
export class LedgerModule {}

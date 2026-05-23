import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { IssuePostService } from './issue-post.service';
import { IssuesController } from './issues/issues.controller';
import { TransferPostService } from './transfer-post.service';
import { TransfersController } from './transfers/transfers.controller';
import { AdjustmentPostService } from './adjustment-post.service';
import { AdjustmentsController } from './adjustments/adjustments.controller';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [IssuesController, TransfersController, AdjustmentsController],
  providers: [IssuePostService, TransferPostService, AdjustmentPostService],
  exports: [IssuePostService, TransferPostService, AdjustmentPostService],
})
export class OperationsModule {}

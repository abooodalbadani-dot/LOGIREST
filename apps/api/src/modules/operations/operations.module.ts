import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { DocumentSequenceModule } from '../sequencing/document-sequence.module';
import { IssuePostService } from './issue-post.service';
import { IssuesController } from './issues/issues.controller';
import { IssuesService } from './issues/issues.service';
import { TransferPostService } from './transfer-post.service';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';
import { AdjustmentPostService } from './adjustment-post.service';
import { AdjustmentsController } from './adjustments/adjustments.controller';
import { AdjustmentsService } from './adjustments/adjustments.service';

@Module({
  imports: [PrismaModule, LedgerModule, DocumentSequenceModule],
  controllers: [IssuesController, TransfersController, AdjustmentsController],
  providers: [
    IssuePostService,
    IssuesService,
    TransferPostService,
    TransfersService,
    AdjustmentPostService,
    AdjustmentsService,
  ],
  exports: [
    IssuePostService,
    IssuesService,
    TransferPostService,
    TransfersService,
    AdjustmentPostService,
    AdjustmentsService,
  ],
})
export class OperationsModule {}

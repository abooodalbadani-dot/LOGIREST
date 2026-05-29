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
import { GrnVoidService } from './grn-void.service';
import { IssueVoidService } from './issue-void.service';
import { AdjustmentVoidService } from './adjustment-void.service';
import { TransferVoidService } from './transfer-void.service';
import { KitchenRequestVoidService } from './kitchen-request-void.service';
import { LotsAvailableService } from './lots-available.service';
import { OperationsController } from './operations.controller';
import { YieldController } from './yield/yield.controller';
import { YieldService } from './yield/yield.service';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, LedgerModule, DocumentSequenceModule, OutboxModule],
  controllers: [
    IssuesController,
    TransfersController,
    AdjustmentsController,
    OperationsController,
    YieldController,
  ],
  providers: [
    IssuePostService,
    IssuesService,
    TransferPostService,
    TransfersService,
    AdjustmentPostService,
    AdjustmentsService,
    GrnVoidService,
    IssueVoidService,
    AdjustmentVoidService,
    TransferVoidService,
    KitchenRequestVoidService,
    LotsAvailableService,
    YieldService,
  ],
  exports: [
    IssuePostService,
    IssuesService,
    TransferPostService,
    TransfersService,
    AdjustmentPostService,
    AdjustmentsService,
    GrnVoidService,
    IssueVoidService,
    AdjustmentVoidService,
    TransferVoidService,
    KitchenRequestVoidService,
    LotsAvailableService,
    YieldService,
  ],
})
export class OperationsModule {}



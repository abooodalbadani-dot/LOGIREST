import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { StocktakePostService } from './stocktake-post.service';
import { StocktakeService } from './stocktake.service';
import { StocktakeController } from './stocktake.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, LedgerModule, WorkflowModule, OutboxModule],
  controllers: [StocktakeController],
  providers: [StocktakePostService, StocktakeService],
  exports: [StocktakePostService, StocktakeService],
})
export class StocktakeModule {}

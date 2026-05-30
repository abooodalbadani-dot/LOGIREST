import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { DocumentSequenceModule } from '../sequencing/document-sequence.module';
import { OperationsModule } from '../operations/operations.module';
import { KitchenRequestsController } from './kitchen-requests.controller';
import { KitchenRequestsService } from './kitchen-requests.service';

@Module({
  imports: [
    PrismaModule,
    WorkflowModule,
    DocumentSequenceModule,
    OperationsModule,
  ],
  controllers: [KitchenRequestsController],
  providers: [KitchenRequestsService],
  exports: [KitchenRequestsService],
})
export class KitchenRequestsModule {}

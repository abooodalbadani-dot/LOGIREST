import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { DocumentSequenceModule } from '../sequencing/document-sequence.module';
import { KitchenRequestsController } from './kitchen-requests.controller';
import { KitchenRequestsService } from './kitchen-requests.service';

@Module({
  imports: [PrismaModule, WorkflowModule, DocumentSequenceModule],
  controllers: [KitchenRequestsController],
  providers: [KitchenRequestsService],
  exports: [KitchenRequestsService],
})
export class KitchenRequestsModule {}

import { Module, Global } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { ConcurrencyService } from '../../services/concurrency.service';

@Global()
@Module({
  providers: [WorkflowService, ConcurrencyService],
  exports: [WorkflowService, ConcurrencyService],
})
export class WorkflowModule {}

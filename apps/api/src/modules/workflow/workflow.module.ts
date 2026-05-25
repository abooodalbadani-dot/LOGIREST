import { Module, Global } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { ConcurrencyService } from '../../services/concurrency.service';
import { OutboxModule } from '../outbox/outbox.module';

@Global()
@Module({
  imports: [OutboxModule],
  providers: [WorkflowService, ConcurrencyService],
  exports: [WorkflowService, ConcurrencyService],
})
export class WorkflowModule {}

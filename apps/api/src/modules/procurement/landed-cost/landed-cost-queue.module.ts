import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'landed-cost-revaluation',
    }),
  ],
  exports: [BullModule],
})
export class LandedCostQueueModule {}

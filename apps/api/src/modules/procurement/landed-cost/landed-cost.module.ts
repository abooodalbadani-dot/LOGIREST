import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../../database/database.module';
import { SettingsModule } from '../../settings/settings.module';
import { LandedCostController } from './landed-cost.controller';
import { LandedCostService } from './landed-cost.service';
import { LandedCostPostService } from './landed-cost-post.service';
import { LandedCostCalculatorService } from './landed-cost-calculator.service';
import { LandedCostRevaluationConsumer } from './landed-cost-revaluation.consumer';
import { RevaluationLockingService } from './revaluation-locking.service';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'landed-cost-revaluation',
    }),
  ],
  controllers: [LandedCostController],
  providers: [
    LandedCostService,
    LandedCostPostService,
    LandedCostCalculatorService,
    LandedCostRevaluationConsumer,
    RevaluationLockingService,
  ],
  exports: [LandedCostService, LandedCostPostService],
})
export class LandedCostModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { StocktakePostService } from './stocktake-post.service';
import { StocktakeController } from './stocktake.controller';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [StocktakeController],
  providers: [StocktakePostService],
  exports: [StocktakePostService],
})
export class StocktakeModule {}

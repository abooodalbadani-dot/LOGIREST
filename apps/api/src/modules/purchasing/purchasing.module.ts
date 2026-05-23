import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { GrnPostService } from './grn-post.service';
import { GrnController } from './grn/grn.controller';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [GrnController],
  providers: [GrnPostService],
  exports: [GrnPostService],
})
export class PurchasingModule {}

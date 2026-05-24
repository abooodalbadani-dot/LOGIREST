import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { LedgerModule } from '../ledger/ledger.module';
import { DocumentSequenceModule } from '../sequencing/document-sequence.module';
import { GrnPostService } from './grn-post.service';
import { GrnController } from './grn/grn.controller';
import { PurchaseOrderController } from './purchase-orders/po.controller';
import { PurchaseOrderService } from './purchase-orders/po.service';

@Module({
  imports: [PrismaModule, LedgerModule, DocumentSequenceModule],
  controllers: [GrnController, PurchaseOrderController],
  providers: [GrnPostService, PurchaseOrderService],
  exports: [GrnPostService, PurchaseOrderService],
})
export class PurchasingModule {}

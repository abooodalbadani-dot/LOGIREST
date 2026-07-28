import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { DocumentSequenceModule } from '../sequencing/document-sequence.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [DocumentSequenceModule, PdfModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}

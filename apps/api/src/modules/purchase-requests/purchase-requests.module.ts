import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { DocumentSequenceModule } from '../sequencing/document-sequence.module';
import { PdfModule } from '../pdf/pdf.module';
import { NotificationModule } from '../notifications/notification.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PrNotificationListener } from './listeners/pr-notification.listener';

@Module({
  imports: [
    DocumentSequenceModule,
    PdfModule,
    NotificationModule,
    OutboxModule,
  ],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, PrNotificationListener],
})
export class PurchaseRequestsModule {}

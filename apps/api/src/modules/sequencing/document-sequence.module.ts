import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { DocumentNumberService } from './document-number.service';

@Module({
  imports: [PrismaModule],
  providers: [DocumentNumberService],
  exports: [DocumentNumberService],
})
export class DocumentSequenceModule {}

import { Module } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { PrismaModule } from '../../database/database.module';

@Module({
  imports: [PrismaModule],
  providers: [PdfGeneratorService],
  exports: [PdfGeneratorService],
})
export class PdfModule {}

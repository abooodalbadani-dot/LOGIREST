import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { OperationsModule } from '../operations/operations.module';
import { ImportsController } from './imports.controller';
import { SuppliersImportService } from './suppliers-import.service';
import { OpeningStockImportService } from './opening-stock-import.service';

@Module({
  imports: [PrismaModule, MasterDataModule, OperationsModule],
  controllers: [ImportsController],
  providers: [SuppliersImportService, OpeningStockImportService],
  exports: [SuppliersImportService, OpeningStockImportService],
})
export class ImportsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { OperationsModule } from '../operations/operations.module';
import { ImportsController } from './imports.controller';
import { SuppliersImportService } from './suppliers-import.service';
import { OpeningStockImportService } from './opening-stock-import.service';
import { ItemsImportService } from './items-import.service';
import { CategoriesImportService } from './categories-import.service';
import { UomsImportService } from './uoms-import.service';
import { BarcodesImportService } from './barcodes-import.service';

@Module({
  imports: [PrismaModule, MasterDataModule, OperationsModule],
  controllers: [ImportsController],
  providers: [
    SuppliersImportService,
    OpeningStockImportService,
    ItemsImportService,
    CategoriesImportService,
    UomsImportService,
    BarcodesImportService,
  ],
  exports: [
    SuppliersImportService,
    OpeningStockImportService,
    ItemsImportService,
    CategoriesImportService,
    UomsImportService,
    BarcodesImportService,
  ],
})
export class ImportsModule {}

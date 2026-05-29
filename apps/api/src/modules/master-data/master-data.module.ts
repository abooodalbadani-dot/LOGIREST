import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { WarehousesController } from './warehouses/warehouses.controller';
import { WarehousesDirectController } from './warehouses/warehouses-direct.controller';
import { BranchesController } from './branches/branches.controller';
import { DepartmentsController } from './departments/departments.controller';
import { FXRatesModule } from './fx-rates/fx-rates.module';

import { ItemsController } from './items/items.controller';
import { ItemsService } from './items/items.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { UomController } from './units-of-measure/uom.controller';
import { UomService } from './units-of-measure/uom.service';
import { BarcodesController } from './barcodes/barcodes.controller';
import { BarcodesService } from './barcodes/barcodes.service';
import { CurrenciesController } from './currencies/currencies.controller';
import { CurrenciesService } from './currencies/currencies.service';
import { VarianceReasonsController } from './variance-reasons/variance-reasons.controller';
import { VarianceReasonsService } from './variance-reasons/variance-reasons.service';

@Module({
  imports: [PrismaModule, FXRatesModule],
  controllers: [
    WarehousesController,
    WarehousesDirectController,
    BranchesController,
    DepartmentsController,
    ItemsController,
    CategoriesController,
    SuppliersController,
    UomController,
    BarcodesController,
    CurrenciesController,
    VarianceReasonsController,
  ],
  providers: [
    ItemsService,
    CategoriesService,
    SuppliersService,
    UomService,
    BarcodesService,
    CurrenciesService,
    VarianceReasonsService,
  ],
  exports: [
    ItemsService,
    CategoriesService,
    SuppliersService,
    UomService,
    BarcodesService,
    CurrenciesService,
    VarianceReasonsService,
  ],
})
export class MasterDataModule {}

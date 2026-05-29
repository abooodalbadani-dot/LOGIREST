import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { WarehousesController } from './warehouses/warehouses.controller';
import { WarehousesDirectController } from './warehouses/warehouses-direct.controller';
import { BranchesController } from './branches/branches.controller';
import { DepartmentsController } from './departments/departments.controller';
import { FXRatesModule } from './fx-rates/fx-rates.module';

@Module({
  imports: [PrismaModule, FXRatesModule],
  controllers: [
    WarehousesController,
    WarehousesDirectController,
    BranchesController,
    DepartmentsController,
  ],
})
export class MasterDataModule {}

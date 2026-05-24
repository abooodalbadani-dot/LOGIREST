import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { WarehousesController } from './warehouses/warehouses.controller';
import { FXRatesModule } from './fx-rates/fx-rates.module';

@Module({
  imports: [PrismaModule, FXRatesModule],
  controllers: [WarehousesController],
})
export class MasterDataModule {}

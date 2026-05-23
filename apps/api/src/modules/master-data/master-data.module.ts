import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { WarehousesController } from './warehouses/warehouses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WarehousesController],
})
export class MasterDataModule {}

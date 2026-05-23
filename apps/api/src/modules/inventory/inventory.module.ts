import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
})
export class InventoryModule {}

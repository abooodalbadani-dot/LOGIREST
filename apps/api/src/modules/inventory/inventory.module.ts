import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { InventoryController, ItemsController } from './inventory.controller';
import { LotsController } from './lots.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController, ItemsController, LotsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

import { Module } from '@nestjs/common';
import { WarehouseLockService } from './warehouse-lock.service';
import { WarehouseLockController } from './warehouse-lock.controller';
import { PrismaModule } from '../../database/database.module';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseLockController],
  providers: [WarehouseLockService],
  exports: [WarehouseLockService],
})
export class WarehouseLockModule {}

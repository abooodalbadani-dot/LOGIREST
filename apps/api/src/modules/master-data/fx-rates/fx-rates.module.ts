import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../database/database.module';
import { FXRatesController } from './fx-rates.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FXRatesController],
})
export class FXRatesModule {}

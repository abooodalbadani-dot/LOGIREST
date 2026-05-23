import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
})
export class ReportsModule {}

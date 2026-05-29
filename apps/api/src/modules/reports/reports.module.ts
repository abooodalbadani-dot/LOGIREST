import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { ReportsController } from './reports.controller';
import { DashboardController } from './dashboard.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController, DashboardController],
  providers: [ReportsService],
})
export class ReportsModule {}

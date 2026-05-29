import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { AuditLogsController } from './audit-logs.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [AuditLogsController, AdminController, DashboardController],
  providers: [AdminService],
})
export class AdminModule {}

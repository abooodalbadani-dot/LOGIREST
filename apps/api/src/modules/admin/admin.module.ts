import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { AuditLogsController } from './audit-logs.controller';
import { AdminController } from './admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController, AdminController],
})
export class AdminModule {}

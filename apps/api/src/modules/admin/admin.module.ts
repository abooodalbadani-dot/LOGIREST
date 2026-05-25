import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { AuditLogsController } from './audit-logs.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController, AdminController],
  providers: [AdminService],
})
export class AdminModule {}

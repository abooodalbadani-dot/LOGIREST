import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController],
})
export class AdminModule {}

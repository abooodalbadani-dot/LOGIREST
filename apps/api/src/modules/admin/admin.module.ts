import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { AuditLogsController } from './audit-logs.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OutboxModule } from '../outbox/outbox.module';
import { NotificationModule } from '../notifications/notification.module';
import { InventoryValidationService } from './inventory-validation.service';
import { InventoryValidationController } from './inventory-validation.controller';
import { InventoryValidationCron } from './inventory-validation.cron';

@Module({
  imports: [PrismaModule, OutboxModule, NotificationModule],
  controllers: [
    AuditLogsController,
    AdminController,
    InventoryValidationController,
  ],
  providers: [
    AdminService,
    InventoryValidationService,
    InventoryValidationCron,
  ],
})
export class AdminModule {}

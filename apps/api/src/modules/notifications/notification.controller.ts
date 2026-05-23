import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { NotificationService } from './notification.service';
import type { Role } from '@logirest/shared-types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    return this.notificationService.getNotifications(role, warehouseId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const updated = await this.notificationService.markAsRead(id);
    return {
      id: updated.id,
      isRead: updated.isRead,
    };
  }

  @Post('read-all')
  async markAllAsRead(
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.notificationService.markAllAsRead(role, warehouseId);
    return {
      success: true,
      markedReadCount: result.count,
    };
  }
}

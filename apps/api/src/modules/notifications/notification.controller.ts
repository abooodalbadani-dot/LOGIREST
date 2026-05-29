import { Controller, Get, Patch, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { NotificationService } from './notification.service';
import { NotificationTemplateService } from './notification-template.service';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import type { Role } from '@logirest/shared-types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly templateService: NotificationTemplateService,
  ) {}

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
    const result = await this.notificationService.markAllAsRead(
      role,
      warehouseId,
    );
    return {
      success: true,
      markedReadCount: result.count,
    };
  }

  // --- Templates CRUD & Reference Data Endpoints ---

  @Get('outbox')
  async getOutbox(
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.templateService.getOutbox(status, pageNum);
  }

  @Get('parameter-registry')
  async getParameterRegistry() {
    return this.templateService.getParameterRegistry();
  }

  @Get('trigger-events')
  async getTriggerEvents() {
    return this.templateService.getTriggerEvents();
  }

  @Get('templates')
  async getTemplates(@Query('page') page?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.templateService.findAll(pageNum);
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post('templates')
  async createTemplate(@Body() body: any) {
    return this.templateService.create(body);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.templateService.update(id, body);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}


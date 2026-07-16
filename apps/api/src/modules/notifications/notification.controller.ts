import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AllRoles } from '../../auth/decorators/all-roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { NotificationService } from './notification.service';
import {
  NotificationTemplateService,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from './notification-template.service';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly templateService: NotificationTemplateService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @AllRoles()
  async getNotifications(
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    return this.notificationService.getNotifications(role, warehouseId);
  }

  @Patch(':id/read')
  @AllRoles()
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
  ) {
    const notification = await this.prisma.notificationLog.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    if (role !== Role.ADMIN) {
      if (notification.targetRole !== role) {
        throw new ForbiddenException(
          'You do not have access to this notification.',
        );
      }
      if (notification.warehouseId) {
        await this.scopeValidationService.validateWarehouse(
          userId,
          role,
          notification.warehouseId,
        );
      }
    }
    const updated = await this.notificationService.markAsRead(id);
    return {
      id: updated.id,
      isRead: updated.isRead,
    };
  }

  @Post('read-all')
  @AllRoles()
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
  @Roles(Role.ADMIN)
  async getOutbox(
    @Query('status') status: string | undefined,
    @Query('page') page: string | undefined,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.templateService.getOutbox(status, pageNum, undefined);
  }

  @Post('outbox/:id/retry')
  @Roles(Role.ADMIN)
  async retryOutboxEvent(@Param('id') id: string) {
    return this.templateService.retryOutboxEvent(id);
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
  @Roles(Role.ADMIN)
  async createTemplate(@Body() body: CreateNotificationTemplateDto) {
    return this.templateService.create(body);
  }

  @Put('templates/:id')
  @Roles(Role.ADMIN)
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: UpdateNotificationTemplateDto,
  ) {
    return this.templateService.update(id, body);
  }

  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  async deleteTemplate(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { EmailService } from '../outbox/email.service';
import { AssignUserRoleSchema } from '@logirest/shared-types';

import { AdminService } from './admin.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
@ApiSecureController()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    private readonly emailService: EmailService,
  ) {}

  @Get('roles')
  async getRoles() {
    return this.adminService.getRoles();
  }

  @Get('system/email-status')
  async getEmailStatus() {
    const failedEvent = await this.prisma.outboxEvent.findFirst({
      where: { status: 'FAILED', lastError: 'SMTP_NOT_CONFIGURED' },
      orderBy: { processedAt: 'desc' },
      select: { processedAt: true },
    });

    const failedEventCount = await this.prisma.outboxEvent.count({
      where: { status: 'FAILED', lastError: 'SMTP_NOT_CONFIGURED' },
    });

    return {
      smtpConfigured: this.emailService.isSmtpConfigured,
      failedEventCount,
      lastFailureAt: failedEvent?.processedAt ?? null,
    };
  }

  @Get('reconciliation-runs')
  async getReconciliationRuns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, runs] = await Promise.all([
      this.prisma.reconciliationRun.count(),
      this.prisma.reconciliationRun.findMany({
        orderBy: {
          ranAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      data: runs,
      meta: {
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  @Get('settings')
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.adminService.updateSettings(dto, userId);
  }

  @Post('settings/test-email')
  async testEmail(
    @Body()
    dto: {
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      smtpEncryption?: string;
    },
  ) {
    return this.emailService.testConnection(dto);
  }

  @Get('outbox')
  async getAllOutboxEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    return this.adminService.getAllOutboxEvents(pageNum, limitNum);
  }

  @Get('outbox/failed')
  async getFailedOutboxEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    return this.adminService.getFailedOutboxEvents(pageNum, limitNum);
  }

  @Post('outbox/:id/retry')
  async retryOutboxEvent(@Param('id') id: string) {
    return this.adminService.retryOutboxEvent(id);
  }

  @Get('inventory/frozen')
  async getFrozenItems() {
    return this.adminService.getFrozenItems();
  }

  @Post('inventory/:id/unfreeze')
  async unfreezeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const parts = id.split('_');
    if (parts.length !== 2) {
      throw new ForbiddenException(
        'Invalid composite ID format. Expected warehouseId_itemId',
      );
    }
    const [warehouseId, itemId] = parts;
    const idRegex = /^[A-Za-z0-9-]+$/;
    if (!idRegex.test(warehouseId) || !idRegex.test(itemId)) {
      throw new ForbiddenException('Invalid ID format in composite parameters');
    }
    return this.adminService.unfreezeItem(warehouseId, itemId, userId);
  }

  @Get('users')
  async getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    return this.adminService.getUsers(pageNum, limitNum);
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users')
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminService.createUser(dto, currentUserId);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.adminService.updateUser(id, dto, currentUserId);
  }

  @Post('users/:id/unlock')
  async unlockUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      success: true,
      message: `User ${user.email} successfully unlocked.`,
    };
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser('id') currentUserId: string,
  ) {
    const parsed = AssignUserRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: parsed.error.flatten().fieldErrors,
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const newRole = parsed.data.role;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          role: newRole,
          version: { increment: 1 },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          version: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: 'UPDATE_USER_ROLE',
          targetTable: 'users',
          targetId: id,
          beforeStateJson: JSON.stringify({ role: user.role }),
          afterStateJson: JSON.stringify({ role: newRole }),
        },
      });

      return result;
    });

    return {
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
      },
      message: `User role updated to ${newRole}`,
    };
  }

  @Get('restaurant-profile')
  async getRestaurantProfile() {
    return this.adminService.getRestaurantProfile();
  }

  @Put('restaurant-profile')
  async updateRestaurantProfile(@Body() data: Record<string, unknown>) {
    return this.adminService.updateRestaurantProfile(data);
  }
}

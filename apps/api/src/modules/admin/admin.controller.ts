import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { EmailService } from '../outbox/email.service';

import { AdminService } from './admin.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    private readonly emailService: EmailService,
  ) {}

  @Get('roles')
  async getRoles(@CurrentUser('role') role: Role) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to access system roles configuration.',
      );
    }
    return this.adminService.getRoles();
  }

  @Get('system/email-status')
  async getEmailStatus(@CurrentUser('role') role: Role) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to view email system status.',
      );
    }

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
    @CurrentUser('role') role: Role,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to access reconciliation runs history.',
      );
    }

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
        page_size: limitNum,
        total_pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  @Get('settings')
  async getSettings(@CurrentUser('role') role: Role) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to view system settings.',
      );
    }
    return this.adminService.getSettings();
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to update system settings.',
      );
    }
    return this.adminService.updateSettings(dto, userId);
  }

  @Post('settings/test-email')
  async testEmail(@CurrentUser('role') role: Role, @Body() dto: any) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to test email settings.',
      );
    }
    return this.emailService.testConnection(dto);
  }

  @Get('outbox/failed')
  async getFailedOutboxEvents(
    @CurrentUser('role') role: Role,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to view failed outbox events.',
      );
    }
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    return this.adminService.getFailedOutboxEvents(pageNum, limitNum);
  }

  @Post('outbox/:id/retry')
  async retryOutboxEvent(
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to retry failed outbox events.',
      );
    }
    return this.adminService.retryOutboxEvent(id);
  }

  @Get('inventory/frozen')
  async getFrozenItems(@CurrentUser('role') role: Role) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to view frozen items.',
      );
    }
    return this.adminService.getFrozenItems();
  }

  @Post('inventory/:id/unfreeze')
  async unfreezeItem(
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to unfreeze items.',
      );
    }
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
  async getUsers(
    @CurrentUser('role') role: Role,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to view users.',
      );
    }
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        include: {
          warehouseScopes: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
    ]);

    const mappedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopes: (user.warehouseScopes || []).map((s) => ({
        branch_id: s.warehouse?.branchId ?? null,
        warehouse_id: s.warehouseId,
        department_id: null,
      })),
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      language: 'en',
      created_at: user.createdAt.toISOString(),
    }));

    return {
      data: mappedUsers,
      meta: {
        page: pageNum,
        page_size: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('users/:id')
  async getUser(@CurrentUser('role') role: Role, @Param('id') id: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to view users.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        warehouseScopes: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopes: (user.warehouseScopes || []).map((s) => ({
        branch_id: s.warehouse?.branchId ?? null,
        warehouse_id: s.warehouseId,
        department_id: null,
      })),
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      language: 'en',
      created_at: user.createdAt.toISOString(),
    };
  }

  @Post('users/:id/unlock')
  async unlockUser(@CurrentUser('role') role: Role, @Param('id') id: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to unlock user accounts.',
      );
    }

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
}

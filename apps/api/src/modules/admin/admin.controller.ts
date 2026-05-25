import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';

import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
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
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

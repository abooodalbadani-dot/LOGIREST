import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { AuditLogsQuery } from '@logirest/shared-types';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.ADMIN, Role.INV_MGR, Role.AUDITOR)
  async getAuditLogs(@Query() query: AuditLogsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};
    if (query.userId) {
      whereClause.userId = query.userId;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where: whereClause }),
      this.prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const data = logs.map((log) => {
      let beforeStateJson: unknown = null;
      let afterStateJson: unknown = null;

      try {
        if (log.beforeStateJson) {
          beforeStateJson = JSON.parse(log.beforeStateJson);
        }
      } catch (e) {
        beforeStateJson = log.beforeStateJson;
      }

      try {
        if (log.afterStateJson) {
          afterStateJson = JSON.parse(log.afterStateJson);
        }
      } catch (e) {
        afterStateJson = log.afterStateJson;
      }

      return {
        id: log.id,
        createdAt: log.createdAt,
        performedByUserId: log.userId,
        performedByRole: log.user?.role ?? null,
        beforeStateJson,
        afterStateJson,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

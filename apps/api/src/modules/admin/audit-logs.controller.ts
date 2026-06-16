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
              name: true,
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
      let beforeState: Record<string, unknown> | null = null;
      let afterState: Record<string, unknown> | null = null;

      try {
        if (log.beforeStateJson) {
          beforeState = JSON.parse(log.beforeStateJson);
        }
      } catch (e) {
        // ignore parsing errors
      }

      try {
        if (log.afterStateJson) {
          afterState = JSON.parse(log.afterStateJson);
        }
      } catch (e) {
        // ignore parsing errors
      }

      const beforeObj =
        beforeState && typeof beforeState === 'object' ? beforeState : {};
      const afterObj =
        afterState && typeof afterState === 'object' ? afterState : {};
      const allKeys = new Set([
        ...Object.keys(beforeObj),
        ...Object.keys(afterObj),
      ]);
      const changesList: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }[] = [];

      for (const key of allKeys) {
        if (key === 'passwordHash' || key === 'password') continue;
        const oldVal = beforeObj[key];
        const newVal = afterObj[key];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changesList.push({
            field: key,
            oldValue: oldVal === undefined ? null : oldVal,
            newValue: newVal === undefined ? null : newVal,
          });
        }
      }

      const rawAction = log.action.toUpperCase();
      const actionMap: Record<
        string,
        'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'APPROVE'
      > = {
        CREATE: 'CREATE',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        POST: 'POST',
        APPROVE: 'APPROVE',
        PATCH: 'UPDATE',
        PUT: 'UPDATE',
      };
      const action = actionMap[rawAction] || 'UPDATE';

      return {
        id: log.id,
        entityType: log.targetTable,
        entityId: log.targetId,
        action,
        userId: log.userId ?? 'system',
        userName: log.user?.name ?? 'System',
        changes: changesList,
        createdAt: log.createdAt,
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

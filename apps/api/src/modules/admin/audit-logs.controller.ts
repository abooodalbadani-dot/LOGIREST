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
import type { Role, AuditLogsQuery } from '@logirest/shared-types';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAuditLogs(
    @CurrentUser('role') role: Role,
    @Query() query: AuditLogsQuery,
  ) {
    if (role !== 'ADMIN' && role !== 'INV_MGR' && role !== 'AUDITOR') {
      throw new ForbiddenException(
        'Only admins, managers, and auditors are authorized to access administrative audit logs.',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
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
      let beforeStateJson: any = null;
      let afterStateJson: any = null;

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
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

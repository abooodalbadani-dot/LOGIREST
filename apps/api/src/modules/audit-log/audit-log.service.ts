import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    tx: Prisma.TransactionClient,
    data: {
      userId: string;
      action: string;
      targetTable: string;
      targetId: string;
      beforeState: Record<string, unknown>;
      afterState: Record<string, unknown>;
      ipAddress?: string;
    },
  ) {
    try {
      return await tx.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          targetTable: data.targetTable,
          targetId: data.targetId,
          beforeStateJson: JSON.stringify(data.beforeState),
          afterStateJson: JSON.stringify(data.afterState),
          ipAddress: data.ipAddress || null,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to write audit log: ${errorMsg}`);
    }
  }
}

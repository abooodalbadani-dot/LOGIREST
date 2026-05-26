import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ArchivalJob {
  private readonly logger = new Logger(ArchivalJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run monthly: 03:00 AM on 1st of every month
  @Cron('0 3 1 * *', { name: 'db-archival' })
  async runArchival() {
    this.logger.log('Starting monthly database archival job...');
    const startTime = Date.now();

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    try {
      const { archivedLogsCount, archivedLedgersCount } = await this.prisma.$transaction(
        async (tx) => {
          // 1. Archive Audit Logs
          const oldLogs = await tx.auditLog.findMany({
            where: {
              createdAt: { lt: twoYearsAgo },
            },
          });

          if (oldLogs.length > 0) {
            await tx.auditLogArchive.createMany({
              data: oldLogs.map((log) => ({
                id: log.id,
                userId: log.userId,
                action: log.action,
                targetTable: log.targetTable,
                targetId: log.targetId,
                beforeStateJson: log.beforeStateJson,
                afterStateJson: log.afterStateJson,
                ipAddress: log.ipAddress,
                createdAt: log.createdAt,
              })),
            });

            await tx.auditLog.deleteMany({
              where: {
                id: { in: oldLogs.map((log) => log.id) },
              },
            });
          }

          // 2. Archive Stock Ledger entries
          const oldLedgers = await tx.stockLedger.findMany({
            where: {
              postedAt: { lt: twoYearsAgo },
            },
          });

          if (oldLedgers.length > 0) {
            await tx.stockLedgerArchive.createMany({
              data: oldLedgers.map((ledger) => ({
                id: ledger.id,
                postedAt: ledger.postedAt,
                warehouseId: ledger.warehouseId,
                itemId: ledger.itemId,
                lotId: ledger.lotId,
                quantity: ledger.quantity,
                documentId: ledger.documentId,
                documentType: ledger.documentType,
                idempotencyKey: ledger.idempotencyKey,
              })),
            });

            await tx.stockLedger.deleteMany({
              where: {
                id: { in: oldLedgers.map((ledger) => ledger.id) },
              },
            });
          }

          return {
            archivedLogsCount: oldLogs.length,
            archivedLedgersCount: oldLedgers.length,
          };
        },
        { timeout: 60000 }, // 1 minute timeout for large transaction
      );

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Database archival job completed in ${durationMs}ms. Archived ${archivedLogsCount} audit logs and ${archivedLedgersCount} stock ledger entries.`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database archival job failed: ${errorMsg}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { RedisLockService } from '../redis/redis-lock.service';
import { DocumentType, Prisma } from '@prisma/client';

@Injectable()
export class ArchivalJob {
  private readonly logger = new Logger(ArchivalJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: RedisLockService,
  ) {}

  // Run monthly: 03:00 AM on 1st of every month
  @Cron('0 3 1 * *', { name: 'db-archival' })
  async runArchival() {
    // Mutex lock for 10 minutes (600 seconds)
    await this.lockService.runWithLock('db-archival', 600, async () => {
      this.logger.log(
        'Starting monthly database archival job with distributed lock...',
      );
      const startTime = Date.now();

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      let archivedLogsCount = 0;
      let archivedLedgersCount = 0;

      try {
        // 1. Archive Audit Logs in batches of 1,000 using cursor-based pagination
        let lastProcessedLogId: string | undefined = undefined;
        let hasMoreLogs = true;
        while (hasMoreLogs) {
          const whereClause: any = {
            createdAt: { lt: twoYearsAgo },
          };
          if (lastProcessedLogId) {
            whereClause.id = { gt: lastProcessedLogId };
          }

          const oldLogs = await this.prisma.auditLog.findMany({
            where: whereClause,
            take: 1000,
            orderBy: { id: 'asc' },
          });

          if (oldLogs.length > 0) {
            lastProcessedLogId = oldLogs[oldLogs.length - 1].id;
            await this.prisma.$transaction(
              async (tx) => {
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
              },
              { timeout: 15000 },
            );

            archivedLogsCount += oldLogs.length;
            this.logger.log(
              `Archived a batch of ${oldLogs.length} audit logs. Total so far: ${archivedLogsCount}`,
            );
          } else {
            hasMoreLogs = false;
          }
        }

        // 2. Archive Stock Ledger and Cost Ledger entries in batches of 1,000 using cursor-based pagination
        let lastProcessedLedgerId: string | undefined = undefined;
        let lastProcessedCostId: string | undefined = undefined;
        let hasMoreLedgers = true;

        while (hasMoreLedgers) {
          const stockWhere: any = {
            postedAt: { lt: threeYearsAgo },
          };
          if (lastProcessedLedgerId) {
            stockWhere.id = { gt: lastProcessedLedgerId };
          }

          const costWhere: any = {
            postedAt: { lt: threeYearsAgo },
          };
          if (lastProcessedCostId) {
            costWhere.id = { gt: lastProcessedCostId };
          }

          const oldLedgers = await this.prisma.stockLedger.findMany({
            where: stockWhere,
            take: 1000,
            orderBy: { id: 'asc' },
          });

          const oldCostLedgers = await this.prisma.costLedger.findMany({
            where: costWhere,
            take: 1000,
            orderBy: { id: 'asc' },
          });

          if (oldLedgers.length === 0 && oldCostLedgers.length === 0) {
            hasMoreLedgers = false;
            break;
          }

          if (oldLedgers.length > 0) {
            lastProcessedLedgerId = oldLedgers[oldLedgers.length - 1].id;
          }
          if (oldCostLedgers.length > 0) {
            lastProcessedCostId = oldCostLedgers[oldCostLedgers.length - 1].id;
          }

          await this.prisma.$transaction(
            async (tx) => {
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

              if (oldCostLedgers.length > 0) {
                await tx.costLedgerArchive.createMany({
                  data: oldCostLedgers.map((ledger) => ({
                    id: ledger.id,
                    postedAt: ledger.postedAt,
                    warehouseId: ledger.warehouseId,
                    itemId: ledger.itemId,
                    quantity: ledger.quantity,
                    unitPrice: ledger.unitPrice,
                    newWac: ledger.newWac,
                    documentId: ledger.documentId,
                    documentType: ledger.documentType,
                    idempotencyKey: ledger.idempotencyKey,
                  })),
                });

                await tx.costLedger.deleteMany({
                  where: {
                    id: { in: oldCostLedgers.map((ledger) => ledger.id) },
                  },
                });
              }
            },
            {
              timeout: 30000,
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
          );

          archivedLedgersCount += oldLedgers.length + oldCostLedgers.length;
          this.logger.log(
            `Archived a batch of ${oldLedgers.length} stock ledgers and ${oldCostLedgers.length} cost ledgers. Total so far: ${archivedLedgersCount}`,
          );
        }

        const durationMs = Date.now() - startTime;
        this.logger.log(
          `Database archival job completed in ${durationMs}ms. Archived ${archivedLogsCount} audit logs and ${archivedLedgersCount} stock ledger entries.`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Database archival job failed: ${errorMsg}`);
      }
    });
  }
}

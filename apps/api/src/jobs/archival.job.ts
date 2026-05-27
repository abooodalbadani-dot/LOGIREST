import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { RedisLockService } from '../redis/redis-lock.service';
import { DocumentType } from '@prisma/client';

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

      let archivedLogsCount = 0;
      let archivedLedgersCount = 0;

      try {
        // 1. Archive Audit Logs in batches of 1,000 to prevent OOM
        let hasMoreLogs = true;
        while (hasMoreLogs) {
          const oldLogs = await this.prisma.auditLog.findMany({
            where: {
              createdAt: { lt: twoYearsAgo },
            },
            take: 1000,
            orderBy: { id: 'asc' },
          });

          if (oldLogs.length > 0) {
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

        // 2. Archive Stock Ledger entries in batches of 1,000 to prevent OOM
        let hasMoreLedgers = true;
        while (hasMoreLedgers) {
          const oldLedgers = await this.prisma.stockLedger.findMany({
            where: {
              postedAt: { lt: twoYearsAgo },
            },
            take: 1000,
            orderBy: { id: 'asc' },
          });

          if (oldLedgers.length > 0) {
            await this.prisma.$transaction(
              async (tx) => {
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
              },
              { timeout: 15000 },
            );

            archivedLedgersCount += oldLedgers.length;
            this.logger.log(
              `Archived a batch of ${oldLedgers.length} stock ledgers. Total so far: ${archivedLedgersCount}`,
            );
          } else {
            hasMoreLedgers = false;
          }
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

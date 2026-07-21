import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotificationService } from '../modules/notifications/notification.service';
import { RedisLockService } from '../redis/redis-lock.service';
import { Role, Prisma } from '@prisma/client';

@Injectable()
export class WacConsistencyJob {
  private readonly logger = new Logger(WacConsistencyJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly lockService: RedisLockService,
  ) {}

  /**
   * Scheduled job running weekly on Sundays at 02:00 AM.
   * Computes ledger-based WAC cost consistency versus recorded WarehouseItem WAC,
   * raising notifications for discrepancies greater than 0.01%.
   */
  @Cron('0 2 * * 0')
  async checkWacConsistency() {
    await this.lockService.runWithLock('wac-consistency-job', 600, async () => {
      this.logger.log('Starting weekly WAC ledger consistency scan...');

    try {
      // Fetch all warehouse items
      const warehouseItems = await this.prisma.warehouseItem.findMany({
        include: {
          item: true,
          warehouse: true,
        },
      });

      // O(2) queries regardless of item count
      const latestWacByItem = await this.prisma.$queryRaw<
        Array<{ warehouseId: string; itemId: string; newWac: Prisma.Decimal }>
      >`
        SELECT DISTINCT ON ("warehouseId", "itemId")
          "warehouseId", "itemId", "newWac"
        FROM "cost_ledger"
        ORDER BY "warehouseId", "itemId", "postedAt" DESC, "id" DESC
      `;

      const wacMap = new Map<string, number>();
      for (const row of latestWacByItem) {
        wacMap.set(`${row.warehouseId}:${row.itemId}`, Number(row.newWac));
      }

      let discrepancyCount = 0;

      for (const whItem of warehouseItems) {
        const key = `${whItem.warehouseId}:${whItem.itemId}`;
        const hasLedgerEntry = wacMap.has(key);

        if (!hasLedgerEntry) {
          // If no cost ledger entries exist, WAC should be 0.
          const wac = Number(whItem.wac);
          if (wac > 0) {
            discrepancyCount++;
            this.logger.warn(
              `WAC discrepancy! SKU ${whItem.item.sku} in warehouse ${whItem.warehouse.code} has WAC ${wac} but no CostLedger entries exist.`,
            );

            await this.notificationService.createNotification({
              targetRole: Role.ADMIN,
              warehouseId: whItem.warehouseId,
              message: `WAC Discrepancy: Item SKU ${whItem.item.sku} in Warehouse ${whItem.warehouse.name} has recorded WAC ${wac} but no CostLedger transaction entries found.`,
            });
          }
          continue;
        }

        const wac = Number(whItem.wac);
        const ledgerWac = wacMap.get(key) ?? 0;

        let variance = 0;
        if (ledgerWac > 0) {
          variance = Math.abs(wac - ledgerWac) / ledgerWac;
        } else if (wac > 0) {
          variance = 1.0; // 100% variance if ledger WAC is 0 but recorded WAC is positive
        }

        // Check if discrepancy exceeds 0.01% threshold (0.0001)
        if (variance > 0.0001) {
          discrepancyCount++;
          const percentStr = (variance * 100).toFixed(4);
          this.logger.warn(
            `WAC cost ledger drift! SKU ${whItem.item.sku} in warehouse ${whItem.warehouse.code}. Recorded WAC: ${wac}, Ledger WAC: ${ledgerWac} (Variance: ${percentStr}%)`,
          );

          await this.notificationService.createNotification({
            targetRole: Role.ADMIN,
            warehouseId: whItem.warehouseId,
            message: `CRITICAL WAC DRIFT: Item SKU ${whItem.item.sku} in Warehouse ${whItem.warehouse.name} has recorded WAC ${wac} but CostLedger sums to ${ledgerWac} (Variance of ${percentStr}% exceeds 0.01% limit).`,
          });
        }
      }

      this.logger.log(
        `WAC consistency scan completed. Checked ${warehouseItems.length} items, raised notifications for ${discrepancyCount} discrepancy(s).`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute WAC consistency check job: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    });
  }
}

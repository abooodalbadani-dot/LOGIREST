import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotificationService } from '../modules/notifications/notification.service';
import { Role } from '@prisma/client';

@Injectable()
export class WacConsistencyJob {
  private readonly logger = new Logger(WacConsistencyJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Scheduled job running weekly on Sundays at 02:00 AM.
   * Computes ledger-based WAC cost consistency versus recorded WarehouseItem WAC,
   * raising notifications for discrepancies greater than 0.01%.
   */
  @Cron('0 2 * * 0')
  async checkWacConsistency() {
    this.logger.log('Starting weekly WAC ledger consistency scan...');

    try {
      // Fetch all warehouse items
      const warehouseItems = await this.prisma.warehouseItem.findMany({
        include: {
          item: true,
          warehouse: true,
        },
      });

      let discrepancyCount = 0;

      for (const whItem of warehouseItems) {
        // Retrieve the latest CostLedger transaction for this warehouse item
        const latestCostLedger = await this.prisma.costLedger.findFirst({
          where: {
            warehouseId: whItem.warehouseId,
            itemId: whItem.itemId,
          },
          orderBy: {
            postedAt: 'desc',
          },
        });

        if (!latestCostLedger) {
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
        const ledgerWac = Number(latestCostLedger.newWac);

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
  }
}

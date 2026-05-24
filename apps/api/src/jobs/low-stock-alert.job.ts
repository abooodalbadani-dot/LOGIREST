import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../modules/outbox/outbox.service';

@Injectable()
export class LowStockAlertJob {
  private readonly logger = new Logger(LowStockAlertJob.name);

  // In-memory alert debounce registry
  // Key format: `${warehouseId}-${itemId}` -> value: Timestamp (ms)
  private readonly alertDebounceRegistry = new Map<string, number>();
  private readonly DEBOUNCE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Scheduled job running daily at 06:00 AM.
   * Scans inventory balances, detects items below their reorder points,
   * and triggers debounced Outbox alerts.
   */
  @Cron('0 6 * * *')
  async checkLowStockThresholds() {
    this.logger.log('Starting daily low stock threshold scan...');

    try {
      // Fetch all WarehouseItems where qtyOnHand <= Item.reorderPoint
      // including Item, Warehouse, and UoM references
      const warehouseItems = await this.prisma.warehouseItem.findMany({
        where: {
          item: {
            reorderPoint: {
              not: null,
            },
          },
        },
        include: {
          item: {
            include: {
              unitOfMeasure: true,
            },
          },
          warehouse: true,
        },
      });

      let alertCount = 0;

      // Filter and evaluate each candidate against its reorderPoint
      for (const whItem of warehouseItems) {
        const reorderPoint = Number(whItem.item.reorderPoint);
        const qtyOnHand = Number(whItem.qtyOnHand);

        if (qtyOnHand <= reorderPoint) {
          const debounceKey = `${whItem.warehouseId}-${whItem.itemId}`;
          const lastAlertTime = this.alertDebounceRegistry.get(debounceKey);
          const now = Date.now();

          // Enforce 24-hour debouncing block
          if (
            lastAlertTime &&
            now - lastAlertTime < this.DEBOUNCE_DURATION_MS
          ) {
            this.logger.debug(
              `Alert for item ${whItem.item.sku} in ${whItem.warehouse.code} debounced (sent less than 24h ago).`,
            );
            continue;
          }

          this.logger.log(
            `Low stock detected! Item: ${whItem.item.sku}, Warehouse: ${whItem.warehouse.code}, On Hand: ${qtyOnHand}, Reorder: ${reorderPoint}`,
          );

          // Dispatch Outbox event inside database transaction client
          await this.prisma.$transaction(async (tx) => {
            await this.outbox.writeEvent(tx, 'LOW_STOCK_ALERT', {
              itemId: whItem.itemId,
              itemName: whItem.item.name,
              sku: whItem.item.sku,
              warehouseId: whItem.warehouseId,
              warehouseName: whItem.warehouse.name,
              qtyOnHand,
              reorderPoint,
              uomCode: whItem.item.unitOfMeasure.code,
            });
          });

          // Registry update to debounce subsequent alerts
          this.alertDebounceRegistry.set(debounceKey, now);
          alertCount++;
        }
      }

      this.logger.log(
        `Completed low stock threshold scan. Triggered ${alertCount} alert(s).`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run low stock alert check job: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

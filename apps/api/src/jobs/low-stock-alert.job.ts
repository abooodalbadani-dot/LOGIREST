import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../modules/outbox/outbox.service';
import { RedisLockService } from '../redis/redis-lock.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class LowStockAlertJob {
  private readonly logger = new Logger(LowStockAlertJob.name);

  private readonly DEBOUNCE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly lockService: RedisLockService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Scheduled job running daily at 06:00 AM.
   * Scans inventory balances, detects items below their reorder points,
   * and triggers debounced Outbox alerts.
   */
  @Cron('0 6 * * *')
  async checkLowStockThresholds() {
    await this.lockService.runWithLock('low-stock-alert-job', 300, async () => {
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
          const debounceKey = `low_stock_debounce:${whItem.warehouseId}:${whItem.itemId}`;

          // Check Redis debounce cache
          try {
            const lastAlert = await this.redis.get(debounceKey);
            if (lastAlert) {
              this.logger.debug(
                `Alert for item ${whItem.item.sku} in ${whItem.warehouse.code} debounced (sent less than 24h ago).`,
              );
              continue;
            }
          } catch (err) {
            this.logger.warn(
              `Redis unreachable for debounce check on key ${debounceKey}, bypassing cache. Error: ${err instanceof Error ? err.message : String(err)}`,
            );
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

          // Set Redis debounce with 24h TTL
          try {
            await this.redis.set(
              debounceKey,
              '1',
              'EX',
              this.DEBOUNCE_TTL_SECONDS,
            );
          } catch (err) {
            this.logger.warn(
              `Redis unreachable for debounce set on key ${debounceKey}. Error: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
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
    });
  }
}

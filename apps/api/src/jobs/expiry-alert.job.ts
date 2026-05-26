import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { OutboxService } from '../modules/outbox/outbox.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class ExpiryAlertJob {
  private readonly logger = new Logger(ExpiryAlertJob.name);
  private readonly DEBOUNCE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Scheduled job running daily at 07:00 AM.
   * Scans lot records expiring within 7 days with stock on hand > 0,
   * and triggers debounced Outbox alert events.
   */
  @Cron('0 7 * * *')
  async checkExpiringLots() {
    this.logger.log('Starting daily lot expiry threshold scan...');

    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Fetch warehouse item lots that are not expired yet, but will expire in next 7 days, and have positive stock
      const expiringLots = await this.prisma.warehouseItemLot.findMany({
        where: {
          qtyOnHand: { gt: 0 },
          lot: {
            expiryDate: {
              not: null,
              lte: sevenDaysFromNow,
              gt: new Date(),
            },
          },
        },
        include: {
          item: {
            include: {
              unitOfMeasure: true,
            },
          },
          lot: true,
          warehouse: true,
        },
      });

      let alertCount = 0;

      for (const whLot of expiringLots) {
        const debounceKey = `expiry_alert_debounce:${whLot.warehouseId}:${whLot.lotId}`;

        // Check Redis debounce
        try {
          const lastAlert = await this.redis.get(debounceKey);
          if (lastAlert) {
            this.logger.debug(
              `Alert for lot ${whLot.lot.lotNumber} in warehouse ${whLot.warehouse.code} debounced (sent less than 24h ago).`,
            );
            continue;
          }
        } catch (err) {
          this.logger.warn(
            `Redis unreachable for debounce check on key ${debounceKey}, bypassing cache. Error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        const qtyOnHand = Number(whLot.qtyOnHand);
        this.logger.log(
          `Expiring lot detected! Lot: ${whLot.lot.lotNumber}, Item: ${whLot.item.sku}, Warehouse: ${whLot.warehouse.code}, Expiry: ${whLot.lot.expiryDate?.toISOString()}`,
        );

        // Dispatch Outbox event
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.writeEvent(tx, 'EXPIRY_WARNING', {
            lotId: whLot.lotId,
            lotNumber: whLot.lot.lotNumber,
            itemId: whLot.itemId,
            itemName: whLot.item.name,
            sku: whLot.item.sku,
            warehouseId: whLot.warehouseId,
            warehouseName: whLot.warehouse.name,
            qtyOnHand,
            expiryDate: whLot.lot.expiryDate,
            uomCode: whLot.item.unitOfMeasure.code,
          });
        });

        // Set Redis debounce
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

      this.logger.log(
        `Completed lot expiry threshold scan. Triggered ${alertCount} alert(s).`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run expiring lot check job: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

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
   * Scans lot records that are past their expiry date and updates their status to EXPIRED.
   * Logs an audit entry and writes a critical notification log if the lot has positive stock.
   */
  async autoExpireExpiredLots() {
    this.logger.log('Starting daily auto-expiry transition scan...');
    try {
      const now = new Date();
      const expiredLots = await this.prisma.lot.findMany({
        where: {
          expiryDate: {
            not: null,
            lte: now,
          },
          status: {
            not: 'EXPIRED',
          },
        },
        include: {
          item: true,
          warehouseItemLots: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      this.logger.log(`Found ${expiredLots.length} lot(s) that have expired.`);

      for (const lot of expiredLots) {
        await this.prisma.$transaction(async (tx) => {
          // Transition status to EXPIRED
          await tx.lot.update({
            where: { id: lot.id },
            data: { status: 'EXPIRED' },
          });

          // Log in AuditLog
          await tx.auditLog.create({
            data: {
              action: 'LOT_EXPIRED',
              targetTable: 'lots',
              targetId: lot.id,
              beforeStateJson: JSON.stringify({ status: lot.status }),
              afterStateJson: JSON.stringify({ status: 'EXPIRED' }),
              ipAddress: '127.0.0.1', // System execution
            },
          });

          // If the lot still has a positive stock balance, issue a CRITICAL notification alert
          for (const whItemLot of lot.warehouseItemLots) {
            const qty = Number(whItemLot.qtyOnHand);
            if (qty > 0) {
              await tx.notificationLog.create({
                data: {
                  targetRole: 'INV_MGR',
                  warehouseId: whItemLot.warehouseId,
                  message: `CRITICAL: Expired lot ${lot.lotNumber} (${lot.item.name}) has positive stock (${qty}) in warehouse ${whItemLot.warehouse.code}.`,
                  isRead: false,
                },
              });
            }
          }

          this.logger.log(`Lot ${lot.lotNumber} successfully auto-expired.`);
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute auto-expiry check: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Scheduled job running daily at 07:00 AM.
   * Performs auto-expiry of expired lots and scans lot records expiring within 7 days
   * with stock on hand > 0, triggering debounced Outbox alert events.
   */
  @Cron('0 7 * * *')
  async checkExpiringLots() {
    await this.autoExpireExpiredLots();

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

  /**
   * Scheduled job running daily at 07:30 AM.
   * Scans lot records expiring within 30 days with stock on hand > 0,
   * triggering debounced Outbox alert events with a 7-day Redis debounce.
   */
  @Cron('30 7 * * *')
  async checkExpiringLots30Days() {
    this.logger.log('Starting daily 30-day lot expiry threshold scan...');

    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Fetch warehouse item lots that are not expired yet, but will expire in next 30 days, and have positive stock
      const expiringLots = await this.prisma.warehouseItemLot.findMany({
        where: {
          qtyOnHand: { gt: 0 },
          lot: {
            expiryDate: {
              not: null,
              lte: thirtyDaysFromNow,
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
        const debounceKey = `expiry_alert_30d_debounce:${whLot.warehouseId}:${whLot.lotId}`;

        // Check Redis debounce
        try {
          const lastAlert = await this.redis.get(debounceKey);
          if (lastAlert) {
            this.logger.debug(
              `Alert for lot ${whLot.lot.lotNumber} in warehouse ${whLot.warehouse.code} debounced (sent less than 7 days ago).`,
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
          `Expiring lot (30-day) detected! Lot: ${whLot.lot.lotNumber}, Item: ${whLot.item.sku}, Warehouse: ${whLot.warehouse.code}, Expiry: ${whLot.lot.expiryDate?.toISOString()}`,
        );

        // Dispatch Outbox event
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.writeEvent(tx, 'EXPIRY_WARNING_ALERT', {
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

        // Set Redis debounce: 7 days = 7 * 24 * 60 * 60 seconds
        try {
          await this.redis.set(debounceKey, '1', 'EX', 7 * 24 * 60 * 60);
        } catch (err) {
          this.logger.warn(
            `Redis unreachable for debounce set on key ${debounceKey}. Error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        alertCount++;
      }

      this.logger.log(
        `Completed 30-day lot expiry threshold scan. Triggered ${alertCount} alert(s).`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run 30-day expiring lot check job: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

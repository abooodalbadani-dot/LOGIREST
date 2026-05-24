import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class ReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationJob.name);
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    this.scheduleNextRun();
  }

  onModuleDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  scheduleNextRun() {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(1, 0, 0, 0); // 01:00 AM

    if (now >= nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    this.logger.log(
      `Scheduling next reconciliation job run in ${delay} ms (at ${nextRun.toISOString()})`,
    );

    this.timeoutId = setTimeout(() => {
      void (async () => {
        try {
          await this.runReconciliation();
        } catch (error) {
          this.logger.error('Error running reconciliation job', error);
        } finally {
          this.scheduleNextRun();
        }
      })();
    }, delay);
  }

  async runReconciliation() {
    this.logger.log('Starting daily stock-to-ledger reconciliation job...');

    // 1. Group stock ledger transactions by warehouse and item to sum quantities
    const ledgerTotals = await this.prisma.stockLedger.groupBy({
      by: ['warehouseId', 'itemId'],
      _sum: {
        quantity: true,
      },
    });

    const ledgerMap = new Map<string, Prisma.Decimal>();
    for (const total of ledgerTotals) {
      const key = `${total.warehouseId}_${total.itemId}`;
      ledgerMap.set(key, total._sum.quantity || new Prisma.Decimal(0));
    }

    // 2. Fetch all warehouse items to compare with historical sums
    const warehouseItems = await this.prisma.warehouseItem.findMany({
      include: {
        item: true,
        warehouse: true,
      },
    });

    let processedCount = 0;
    let discrepancyCount = 0;

    for (const whItem of warehouseItems) {
      processedCount++;
      const key = `${whItem.warehouseId}_${whItem.itemId}`;
      const ledgerQty = ledgerMap.get(key) || new Prisma.Decimal(0);
      const currentQty = new Prisma.Decimal(whItem.qtyOnHand);

      if (!currentQty.equals(ledgerQty)) {
        discrepancyCount++;
        this.logger.warn(
          `Discrepancy detected for Item ${whItem.item.sku} in Warehouse ${whItem.warehouse.name} (${whItem.warehouse.code}). qtyOnHand: ${currentQty.toString()}, ledgerQty: ${ledgerQty.toString()}`,
        );

        // Freeze the item and raise notification inside transaction
        await this.prisma.$transaction(async (tx) => {
          await tx.warehouseItem.update({
            where: {
              warehouseId_itemId: {
                warehouseId: whItem.warehouseId,
                itemId: whItem.itemId,
              },
            },
            data: {
              isFrozen: true,
            },
          });

          await this.notificationService.createNotification({
            targetRole: Role.ADMIN,
            warehouseId: whItem.warehouseId,
            message: `CRITICAL: Stock reconciliation discrepancy for SKU ${whItem.item.sku} in Warehouse ${whItem.warehouse.name}. System has frozen the item to prevent further operations. Qty On Hand: ${currentQty.toString()}, Ledger Qty: ${ledgerQty.toString()}`,
          });
        });
      }
    }

    this.logger.log(
      `Reconciliation job completed. Processed ${processedCount} items, found and resolved ${discrepancyCount} discrepancies.`,
    );
  }
}

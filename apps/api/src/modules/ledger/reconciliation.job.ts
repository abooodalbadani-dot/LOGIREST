import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class ReconciliationJob {
  private readonly logger = new Logger(ReconciliationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 1 * * *', { name: 'daily-reconciliation' })
  async runReconciliation() {
    const startTime = Date.now();
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

    // 3. Aggregate active/in-transit LotAllocations (transfers in IN_TRANSIT status)
    const activeAllocations = await this.prisma.lotAllocation.findMany({
      where: {
        transferLine: {
          transfer: {
            status: 'IN_TRANSIT',
          },
        },
      },
      include: {
        transferLine: {
          include: {
            transfer: true,
          },
        },
      },
    });

    // Map: toWarehouseId_itemId -> total quantity allocated/in-transit
    const allocationMap = new Map<string, Prisma.Decimal>();
    for (const alloc of activeAllocations) {
      if (alloc.transferLine) {
        const warehouseId = alloc.transferLine.transfer.toWarehouseId;
        const itemId = alloc.transferLine.itemId;
        const key = `${warehouseId}_${itemId}`;
        const currentVal = allocationMap.get(key) || new Prisma.Decimal(0);
        allocationMap.set(key, currentVal.add(alloc.quantityAllocated));
      }
    }

    let processedCount = 0;
    let discrepancyCount = 0;
    const frozenItems: string[] = [];

    for (const whItem of warehouseItems) {
      processedCount++;
      const key = `${whItem.warehouseId}_${whItem.itemId}`;
      const ledgerQty = ledgerMap.get(key) || new Prisma.Decimal(0);
      const currentQty = new Prisma.Decimal(whItem.qtyOnHand);

      // Check A: Qty On Hand vs Stock Ledger Sum (hard check, freezes item)
      if (!currentQty.equals(ledgerQty)) {
        discrepancyCount++;
        this.logger.warn(
          `Discrepancy detected for Item ${whItem.item.sku} in Warehouse ${whItem.warehouse.name} (${whItem.warehouse.code}). qtyOnHand: ${currentQty.toString()}, ledgerQty: ${ledgerQty.toString()}`,
        );

        frozenItems.push(whItem.item.sku);

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

      // Check B: Qty Allocated vs Active Allocations (soft check, logs warning and raises notification)
      const expectedQtyAllocated =
        allocationMap.get(key) || new Prisma.Decimal(0);
      const currentQtyAllocated = new Prisma.Decimal(whItem.qtyAllocated);

      if (!currentQtyAllocated.equals(expectedQtyAllocated)) {
        this.logger.warn(
          `Allocation discrepancy detected for Item ${whItem.item.sku} in Warehouse ${whItem.warehouse.name} (${whItem.warehouse.code}). qtyAllocated: ${currentQtyAllocated.toString()}, expected (in-transit): ${expectedQtyAllocated.toString()}`,
        );

        // Raise soft notification
        await this.notificationService.createNotification({
          targetRole: Role.ADMIN,
          warehouseId: whItem.warehouseId,
          message: `WARNING: Stock allocation discrepancy for SKU ${whItem.item.sku} in Warehouse ${whItem.warehouse.name}. Qty Allocated: ${currentQtyAllocated.toString()}, Expected (In-transit): ${expectedQtyAllocated.toString()}`,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // Log the run in reconciliation_runs table
    await this.prisma.reconciliationRun.create({
      data: {
        itemsChecked: processedCount,
        discrepanciesFound: discrepancyCount,
        frozenItems,
        durationMs,
      },
    });

    this.logger.log(
      `Reconciliation job completed in ${durationMs}ms. Processed ${processedCount} items, found and resolved ${discrepancyCount} discrepancies.`,
    );
  }
}

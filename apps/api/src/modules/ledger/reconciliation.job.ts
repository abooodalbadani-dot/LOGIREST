import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { Prisma, Role } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';
import { RedisLockService } from '../../redis/redis-lock.service';
import { AlertService } from '../alerts/alert.service';

@Injectable()
export class ReconciliationJob {
  private readonly logger = new Logger(ReconciliationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly metricsService: MetricsService,
    private readonly lockService: RedisLockService,
    private readonly alertService: AlertService,
  ) {}

  @Cron('0 1 * * *', { name: 'daily-reconciliation' })
  async runReconciliation() {
    const startTime = Date.now();

    // Acquire distributed lock to prevent concurrent multi-node executions
    const lockKey = 'reconciliation-job';
    const lockTtlSeconds = 10 * 60; // 10 minutes lock TTL
    const acquired = await this.lockService.acquireLock(
      lockKey,
      lockTtlSeconds,
    );
    if (!acquired) {
      this.logger.warn(
        'Reconciliation job already running (lock held). Skipping.',
      );
      return;
    }

    this.logger.log('Starting daily stock-to-ledger reconciliation job...');

    try {
      // 1. Group stock ledger transactions by warehouse and item to sum quantities (optimized raw SQL GROUP BY)
      const ledgerTotals = await this.prisma.$queryRaw<
        Array<{ warehouseId: string; itemId: string; total: string }>
      >`
        SELECT "warehouseId", "itemId", SUM(quantity)::text as total
        FROM stock_ledger
        GROUP BY "warehouseId", "itemId"
      `;

      const ledgerMap = new Map<string, Prisma.Decimal>();
      for (const total of ledgerTotals) {
        const key = `${total.warehouseId}_${total.itemId}`;
        ledgerMap.set(key, new Prisma.Decimal(total.total || '0'));
      }

      // 2. Aggregate active/in-transit LotAllocations (transfers in IN_TRANSIT status)
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
      let lotDiscrepanciesFound = 0;
      const frozenItems: string[] = [];
      const discrepanciesToFreeze: { warehouseId: string; itemId: string }[] =
        [];
      const notificationsToCreate: {
        targetRole: Role;
        warehouseId?: string;
        message: string;
      }[] = [];

      // 3. Paginate warehouse items sweep (batch size 500)
      let itemCursor: { warehouseId: string; itemId: string } | undefined;
      while (true) {
        const batch: Array<any> = await this.prisma.warehouseItem.findMany({
          take: 500,
          ...(itemCursor
            ? { skip: 1, cursor: { warehouseId_itemId: itemCursor } }
            : {}),
          include: {
            item: true,
            warehouse: true,
          },
          orderBy: [{ warehouseId: 'asc' }, { itemId: 'asc' }],
        });

        if (batch.length === 0) break;

        for (const whItem of batch) {
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
            discrepanciesToFreeze.push({
              warehouseId: whItem.warehouseId,
              itemId: whItem.itemId,
            });

            notificationsToCreate.push({
              targetRole: Role.ADMIN,
              warehouseId: whItem.warehouseId,
              message: `CRITICAL: Stock reconciliation discrepancy for SKU ${whItem.item.sku} in Warehouse ${whItem.warehouse.name}. System has frozen the item to prevent further operations. Qty On Hand: ${currentQty.toString()}, Ledger Qty: ${ledgerQty.toString()}`,
            });
          }

          // Check B: Qty Allocated vs Active Allocations (soft check)
          const expectedQtyAllocated =
            allocationMap.get(key) || new Prisma.Decimal(0);
          const currentQtyAllocated = new Prisma.Decimal(whItem.qtyAllocated);

          if (!currentQtyAllocated.equals(expectedQtyAllocated)) {
            this.logger.warn(
              `Allocation discrepancy detected for Item ${whItem.item.sku} in Warehouse ${whItem.warehouse.name} (${whItem.warehouse.code}). qtyAllocated: ${currentQtyAllocated.toString()}, expected (in-transit): ${expectedQtyAllocated.toString()}`,
            );

            notificationsToCreate.push({
              targetRole: Role.ADMIN,
              warehouseId: whItem.warehouseId,
              message: `WARNING: Stock allocation discrepancy for SKU ${whItem.item.sku} in Warehouse ${whItem.warehouse.name}. Qty Allocated: ${currentQtyAllocated.toString()}, Expected (In-transit): ${expectedQtyAllocated.toString()}`,
            });
          }
        }

        const last = batch[batch.length - 1];
        itemCursor = { warehouseId: last.warehouseId, itemId: last.itemId };
        if (batch.length < 500) break;
      }

      // Check C: Lot-level drift — aggregate lot-level stock ledger totals
      const lotLedgerTotals = await this.prisma.$queryRaw<
        Array<{ warehouseId: string; lotId: string; total: string }>
      >`
        SELECT "warehouseId", "lotId", SUM(quantity)::text as total
        FROM stock_ledger
        WHERE "lotId" IS NOT NULL
        GROUP BY "warehouseId", "lotId"
      `;

      const lotLedgerMap = new Map<string, Prisma.Decimal>();
      for (const total of lotLedgerTotals) {
        const key = `${total.warehouseId}_${total.lotId}`;
        lotLedgerMap.set(key, new Prisma.Decimal(total.total || '0'));
      }

      // Batch process warehouseItemLots cursor-based pagination (batch size 500)
      let lotCursor:
        | { warehouseId: string; itemId: string; lotId: string }
        | undefined;
      while (true) {
        const batchLots: Array<any> =
          await this.prisma.warehouseItemLot.findMany({
            take: 500,
            ...(lotCursor
              ? { skip: 1, cursor: { warehouseId_itemId_lotId: lotCursor } }
              : {}),
            include: {
              item: { select: { sku: true } },
              lot: { select: { lotNumber: true, status: true } },
              warehouse: { select: { name: true, code: true } },
            },
            orderBy: [
              { warehouseId: 'asc' },
              { itemId: 'asc' },
              { lotId: 'asc' },
            ],
          });

        if (batchLots.length === 0) break;

        for (const wil of batchLots) {
          const key = `${wil.warehouseId}_${wil.lotId}`;
          const ledgerLotQty = lotLedgerMap.get(key) || new Prisma.Decimal(0);
          const currentLotQty = new Prisma.Decimal(wil.qtyOnHand);

          if (!currentLotQty.equals(ledgerLotQty)) {
            lotDiscrepanciesFound++;
            this.logger.warn(
              `Lot-level discrepancy for Lot ${wil.lot.lotNumber} (SKU: ${wil.item.sku}) in Warehouse ${wil.warehouse.name} (${wil.warehouse.code}). qtyOnHand: ${currentLotQty.toString()}, ledgerQty: ${ledgerLotQty.toString()}`,
            );

            notificationsToCreate.push({
              targetRole: Role.ADMIN,
              warehouseId: wil.warehouseId,
              message: `Lot drift detected: Lot ${wil.lot.lotNumber} (SKU: ${wil.item.sku}) in Warehouse ${wil.warehouse.name} (${wil.warehouse.code}) has qty_on_hand ${currentLotQty.toString()} but stock_ledger sums to ${ledgerLotQty.toString()}.`,
            });
          }

          // Check F: EXPIRED/QUARANTINE lots with positive balance (Task-11)
          if (
            currentLotQty.gt(0) &&
            (wil.lot.status === 'EXPIRED' || wil.lot.status === 'QUARANTINE')
          ) {
            this.logger.warn(
              `Lot status alert: Lot ${wil.lot.lotNumber} (SKU: ${wil.item.sku}) is marked ${wil.lot.status} but has positive balance of ${currentLotQty.toString()} in Warehouse ${wil.warehouse.name} (${wil.warehouse.code}).`,
            );

            notificationsToCreate.push({
              targetRole: Role.ADMIN,
              warehouseId: wil.warehouseId,
              message: `CRITICAL: Lot ${wil.lot.lotNumber} (SKU: ${wil.item.sku}) in Warehouse ${wil.warehouse.name} is marked as ${wil.lot.status} but has positive balance of ${currentLotQty.toString()}!`,
            });
          }
        }

        const last = batchLots[batchLots.length - 1];
        lotCursor = {
          warehouseId: last.warehouseId,
          itemId: last.itemId,
          lotId: last.lotId,
        };
        if (batchLots.length < 500) break;
      }

      // Check D: CostLedger orphan detection (Task-10) - Refactored to single set-based join query (T023)
      const orphanedGrns = await this.prisma.$queryRaw<
        Array<{ id: string; grnNumber: string }>
      >`
        SELECT DISTINCT grn.id, grn."grnNumber"
        FROM goods_received_notes grn
        INNER JOIN stock_ledger sl ON sl."documentId" = grn.id AND sl."documentType" = 'GOODS_RECEIVED_NOTE'::"DocumentType"
        LEFT JOIN cost_ledger cl ON cl."documentId" = grn.id AND cl."documentType" = 'GOODS_RECEIVED_NOTE'::"DocumentType"
        WHERE grn.status = 'POSTED' AND cl.id IS NULL
      `;

      for (const grn of orphanedGrns) {
        this.logger.error(
          `ORPHAN: GRN ${grn.grnNumber} has StockLedger entries but NO CostLedger entries. WAC integrity may be compromised.`,
        );
        notificationsToCreate.push({
          targetRole: Role.ADMIN,
          message: `CRITICAL: GRN ${grn.grnNumber} has stock entries but no cost ledger entries. WAC may be corrupted.`,
        });
      }

      // Check E: Orphaned lots (Task-11)
      const orphanedLots = await this.prisma.$queryRaw<
        Array<{
          lotId: string;
          warehouseId: string;
          itemId: string;
          qtyOnHand: string;
        }>
      >`
        SELECT wil."lotId", wil."warehouseId", wil."itemId", wil."qtyOnHand"::text
        FROM warehouse_item_lots wil
        LEFT JOIN warehouse_items wi ON wi."warehouseId" = wil."warehouseId" AND wi."itemId" = wil."itemId"
        WHERE wil."qtyOnHand" > 0 AND wi."itemId" IS NULL
      `;

      for (const orphan of orphanedLots) {
        this.logger.error(
          `ORPHAN LOT: Lot ${orphan.lotId} in warehouse ${orphan.warehouseId} has balance ${orphan.qtyOnHand} but no parent WarehouseItem record`,
        );
        notificationsToCreate.push({
          targetRole: Role.ADMIN,
          warehouseId: orphan.warehouseId,
          message: `CRITICAL: Orphaned Lot ${orphan.lotId} detected in warehouse ${orphan.warehouseId} with balance ${orphan.qtyOnHand} but no parent WarehouseItem record!`,
        });
      }

      // 4. Batch update database freezes in a single O(1) transaction
      if (discrepanciesToFreeze.length > 0) {
        await this.prisma.$transaction(async (tx) => {
          await tx.warehouseItem.updateMany({
            where: {
              OR: discrepanciesToFreeze.map((d) => ({
                warehouseId: d.warehouseId,
                itemId: d.itemId,
              })),
            },
            data: {
              isFrozen: true,
            },
          });
        });
      }

      // 5. Trigger all notifications concurrently
      if (notificationsToCreate.length > 0) {
        await Promise.all(
          notificationsToCreate.map((n) =>
            this.notificationService.createNotification(n),
          ),
        );
      }

      const durationMs = Date.now() - startTime;

      // Log the run in reconciliation_runs table
      await this.prisma.reconciliationRun.create({
        data: {
          itemsChecked: processedCount,
          discrepanciesFound: discrepancyCount,
          lotDiscrepanciesFound,
          frozenItems,
          durationMs,
        },
      });

      const totalDiscrepancies = discrepancyCount + lotDiscrepanciesFound;
      if (totalDiscrepancies > 0) {
        this.metricsService.reconciliationDiscrepanciesCounter.inc(
          totalDiscrepancies,
        );
      }

      // Trigger Slack webhook alert for reconciliation mismatch (non-blocking)
      if (
        totalDiscrepancies > 0 ||
        orphanedGrns.length > 0 ||
        orphanedLots.length > 0
      ) {
        const alertMsg = `Nightly stock reconciliation run detected discrepancies!
*Core stock discrepancies:* ${discrepancyCount} items frozen.
*Lot-level drifts:* ${lotDiscrepanciesFound} lots.
*Orphaned GRNs:* ${orphanedGrns.length} documents.
*Orphaned Lots:* ${orphanedLots.length} records.
Please review the system logs and administrator notification panel immediately.`;

        this.alertService
          .sendSlackAlert(alertMsg, '⚠️ RECONCILIATION DISCREPANCY DETECTED', {
            itemsChecked: processedCount,
            discrepancyCount,
            lotDiscrepanciesFound,
            orphanedGrnsCount: orphanedGrns.length,
            orphanedLotsCount: orphanedLots.length,
            durationMs,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to dispatch reconciliation Slack alert: ${err.message}`,
            );
          });
      }

      // Record duration metrics in Prometheus
      this.metricsService.reconciliationDurationHistogram.observe(durationMs);

      this.logger.log(
        `Reconciliation job completed in ${durationMs}ms. Processed ${processedCount} items, found ${discrepancyCount} discrepancies, detected ${lotDiscrepanciesFound} lot-level drifts.`,
      );
    } finally {
      await this.lockService.releaseLock(lockKey);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, Prisma } from '@prisma/client';

export interface Discrepancy {
  type: 'ITEM_LEDGER_PARITY' | 'LOT_LEDGER_PARITY' | 'LOT_ITEM_AGGREGATION';
  itemId: string;
  warehouseId: string;
  lotId?: string;
  physicalQty: number;
  ledgerQty: number;
  variance: number;
  quarantined: boolean;
}

export interface ValidationCertificate {
  status: 'CONSISTENT' | 'DISCREPANCY_DETECTED';
  success: boolean;
  timestamp: string;
  itemsAudited: number;
  lotsAudited: number;
  discrepanciesCount: number;
  discrepancies: Discrepancy[];
}

@Injectable()
export class InventoryValidationService {
  private readonly logger = new Logger(InventoryValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validate(): Promise<ValidationCertificate> {
    const startTime = Date.now();
    const discrepancies: Discrepancy[] = [];
    const frozenSet = new Set<string>();

    const [{ count: itemsAudited }] = await this.prisma.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(*)::int AS count FROM warehouse_items
    `;

    const [{ count: lotsAudited }] = await this.prisma.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(*)::int AS count FROM warehouse_item_lots
    `;

    const eq1Results = await this.prisma.$queryRaw<
      Array<{
        item_id: string;
        warehouse_id: string;
        qty_on_hand: string;
        ledger_sum: string;
      }>
    >`
      SELECT wi.item_id, wi.warehouse_id, wi.qty_on_hand, COALESCE(SUM(sl.quantity), 0) AS ledger_sum
      FROM warehouse_items wi
      LEFT JOIN stock_ledger sl ON wi.item_id = sl.item_id AND wi.warehouse_id = sl.warehouse_id
      GROUP BY wi.item_id, wi.warehouse_id, wi.qty_on_hand
      HAVING wi.qty_on_hand != COALESCE(SUM(sl.quantity), 0)
    `;

    for (const row of eq1Results) {
      discrepancies.push({
        type: 'ITEM_LEDGER_PARITY',
        itemId: row.item_id,
        warehouseId: row.warehouse_id,
        physicalQty: Number(row.qty_on_hand),
        ledgerQty: Number(row.ledger_sum),
        variance: Number(row.qty_on_hand) - Number(row.ledger_sum),
        quarantined: false,
      });
    }

    const eq2Results = await this.prisma.$queryRaw<
      Array<{
        lot_id: string;
        item_id: string;
        warehouse_id: string;
        qty_on_hand: string;
        ledger_sum: string;
      }>
    >`
      SELECT wil.lot_id, wil.item_id, wil.warehouse_id, wil.qty_on_hand, COALESCE(SUM(sl.quantity), 0) AS ledger_sum
      FROM warehouse_item_lots wil
      LEFT JOIN stock_ledger sl ON wil.lot_id = sl.lot_id AND wil.item_id = sl.item_id AND wil.warehouse_id = sl.warehouse_id
      GROUP BY wil.lot_id, wil.item_id, wil.warehouse_id, wil.qty_on_hand
      HAVING wil.qty_on_hand != COALESCE(SUM(sl.quantity), 0)
    `;

    for (const row of eq2Results) {
      discrepancies.push({
        type: 'LOT_LEDGER_PARITY',
        itemId: row.item_id,
        warehouseId: row.warehouse_id,
        lotId: row.lot_id,
        physicalQty: Number(row.qty_on_hand),
        ledgerQty: Number(row.ledger_sum),
        variance: Number(row.qty_on_hand) - Number(row.ledger_sum),
        quarantined: false,
      });
    }

    const eq3Results = await this.prisma.$queryRaw<
      Array<{
        item_id: string;
        warehouse_id: string;
        qty_on_hand: string;
        lot_sum: string;
      }>
    >`
      SELECT wi.item_id, wi.warehouse_id, wi.qty_on_hand, COALESCE(SUM(wil.qty_on_hand), 0) AS lot_sum
      FROM warehouse_items wi
      LEFT JOIN warehouse_item_lots wil ON wi.item_id = wil.item_id AND wi.warehouse_id = wil.warehouse_id
      GROUP BY wi.item_id, wi.warehouse_id, wi.qty_on_hand
      HAVING wi.qty_on_hand != COALESCE(SUM(wil.qty_on_hand), 0)
    `;

    for (const row of eq3Results) {
      discrepancies.push({
        type: 'LOT_ITEM_AGGREGATION',
        itemId: row.item_id,
        warehouseId: row.warehouse_id,
        physicalQty: Number(row.qty_on_hand),
        ledgerQty: Number(row.lot_sum),
        variance: Number(row.qty_on_hand) - Number(row.lot_sum),
        quarantined: false,
      });
    }

    if (discrepancies.length > 0) {
      for (const d of discrepancies) {
        const key = `${d.warehouseId}_${d.itemId}`;
        if (frozenSet.has(key)) continue;
        frozenSet.add(key);

        try {
          await this.prisma.$transaction(async (tx) => {
            const before = await tx.warehouseItem.findUnique({
              where: {
                warehouseId_itemId: {
                  warehouseId: d.warehouseId,
                  itemId: d.itemId,
                },
              },
              select: { isFrozen: true },
            });

            if (before?.isFrozen) return;

            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: d.warehouseId,
                  itemId: d.itemId,
                },
              },
              data: { isFrozen: true },
            });

            await tx.auditLog.create({
              data: {
                action: 'AUTO_FREEZE',
                targetTable: 'warehouse_items',
                targetId: key,
                beforeStateJson: JSON.stringify({ isFrozen: false }),
                afterStateJson: JSON.stringify({ isFrozen: true }),
              },
            });
          });

          d.quarantined = true;
        } catch (err) {
          this.logger.error(
            `Failed to freeze item ${key}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      await this.prisma.notificationLog.create({
        data: {
          targetRole: Role.ADMIN,
          message: `Inventory validation detected ${discrepancies.length} discrepancy(ies). Frozen ${frozenSet.size} item(s).`,
        },
      });

      const payload = {
        discrepanciesCount: discrepancies.length,
        itemsFrozen: frozenSet.size,
        timestamp: new Date().toISOString(),
      };

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.outboxEvent.create({
        data: {
          eventType: 'SLACK_VALIDATION_ALERT',
          payload: payload,
          status: 'PENDING',
          attempts: 0,
          expiresAt,
        },
      });

      await this.prisma.outboxEvent.create({
        data: {
          eventType: 'EMAIL_VALIDATION_ALERT',
          payload: payload,
          status: 'PENDING',
          attempts: 0,
          expiresAt,
        },
      });
    }

    const durationMs = Date.now() - startTime;

    await this.prisma.reconciliationRun.create({
      data: {
        itemsChecked: itemsAudited,
        discrepanciesFound: discrepancies.length,
        lotDiscrepanciesFound: eq2Results.length,
        frozenItems: [...frozenSet],
        durationMs,
      },
    });

    return {
      status: discrepancies.length > 0 ? 'DISCREPANCY_DETECTED' : 'CONSISTENT',
      success: discrepancies.length === 0,
      timestamp: new Date().toISOString(),
      itemsAudited,
      lotsAudited,
      discrepanciesCount: discrepancies.length,
      discrepancies,
    };
  }
}

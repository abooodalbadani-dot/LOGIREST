/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { WacService } from '../ledger/wac.service';
import { Role, DocumentType, AdjustmentDirection } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class AdjustmentPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
    private readonly wacService: WacService,
    private readonly metricsService: MetricsService,
  ) {}

  async post(
    adjustmentId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Adjustment with lines and items
      const adj = await tx.adjustment.findUnique({
        where: { id: adjustmentId },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!adj) {
        throw new NotFoundException(
          `Adjustment with ID ${adjustmentId} not found`,
        );
      }

      if (adj.status !== 'APPROVED') {
        throw new BadRequestException(
          `Adjustment must be in APPROVED status to be posted`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && adj.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // 2. Validate all lines before processing
      for (const line of adj.lines) {
        if (line.direction === AdjustmentDirection.IN) {
          if (
            line.unitCost === null ||
            line.unitCost === undefined ||
            Number(line.unitCost) <= 0
          ) {
            throw new BadRequestException(
              `Unit cost is required and must be > 0. For promotional items, enter the standard market value or 0.0001 if strictly required by finance.`,
            );
          }
        }
      }

      // 3. Process each line
      for (const line of adj.lines) {
        const item = line.item;
        const lotId = line.lotId;
        const qtyVal = Number(line.quantity);

        // Check if item is frozen in warehouse
        const whItemCheck = await tx.warehouseItem.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: adj.warehouseId,
              itemId: item.id,
            },
          },
        });
        if (whItemCheck?.isFrozen && userRole !== Role.ADMIN) {
          throw new BadRequestException(
            `Cannot post adjustment: Item ${item.sku} is frozen/locked. Only an Admin can post a reconciling adjustment.`,
          );
        }

        if (item.isBatched || item.hasExpiry) {
          if (!lotId) {
            throw new BadRequestException(
              `Lot ID is required for batched item: ${item.sku}`,
            );
          }

          if (line.direction === AdjustmentDirection.IN) {
            // Lock lot row (SELECT FOR UPDATE)
            await this.lockService.lockLots(tx, adj.warehouseId, item.id, [
              lotId,
            ]);

            // Upsert WarehouseItemLot
            await tx.warehouseItemLot.upsert({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                  lotId,
                },
              },
              create: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId,
                qtyOnHand: qtyVal,
                qtyAllocated: 0,
              },
              update: {
                qtyOnHand: { increment: qtyVal },
              },
            });

            // Lock WarehouseItem row
            await this.lockService.lockItem(tx, adj.warehouseId, item.id);

            // Upsert WarehouseItem
            await tx.warehouseItem.upsert({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              create: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                qtyOnHand: qtyVal,
                qtyAllocated: 0,
                wac: 0,
                isFrozen: false,
              },
              update: {
                qtyOnHand: { increment: qtyVal },
                isFrozen: false,
              },
            });

            // Recalculate WAC (positive adjustment)
            const unitCost = line.unitCost ? Number(line.unitCost) : 0;
            await this.wacService.handlePositiveAdjustment(
              tx,
              adj.warehouseId,
              item.id,
              qtyVal,
              unitCost,
              adj.id,
            );

            // Insert StockLedger entry
            await tx.stockLedger.create({
              data: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId: lotId || null,
                quantity: qtyVal,
                documentId: adj.id,
                documentType: DocumentType.ADJUSTMENT,
              },
            });
          } else {
            // Outflow: decrement
            // Lock lot row (SELECT FOR UPDATE)
            const lockedLots = await this.lockService.lockLots(
              tx,
              adj.warehouseId,
              item.id,
              [lotId],
            );
            const lockedLot = lockedLots.length > 0 ? lockedLots[0] : null;
            this.lockService.assertLotBalance(lockedLot, qtyVal, lotId);

            // Lock WarehouseItem row
            const lockedItem = await this.lockService.lockItem(
              tx,
              adj.warehouseId,
              item.id,
            );
            this.lockService.assertItemBalance(lockedItem, qtyVal, item.id);

            // Decrement WarehouseItemLot
            await tx.warehouseItemLot.update({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                  lotId,
                },
              },
              data: {
                qtyOnHand: { decrement: qtyVal },
              },
            });

            // Decrement WarehouseItem
            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              data: {
                qtyOnHand: { decrement: qtyVal },
                isFrozen: false,
              },
            });

            // Insert StockLedger entry (negative for decrease)
            await tx.stockLedger.create({
              data: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId: lotId || null,
                quantity: -qtyVal,
                documentId: adj.id,
                documentType: DocumentType.ADJUSTMENT,
              },
            });
          }
        } else {
          // Unbatched item
          if (line.direction === AdjustmentDirection.IN) {
            // Lock WarehouseItem row
            await this.lockService.lockItem(tx, adj.warehouseId, item.id);

            // Upsert WarehouseItem
            await tx.warehouseItem.upsert({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              create: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                qtyOnHand: qtyVal,
                qtyAllocated: 0,
                wac: 0,
                isFrozen: false,
              },
              update: {
                qtyOnHand: { increment: qtyVal },
                isFrozen: false,
              },
            });

            // Recalculate WAC (positive adjustment)
            const unitCost = line.unitCost ? Number(line.unitCost) : 0;
            await this.wacService.handlePositiveAdjustment(
              tx,
              adj.warehouseId,
              item.id,
              qtyVal,
              unitCost,
              adj.id,
            );

            // Insert StockLedger entry
            await tx.stockLedger.create({
              data: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId: null,
                quantity: qtyVal,
                documentId: adj.id,
                documentType: DocumentType.ADJUSTMENT,
              },
            });
          } else {
            // Decrement unbatched item
            const lockedItem = await this.lockService.lockItem(
              tx,
              adj.warehouseId,
              item.id,
            );
            this.lockService.assertItemBalance(lockedItem, qtyVal, item.id);

            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              data: {
                qtyOnHand: { decrement: qtyVal },
                isFrozen: false,
              },
            });

            // Insert StockLedger entry (negative)
            await tx.stockLedger.create({
              data: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId: null,
                quantity: -qtyVal,
                documentId: adj.id,
                documentType: DocumentType.ADJUSTMENT,
              },
            });
          }
        }
      }

      // 4. Update Adjustment status to POSTED
      const updatedAdj = await tx.adjustment.update({
        where: { id: adjustmentId },
        data: {
          status: 'POSTED',
          version: adj.version + 1,
        },
      });

      this.metricsService.postingOperationsCounter.inc({
        document_type: 'ADJUSTMENT',
      });

      // 5. Record ApprovalEvent
      const stepNumber =
        (await tx.approvalEvent.count({
          where: {
            documentId: adj.id,
            documentType: DocumentType.ADJUSTMENT,
          },
        })) + 1;

      await tx.approvalEvent.create({
        data: {
          documentId: adj.id,
          documentType: DocumentType.ADJUSTMENT,
          fromStatus: 'APPROVED',
          toStatus: 'POSTED',
          actionPerformed: 'POST',
          userId,
          userRole: userRole as any,
          stepNumber,
        },
      });

      // 6. Record AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_POST_SUCCESS',
          targetTable: 'adjustments',
          targetId: adj.id,
          beforeStateJson: JSON.stringify({
            status: adj.status,
            version: adj.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'POSTED',
            version: adj.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedAdj;
    });
  }
}

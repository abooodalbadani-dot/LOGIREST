import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import {
  Role,
  DocumentType,
  AdjustmentDirection,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AdjustmentVoidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
  ) {}

  async void(
    adjustmentId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const adj = await tx.adjustment.findUnique({
        where: { id: adjustmentId },
        include: {
          lines: {
            include: { item: true },
          },
        },
      });

      if (!adj) {
        throw new NotFoundException(
          `Adjustment with ID ${adjustmentId} not found`,
        );
      }

      if (adj.status !== 'POSTED') {
        throw new BadRequestException(
          'Adjustment must be in POSTED status to be voided',
        );
      }

      if (clientVersion !== undefined && adj.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      const sortedLines = [...adj.lines].sort((a, b) => {
        const cmp = a.itemId.localeCompare(b.itemId);
        if (cmp !== 0) return cmp;
        return (a.lotId || '').localeCompare(b.lotId || '');
      });

      for (const line of sortedLines) {
        const item = line.item;
        const qtyVal = Number(line.quantity);

        if (line.direction === AdjustmentDirection.IN) {
          if (item.isBatched || item.hasExpiry) {
            const lotId = line.lotId;
            if (!lotId) {
              throw new BadRequestException(
                `Lot ID is required for batched item: ${item.sku}`,
              );
            }

            const lockedLots = await this.lockService.lockLots(
              tx,
              adj.warehouseId,
              item.id,
              [lotId],
            );
            if (lockedLots.length > 0) {
              const lotQty = Number(lockedLots[0].qtyOnHand);
              if (lotQty < qtyVal) {
                throw new BadRequestException(
                  `Cannot void adjustment IN: Item ${item.sku} (lot ${lotId}) has been partially consumed. Available: ${lotQty}, Required to void: ${qtyVal}`,
                );
              }
            }
          }

          const lockedItem = await this.lockService.lockItem(
            tx,
            adj.warehouseId,
            item.id,
          );
          if (lockedItem) {
            const itemQty = Number(lockedItem.qtyOnHand);
            if (itemQty < qtyVal) {
              throw new BadRequestException(
                `Cannot void adjustment IN: Item ${item.sku} has been partially consumed. Available: ${itemQty}, Required to void: ${qtyVal}`,
              );
            }
          }
        }
      }

      for (const line of sortedLines) {
        const item = line.item;
        const qtyVal = Number(line.quantity);

        if (line.direction === AdjustmentDirection.IN) {
          if (item.isBatched || item.hasExpiry) {
            const lotId = line.lotId!;

            await tx.warehouseItemLot.update({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                  lotId,
                },
              },
              data: { qtyOnHand: { decrement: qtyVal } },
            });

            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              data: { qtyOnHand: { decrement: qtyVal } },
            });

            await tx.stockLedger.create({
              data: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId,
                quantity: -qtyVal,
                documentId: adj.id,
                documentType: DocumentType.ADJUSTMENT,
              },
            });
          } else {
            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              data: { qtyOnHand: { decrement: qtyVal } },
            });

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

          // WAC recalculation & Cost Ledger entry for IN adjustment void
          const costEntries = await tx.costLedger.findMany({
            where: {
              warehouseId: adj.warehouseId,
              itemId: item.id,
            },
            orderBy: { postedAt: 'asc' },
          });

          let recalcQty = new Prisma.Decimal(0);
          let recalcWac = new Prisma.Decimal(0);

          for (const entry of costEntries) {
            if (
              entry.documentId === adj.id &&
              entry.documentType === DocumentType.ADJUSTMENT
            ) {
              continue;
            }

            const entryQty = new Prisma.Decimal(entry.quantity);
            if (entryQty.isZero()) continue;

            if (entryQty.gt(0)) {
              const entryPrice = new Prisma.Decimal(entry.unitPrice);
              if (recalcQty.lte(0)) {
                recalcWac = entryPrice;
              } else {
                recalcWac = recalcQty
                  .mul(recalcWac)
                  .add(entryQty.mul(entryPrice))
                  .div(recalcQty.add(entryQty));
              }
            }

            recalcQty = recalcQty.add(entryQty);
          }

          const newWac = recalcQty.lte(0) ? new Prisma.Decimal(0) : recalcWac;
          const roundedWac = newWac.toDecimalPlaces(4);

          await tx.warehouseItem.update({
            where: {
              warehouseId_itemId: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
              },
            },
            data: { wac: roundedWac },
          });

          const unitCost = line.unitCost ? Number(line.unitCost) : 0;
          await tx.costLedger.create({
            data: {
              warehouseId: adj.warehouseId,
              itemId: item.id,
              quantity: -qtyVal,
              unitPrice: unitCost,
              newWac: roundedWac,
              documentId: adj.id,
              documentType: DocumentType.ADJUSTMENT,
            },
          });
        } else {
          if (item.isBatched || item.hasExpiry) {
            const lotId = line.lotId;
            if (!lotId) {
              throw new BadRequestException(
                `Lot ID is required for batched item: ${item.sku}`,
              );
            }

            await this.lockService.lockLots(tx, adj.warehouseId, item.id, [
              lotId,
            ]);

            await tx.warehouseItemLot.update({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                  lotId,
                },
              },
              data: { qtyOnHand: { increment: qtyVal } },
            });

            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              data: { qtyOnHand: { increment: qtyVal } },
            });

            await tx.stockLedger.create({
              data: {
                warehouseId: adj.warehouseId,
                itemId: item.id,
                lotId,
                quantity: qtyVal,
                documentId: adj.id,
                documentType: DocumentType.ADJUSTMENT,
              },
            });
          } else {
            await this.lockService.lockItem(tx, adj.warehouseId, item.id);

            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: adj.warehouseId,
                  itemId: item.id,
                },
              },
              data: { qtyOnHand: { increment: qtyVal } },
            });

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
          }
        }
      }

      const updatedAdj = await tx.adjustment.update({
        where: { id: adjustmentId },
        data: { status: 'VOIDED', version: adj.version + 1 },
      });

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
          fromStatus: 'POSTED',
          toStatus: 'VOIDED',
          actionPerformed: 'VOID',
          userId,
          userRole: userRole as any,
          stepNumber,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_VOID_SUCCESS',
          targetTable: 'adjustments',
          targetId: adj.id,
          beforeStateJson: JSON.stringify({
            status: adj.status,
            version: adj.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'VOIDED',
            version: adj.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedAdj;
    });
  }
}

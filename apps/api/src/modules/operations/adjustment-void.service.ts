import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
    if (userRole !== Role.ADMIN && userRole !== Role.INV_MGR) {
      throw new ForbiddenException(
        'Only System Administrators or Inventory Managers can void documents',
      );
    }
    const maxAttempts = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await this.prisma.$transaction(
          async (tx) => {
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
                idempotencyKey: `${DocumentType.ADJUSTMENT}:stock_void:${adj.id}:${item.id}:${lotId}:${line.id}`,
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
                idempotencyKey: `${DocumentType.ADJUSTMENT}:stock_void:${adj.id}:${item.id}:${line.id}`,
              },
            });
          }

          // WAC recalculation & Cost Ledger entry for IN adjustment void
          // 1. Check if any subsequent cost-impacting document exists for the same item in the same warehouse
          const subsequentGrn = await tx.goodsReceivedNote.findFirst({
            where: {
              warehouseId: adj.warehouseId,
              status: 'POSTED',
              createdAt: { gt: adj.createdAt },
              lines: {
                some: {
                  itemId: item.id,
                },
              },
            },
          });

          const subsequentAdj = await tx.adjustment.findFirst({
            where: {
              warehouseId: adj.warehouseId,
              status: 'POSTED',
              createdAt: { gt: adj.createdAt },
              lines: {
                some: {
                  itemId: item.id,
                  direction: AdjustmentDirection.IN,
                },
              },
            },
          });

          const subsequentTransfer = await tx.transfer.findFirst({
            where: {
              toWarehouseId: adj.warehouseId,
              status: 'RECEIVED',
              createdAt: { gt: adj.createdAt },
              lines: {
                some: {
                  itemId: item.id,
                },
              },
            },
          });

          const subsequentStocktakeSessions =
            await tx.stocktakeSession.findMany({
              where: {
                warehouseId: adj.warehouseId,
                status: 'POSTED',
                createdAt: { gt: adj.createdAt },
                counts: {
                  some: {
                    itemId: item.id,
                  },
                },
              },
              include: {
                counts: {
                  where: { itemId: item.id },
                },
                snapshots: {
                  where: { itemId: item.id },
                },
              },
            });

          let subsequentStocktake = false;
          for (const session of subsequentStocktakeSessions) {
            const snapshotMap = new Map<string, number>();
            const countMap = new Map<string, number>();
            const allLotIds = new Set<string>();

            for (const snap of session.snapshots) {
              const key = snap.lotId || '';
              snapshotMap.set(key, Number(snap.qtySnapshot));
              allLotIds.add(key);
            }

            for (const count of session.counts) {
              const key = count.lotId || '';
              countMap.set(key, Number(count.qtyCounted));
              allLotIds.add(key);
            }

            for (const lotId of allLotIds) {
              const qtySnapshot = snapshotMap.get(lotId) || 0;
              const qtyCounted = countMap.get(lotId) || 0;
              if (qtyCounted > qtySnapshot) {
                subsequentStocktake = true;
                break;
              }
            }
            if (subsequentStocktake) break;
          }

          const subsequentLandedCost = await tx.landedCostVoucher.findFirst({
            where: {
              status: 'POSTED',
              createdAt: { gt: adj.createdAt },
              lines: {
                some: {
                  grnLine: {
                    itemId: item.id,
                    goodsReceivedNote: {
                      warehouseId: adj.warehouseId,
                    },
                  },
                },
              },
            },
          });

          if (
            subsequentGrn ||
            subsequentAdj ||
            subsequentTransfer ||
            subsequentStocktake ||
            subsequentLandedCost
          ) {
            throw new BadRequestException('VOID_NOT_ALLOWED_UNDER_COST_IMPACT');
          }

          // 2. Find the most recent CostLedger entry NOT from this Adjustment (O(1) restoration query)
          const lastCostEntry = await tx.costLedger.findFirst({
            where: {
              warehouseId: adj.warehouseId,
              itemId: item.id,
              NOT: {
                documentId: adj.id,
              },
            },
            orderBy: { postedAt: 'desc' },
          });

          const newWac = lastCostEntry
            ? new Prisma.Decimal(lastCostEntry.newWac)
            : new Prisma.Decimal(0);
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
              idempotencyKey: `${DocumentType.ADJUSTMENT}:cost_void:${adj.id}:${item.id}:${line.id}`,
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

            await this.lockService.lockItem(tx, adj.warehouseId, item.id);

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
                idempotencyKey: `${DocumentType.ADJUSTMENT}:stock_void:${adj.id}:${item.id}:${lotId}:${line.id}`,
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
                idempotencyKey: `${DocumentType.ADJUSTMENT}:stock_void:${adj.id}:${item.id}:${line.id}`,
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
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 30000,
          },
        );
      } catch (error) {
        const isSerializationError =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' ||
            error.message?.includes('40001') ||
            error.message?.includes('40P01') ||
            error.message?.includes('serialization') ||
            error.message?.includes('deadlock'));
        if (isSerializationError && attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
}

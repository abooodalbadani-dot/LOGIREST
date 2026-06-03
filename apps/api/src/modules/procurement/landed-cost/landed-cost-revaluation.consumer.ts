import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma, AdjustmentDirection } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { RevaluationLockingService } from './revaluation-locking.service';

interface RevaluationJobData {
  voucherId: string;
}

@Processor('landed-cost-revaluation')
export class LandedCostRevaluationConsumer extends WorkerHost {
  private readonly logger = new Logger(LandedCostRevaluationConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly revaluationLocking: RevaluationLockingService,
  ) {
    super();
  }

  async process(job: Job<RevaluationJobData>): Promise<void> {
    const { voucherId } = job.data;
    this.logger.log(`Processing revaluation job for voucher: ${voucherId}`);

    try {
      await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const voucher = await tx.landedCostVoucher.findUnique({
            where: { id: voucherId },
            include: {
              lines: true,
              grnRelations: {
                include: {
                  grn: {
                    include: {
                      lines: {
                        include: {
                          item: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!voucher) {
            throw new Error(`LandedCostVoucher ${voucherId} not found`);
          }

          if (voucher.status !== 'PROCESSING') {
            this.logger.warn(
              `Voucher ${voucherId} is not in PROCESSING status, skipping`,
            );
            return;
          }

          const lockGroups = new Map<string, Set<string>>();
          const lotLockGroups = new Map<
            string,
            { itemId: string; lotIds: Set<string> }
          >();
          const grnLineMap = new Map<string, any>();
          const lockedGrnIds = new Set<string>();

          for (const allocation of voucher.lines) {
            const grnLine = await tx.gRNLine.findUnique({
              where: { id: allocation.grnLineId },
              include: { goodsReceivedNote: true },
            });

            if (!grnLine) {
              this.logger.warn(
                `GRNLine ${allocation.grnLineId} not found, skipping`,
              );
              continue;
            }

            const grnId = grnLine.goodsReceivedNote.id;
            if (!lockedGrnIds.has(grnId)) {
              await tx.$queryRaw`
                SELECT id FROM "goods_received_notes"
                WHERE id = ${grnId}
                FOR UPDATE
              `;
              lockedGrnIds.add(grnId);
            }

            grnLineMap.set(allocation.grnLineId, grnLine);

            const warehouseId = grnLine.goodsReceivedNote.warehouseId;
            const itemId = grnLine.itemId;
            const key = `${warehouseId}::${itemId}`;

            if (!lockGroups.has(warehouseId)) {
              lockGroups.set(warehouseId, new Set());
            }
            lockGroups.get(warehouseId)!.add(itemId);

            if (grnLine.lotId) {
              if (!lotLockGroups.has(key)) {
                lotLockGroups.set(key, { itemId, lotIds: new Set() });
              }
              lotLockGroups.get(key)!.lotIds.add(grnLine.lotId);
            }
          }

          for (const [warehouseId, itemIds] of lockGroups) {
            await this.revaluationLocking.lockWarehouseItems(
              tx,
              warehouseId,
              Array.from(itemIds),
            );
          }

          for (const [key, group] of lotLockGroups) {
            const [warehouseId] = key.split('::');
            await this.revaluationLocking.lockWarehouseItemLots(
              tx,
              warehouseId,
              group.itemId,
              Array.from(group.lotIds),
            );
          }

          for (const allocation of voucher.lines) {
            const grnLine = grnLineMap.get(allocation.grnLineId);

            if (!grnLine) continue;

            const warehouseId = grnLine.goodsReceivedNote.warehouseId;
            const itemId = grnLine.itemId;

            const whItem = await tx.warehouseItem.findUnique({
              where: { warehouseId_itemId: { warehouseId, itemId } },
            });

            if (!whItem) {
              this.logger.warn(
                `WarehouseItem not found for wh=${warehouseId}, item=${itemId}, skipping`,
              );
              continue;
            }

            const currentQty = Number(whItem.qtyOnHand);
            const originalQty = Number(grnLine.quantityReceived);

            // Guard 1a: qtyOnHand < originalReceivedQty for that GRN line
            if (currentQty < originalQty) {
              throw new BadRequestException(
                `Landed cost allocation is forbidden because the goods received note quantity has been partially or fully issued/consumed (GRNLine ID: ${grnLine.id}, current qty: ${currentQty}, original qty: ${originalQty}).`,
              );
            }

            // Guard 1b: A subsequent cost-impacting document exists for the same item in the same warehouse
            const subsequentGrn = await tx.goodsReceivedNote.findFirst({
              where: {
                warehouseId,
                status: 'POSTED',
                createdAt: { gt: grnLine.goodsReceivedNote.createdAt },
                lines: {
                  some: {
                    itemId,
                  },
                },
              },
            });

            const subsequentAdj = await tx.adjustment.findFirst({
              where: {
                warehouseId,
                status: 'POSTED',
                createdAt: { gt: grnLine.goodsReceivedNote.createdAt },
                lines: {
                  some: {
                    itemId,
                    direction: AdjustmentDirection.IN,
                  },
                },
              },
            });

            const subsequentTransfer = await tx.transfer.findFirst({
              where: {
                toWarehouseId: warehouseId,
                status: 'RECEIVED',
                createdAt: { gt: grnLine.goodsReceivedNote.createdAt },
                lines: {
                  some: {
                    itemId,
                  },
                },
              },
            });

            const subsequentStocktakeSessions =
              await tx.stocktakeSession.findMany({
                where: {
                  warehouseId,
                  status: 'POSTED',
                  createdAt: { gt: grnLine.goodsReceivedNote.createdAt },
                  counts: {
                    some: {
                      itemId,
                    },
                  },
                },
                include: {
                  counts: {
                    where: { itemId },
                  },
                  snapshots: {
                    where: { itemId },
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
                createdAt: { gt: grnLine.goodsReceivedNote.createdAt },
                lines: {
                  some: {
                    grnLine: {
                      itemId,
                      goodsReceivedNote: {
                        warehouseId,
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
              throw new BadRequestException(
                'LANDED_COST_NOT_ALLOWED_UNDER_COST_IMPACT',
              );
            }

            const currentQtyDec = new Prisma.Decimal(whItem.qtyOnHand);
            const currentWacDec = new Prisma.Decimal(whItem.wac);
            const allocatedCostDec = new Prisma.Decimal(
              allocation.allocatedCost,
            );
            const originalQtyDec = new Prisma.Decimal(grnLine.quantityReceived);

            // Corrected WAC addition formula: (currentQtyDec * currentWacDec + allocatedCostDec) / currentQtyDec
            const newWac = currentQtyDec
              .mul(currentWacDec)
              .add(allocatedCostDec)
              .div(currentQtyDec);

            const roundedWac = newWac.toDecimalPlaces(4);

            await tx.warehouseItem.update({
              where: { warehouseId_itemId: { warehouseId, itemId } },
              data: { wac: roundedWac },
            });

            const unitLandedCost = allocatedCostDec
              .div(originalQtyDec)
              .toDecimalPlaces(4);
            const idempotencyKey = `LANDED_COST:cost:${voucherId}:${grnLine.id}`;

            await tx.costLedger.create({
              data: {
                warehouseId,
                itemId,
                quantity: originalQtyDec,
                unitPrice: unitLandedCost,
                newWac: roundedWac,
                documentId: voucherId,
                documentType: 'GOODS_RECEIVED_NOTE' as any,
                idempotencyKey,
              },
            });
          }

          await tx.landedCostVoucher.update({
            where: { id: voucherId },
            data: { status: 'POSTED', version: { increment: 1 } },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      this.logger.log(
        `Successfully processed revaluation for voucher: ${voucherId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process revaluation for voucher ${voucherId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      const isDuplicateKey =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';

      if (isDuplicateKey) {
        // Verify if ledger entries for this voucher already exist
        const existingLedgerEntries = await this.prisma.costLedger.findFirst({
          where: {
            documentId: voucherId,
            documentType: 'GOODS_RECEIVED_NOTE' as any,
          },
        });

        if (existingLedgerEntries) {
          this.logger.log(
            `Duplicate revaluation execution detected for voucher ${voucherId}, but ledger entries already exist. Marking voucher as POSTED without reverting or rethrowing.`,
          );
          await this.prisma.landedCostVoucher
            .update({
              where: { id: voucherId },
              data: { status: 'POSTED', version: { increment: 1 } },
            })
            .catch((updateError) => {
              this.logger.error(
                `Failed to ensure voucher status is POSTED: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              );
            });
          return;
        }
      }

      await this.prisma.landedCostVoucher
        .update({
          where: { id: voucherId },
          data: { status: 'DRAFT' },
        })
        .catch((revertError) => {
          this.logger.error(
            `Failed to revert voucher ${voucherId} to DRAFT: ${revertError instanceof Error ? revertError.message : String(revertError)}`,
          );
        });

      throw error;
    }
  }
}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
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
            const grnLine = await tx.gRNLine.findUnique({
              where: { id: allocation.grnLineId },
              include: { goodsReceivedNote: true },
            });

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
            const currentWac = Number(whItem.wac);
            const allocatedCost = Number(allocation.allocatedCost);

            let newWac: number;
            if (currentQty <= 0) {
              newWac = currentWac;
            } else {
              const totalCost = currentQty * currentWac;
              newWac = (totalCost + allocatedCost) / currentQty;
            }

            const roundedWac = Math.round(newWac * 10000) / 10000;

            await tx.warehouseItem.update({
              where: { warehouseId_itemId: { warehouseId, itemId } },
              data: { wac: roundedWac },
            });

            await tx.costLedger.create({
              data: {
                warehouseId,
                itemId,
                quantity: currentQty,
                unitPrice: allocatedCost,
                newWac: roundedWac,
                documentId: voucherId,
                documentType: 'GOODS_RECEIVED_NOTE' as any,
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

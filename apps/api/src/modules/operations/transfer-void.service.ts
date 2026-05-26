import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Role, DocumentType, Prisma } from '@prisma/client';

@Injectable()
export class TransferVoidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
  ) {}

  async void(
    transferId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: {
          lines: {
            include: { item: true },
          },
        },
      });

      if (!transfer) {
        throw new NotFoundException(`Transfer with ID ${transferId} not found`);
      }

      if (transfer.status !== 'RECEIVED') {
        throw new BadRequestException(
          'Transfer must be in RECEIVED status to be voided',
        );
      }

      if (clientVersion !== undefined && transfer.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // Sort lines deterministically to prevent deadlocks
      const sortedLines = [...transfer.lines].sort((a, b) =>
        a.itemId.localeCompare(b.itemId),
      );

      // 1. Lock and validate balances in destination warehouse (we need to deduct received stock)
      for (const line of sortedLines) {
        const item = line.item;
        const receivedQty = Number(line.quantityReceived);

        if (item.isBatched || item.hasExpiry) {
          const allocations = await tx.lotAllocation.findMany({
            where: { transferLineId: line.id },
          });

          // Sort allocations to lock lots deterministically
          const sortedAllocations = [...allocations].sort((a, b) =>
            a.lotId.localeCompare(b.lotId),
          );

          let remainingReceived = receivedQty;
          for (const alloc of sortedAllocations) {
            if (remainingReceived <= 0) break;

            const receivedForLot = Math.min(
              Number(alloc.quantityAllocated),
              remainingReceived,
            );

            if (receivedForLot > 0) {
              const lockedLots = await this.lockService.lockLots(
                tx,
                transfer.toWarehouseId,
                item.id,
                [alloc.lotId],
              );
              if (lockedLots.length > 0) {
                const lotQty = Number(lockedLots[0].qtyOnHand);
                if (lotQty < receivedForLot) {
                  throw new BadRequestException(
                    `Cannot void Transfer: Destination warehouse item ${item.sku} (lot ${alloc.lotId}) has been consumed. Available: ${lotQty}, Required to void: ${receivedForLot}`,
                  );
                }
              }
              remainingReceived -= receivedForLot;
            }
          }
        }

        const lockedItem = await this.lockService.lockItem(
          tx,
          transfer.toWarehouseId,
          item.id,
        );
        if (lockedItem) {
          const itemQty = Number(lockedItem.qtyOnHand);
          if (itemQty < receivedQty) {
            throw new BadRequestException(
              `Cannot void Transfer: Destination warehouse item ${item.sku} has been partially consumed. Available: ${itemQty}, Required to void: ${receivedQty}`,
            );
          }
        }
      }

      // 2. Perform reversals
      for (const line of sortedLines) {
        const item = line.item;
        const shippedQty = Number(line.quantityShipped);
        const receivedQty = Number(line.quantityReceived);
        const discrepancy = shippedQty - receivedQty;

        // Retrieve source warehouse WAC before shipping
        const sourceWhItem = await tx.warehouseItem.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: item.id,
            },
          },
        });
        const sourceWac = sourceWhItem
          ? new Prisma.Decimal(sourceWhItem.wac)
          : new Prisma.Decimal(0);

        if (item.isBatched || item.hasExpiry) {
          const allocations = await tx.lotAllocation.findMany({
            where: { transferLineId: line.id },
          });

          const sortedAllocations = [...allocations].sort((a, b) =>
            a.lotId.localeCompare(b.lotId),
          );

          let remainingReceived = receivedQty;
          for (const alloc of sortedAllocations) {
            const receivedForLot = Math.min(
              Number(alloc.quantityAllocated),
              remainingReceived,
            );

            // Lock source lot
            await this.lockService.lockLots(
              tx,
              transfer.fromWarehouseId,
              item.id,
              [alloc.lotId],
            );

            // Increment back to origin warehouse lot
            await tx.warehouseItemLot.upsert({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: transfer.fromWarehouseId,
                  itemId: item.id,
                  lotId: alloc.lotId,
                },
              },
              create: {
                warehouseId: transfer.fromWarehouseId,
                itemId: item.id,
                lotId: alloc.lotId,
                qtyOnHand: Number(alloc.quantityAllocated),
                qtyAllocated: 0,
              },
              update: {
                qtyOnHand: { increment: Number(alloc.quantityAllocated) },
              },
            });

            // Create positive StockLedger at source warehouse (returns stock)
            await tx.stockLedger.create({
              data: {
                warehouseId: transfer.fromWarehouseId,
                itemId: item.id,
                lotId: alloc.lotId,
                quantity: Number(alloc.quantityAllocated),
                documentId: transfer.id,
                documentType: DocumentType.TRANSFER,
              },
            });

            if (receivedForLot > 0) {
              // Decrement from destination warehouse lot
              await tx.warehouseItemLot.update({
                where: {
                  warehouseId_itemId_lotId: {
                    warehouseId: transfer.toWarehouseId,
                    itemId: item.id,
                    lotId: alloc.lotId,
                  },
                },
                data: { qtyOnHand: { decrement: receivedForLot } },
              });

              // Create negative StockLedger at destination warehouse (deducts stock)
              await tx.stockLedger.create({
                data: {
                  warehouseId: transfer.toWarehouseId,
                  itemId: item.id,
                  lotId: alloc.lotId,
                  quantity: -receivedForLot,
                  documentId: transfer.id,
                  documentType: DocumentType.TRANSFER,
                },
              });

              remainingReceived -= receivedForLot;
            }
          }
        } else {
          // Unbatched item: lock and update WarehouseItems
          await this.lockService.lockItem(
            tx,
            transfer.fromWarehouseId,
            item.id,
          );
          await this.lockService.lockItem(tx, transfer.toWarehouseId, item.id);

          // Add to origin
          await tx.warehouseItem.update({
            where: {
              warehouseId_itemId: {
                warehouseId: transfer.fromWarehouseId,
                itemId: item.id,
              },
            },
            data: { qtyOnHand: { increment: shippedQty } },
          });

          await tx.stockLedger.create({
            data: {
              warehouseId: transfer.fromWarehouseId,
              itemId: item.id,
              lotId: null,
              quantity: shippedQty,
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
            },
          });

          // Deduct from destination
          await tx.warehouseItem.update({
            where: {
              warehouseId_itemId: {
                warehouseId: transfer.toWarehouseId,
                itemId: item.id,
              },
            },
            data: { qtyOnHand: { decrement: receivedQty } },
          });

          await tx.stockLedger.create({
            data: {
              warehouseId: transfer.toWarehouseId,
              itemId: item.id,
              lotId: null,
              quantity: -receivedQty,
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
            },
          });
        }

        if (item.isBatched || item.hasExpiry) {
          // For batched item, also update parent WarehouseItem qtyOnHand
          await tx.warehouseItem.update({
            where: {
              warehouseId_itemId: {
                warehouseId: transfer.fromWarehouseId,
                itemId: item.id,
              },
            },
            data: { qtyOnHand: { increment: shippedQty } },
          });

          await tx.warehouseItem.update({
            where: {
              warehouseId_itemId: {
                warehouseId: transfer.toWarehouseId,
                itemId: item.id,
              },
            },
            data: { qtyOnHand: { decrement: receivedQty } },
          });
        }

        // Recalculate destination WAC from cost ledger entries excluding this transfer
        const costEntries = await tx.costLedger.findMany({
          where: {
            warehouseId: transfer.toWarehouseId,
            itemId: item.id,
          },
          orderBy: { postedAt: 'asc' },
        });

        let recalcQty = new Prisma.Decimal(0);
        let recalcWac = new Prisma.Decimal(0);

        for (const entry of costEntries) {
          if (
            entry.documentId === transfer.id &&
            entry.documentType === DocumentType.TRANSFER
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
              warehouseId: transfer.toWarehouseId,
              itemId: item.id,
            },
          },
          data: { wac: roundedWac },
        });

        // Add CostLedger entries
        await tx.costLedger.create({
          data: {
            warehouseId: transfer.toWarehouseId,
            itemId: item.id,
            quantity: -receivedQty,
            unitPrice: sourceWac,
            newWac: roundedWac,
            documentId: transfer.id,
            documentType: DocumentType.TRANSFER,
          },
        });

        // Handle Transit Loss reversal
        if (discrepancy > 0) {
          const transitLossWh = await tx.warehouse.findUnique({
            where: { code: 'TRANSIT_LOSS' },
          });

          if (transitLossWh) {
            const discrepancyDec = new Prisma.Decimal(discrepancy);

            await tx.warehouseItem.update({
              where: {
                warehouseId_itemId: {
                  warehouseId: transitLossWh.id,
                  itemId: item.id,
                },
              },
              data: { qtyOnHand: { decrement: discrepancyDec } },
            });

            await tx.stockLedger.create({
              data: {
                warehouseId: transitLossWh.id,
                itemId: item.id,
                lotId: null,
                quantity: -discrepancy,
                documentId: transfer.id,
                documentType: DocumentType.TRANSFER,
              },
            });

            await tx.costLedger.create({
              data: {
                warehouseId: transitLossWh.id,
                itemId: item.id,
                quantity: -discrepancy,
                unitPrice: sourceWac,
                newWac: sourceWac,
                documentId: transfer.id,
                documentType: DocumentType.TRANSFER,
              },
            });
          }
        }
      }

      // Update document status
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: { status: 'VOIDED', version: transfer.version + 1 },
      });

      const stepNumber =
        (await tx.approvalEvent.count({
          where: {
            documentId: transfer.id,
            documentType: DocumentType.TRANSFER,
          },
        })) + 1;

      await tx.approvalEvent.create({
        data: {
          documentId: transfer.id,
          documentType: DocumentType.TRANSFER,
          fromStatus: 'RECEIVED',
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
          targetTable: 'transfers',
          targetId: transfer.id,
          beforeStateJson: JSON.stringify({
            status: transfer.status,
            version: transfer.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'VOIDED',
            version: transfer.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedTransfer;
    });
  }
}

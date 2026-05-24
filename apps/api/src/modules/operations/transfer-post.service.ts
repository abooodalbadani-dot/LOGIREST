/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Role, DocumentType, Prisma } from '@prisma/client';

@Injectable()
export class TransferPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationService: AllocationService,
    private readonly lockService: LedgerLockService,
  ) {}

  /**
   * Ships a transfer: deducts stock from source warehouse and puts status to IN_TRANSIT
   */
  async ship(
    transferId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Transfer with lines and items
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!transfer) {
        throw new NotFoundException(`Transfer with ID ${transferId} not found`);
      }

      if (transfer.status !== 'DRAFT') {
        throw new BadRequestException(
          `Transfer must be in DRAFT status to be shipped`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && transfer.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // 2. Process each line
      for (const line of transfer.lines) {
        const item = line.item;

        // Check if item is frozen in source warehouse
        const sourceWhItem = await tx.warehouseItem.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: item.id,
            },
          },
        });
        if (sourceWhItem?.isFrozen) {
          throw new BadRequestException(
            `Cannot ship transfer: Item ${item.sku} is frozen/locked in source warehouse`,
          );
        }

        // Perform progressive lot allocation (FEFO/FIFO) and decrement quantities in source warehouse
        const allocations = await this.allocationService.allocate(
          tx,
          transfer.fromWarehouseId,
          item.id,
          Number(line.quantityShipped),
        );

        if (item.isBatched || item.hasExpiry) {
          // Record LotAllocation for each allocated lot
          for (const alloc of allocations) {
            await tx.lotAllocation.create({
              data: {
                transferLineId: line.id,
                lotId: alloc.lotId,
                quantityAllocated: alloc.quantityAllocated,
              },
            });

            // Insert StockLedger entry (negative for stock reduction at source warehouse)
            await tx.stockLedger.create({
              data: {
                warehouseId: transfer.fromWarehouseId,
                itemId: item.id,
                lotId: alloc.lotId,
                quantity: -alloc.quantityAllocated,
                documentId: transfer.id,
                documentType: DocumentType.TRANSFER,
              },
            });
          }
        } else {
          // Unbatched item: StockLedger entry with lotId null
          await tx.stockLedger.create({
            data: {
              warehouseId: transfer.fromWarehouseId,
              itemId: item.id,
              lotId: null,
              quantity: -Number(line.quantityShipped),
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
            },
          });
        }
      }

      // 3. Update Transfer status to IN_TRANSIT
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'IN_TRANSIT',
          version: transfer.version + 1,
        },
      });

      // 4. Record ApprovalEvent
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
          fromStatus: 'DRAFT',
          toStatus: 'IN_TRANSIT',
          actionPerformed: 'SHIP',
          userId,
          userRole: userRole as any,
          stepNumber,
        },
      });

      // 5. Record AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_SHIP_SUCCESS',
          targetTable: 'transfers',
          targetId: transfer.id,
          beforeStateJson: JSON.stringify({
            status: transfer.status,
            version: transfer.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'IN_TRANSIT',
            version: transfer.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedTransfer;
    });
  }

  /**
   * Receives a transfer: adds stock to destination warehouse and updates status to RECEIVED.
   * Records quantity variance and varianceReason.
   */
  async receive(
    transferId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
    linesReceived?: Array<{
      lineId: string;
      quantityReceived: number;
      varianceReason?: string;
    }>,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Transfer with lines and items
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!transfer) {
        throw new NotFoundException(`Transfer with ID ${transferId} not found`);
      }

      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException(
          `Transfer must be in IN_TRANSIT status to be received`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && transfer.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // Map linesReceived for easy lookup
      const receivedMap = new Map<
        string,
        { quantityReceived: number; varianceReason?: string }
      >();
      if (linesReceived) {
        for (const input of linesReceived) {
          receivedMap.set(input.lineId, input);
        }
      }

      // 2. Process each line
      for (const line of transfer.lines) {
        const item = line.item;
        const input = receivedMap.get(line.id);
        const receivedQty = input
          ? input.quantityReceived
          : Number(line.quantityShipped);
        const varianceReason = input ? input.varianceReason : undefined;
        const shippedQty = Number(line.quantityShipped);

        // Discrepancy checks: if receivedQty < shippedQty, must have non-empty varianceReason
        if (
          receivedQty < shippedQty &&
          (!varianceReason || varianceReason.trim() === '')
        ) {
          throw new BadRequestException(
            `Variance reason is required for discrepancies on line ${line.id}`,
          );
        }

        // Check if item is frozen in destination warehouse
        const destWhItemCheck = await tx.warehouseItem.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.toWarehouseId,
              itemId: item.id,
            },
          },
        });
        if (destWhItemCheck?.isFrozen) {
          throw new BadRequestException(
            `Cannot receive transfer: Item ${item.sku} is frozen/locked in destination warehouse`,
          );
        }

        // Retrieve source warehouse WAC
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

        // Update TransferLine
        await tx.transferLine.update({
          where: { id: line.id },
          data: {
            quantityReceived: receivedQty,
            varianceReason: varianceReason || null,
          },
        });

        if (item.isBatched || item.hasExpiry) {
          // Retrieve LotAllocations to know which lots were shipped
          const allocations = await tx.lotAllocation.findMany({
            where: { transferLineId: line.id },
          });

          // Distribute receivedQty progressively across the shipped lots
          let remainingReceived = receivedQty;
          for (const alloc of allocations) {
            if (remainingReceived <= 0) break;

            const receivedForLot = Math.min(
              Number(alloc.quantityAllocated),
              remainingReceived,
            );

            if (receivedForLot > 0) {
              // Lock lot in target warehouse
              await this.lockService.lockLots(
                tx,
                transfer.toWarehouseId,
                item.id,
                [alloc.lotId],
              );

              // Upsert lot balance in target warehouse
              await tx.warehouseItemLot.upsert({
                where: {
                  warehouseId_itemId_lotId: {
                    warehouseId: transfer.toWarehouseId,
                    itemId: item.id,
                    lotId: alloc.lotId,
                  },
                },
                create: {
                  warehouseId: transfer.toWarehouseId,
                  itemId: item.id,
                  lotId: alloc.lotId,
                  qtyOnHand: receivedForLot,
                  qtyAllocated: 0,
                },
                update: {
                  qtyOnHand: { increment: receivedForLot },
                },
              });

              // Create StockLedger entry for TRANSFER_IN at destination warehouse
              await tx.stockLedger.create({
                data: {
                  warehouseId: transfer.toWarehouseId,
                  itemId: item.id,
                  lotId: alloc.lotId,
                  quantity: receivedForLot,
                  documentId: transfer.id,
                  documentType: DocumentType.TRANSFER,
                },
              });

              remainingReceived -= receivedForLot;
            }
          }
        } else {
          // Unbatched item: lock and upsert WarehouseItem directly
          await this.lockService.lockItem(tx, transfer.toWarehouseId, item.id);

          // Create StockLedger entry
          await tx.stockLedger.create({
            data: {
              warehouseId: transfer.toWarehouseId,
              itemId: item.id,
              lotId: null,
              quantity: receivedQty,
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
            },
          });
        }

        // Lock/fetch destination warehouse item to recalculate WAC
        const destWhItem = await this.lockService.lockItem(
          tx,
          transfer.toWarehouseId,
          item.id,
        );
        const currentQty = destWhItem
          ? new Prisma.Decimal(destWhItem.qtyOnHand)
          : new Prisma.Decimal(0);
        const currentWac = destWhItem
          ? new Prisma.Decimal(destWhItem.wac)
          : new Prisma.Decimal(0);
        const rxQty = new Prisma.Decimal(receivedQty);
        const rxCost = sourceWac;

        let newDestWac: Prisma.Decimal;
        if (currentQty.lte(0)) {
          newDestWac = rxCost;
        } else {
          const currentTotalCost = currentQty.mul(currentWac);
          const receivedTotalCost = rxQty.mul(rxCost);
          const totalQty = currentQty.add(rxQty);

          if (totalQty.lte(0)) {
            newDestWac = rxCost;
          } else {
            newDestWac = currentTotalCost.add(receivedTotalCost).div(totalQty);
          }
        }
        const roundedDestWac = newDestWac.toDecimalPlaces(4);

        // Upsert total item balance in target warehouse
        await tx.warehouseItem.upsert({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.toWarehouseId,
              itemId: item.id,
            },
          },
          create: {
            warehouseId: transfer.toWarehouseId,
            itemId: item.id,
            qtyOnHand: rxQty,
            qtyAllocated: 0,
            wac: roundedDestWac,
          },
          update: {
            qtyOnHand: { increment: rxQty },
            wac: roundedDestWac,
          },
        });

        // Log mutation to CostLedger for destination warehouse
        await tx.costLedger.create({
          data: {
            warehouseId: transfer.toWarehouseId,
            itemId: item.id,
            quantity: rxQty,
            unitPrice: rxCost,
            newWac: roundedDestWac,
            documentId: transfer.id,
            documentType: DocumentType.TRANSFER,
          },
        });

        // Log Transit Loss if there is a discrepancy
        const discrepancy = shippedQty - receivedQty;
        if (discrepancy > 0) {
          let transitLossWh = await tx.warehouse.findUnique({
            where: { code: 'TRANSIT_LOSS' },
          });
          if (!transitLossWh) {
            const toWh = await tx.warehouse.findUnique({
              where: { id: transfer.toWarehouseId },
              select: { branchId: true },
            });
            if (!toWh) {
              throw new NotFoundException(
                `Destination warehouse with ID ${transfer.toWarehouseId} not found`,
              );
            }
            transitLossWh = await tx.warehouse.create({
              data: {
                code: 'TRANSIT_LOSS',
                name: 'Transit Loss Expense Warehouse',
                branchId: toWh.branchId,
                isActive: false,
              },
            });
          }

          const discrepancyDec = new Prisma.Decimal(discrepancy);

          await tx.warehouseItem.upsert({
            where: {
              warehouseId_itemId: {
                warehouseId: transitLossWh.id,
                itemId: item.id,
              },
            },
            create: {
              warehouseId: transitLossWh.id,
              itemId: item.id,
              qtyOnHand: discrepancyDec,
              qtyAllocated: 0,
              wac: sourceWac,
            },
            update: {
              qtyOnHand: { increment: discrepancyDec },
            },
          });

          await tx.stockLedger.create({
            data: {
              warehouseId: transitLossWh.id,
              itemId: item.id,
              lotId: null,
              quantity: discrepancyDec,
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
            },
          });

          await tx.costLedger.create({
            data: {
              warehouseId: transitLossWh.id,
              itemId: item.id,
              quantity: discrepancyDec,
              unitPrice: sourceWac,
              newWac: sourceWac,
              documentId: transfer.id,
              documentType: DocumentType.TRANSFER,
            },
          });
        }
      }

      // 3. Update Transfer status to RECEIVED
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED',
          version: transfer.version + 1,
        },
      });

      // 4. Record ApprovalEvent
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
          fromStatus: 'IN_TRANSIT',
          toStatus: 'RECEIVED',
          actionPerformed: 'RECEIVE',
          userId,
          userRole: userRole as any,
          stepNumber,
        },
      });

      // 5. Record AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_RECEIVE_SUCCESS',
          targetTable: 'transfers',
          targetId: transfer.id,
          beforeStateJson: JSON.stringify({
            status: transfer.status,
            version: transfer.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'RECEIVED',
            version: transfer.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedTransfer;
    });
  }
}

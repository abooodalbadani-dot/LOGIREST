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
  Prisma,
  AdjustmentDirection,
  Transfer,
} from '@prisma/client';

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
  ): Promise<unknown> {
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
            // Lock the document first using SELECT FOR UPDATE
            const lockedDoc = await this.lockService.lockDocument<Transfer>(
              tx,
              transferId,
              DocumentType.TRANSFER,
            );
            if (!lockedDoc) {
              throw new NotFoundException(
                `Transfer with ID ${transferId} not found`,
              );
            }

            if (lockedDoc.status !== 'RECEIVED') {
              throw new BadRequestException(
                'Transfer must be in RECEIVED status to be voided',
              );
            }

            if (
              clientVersion !== undefined &&
              lockedDoc.version !== clientVersion
            ) {
              throw new BadRequestException('Version conflict detected');
            }

            const transfer = await tx.transfer.findUnique({
              where: { id: transferId },
              include: {
                lines: {
                  include: { item: true },
                },
              },
            });

            if (!transfer) {
              throw new NotFoundException(
                `Transfer with ID ${transferId} not found`,
              );
            }

            // Sort lines deterministically to prevent deadlocks
            const sortedLines = [...transfer.lines].sort((a, b) =>
              a.itemId.localeCompare(b.itemId),
            );

            // Deterministically sort warehouse IDs to prevent cross-warehouse deadlocks
            const sortedWhs = [
              transfer.fromWarehouseId,
              transfer.toWarehouseId,
            ].sort();

            // Pre-acquire locks in deterministic order: Warehouse -> Item -> Lot
            for (const whId of sortedWhs) {
              for (const line of sortedLines) {
                const item = line.item;
                // Lock WarehouseItem first
                await this.lockService.lockItem(tx, whId, item.id);

                // Lock WarehouseItemLot second (if batched)
                if (item.isBatched || item.hasExpiry) {
                  const allocations = await tx.lotAllocation.findMany({
                    where: { transferLineId: line.id },
                  });
                  const lotIds = allocations.map((a) => a.lotId).sort();
                  if (lotIds.length > 0) {
                    await this.lockService.lockLots(tx, whId, item.id, lotIds);
                  }
                }
              }
            }

            // 1. Lock and validate balances in destination warehouse (we need to deduct received stock)
            for (const line of sortedLines) {
              const item = line.item;
              const receivedQty = Number(line.quantityReceived);

              // Lock WarehouseItem first (destination warehouse)
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
                      idempotencyKey: `${DocumentType.TRANSFER}:stock_void_src:${transfer.id}:${item.id}:${alloc.lotId}:${line.id}`,
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
                        idempotencyKey: `${DocumentType.TRANSFER}:stock_void_dest:${transfer.id}:${item.id}:${alloc.lotId}:${line.id}`,
                      },
                    });

                    remainingReceived -= receivedForLot;
                  }
                }
              } else {
                // Unbatched item: lock and update WarehouseItems in sorted warehouse order
                const sortedWhs = [
                  transfer.fromWarehouseId,
                  transfer.toWarehouseId,
                ].sort();
                for (const whId of sortedWhs) {
                  await this.lockService.lockItem(tx, whId, item.id);
                }

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
                    idempotencyKey: `${DocumentType.TRANSFER}:stock_void_src:${transfer.id}:${item.id}:${line.id}`,
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
                    idempotencyKey: `${DocumentType.TRANSFER}:stock_void_dest:${transfer.id}:${item.id}:${line.id}`,
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
              // 1. Check if any subsequent cost-impacting document exists for the same item in the destination warehouse
              const subsequentGrn = await tx.goodsReceivedNote.findFirst({
                where: {
                  warehouseId: transfer.toWarehouseId,
                  status: 'POSTED',
                  createdAt: { gt: transfer.createdAt },
                  lines: {
                    some: {
                      itemId: item.id,
                    },
                  },
                },
              });

              const subsequentAdj = await tx.adjustment.findFirst({
                where: {
                  warehouseId: transfer.toWarehouseId,
                  status: 'POSTED',
                  createdAt: { gt: transfer.createdAt },
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
                  toWarehouseId: transfer.toWarehouseId,
                  status: 'RECEIVED',
                  createdAt: { gt: transfer.createdAt },
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
                    warehouseId: transfer.toWarehouseId,
                    status: 'POSTED',
                    createdAt: { gt: transfer.createdAt },
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

              const subsequentLandedCost = await tx.landedCostVoucher.findFirst(
                {
                  where: {
                    status: 'POSTED',
                    createdAt: { gt: transfer.createdAt },
                    lines: {
                      some: {
                        grnLine: {
                          itemId: item.id,
                          goodsReceivedNote: {
                            warehouseId: transfer.toWarehouseId,
                          },
                        },
                      },
                    },
                  },
                },
              );

              if (
                subsequentGrn ||
                subsequentAdj ||
                subsequentTransfer ||
                subsequentStocktake ||
                subsequentLandedCost
              ) {
                throw new BadRequestException(
                  'VOID_NOT_ALLOWED_UNDER_COST_IMPACT',
                );
              }

              // 2. Find the most recent CostLedger entry NOT from this Transfer (O(1) restoration query)
              const lastCostEntry = await tx.costLedger.findFirst({
                where: {
                  warehouseId: transfer.toWarehouseId,
                  itemId: item.id,
                  NOT: {
                    documentId: transfer.id,
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
                  idempotencyKey: `${DocumentType.TRANSFER}:cost_void_dest:${transfer.id}:${item.id}:${line.id}`,
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
                      idempotencyKey: `${DocumentType.TRANSFER}:stock_void_transit_loss:${transfer.id}:${item.id}:${line.id}`,
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
                      idempotencyKey: `${DocumentType.TRANSFER}:cost_void_transit_loss:${transfer.id}:${item.id}:${line.id}`,
                    },
                  });
                }
              }
            }

            // Update document status with version check
            const updateResult = await tx.transfer.updateMany({
              where: { id: transferId, version: lockedDoc.version },
              data: { status: 'VOIDED', version: lockedDoc.version + 1 },
            });
            if (updateResult.count === 0) {
              throw new BadRequestException('Version conflict detected');
            }

            const updatedTransfer = await tx.transfer.findUnique({
              where: { id: transferId },
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
                userRole,
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
                  status: lockedDoc.status,
                  version: lockedDoc.version,
                }),
                afterStateJson: JSON.stringify({
                  status: 'VOIDED',
                  version: lockedDoc.version + 1,
                }),
                ipAddress: ipAddress || null,
              },
            });

            return updatedTransfer;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 30000,
          },
        );
      } catch (error) {
        const isSerializationError =
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034') ||
          (error instanceof Error &&
            (error.message?.includes('40001') ||
              error.message?.includes('40P01') ||
              error.message?.includes('serialization') ||
              error.message?.includes('deadlock')));
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

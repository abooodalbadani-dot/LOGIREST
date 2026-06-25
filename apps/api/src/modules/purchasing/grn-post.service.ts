import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { WacService } from '../ledger/wac.service';
import { DocumentType, Role } from '@logirest/shared-types';
import {
  DocumentType as PrismaDocType,
  GoodsReceivedNote,
  $Enums,
  Prisma,
} from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class GrnPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
    private readonly wacService: WacService,
    private readonly metricsService: MetricsService,
    private readonly outboxService: OutboxService,
  ) {}

  async post(
    grnId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<GoodsReceivedNote> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Lock the document first
            const lockedDoc =
              await this.lockService.lockDocument<GoodsReceivedNote>(
                tx,
                grnId,
                PrismaDocType.GOODS_RECEIVED_NOTE,
              );
            if (!lockedDoc) {
              throw new NotFoundException(
                `GoodsReceivedNote with ID ${grnId} not found`,
              );
            }

            if (lockedDoc.status !== 'RECEIVED') {
              throw new BadRequestException(
                `GoodsReceivedNote must be in RECEIVED status to be posted`,
              );
            }

            if (
              clientVersion !== undefined &&
              lockedDoc.version !== clientVersion
            ) {
              throw new BadRequestException('Version conflict detected');
            }

            // Fetch GRN details and lines
            const grn = await tx.goodsReceivedNote.findUnique({
              where: { id: grnId },
              include: {
                lines: {
                  include: {
                    item: true,
                  },
                },
              },
            });

            if (!grn) {
              throw new NotFoundException(
                `Goods Received Note with ID ${grnId} not found`,
              );
            }

            // 2. Process each line
            for (const line of grn.lines) {
              const item = line.item;
              const lotId = line.lotId;

              // Historical posting guard (disabled to allow posting draft documents in current chronological ledger sequence)

              // Check if item is frozen in destination warehouse
              const destWhItemCheck = await tx.warehouseItem.findUnique({
                where: {
                  warehouseId_itemId: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                  },
                },
              });
              if (destWhItemCheck?.isFrozen) {
                throw new BadRequestException(
                  `Cannot post GRN: Item ${item.sku} is frozen/locked in destination warehouse`,
                );
              }

              // Lock WarehouseItem row
              await this.lockService.lockItem(tx, grn.warehouseId, item.id);

              if (item.isBatched || item.hasExpiry) {
                let resolvedLotId = lotId;

                if (!resolvedLotId) {
                  // Auto-create a lot using the GRN document number + item SKU as a stable,
                  // unique lot number. This handles GRNs that were submitted without lot data.
                  const autoLotNumber = `${grn.grnNumber}-${item.sku}`;
                  const existingLot = await tx.lot.findUnique({
                    where: { lotNumber: autoLotNumber },
                  });

                  if (existingLot) {
                    resolvedLotId = existingLot.id;
                  } else {
                    const newLot = await tx.lot.create({
                      data: {
                        itemId: item.id,
                        lotNumber: autoLotNumber,
                        receivedDate: grn.createdAt,
                        expiryDate: null,
                      },
                    });
                    resolvedLotId = newLot.id;
                  }

                  // Persist the resolved lotId back onto the GRN line
                  await tx.gRNLine.update({
                    where: { id: line.id },
                    data: { lotId: resolvedLotId },
                  });
                }

                // Validate lot-item association
                const lot = await tx.lot.findUnique({
                  where: { id: resolvedLotId },
                  select: { itemId: true },
                });
                if (!lot || lot.itemId !== item.id) {
                  throw new BadRequestException(
                    `Lot ${resolvedLotId} does not belong to item ${item.id}.`,
                  );
                }

                // Lock lot balance row (SELECT FOR UPDATE)
                await this.lockService.lockLots(tx, grn.warehouseId, item.id, [
                  resolvedLotId,
                ]);

                // Upsert WarehouseItem FIRST — warehouse_item_lots has a FK to warehouse_items,
                // so the parent row must exist before the lot row can be inserted.
                await tx.warehouseItem.upsert({
                  where: {
                    warehouseId_itemId: {
                      warehouseId: grn.warehouseId,
                      itemId: item.id,
                    },
                  },
                  create: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                    qtyOnHand: line.quantityReceived,
                    qtyAllocated: 0,
                    wac: 0, // updated by WacService
                  },
                  update: {
                    qtyOnHand: { increment: line.quantityReceived },
                  },
                });

                // Upsert WarehouseItemLot
                await tx.warehouseItemLot.upsert({
                  where: {
                    warehouseId_itemId_lotId: {
                      warehouseId: grn.warehouseId,
                      itemId: item.id,
                      lotId: resolvedLotId,
                    },
                  },
                  create: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                    lotId: resolvedLotId,
                    qtyOnHand: line.quantityReceived,
                    qtyAllocated: 0,
                  },
                  update: {
                    qtyOnHand: { increment: line.quantityReceived },
                  },
                });

                // Propagate resolvedLotId for the StockLedger entry below
                Object.assign(line, { lotId: resolvedLotId });
              }

              // Upsert WarehouseItem for non-batched items (batched items already upserted above)
              if (!item.isBatched && !item.hasExpiry) {
                await tx.warehouseItem.upsert({
                  where: {
                    warehouseId_itemId: {
                      warehouseId: grn.warehouseId,
                      itemId: item.id,
                    },
                  },
                  create: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                    qtyOnHand: line.quantityReceived,
                    qtyAllocated: 0,
                    wac: 0, // updated by WacService
                  },
                  update: {
                    qtyOnHand: { increment: line.quantityReceived },
                  },
                });
              }

              // Recalculate WAC
              const costIdempotencyKey = `${PrismaDocType.GOODS_RECEIVED_NOTE}:cost:${grn.id}:${item.id}:${line.id}`;

              // Task 1.1: Use unitPriceBase if available, fallback to unitPrice (for legacy un-migrated GRNs)
              const costToUse =
                line.unitPriceBase !== null
                  ? Number(line.unitPriceBase)
                  : Number(line.unitPrice);

              await this.wacService.recalculate(
                tx,
                grn.warehouseId,
                item.id,
                Number(line.quantityReceived),
                costToUse,
                grn.id,
                costIdempotencyKey,
              );

              // Insert StockLedger entry
              const stockIdempotencyKey = `${PrismaDocType.GOODS_RECEIVED_NOTE}:stock:${grn.id}:${item.id}:${line.id}`;
              await tx.stockLedger.create({
                data: {
                  warehouseId: grn.warehouseId,
                  itemId: item.id,
                  lotId: line.lotId || null,
                  quantity: line.quantityReceived,
                  documentId: grn.id,
                  documentType: PrismaDocType.GOODS_RECEIVED_NOTE,
                  idempotencyKey: stockIdempotencyKey,
                },
              });
            }

            // 3. Update GRN status with version check
            const updateResult = await tx.goodsReceivedNote.updateMany({
              where: { id: grnId, version: lockedDoc.version },
              data: {
                status: 'POSTED',
                version: lockedDoc.version + 1,
                postedAt: new Date(), // Task 1.2: Set postedAt
              },
            });
            if (updateResult.count === 0) {
              throw new BadRequestException('Version conflict detected');
            }

            // 4. Task 1.3: Update PO Status (Auto-fulfillment)
            const poLines = await tx.pOLine.findMany({
              where: { poId: grn.poId },
            });
            const allPostedGrns = await tx.goodsReceivedNote.findMany({
              where: { poId: grn.poId, status: 'POSTED' },
              include: { lines: true },
            });

            const receivedTotals = new Map<string, number>();
            for (const pGrn of allPostedGrns) {
              for (const pLine of pGrn.lines) {
                receivedTotals.set(
                  pLine.itemId,
                  (receivedTotals.get(pLine.itemId) || 0) +
                    Number(pLine.quantityReceived),
                );
              }
            }

            let allFulfilled = true;
            let anyFulfilled = false;
            for (const pol of poLines) {
              const reqQty = Number(pol.quantity);
              const recQty = receivedTotals.get(pol.itemId) || 0;
              if (recQty >= reqQty) {
                anyFulfilled = true;
              } else {
                allFulfilled = false;
                if (recQty > 0) anyFulfilled = true;
              }
            }

            const newPoStatus = allFulfilled
              ? 'FULFILLED'
              : anyFulfilled
                ? 'PARTIAL'
                : 'APPROVED';
            const currentPo = await tx.purchaseOrder.findUnique({
              where: { id: grn.poId },
            });

            if (currentPo && currentPo.status !== newPoStatus) {
              await tx.purchaseOrder.update({
                where: { id: grn.poId },
                data: { status: newPoStatus, version: { increment: 1 } },
              });

              const poStep =
                (await tx.approvalEvent.count({
                  where: {
                    documentId: grn.poId,
                    documentType: PrismaDocType.PURCHASE_ORDER,
                  },
                })) + 1;

              await tx.approvalEvent.create({
                data: {
                  documentId: grn.poId,
                  documentType: PrismaDocType.PURCHASE_ORDER,
                  fromStatus: currentPo.status,
                  toStatus: newPoStatus,
                  actionPerformed: 'AUTO_FULFILL',
                  userId,
                  userRole: userRole,
                  stepNumber: poStep,
                },
              });
            }

            const updatedGrn = await tx.goodsReceivedNote.findUnique({
              where: { id: grnId },
              include: {
                lines: {
                  include: {
                    item: {
                      include: {
                        unitOfMeasure: true,
                        category: true,
                      },
                    },
                    lot: true,
                  },
                },
                purchaseOrder: {
                  include: {
                    supplier: true,
                    currency: true,
                  },
                },
                warehouse: true,
              },
            });

            if (!updatedGrn) {
              throw new Error(
                `Failed to retrieve GoodsReceivedNote with ID ${grnId} after update`,
              );
            }

            this.metricsService.postingOperationsCounter.inc({
              document_type: 'GOODS_RECEIVED_NOTE',
            });

            // 4. Record ApprovalEvent
            const stepNumber =
              (await tx.approvalEvent.count({
                where: {
                  documentId: grn.id,
                  documentType: PrismaDocType.GOODS_RECEIVED_NOTE,
                },
              })) + 1;

            await tx.approvalEvent.create({
              data: {
                documentId: grn.id,
                documentType: PrismaDocType.GOODS_RECEIVED_NOTE,
                fromStatus: 'RECEIVED',
                toStatus: 'POSTED',
                actionPerformed: 'POST',
                userId,
                userRole: userRole,
                stepNumber,
              },
            });

            // 6. Record AuditLog
            await tx.auditLog.create({
              data: {
                userId,
                action: 'WORKFLOW_POST_SUCCESS',
                targetTable: 'goods_received_notes',
                targetId: grn.id,
                beforeStateJson: JSON.stringify({
                  status: grn.status,
                  version: grn.version,
                }),
                afterStateJson: JSON.stringify({
                  status: 'POSTED',
                  version: grn.version + 1,
                }),
                ipAddress: ipAddress || null,
              },
            });

            const user = tx.user
              ? await tx.user.findUnique({
                  where: { id: userId },
                  select: { name: true },
                })
              : null;

            await this.outboxService.writeEvent(tx, 'GRN_POSTED', {
              id: grn.id,
              documentNumber: grn.grnNumber,
              warehouseId: grn.warehouseId,
              warehouseName: updatedGrn.warehouse?.name || 'N/A',
              userName: user?.name || 'N/A',
            });

            return updatedGrn;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ); // Task 1.4: Serializable isolation
      } catch (error: unknown) {
        attempt++;
        let shouldRetry = false;
        if (error && typeof error === 'object') {
          const err = error as Record<string, unknown>;
          const code = typeof err.code === 'string' ? err.code : '';
          const message = typeof err.message === 'string' ? err.message : '';
          if (
            code === 'P2034' ||
            message.includes('Serializable') ||
            message.includes('deadlock') ||
            message.includes('conflict')
          ) {
            shouldRetry = true;
          }
        }
        if (attempt < MAX_RETRIES && shouldRetry) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Transaction failed after maximum retries');
  }
}

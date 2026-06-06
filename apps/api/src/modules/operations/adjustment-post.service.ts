import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { WacService } from '../ledger/wac.service';
import {
  Role,
  DocumentType,
  AdjustmentDirection,
  Prisma,
  Adjustment,
} from '@prisma/client';
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
  ): Promise<Adjustment> {
    const maxAttempts = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Lock the document first
            const lockedDoc = await this.lockService.lockDocument(
              tx,
              adjustmentId,
              DocumentType.ADJUSTMENT,
            );
            if (!lockedDoc) {
              throw new NotFoundException(
                `Adjustment with ID ${adjustmentId} not found`,
              );
            }

            if (lockedDoc.status !== 'APPROVED') {
              throw new BadRequestException(
                `Adjustment must be in APPROVED status to be posted`,
              );
            }

            if (
              clientVersion !== undefined &&
              lockedDoc.version !== clientVersion
            ) {
              throw new BadRequestException('Version conflict detected');
            }

            // Fetch Adjustment details with lines and items
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

            // 2. Validate all lines before processing
            for (const line of adj.lines) {
              if (line.direction === AdjustmentDirection.IN) {
                if (
                  line.unitCost === null ||
                  line.unitCost === undefined ||
                  Number(line.unitCost) <= 0
                ) {
                  throw new BadRequestException(
                    `Unit cost is required and must be greater than zero for manual Adjustment IN (Item SKU: ${line.item.sku}).`,
                  );
                }
              }
            }

            // 3. Process each line
            for (const line of adj.lines) {
              const item = line.item;
              const lotId = line.lotId;
              const qtyVal = Number(line.quantity);

              // Historical posting guard with raw SELECT FOR UPDATE to serialize concurrent posts
              const latestLedgers = await tx.$queryRaw<any[]>`
          SELECT "postedAt"
          FROM "stock_ledger"
          WHERE "warehouseId" = ${adj.warehouseId} AND "itemId" = ${item.id}
          ORDER BY "postedAt" DESC
          LIMIT 1
          FOR UPDATE
        `;
              const latestLedger = latestLedgers[0];
              if (
                latestLedger &&
                adj.createdAt < new Date(latestLedger.postedAt)
              ) {
                throw new BadRequestException('HISTORICAL_POSTING_BLOCKED');
              }

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
                  // Lock WarehouseItem row
                  const lockedItem = await this.lockService.lockItem(
                    tx,
                    adj.warehouseId,
                    item.id,
                  );
                  const currentWac = lockedItem ? Number(lockedItem.wac) : 0;

                  // Lock lot row (SELECT FOR UPDATE)
                  await this.lockService.lockLots(
                    tx,
                    adj.warehouseId,
                    item.id,
                    [lotId],
                  );

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
                  const unitCost = line.unitCost
                    ? Number(line.unitCost)
                    : currentWac;
                  const costIdempotencyKey = `${DocumentType.ADJUSTMENT}:cost:${adj.id}:${item.id}:${line.id}`;
                  await this.wacService.handlePositiveAdjustment(
                    tx,
                    adj.warehouseId,
                    item.id,
                    qtyVal,
                    unitCost,
                    adj.id,
                    costIdempotencyKey,
                  );

                  // Insert StockLedger entry
                  const stockIdempotencyKey = `${DocumentType.ADJUSTMENT}:stock:${adj.id}:${item.id}:${line.id}`;
                  await tx.stockLedger.create({
                    data: {
                      warehouseId: adj.warehouseId,
                      itemId: item.id,
                      lotId: lotId || null,
                      quantity: qtyVal,
                      documentId: adj.id,
                      documentType: DocumentType.ADJUSTMENT,
                      idempotencyKey: stockIdempotencyKey,
                    },
                  });
                } else {
                  // Outflow: decrement
                  // Lock WarehouseItem row
                  const lockedItem = await this.lockService.lockItem(
                    tx,
                    adj.warehouseId,
                    item.id,
                  );
                  this.lockService.assertItemBalance(
                    lockedItem,
                    qtyVal,
                    item.id,
                  );

                  // Lock lot row (SELECT FOR UPDATE)
                  const lockedLots = await this.lockService.lockLots(
                    tx,
                    adj.warehouseId,
                    item.id,
                    [lotId],
                  );
                  const lockedLot =
                    lockedLots.length > 0 ? lockedLots[0] : null;
                  this.lockService.assertLotBalance(lockedLot, qtyVal, lotId);

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
                    },
                  });

                  // Insert StockLedger entry (negative for decrease)
                  const stockIdempotencyKey = `${DocumentType.ADJUSTMENT}:stock:${adj.id}:${item.id}:${line.id}`;
                  await tx.stockLedger.create({
                    data: {
                      warehouseId: adj.warehouseId,
                      itemId: item.id,
                      lotId: lotId || null,
                      quantity: -qtyVal,
                      documentId: adj.id,
                      documentType: DocumentType.ADJUSTMENT,
                      idempotencyKey: stockIdempotencyKey,
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
                  const costIdempotencyKey = `${DocumentType.ADJUSTMENT}:cost:${adj.id}:${item.id}:${line.id}`;
                  await this.wacService.handlePositiveAdjustment(
                    tx,
                    adj.warehouseId,
                    item.id,
                    qtyVal,
                    unitCost,
                    adj.id,
                    costIdempotencyKey,
                  );

                  // Insert StockLedger entry
                  const stockIdempotencyKey = `${DocumentType.ADJUSTMENT}:stock:${adj.id}:${item.id}:${line.id}`;
                  await tx.stockLedger.create({
                    data: {
                      warehouseId: adj.warehouseId,
                      itemId: item.id,
                      lotId: null,
                      quantity: qtyVal,
                      documentId: adj.id,
                      documentType: DocumentType.ADJUSTMENT,
                      idempotencyKey: stockIdempotencyKey,
                    },
                  });
                } else {
                  // Decrement unbatched item
                  const lockedItem = await this.lockService.lockItem(
                    tx,
                    adj.warehouseId,
                    item.id,
                  );
                  this.lockService.assertItemBalance(
                    lockedItem,
                    qtyVal,
                    item.id,
                  );

                  await tx.warehouseItem.update({
                    where: {
                      warehouseId_itemId: {
                        warehouseId: adj.warehouseId,
                        itemId: item.id,
                      },
                    },
                    data: {
                      qtyOnHand: { decrement: qtyVal },
                    },
                  });

                  // Insert StockLedger entry (negative)
                  const stockIdempotencyKey = `${DocumentType.ADJUSTMENT}:stock:${adj.id}:${item.id}:${line.id}`;
                  await tx.stockLedger.create({
                    data: {
                      warehouseId: adj.warehouseId,
                      itemId: item.id,
                      lotId: null,
                      quantity: -qtyVal,
                      documentId: adj.id,
                      documentType: DocumentType.ADJUSTMENT,
                      idempotencyKey: stockIdempotencyKey,
                    },
                  });
                }
              }
            }

            // 4. Update Adjustment status to POSTED with version check
            const updateResult = await tx.adjustment.updateMany({
              where: { id: adjustmentId, version: lockedDoc.version },
              data: {
                status: 'POSTED',
                version: lockedDoc.version + 1,
              },
            });
            if (updateResult.count === 0) {
              throw new BadRequestException('Version conflict detected');
            }

            const updatedAdj = await tx.adjustment.findUnique({
              where: { id: adjustmentId },
            });
            if (!updatedAdj) {
              throw new NotFoundException(
                `Adjustment with ID ${adjustmentId} not found`,
              );
            }

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
                userRole: userRole,
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

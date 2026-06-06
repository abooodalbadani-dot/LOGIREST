import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Role, DocumentType, Prisma } from '@prisma/client';

@Injectable()
export class GrnVoidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
  ) {}

  async void(
    grnId: string,
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
            // Lock the document first
            const lockedDoc = await this.lockService.lockDocument(
              tx,
              grnId,
              DocumentType.GOODS_RECEIVED_NOTE,
            );
            if (!lockedDoc) {
              throw new NotFoundException(`GRN with ID ${grnId} not found`);
            }

            if (lockedDoc.status !== 'POSTED') {
              throw new BadRequestException(
                'GRN must be in POSTED status to be voided',
              );
            }

            if (
              clientVersion !== undefined &&
              lockedDoc.version !== clientVersion
            ) {
              throw new BadRequestException('Version conflict detected');
            }

            const grn = await tx.goodsReceivedNote.findUnique({
              where: { id: grnId },
              include: {
                lines: {
                  include: { item: true },
                },
              },
            });

            if (!grn) {
              throw new NotFoundException(`GRN with ID ${grnId} not found`);
            }

            // Assert no landed costs are applied to this GRN
            const landedCostExists =
              await tx.landedCostAllocationLine.findFirst({
                where: { grnLineId: { in: grn.lines.map((l) => l.id) } },
              });
            if (landedCostExists) {
              throw new BadRequestException(
                'GRN voiding is rejected because landed cost allocations have been posted to this receipt.',
              );
            }

            // Assert no subsequent GRNs containing any of the items have been posted in the warehouse
            const subsequentGrn = await tx.goodsReceivedNote.findFirst({
              where: {
                warehouseId: grn.warehouseId,
                status: 'POSTED',
                createdAt: { gt: grn.createdAt },
                lines: {
                  some: { itemId: { in: grn.lines.map((l) => l.itemId) } },
                },
              },
            });
            if (subsequentGrn) {
              throw new BadRequestException(
                'GRN voiding is rejected because a subsequent Goods Received Note has been posted, locking WAC history.',
              );
            }

            const sortedLines = [...grn.lines].sort((a, b) => {
              const cmp = a.itemId.localeCompare(b.itemId);
              if (cmp !== 0) return cmp;
              return (a.lotId || '').localeCompare(b.lotId || '');
            });

            for (const line of sortedLines) {
              const item = line.item;
              const qtyVal = Number(line.quantityReceived);

              const lockedItem = await this.lockService.lockItem(
                tx,
                grn.warehouseId,
                item.id,
              );
              if (lockedItem) {
                const itemQty = Number(lockedItem.qtyOnHand);
                if (itemQty < qtyVal) {
                  throw new BadRequestException(
                    'GRN voiding is rejected because items from this receipt have been partially or fully issued/consumed.',
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
                  grn.warehouseId,
                  item.id,
                  [lotId],
                );
                if (lockedLots.length > 0) {
                  const lotQty = Number(lockedLots[0].qtyOnHand);
                  if (lotQty < qtyVal) {
                    throw new BadRequestException(
                      'GRN voiding is rejected because items from this receipt have been partially or fully issued/consumed.',
                    );
                  }
                }
              }
            }

            for (const line of sortedLines) {
              const item = line.item;
              const qtyVal = Number(line.quantityReceived);
              const unitPrice = Number(line.unitPrice);

              if (item.isBatched || item.hasExpiry) {
                const lotId = line.lotId!;

                await tx.warehouseItemLot.update({
                  where: {
                    warehouseId_itemId_lotId: {
                      warehouseId: grn.warehouseId,
                      itemId: item.id,
                      lotId,
                    },
                  },
                  data: { qtyOnHand: { decrement: qtyVal } },
                });

                await tx.warehouseItem.update({
                  where: {
                    warehouseId_itemId: {
                      warehouseId: grn.warehouseId,
                      itemId: item.id,
                    },
                  },
                  data: { qtyOnHand: { decrement: qtyVal } },
                });

                await tx.stockLedger.create({
                  data: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                    lotId,
                    quantity: -qtyVal,
                    documentId: grn.id,
                    documentType: DocumentType.GOODS_RECEIVED_NOTE,
                    idempotencyKey: `${DocumentType.GOODS_RECEIVED_NOTE}:stock:${grn.id}:${item.id}:${line.id}:void`,
                  },
                });
              } else {
                await tx.warehouseItem.update({
                  where: {
                    warehouseId_itemId: {
                      warehouseId: grn.warehouseId,
                      itemId: item.id,
                    },
                  },
                  data: { qtyOnHand: { decrement: qtyVal } },
                });

                await tx.stockLedger.create({
                  data: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                    lotId: null,
                    quantity: -qtyVal,
                    documentId: grn.id,
                    documentType: DocumentType.GOODS_RECEIVED_NOTE,
                    idempotencyKey: `${DocumentType.GOODS_RECEIVED_NOTE}:stock:${grn.id}:${item.id}:${line.id}:void`,
                  },
                });
              }

              // Find the most recent CostLedger entry NOT from this GRN (O(1) restoration query)
              const lastCostEntry = await tx.costLedger.findFirst({
                where: {
                  warehouseId: grn.warehouseId,
                  itemId: item.id,
                  NOT: {
                    documentId: grn.id,
                  },
                },
                orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
              });

              const newWac = lastCostEntry
                ? new Prisma.Decimal(lastCostEntry.newWac)
                : new Prisma.Decimal(0);
              const roundedWac = newWac.toDecimalPlaces(4);

              await tx.warehouseItem.update({
                where: {
                  warehouseId_itemId: {
                    warehouseId: grn.warehouseId,
                    itemId: item.id,
                  },
                },
                data: { wac: roundedWac },
              });

              await tx.costLedger.create({
                data: {
                  warehouseId: grn.warehouseId,
                  itemId: item.id,
                  quantity: -qtyVal,
                  unitPrice: unitPrice,
                  newWac: roundedWac,
                  documentId: grn.id,
                  documentType: DocumentType.GOODS_RECEIVED_NOTE,
                  idempotencyKey: `${DocumentType.GOODS_RECEIVED_NOTE}:cost:${grn.id}:${item.id}:${line.id}:void`,
                },
              });
            }

            // Update GRN status with version check
            const updateResult = await tx.goodsReceivedNote.updateMany({
              where: { id: grnId, version: lockedDoc.version },
              data: { status: 'VOIDED', version: lockedDoc.version + 1 },
            });
            if (updateResult.count === 0) {
              throw new BadRequestException('Version conflict detected');
            }

            const updatedGrn = await tx.goodsReceivedNote.findUnique({
              where: { id: grnId },
            });

            const stepNumber =
              (await tx.approvalEvent.count({
                where: {
                  documentId: grn.id,
                  documentType: DocumentType.GOODS_RECEIVED_NOTE,
                },
              })) + 1;

            await tx.approvalEvent.create({
              data: {
                documentId: grn.id,
                documentType: DocumentType.GOODS_RECEIVED_NOTE,
                fromStatus: 'POSTED',
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
                targetTable: 'goods_received_notes',
                targetId: grn.id,
                beforeStateJson: JSON.stringify({
                  status: grn.status,
                  version: grn.version,
                }),
                afterStateJson: JSON.stringify({
                  status: 'VOIDED',
                  version: grn.version + 1,
                }),
                ipAddress: ipAddress || null,
              },
            });

            return updatedGrn;
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

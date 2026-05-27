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
  ): Promise<any> {
    if (userRole !== Role.ADMIN && userRole !== Role.INV_MGR) {
      throw new ForbiddenException(
        'Only System Administrators or Inventory Managers can void documents',
      );
    }
    return this.prisma.$transaction(async (tx) => {
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

      if (grn.status !== 'POSTED') {
        throw new BadRequestException(
          'GRN must be in POSTED status to be voided',
        );
      }

      if (clientVersion !== undefined && grn.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      const sortedLines = [...grn.lines].sort((a, b) => {
        const cmp = a.itemId.localeCompare(b.itemId);
        if (cmp !== 0) return cmp;
        return (a.lotId || '').localeCompare(b.lotId || '');
      });

      for (const line of sortedLines) {
        const item = line.item;
        const qtyVal = Number(line.quantityReceived);

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
                `Cannot void GRN: Item ${item.sku} (lot ${lotId}) has been partially consumed. Available: ${lotQty}, Required to void: ${qtyVal}`,
              );
            }
          }
        }

        const lockedItem = await this.lockService.lockItem(
          tx,
          grn.warehouseId,
          item.id,
        );
        if (lockedItem) {
          const itemQty = Number(lockedItem.qtyOnHand);
          if (itemQty < qtyVal) {
            throw new BadRequestException(
              `Cannot void GRN: Item ${item.sku} has been partially consumed. Available: ${itemQty}, Required to void: ${qtyVal}`,
            );
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
            },
          });
        }

        const costEntries = await tx.costLedger.findMany({
          where: {
            warehouseId: grn.warehouseId,
            itemId: item.id,
          },
          orderBy: { postedAt: 'asc' },
        });

        let recalcQty = new Prisma.Decimal(0);
        let recalcWac = new Prisma.Decimal(0);

        for (const entry of costEntries) {
          if (
            entry.documentId === grn.id &&
            entry.documentType === DocumentType.GOODS_RECEIVED_NOTE
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
          },
        });
      }

      const updatedGrn = await tx.goodsReceivedNote.update({
        where: { id: grnId },
        data: { status: 'VOIDED', version: grn.version + 1 },
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
          userRole: userRole as any,
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
    });
  }
}

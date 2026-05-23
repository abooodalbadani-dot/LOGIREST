/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { WacService } from '../ledger/wac.service';
import { DocumentType, Role } from '@logirest/shared-types';
import { DocumentType as PrismaDocType } from '@prisma/client';

@Injectable()
export class GrnPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
    private readonly wacService: WacService,
  ) {}

  async post(
    grnId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch GRN with lines and items
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
          `GoodsReceivedNote with ID ${grnId} not found`,
        );
      }

      if (grn.status !== 'RECEIVED') {
        throw new BadRequestException(
          `GoodsReceivedNote must be in RECEIVED status to be posted`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && grn.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // 2. Process each line
      for (const line of grn.lines) {
        const item = line.item;
        const lotId = line.lotId;

        if (item.isBatched || item.hasExpiry) {
          if (!lotId) {
            throw new BadRequestException(
              `Lot ID is required for batched item: ${item.sku}`,
            );
          }

          // Lock lot balance row (SELECT FOR UPDATE)
          await this.lockService.lockLots(tx, grn.warehouseId, item.id, [
            lotId,
          ]);

          // Upsert WarehouseItemLot
          await tx.warehouseItemLot.upsert({
            where: {
              warehouseId_itemId_lotId: {
                warehouseId: grn.warehouseId,
                itemId: item.id,
                lotId,
              },
            },
            create: {
              warehouseId: grn.warehouseId,
              itemId: item.id,
              lotId,
              qtyOnHand: line.quantityReceived,
              qtyAllocated: 0,
            },
            update: {
              qtyOnHand: { increment: line.quantityReceived },
            },
          });
        }

        // Lock WarehouseItem row
        await this.lockService.lockItem(tx, grn.warehouseId, item.id);

        // Upsert WarehouseItem
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

        // Recalculate WAC
        await this.wacService.recalculate(
          tx,
          grn.warehouseId,
          item.id,
          Number(line.quantityReceived),
          Number(line.unitPrice),
          grn.id,
        );

        // Insert StockLedger entry
        await tx.stockLedger.create({
          data: {
            warehouseId: grn.warehouseId,
            itemId: item.id,
            lotId: lotId || null,
            quantity: line.quantityReceived,
            documentId: grn.id,
            documentType: PrismaDocType.GOODS_RECEIVED_NOTE,
          },
        });
      }

      // 3. Update GRN status
      const updatedGrn = await tx.goodsReceivedNote.update({
        where: { id: grnId },
        data: {
          status: 'POSTED',
          version: grn.version + 1,
        },
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
          userRole: userRole as any,
          stepNumber,
        },
      });

      // 5. Record AuditLog
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

      return updatedGrn;
    });
  }
}

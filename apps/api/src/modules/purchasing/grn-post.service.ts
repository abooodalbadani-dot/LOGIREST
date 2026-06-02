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
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class GrnPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
    private readonly wacService: WacService,
    private readonly metricsService: MetricsService,
  ) {}

  async post(
    grnId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the document first
      const lockedDoc = await this.lockService.lockDocument(
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

      if (clientVersion !== undefined && lockedDoc.version !== clientVersion) {
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

        // Historical posting guard
        const latestLedger = await tx.stockLedger.findFirst({
          where: { warehouseId: grn.warehouseId, itemId: item.id },
          orderBy: { postedAt: 'desc' },
        });
        if (latestLedger && grn.createdAt < latestLedger.postedAt) {
          throw new BadRequestException('HISTORICAL_POSTING_BLOCKED');
        }

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

        if (item.isBatched || item.hasExpiry) {
          if (!lotId) {
            throw new BadRequestException(
              `Lot ID is required for batched item: ${item.sku}`,
            );
          }

          // Validate lot-item association
          const lot = await tx.lot.findUnique({
            where: { id: lotId },
            select: { itemId: true },
          });
          if (!lot || lot.itemId !== item.id) {
            throw new BadRequestException(
              `Lot ${lotId} does not belong to item ${item.id}.`,
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
        const costIdempotencyKey = `${PrismaDocType.GOODS_RECEIVED_NOTE}:cost:${grn.id}:${item.id}:${line.id}`;
        await this.wacService.recalculate(
          tx,
          grn.warehouseId,
          item.id,
          Number(line.quantityReceived),
          Number(line.unitPrice),
          grn.id,
          costIdempotencyKey,
        );

        // Insert StockLedger entry
        const stockIdempotencyKey = `${PrismaDocType.GOODS_RECEIVED_NOTE}:stock:${grn.id}:${item.id}:${line.id}`;
        await tx.stockLedger.create({
          data: {
            warehouseId: grn.warehouseId,
            itemId: item.id,
            lotId: lotId || null,
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
        },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Version conflict detected');
      }

      const updatedGrn = await tx.goodsReceivedNote.findUnique({
        where: { id: grnId },
      });

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

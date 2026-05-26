/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Role, DocumentType, StocktakeStatus } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class StocktakePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
    private readonly metricsService: MetricsService,
  ) {}

  async post(
    sessionId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Session
      const session = await tx.stocktakeSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException(
          `StocktakeSession with ID ${sessionId} not found`,
        );
      }

      if (session.status !== StocktakeStatus.APPROVED) {
        throw new BadRequestException(
          `StocktakeSession must be in APPROVED status to be posted`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && session.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // 2. Fetch Snapshots and Counts
      const snapshots = await tx.stocktakeSnapshot.findMany({
        where: { sessionId: session.id },
        include: {
          item: true,
        },
      });

      const counts = await tx.stocktakeCount.findMany({
        where: { sessionId: session.id },
      });

      // Map snapshots and counts by key "itemId:lotId"
      const snapshotMap = new Map<string, (typeof snapshots)[number]>();
      const countMap = new Map<string, (typeof counts)[number]>();

      const allKeys = new Set<string>();

      for (const snap of snapshots) {
        const key = `${snap.itemId}:${snap.lotId || ''}`;
        snapshotMap.set(key, snap);
        allKeys.add(key);
      }

      for (const count of counts) {
        const key = `${count.itemId}:${count.lotId || ''}`;
        countMap.set(key, count);
        allKeys.add(key);
      }

      // 3. Reconcile variances
      for (const key of allKeys) {
        const snapshot = snapshotMap.get(key);
        const count = countMap.get(key);

        const itemId = snapshot ? snapshot.itemId : count!.itemId;
        const lotId = snapshot ? snapshot.lotId : count!.lotId;
        const isBatched = snapshot ? snapshot.item.isBatched : true; // default true if from count

        const qtySnapshot = snapshot ? Number(snapshot.qtySnapshot) : 0;
        const qtyCounted = count ? Number(count.qtyCounted) : 0;
        const variance = qtyCounted - qtySnapshot;

        if (variance !== 0) {
          if (isBatched && lotId) {
            // Lock lot row (SELECT FOR UPDATE)
            await this.lockService.lockLots(tx, session.warehouseId, itemId, [
              lotId,
            ]);

            // Lock WarehouseItem row
            await this.lockService.lockItem(tx, session.warehouseId, itemId);

            if (variance > 0) {
              // Upsert WarehouseItemLot
              await tx.warehouseItemLot.upsert({
                where: {
                  warehouseId_itemId_lotId: {
                    warehouseId: session.warehouseId,
                    itemId,
                    lotId,
                  },
                },
                create: {
                  warehouseId: session.warehouseId,
                  itemId,
                  lotId,
                  qtyOnHand: variance,
                  qtyAllocated: 0,
                },
                update: {
                  qtyOnHand: { increment: variance },
                },
              });

              // Upsert WarehouseItem
              await tx.warehouseItem.upsert({
                where: {
                  warehouseId_itemId: {
                    warehouseId: session.warehouseId,
                    itemId,
                  },
                },
                create: {
                  warehouseId: session.warehouseId,
                  itemId,
                  qtyOnHand: variance,
                  qtyAllocated: 0,
                  wac: 0,
                },
                update: {
                  qtyOnHand: { increment: variance },
                },
              });
            } else {
              // variance < 0
              // Decrement lot balance
              await tx.warehouseItemLot.update({
                where: {
                  warehouseId_itemId_lotId: {
                    warehouseId: session.warehouseId,
                    itemId,
                    lotId,
                  },
                },
                data: {
                  qtyOnHand: { decrement: Math.abs(variance) },
                },
              });

              // Decrement item balance
              await tx.warehouseItem.update({
                where: {
                  warehouseId_itemId: {
                    warehouseId: session.warehouseId,
                    itemId,
                  },
                },
                data: {
                  qtyOnHand: { decrement: Math.abs(variance) },
                },
              });
            }
          } else {
            // Unbatched item
            await this.lockService.lockItem(tx, session.warehouseId, itemId);

            if (variance > 0) {
              await tx.warehouseItem.upsert({
                where: {
                  warehouseId_itemId: {
                    warehouseId: session.warehouseId,
                    itemId,
                  },
                },
                create: {
                  warehouseId: session.warehouseId,
                  itemId,
                  qtyOnHand: variance,
                  qtyAllocated: 0,
                  wac: 0,
                },
                update: {
                  qtyOnHand: { increment: variance },
                },
              });
            } else {
              // variance < 0
              await tx.warehouseItem.update({
                where: {
                  warehouseId_itemId: {
                    warehouseId: session.warehouseId,
                    itemId,
                  },
                },
                data: {
                  qtyOnHand: { decrement: Math.abs(variance) },
                },
              });
            }
          }

          // Write StockLedger entry
          await tx.stockLedger.create({
            data: {
              warehouseId: session.warehouseId,
              itemId,
              lotId,
              quantity: variance,
              documentId: session.id,
              documentType: DocumentType.STOCKTAKE,
            },
          });
        }
      }

      // 4. Release Warehouse Locks
      await tx.warehouseLock.updateMany({
        where: {
          warehouseId: session.warehouseId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      await tx.warehouse.update({
        where: { id: session.warehouseId },
        data: {
          isLocked: false,
        },
      });

      // 5. Update Session status
      const updatedSession = await tx.stocktakeSession.update({
        where: { id: sessionId },
        data: {
          status: StocktakeStatus.POSTED,
          version: session.version + 1,
        },
      });

      this.metricsService.postingOperationsCounter.inc({
        document_type: 'STOCKTAKE',
      });

      // 6. Record ApprovalEvent
      const stepNumber =
        (await tx.approvalEvent.count({
          where: {
            documentId: session.id,
            documentType: DocumentType.STOCKTAKE,
          },
        })) + 1;

      await tx.approvalEvent.create({
        data: {
          documentId: session.id,
          documentType: DocumentType.STOCKTAKE,
          fromStatus: 'APPROVED',
          toStatus: 'POSTED',
          actionPerformed: 'POST',
          userId,
          userRole: userRole as any,
          stepNumber,
        },
      });

      // 7. Record AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: 'WORKFLOW_POST_SUCCESS',
          targetTable: 'stocktake_sessions',
          targetId: session.id,
          beforeStateJson: JSON.stringify({
            status: session.status,
            version: session.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'POSTED',
            version: session.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedSession;
    });
  }
}

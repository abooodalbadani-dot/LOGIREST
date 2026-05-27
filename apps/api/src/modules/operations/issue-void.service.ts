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
export class IssueVoidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
  ) {}

  async void(
    issueId: string,
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
      const issue = await tx.inventoryIssue.findUnique({
        where: { id: issueId },
        include: {
          lines: {
            include: { item: true },
          },
        },
      });

      if (!issue) {
        throw new NotFoundException(
          `InventoryIssue with ID ${issueId} not found`,
        );
      }

      if (issue.status !== 'POSTED') {
        throw new BadRequestException(
          'InventoryIssue must be in POSTED status to be voided',
        );
      }

      if (clientVersion !== undefined && issue.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      const sortedLines = [...issue.lines].sort((a, b) =>
        a.itemId.localeCompare(b.itemId),
      );

      for (const line of sortedLines) {
        const item = line.item;
        const qtyVal = Number(line.quantity);

        if (item.isBatched || item.hasExpiry) {
          const allocations = await tx.lotAllocation.findMany({
            where: { issueLineId: line.id },
          });

          // Deterministic lock ordering for lots
          const sortedAllocations = [...allocations].sort((a, b) =>
            a.lotId.localeCompare(b.lotId),
          );

          for (const alloc of sortedAllocations) {
            await this.lockService.lockLots(tx, issue.warehouseId, item.id, [
              alloc.lotId,
            ]);

            await tx.warehouseItemLot.update({
              where: {
                warehouseId_itemId_lotId: {
                  warehouseId: issue.warehouseId,
                  itemId: item.id,
                  lotId: alloc.lotId,
                },
              },
              data: {
                qtyOnHand: { increment: Number(alloc.quantityAllocated) },
              },
            });

            await tx.stockLedger.create({
              data: {
                warehouseId: issue.warehouseId,
                itemId: item.id,
                lotId: alloc.lotId,
                quantity: Number(alloc.quantityAllocated),
                documentId: issue.id,
                documentType: DocumentType.INVENTORY_ISSUE,
              },
            });
          }
        }

        await this.lockService.lockItem(tx, issue.warehouseId, item.id);

        await tx.warehouseItem.update({
          where: {
            warehouseId_itemId: {
              warehouseId: issue.warehouseId,
              itemId: item.id,
            },
          },
          data: { qtyOnHand: { increment: qtyVal } },
        });

        if (!item.isBatched && !item.hasExpiry) {
          await tx.stockLedger.create({
            data: {
              warehouseId: issue.warehouseId,
              itemId: item.id,
              lotId: null,
              quantity: qtyVal,
              documentId: issue.id,
              documentType: DocumentType.INVENTORY_ISSUE,
            },
          });
        }
      }

      const updatedIssue = await tx.inventoryIssue.update({
        where: { id: issueId },
        data: { status: 'VOIDED', version: issue.version + 1 },
      });

      const stepNumber =
        (await tx.approvalEvent.count({
          where: {
            documentId: issue.id,
            documentType: DocumentType.INVENTORY_ISSUE,
          },
        })) + 1;

      await tx.approvalEvent.create({
        data: {
          documentId: issue.id,
          documentType: DocumentType.INVENTORY_ISSUE,
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
          targetTable: 'inventory_issues',
          targetId: issue.id,
          beforeStateJson: JSON.stringify({
            status: issue.status,
            version: issue.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'VOIDED',
            version: issue.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedIssue;
    });
  }
}

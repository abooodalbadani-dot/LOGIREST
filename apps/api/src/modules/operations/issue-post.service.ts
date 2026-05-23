/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { Role, DocumentType } from '@prisma/client';

@Injectable()
export class IssuePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationService: AllocationService,
  ) {}

  async post(
    issueId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Issue with lines and items
      const issue = await tx.inventoryIssue.findUnique({
        where: { id: issueId },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!issue) {
        throw new NotFoundException(
          `InventoryIssue with ID ${issueId} not found`,
        );
      }

      if (issue.status !== 'SUBMITTED') {
        throw new BadRequestException(
          `InventoryIssue must be in SUBMITTED status to be posted`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && issue.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // 2. Process each line
      for (const line of issue.lines) {
        const item = line.item;

        // Perform progressive lot allocation (FEFO/FIFO) and decrement quantities
        const allocations = await this.allocationService.allocate(
          tx,
          issue.warehouseId,
          item.id,
          Number(line.quantity),
        );

        if (item.isBatched || item.hasExpiry) {
          // Record LotAllocation for each allocated lot
          for (const alloc of allocations) {
            await tx.lotAllocation.create({
              data: {
                issueLineId: line.id,
                lotId: alloc.lotId,
                quantityAllocated: alloc.quantityAllocated,
              },
            });

            // Insert StockLedger entry (negative for stock reduction)
            await tx.stockLedger.create({
              data: {
                warehouseId: issue.warehouseId,
                itemId: item.id,
                lotId: alloc.lotId,
                quantity: -alloc.quantityAllocated,
                documentId: issue.id,
                documentType: DocumentType.INVENTORY_ISSUE,
              },
            });
          }
        } else {
          // Unbatched item: StockLedger entry with lotId null
          await tx.stockLedger.create({
            data: {
              warehouseId: issue.warehouseId,
              itemId: item.id,
              lotId: null,
              quantity: -Number(line.quantity),
              documentId: issue.id,
              documentType: DocumentType.INVENTORY_ISSUE,
            },
          });
        }
      }

      // 3. Update Issue status
      const updatedIssue = await tx.inventoryIssue.update({
        where: { id: issueId },
        data: {
          status: 'POSTED',
          version: issue.version + 1,
        },
      });

      // 4. Record ApprovalEvent
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
          fromStatus: 'SUBMITTED',
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
          targetTable: 'inventory_issues',
          targetId: issue.id,
          beforeStateJson: JSON.stringify({
            status: issue.status,
            version: issue.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'POSTED',
            version: issue.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedIssue;
    });
  }
}

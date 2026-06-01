import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { Role, DocumentType, Prisma, InventoryIssue } from '@prisma/client';
import { OutboxService } from '../outbox/outbox.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class IssuePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationService: AllocationService,
    private readonly outboxService: OutboxService,
    private readonly metricsService: MetricsService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  async post(
    issueId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryIssue> {
    const execute = async (
      tx: Prisma.TransactionClient,
    ): Promise<InventoryIssue> => {
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

        // Check if item is frozen in source warehouse
        await this.scopeValidationService.checkWarehouseItemQuarantine(
          issue.warehouseId,
          item.id,
          item.sku,
        );

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

      this.metricsService.postingOperationsCounter.inc({
        document_type: 'INVENTORY_ISSUE',
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
          userRole: userRole,
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

      // 6. Dispatch Outbox Event
      await this.outboxService.writeEvent(tx, 'ISSUE_POSTED', {
        issueId: issue.id,
        issueNumber: updatedIssue.issueNumber,
        warehouseId: issue.warehouseId,
        postedByUserId: userId,
        totalLines: issue.lines.length,
        timestamp: new Date().toISOString(),
      });

      // 7. Generate NotificationLog entries per target role
      const notificationRoles = [Role.ADMIN, Role.INV_MGR];
      for (const role of notificationRoles) {
        await tx.notificationLog.create({
          data: {
            targetRole: role,
            warehouseId: issue.warehouseId,
            message: `Stock Issue Posted: ${updatedIssue.issueNumber} / تم ترحيل صرف مخزون: ${updatedIssue.issueNumber}`,
            isRead: false,
            documentType: DocumentType.INVENTORY_ISSUE,
            documentId: issue.id,
          },
        });
      }

      return updatedIssue;
    };

    if (tx) {
      return execute(tx);
    }
    return this.prisma.$transaction(execute, { timeout: 30000 });
  }
}

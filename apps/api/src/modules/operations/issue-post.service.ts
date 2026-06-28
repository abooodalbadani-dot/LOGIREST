import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
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
    private readonly lockService: LedgerLockService,
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
      // Lock the document first
      const lockedDoc = await this.lockService.lockDocument(
        tx,
        issueId,
        DocumentType.INVENTORY_ISSUE,
      );
      if (!lockedDoc) {
        throw new NotFoundException(
          `InventoryIssue with ID ${issueId} not found`,
        );
      }

      if (lockedDoc.status !== 'SUBMITTED') {
        throw new BadRequestException(
          `InventoryIssue must be in SUBMITTED status to be posted`,
        );
      }

      // Optimistic locking version check
      if (clientVersion !== undefined && lockedDoc.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      // Fetch Issue details with lines and items
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
          `Inventory Issue with ID ${issueId} not found`,
        );
      }

      // 2. Process each line
      for (const line of issue.lines) {
        const item = line.item;

        // Historical posting guard (disabled to allow posting draft documents in current chronological ledger sequence)

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
                idempotencyKey: `${DocumentType.INVENTORY_ISSUE}:stock:${issue.id}:${item.id}:${alloc.lotId}:${line.id}`,
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
              idempotencyKey: `${DocumentType.INVENTORY_ISSUE}:stock:${issue.id}:${item.id}:${line.id}`,
            },
          });
        }
      }

      // 3. Update Issue status with version check
      const updateResult = await tx.inventoryIssue.updateMany({
        where: { id: issueId, version: lockedDoc.version },
        data: {
          status: 'POSTED',
          version: lockedDoc.version + 1,
        },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Version conflict detected');
      }

      const updatedIssue = await tx.inventoryIssue.findUnique({
        where: { id: issueId },
      });
      if (!updatedIssue) {
        throw new NotFoundException(
          `Inventory Issue with ID ${issueId} not found`,
        );
      }

      // 3.5. If there is a linked KitchenRequest, transition it to FULFILLED and update item fulfillment quantities
      const kitchenRequest = await tx.kitchenRequest.findFirst({
        where: { issueId: issue.id },
      });
      if (kitchenRequest && kitchenRequest.status !== 'FULFILLED') {
        // Update KitchenRequestItem fulfillment quantities
        for (const line of issue.lines) {
          const krItem = await tx.kitchenRequestItem.findFirst({
            where: { requestId: kitchenRequest.id, itemId: line.itemId },
          });
          if (krItem) {
            await tx.kitchenRequestItem.update({
              where: { id: krItem.id },
              data: { quantityFulfilled: line.quantity },
            });
          }
        }

        // Transition status to FULFILLED
        await tx.kitchenRequest.update({
          where: { id: kitchenRequest.id },
          data: {
            status: 'FULFILLED',
            version: { increment: 1 },
          },
        });

        // Write outbox event for kitchen request posted
        await this.outboxService.writeEvent(tx, 'KITCHEN_REQUEST_POSTED', {
          id: kitchenRequest.id,
          documentNumber: kitchenRequest.requestNumber,
          warehouseId: kitchenRequest.warehouseId,
          requestedById: kitchenRequest.requestedById,
        });

        // Write KITCHEN_CHIEF in-app notice
        await tx.notificationLog.create({
          data: {
            targetRole: Role.KITCHEN_CHIEF,
            warehouseId: kitchenRequest.warehouseId,
            message: `Kitchen Request ${kitchenRequest.requestNumber} has been fulfilled.`,
            isRead: false,
            documentType: DocumentType.KITCHEN_REQUEST,
            documentId: kitchenRequest.id,
          },
        });

        // Write ApprovalEvent for kitchen request fulfillment
        const krStep =
          (await tx.approvalEvent.count({
            where: {
              documentId: kitchenRequest.id,
              documentType: DocumentType.KITCHEN_REQUEST,
            },
          })) + 1;

        await tx.approvalEvent.create({
          data: {
            documentId: kitchenRequest.id,
            documentType: DocumentType.KITCHEN_REQUEST,
            fromStatus: kitchenRequest.status,
            toStatus: 'FULFILLED',
            actionPerformed: 'FULFILL',
            userId,
            userRole: userRole,
            stepNumber: krStep,
          },
        });
      }

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
    const maxAttempts = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await this.prisma.$transaction(execute, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30000,
        });
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

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { getCurrentUserContext } from '../../common/user.context';
import { PrismaService } from '../../database/prisma.service';
import { ConcurrencyService } from '../../services/concurrency.service';
import { DocumentType as PrismaDocType, Prisma, Role } from '@prisma/client';
import { OutboxService } from '../outbox/outbox.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  DocumentType,
  DocumentStatus,
  DocumentAction,
  getNextStatusV2,
  canPerformActionV2,
} from '@logirest/shared-types';

export interface DynamicDocument {
  id: string;
  status: string;
  version: number;
  warehouseId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  requestNumber?: string;
  grnNumber?: string;
  poNumber?: string;
  transferNumber?: string;
  adjustmentNumber?: string;
  sessionNumber?: string;
  createdById?: string;
  poId?: string;
  supplierId?: string;
  [key: string]: unknown;
}

type PrismaDynamicDelegate = {
  findUnique: (args: {
    where: { id: string };
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }) => Promise<DynamicDocument | null>;
  updateMany: (args: {
    where: { id: string; version: number };
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
};

export const MODEL_TO_TABLE: Record<string, string> = {
  purchaseRequest: 'purchase_requests',
  purchaseOrder: 'purchase_orders',
  goodsReceivedNote: 'goods_received_notes',
  inventoryIssue: 'inventory_issues',
  transfer: 'transfers',
  adjustment: 'adjustments',
  stocktakeSession: 'stocktake_sessions',
  kitchenRequest: 'kitchen_requests',
};

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly outboxService: OutboxService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Helper to map model names to document types
   */
  mapModelToDocType(modelName: string): DocumentType {
    switch (modelName) {
      case 'purchaseRequest':
        return 'pr';
      case 'purchaseOrder':
        return 'po';
      case 'goodsReceivedNote':
        return 'grn';
      case 'inventoryIssue':
        return 'issue';
      case 'transfer':
        return 'transfer';
      case 'adjustment':
        return 'adjustment';
      case 'stocktakeSession':
        return 'stocktake';
      case 'kitchenRequest':
        return 'kitchen_request';
      default:
        throw new BadRequestException(`Unknown model name: ${modelName}`);
    }
  }

  /**
   * Map shared-type DocumentType to Prisma.DocumentType enum
   */
  mapToPrismaDocType(docType: DocumentType): PrismaDocType {
    const norm = docType.toUpperCase();
    if (norm === 'PR') return PrismaDocType.PURCHASE_REQUEST;
    if (norm === 'PO') return PrismaDocType.PURCHASE_ORDER;
    if (norm === 'GRN') return PrismaDocType.GOODS_RECEIVED_NOTE;
    if (norm === 'ISSUE') return PrismaDocType.INVENTORY_ISSUE;
    if (norm === 'TRANSFER') return PrismaDocType.TRANSFER;
    if (norm === 'ADJUSTMENT') return PrismaDocType.ADJUSTMENT;
    if (norm === 'KITCHEN_REQUEST') return PrismaDocType.KITCHEN_REQUEST;
    if (norm === 'STOCKTAKE') return PrismaDocType.STOCKTAKE;
    throw new Error(`Unknown document type for mapping: ${docType}`);
  }

  /**
   * Wrapper for shared-types role capability validation
   */
  verifyRolePermission(
    docType: DocumentType,
    status: DocumentStatus,
    action: DocumentAction,
    role: Role,
  ): boolean {
    return canPerformActionV2(docType, status, action, role);
  }

  /**
   * Wrapper for shared-types next status retrieval
   */
  getNextStatus(
    docType: DocumentType,
    status: DocumentStatus,
    action: DocumentAction,
  ): DocumentStatus | null {
    return getNextStatusV2(docType, status, action);
  }

  /**
   * Check if warehouse is locked (either warehouse.isLocked is true or an active expiresAt > now() lock exists)
   */
  async isWarehouseLocked(warehouseId: string): Promise<boolean> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { isLocked: true },
    });

    if (warehouse?.isLocked) {
      return true;
    }

    const activeLock = await this.prisma.warehouseLock.findFirst({
      where: {
        warehouseId,
        isActive: true,
      },
    });

    return !!activeLock;
  }

  /**
   * Check warehouse operational locks for physical inventory mutating actions
   */
  async verifyWarehouseLocks(
    docType: DocumentType,
    action: DocumentAction,
    document: {
      warehouseId?: string | null;
      fromWarehouseId?: string | null;
      toWarehouseId?: string | null;
    },
  ): Promise<void> {
    const normalizedType = docType.toLowerCase();
    let isMutating = false;

    if (normalizedType === 'grn' && action === 'POST') isMutating = true;
    if (normalizedType === 'issue' && action === 'POST') isMutating = true;
    if (normalizedType === 'adjustment' && action === 'POST') isMutating = true;
    if (normalizedType === 'kitchen_request' && action === 'POST')
      isMutating = true;
    if (
      normalizedType === 'transfer' &&
      (action === 'SHIP' || action === 'RECEIVE')
    )
      isMutating = true;

    if (!isMutating) return;

    const warehouseIds: string[] = [];
    if (document.warehouseId) {
      warehouseIds.push(document.warehouseId);
    }
    if (document.fromWarehouseId) {
      warehouseIds.push(document.fromWarehouseId);
    }
    if (document.toWarehouseId) {
      warehouseIds.push(document.toWarehouseId);
    }

    for (const whId of warehouseIds) {
      const locked = await this.isWarehouseLocked(whId);
      if (locked) {
        throw new HttpException(
          `Warehouse is locked. Physical inventory mutations are blocked.`,
          HttpStatus.LOCKED,
        );
      }
    }
  }

  /**
   * Helper to write an audit log entry
   */
  async writeAuditLog(
    userId: string,
    action: string,
    targetTable: string,
    targetId: string,
    beforeState: unknown,
    afterState: unknown,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          targetTable,
          targetId,
          beforeStateJson: JSON.stringify(beforeState),
          afterStateJson: JSON.stringify(afterState),
          ipAddress: ipAddress || null,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to write audit log: ${errorMsg}`, errorStack);
    }
  }

  /**
   * Executes a workflow status transition, logging events & audit log.
   * If version is provided, performs database-level optimistic locking.
   */
  async executeTransition(
    documentId: string,
    modelName: string,
    action: DocumentAction,
    userId: string,
    userRole: Role,
    comments?: string,
    clientVersion?: number,
    ipAddress?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DynamicDocument> {
    const docType = this.mapModelToDocType(modelName);
    const targetTable = MODEL_TO_TABLE[modelName] || modelName;

    if (action === 'REJECT' && (!comments || comments.trim() === '')) {
      throw new BadRequestException('Comments are mandatory for REJECT action');
    }

    let fetchedDoc: DynamicDocument | null = null;

    try {
      const execute = async (transaction: Prisma.TransactionClient) => {
        const includeConfig =
          modelName === 'purchaseOrder'
            ? { purchaseRequest: { select: { warehouseId: true } } }
            : undefined;

        const doc = await (
          transaction as unknown as Record<string, PrismaDynamicDelegate>
        )[modelName].findUnique({
          where: { id: documentId },
          include: includeConfig,
        });

        if (!doc) {
          throw new NotFoundException(
            `Document not found: ${modelName} with ID ${documentId}`,
          );
        }

        fetchedDoc = doc;

        // 1. Transition Status check
        const targetStatus = getNextStatusV2(
          docType,
          doc.status as DocumentStatus,
          action,
        );
        if (!targetStatus) {
          const errorMsg = `Invalid status transition: Action ${action} is not allowed on ${docType} in status ${doc.status}`;
          throw new BadRequestException(errorMsg);
        }

        // 2. Role Validation Check
        // SELF-APPROVAL POLICY: PROC_MGR, INV_MGR, and BRANCH_MGR are fully authorized
        // to approve or post their own drafted documents. This is an intentional design
        // decision for fast-paced kitchen supply operations. No Maker-Checker block
        // is applied here by design. If dual-control is required, add a
        // `document.createdById !== userId` check immediately below this block.
        const hasRolePermission = canPerformActionV2(
          docType,
          doc.status as DocumentStatus,
          action,
          userRole,
        );
        if (!hasRolePermission) {
          const errorMsg = `User with role ${userRole} is not authorized to perform action ${action} on ${docType} in status ${doc.status}`;
          throw new ForbiddenException(errorMsg);
        }

        // 2b. Scope Isolation check
        if (userRole !== Role.ADMIN && userRole !== Role.GM) {
          const warehouseIds: string[] = [];
          if (docType === 'transfer') {
            if (action === 'RECEIVE') {
              if (doc.toWarehouseId) warehouseIds.push(doc.toWarehouseId);
            } else {
              if (doc.fromWarehouseId) warehouseIds.push(doc.fromWarehouseId);
            }
          } else {
            if (doc.warehouseId) warehouseIds.push(doc.warehouseId as string);
            if ((doc as Record<string, unknown>).purchaseRequest && ((doc as Record<string, unknown>).purchaseRequest as Record<string, unknown>).warehouseId) {
              warehouseIds.push(((doc as Record<string, unknown>).purchaseRequest as Record<string, unknown>).warehouseId as string);
            }
            if (doc.fromWarehouseId) warehouseIds.push(doc.fromWarehouseId as string);
            if (doc.toWarehouseId) warehouseIds.push(doc.toWarehouseId as string);
          }

          for (const whId of warehouseIds) {
            if (userRole === Role.WH_KEEPER) {
              const hasScope = await transaction.userWarehouseScope.findUnique({
                where: {
                  userId_warehouseId: {
                    userId,
                    warehouseId: whId,
                  },
                },
              });
              if (!hasScope) {
                throw new ForbiddenException(
                  `Access to warehouse ${whId} is not authorized for WH_KEEPER.`,
                );
              }
            } else if (
              userRole === Role.BRANCH_MGR ||
              userRole === Role.PROC_MGR ||
              userRole === Role.INV_MGR ||
              userRole === Role.STORE_MGR ||
              userRole === Role.PROC_OFFICER
            ) {
              const wh = await transaction.warehouse.findUnique({
                where: { id: whId },
                select: { branchId: true },
              });
              if (!wh) {
                throw new ForbiddenException('Warehouse not found.');
              }
              const hasBranchScope =
                await transaction.userBranchScope.findUnique({
                  where: {
                    userId_branchId: {
                      userId,
                      branchId: wh.branchId,
                    },
                  },
                });
              if (!hasBranchScope) {
                const hasScope =
                  await transaction.userWarehouseScope.findUnique({
                    where: {
                      userId_warehouseId: {
                        userId,
                        warehouseId: whId,
                      },
                    },
                  });
                if (!hasScope) {
                  throw new ForbiddenException(
                    `Access to warehouse ${whId} is not authorized.`,
                  );
                }
              }
            } else if (userRole === Role.KITCHEN_CHIEF) {
              const wh = await transaction.warehouse.findUnique({
                where: { id: whId },
                select: { branchId: true },
              });
              if (!wh) {
                throw new ForbiddenException('Warehouse not found.');
              }
              const deptScopes = await transaction.userDepartmentScope.findMany(
                {
                  where: { userId },
                  include: { department: true },
                },
              );
              const hasScopeInBranch = deptScopes.some(
                (ds) => ds.department.branchId === wh.branchId,
              );
              if (!hasScopeInBranch) {
                throw new ForbiddenException(
                  `Access to warehouse branch is not authorized for Kitchen Chief.`,
                );
              }
            }
          }
        }

        // Check warehouse operational locks
        await this.verifyWarehouseLocks(docType, action, doc);

        // Optimistic locking verification
        if (clientVersion !== undefined && doc.version !== clientVersion) {
          await this.concurrencyService.handleConflict(
            documentId,
            modelName,
            clientVersion,
            transaction,
          );
        }

        // Perform the status update
        const currentVersion = doc.version;
        const updateResult = await (
          transaction as unknown as Record<string, PrismaDynamicDelegate>
        )[modelName].updateMany({
          where: { id: documentId, version: currentVersion },
          data: {
            status: targetStatus,
            version: currentVersion + 1,
          },
        });

        if (updateResult.count === 0) {
          await this.concurrencyService.handleConflict(
            documentId,
            modelName,
            currentVersion,
            transaction,
          );
        }

        // Fetch updated document to return it
        const updatedDoc = await (
          transaction as unknown as Record<string, PrismaDynamicDelegate>
        )[modelName].findUnique({
          where: { id: documentId },
        });

        if (!updatedDoc) {
          throw new NotFoundException(
            `Document not found after update: ${modelName} with ID ${documentId}`,
          );
        }

        // Determine stepNumber for ApprovalEvent
        const stepNumber =
          (await transaction.approvalEvent.count({
            where: {
              documentId,
              documentType: this.mapToPrismaDocType(docType),
            },
          })) + 1;

        // Create ApprovalEvent
        const userCtx = getCurrentUserContext();
        const effectiveUserId = userId || userCtx?.id || 'SYSTEM';
        const effectiveUserRole = userRole || (userCtx?.role as Role) || Role.ADMIN;

        await transaction.approvalEvent.create({
          data: {
            documentId,
            documentType: this.mapToPrismaDocType(docType),
            fromStatus: doc.status,
            toStatus: targetStatus,
            actionPerformed: action,
            userId: effectiveUserId,
            userRole: effectiveUserRole,
            stepNumber,
            comments: comments || null,
          },
        });

        // Successful AuditLog inside the transaction
        await transaction.auditLog.create({
          data: {
            userId,
            action: `WORKFLOW_${action}_SUCCESS`,
            targetTable,
            targetId: documentId,
            beforeStateJson: JSON.stringify({
              status: doc.status,
              version: doc.version,
            }),
            afterStateJson: JSON.stringify({
              status: targetStatus,
              version: currentVersion + 1,
            }),
            ipAddress: ipAddress || null,
          },
        });

        // Dispatch notifications for key status changes
        if (docType === 'pr' && targetStatus === 'SUBMITTED') {
          await transaction.notificationLog.create({
            data: {
              targetRole: 'APPROVER',
              warehouseId: updatedDoc.warehouseId,
              message: `Purchase Request ${updatedDoc.requestNumber} is awaiting approval.`,
              documentType: 'PURCHASE_REQUEST',
              documentId: updatedDoc.id,
            },
          });
          await this.outboxService.writeEvent(transaction, 'PR_SUBMITTED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.requestNumber,
            warehouseId: updatedDoc.warehouseId,
          });
        } else if (
          docType === 'pr' &&
          targetStatus === 'APPROVED' &&
          action === 'APPROVE'
        ) {
          await transaction.notificationLog.create({
            data: {
              targetRole: 'PROC_OFFICER',
              warehouseId: updatedDoc.warehouseId,
              message: `Purchase Request ${updatedDoc.requestNumber} has been approved.`,
              documentType: 'PURCHASE_REQUEST',
              documentId: updatedDoc.id,
            },
          });
          const warehouse =
            updatedDoc.warehouseId &&
            transaction.warehouse &&
            typeof transaction.warehouse.findUnique === 'function'
              ? await transaction.warehouse.findUnique({
                  where: { id: updatedDoc.warehouseId },
                  select: { name: true },
                })
              : null;
          const user =
            transaction.user &&
            typeof transaction.user.findUnique === 'function'
              ? await transaction.user.findUnique({
                  where: { id: userId },
                  select: { name: true },
                })
              : null;
          await this.outboxService.writeEvent(transaction, 'PR_APPROVED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.requestNumber,
            warehouseId: updatedDoc.warehouseId,
            warehouseName: warehouse?.name || 'N/A',
            userName: user?.name || 'N/A',
            createdById: updatedDoc.createdById,
          });
        } else if (docType === 'pr' && targetStatus === 'REJECTED') {
          const warehouse =
            updatedDoc.warehouseId &&
            transaction.warehouse &&
            typeof transaction.warehouse.findUnique === 'function'
              ? await transaction.warehouse.findUnique({
                  where: { id: updatedDoc.warehouseId },
                  select: { name: true },
                })
              : null;
          const user =
            transaction.user &&
            typeof transaction.user.findUnique === 'function'
              ? await transaction.user.findUnique({
                  where: { id: userId },
                  select: { name: true },
                })
              : null;
          await this.outboxService.writeEvent(transaction, 'PR_REJECTED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.requestNumber,
            warehouseId: updatedDoc.warehouseId,
            warehouseName: warehouse?.name || 'N/A',
            userName: user?.name || 'N/A',
            createdById: updatedDoc.createdById,
          });
        } else if (docType === 'transfer' && targetStatus === 'IN_TRANSIT') {
          await transaction.notificationLog.create({
            data: {
              targetRole: 'WH_KEEPER',
              warehouseId: updatedDoc.toWarehouseId,
              message: `Transfer ${updatedDoc.transferNumber} has been shipped and is in transit.`,
              documentType: 'TRANSFER',
              documentId: updatedDoc.id,
            },
          });
          await this.outboxService.writeEvent(transaction, 'TRANSFER_SHIPPED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.transferNumber,
            warehouseId: updatedDoc.toWarehouseId,
          });
        }

        // New Outbox Notification triggers:
        if (docType === 'grn' && targetStatus === 'POSTED') {
          await this.outboxService.writeEvent(transaction, 'GRN_POSTED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.grnNumber,
            warehouseId: updatedDoc.warehouseId,
          });
          const po =
            transaction.purchaseOrder &&
            typeof transaction.purchaseOrder.findUnique === 'function'
              ? await transaction.purchaseOrder.findUnique({
                  where: { id: updatedDoc.poId },
                  include: { supplier: true },
                })
              : null;
          if (po?.supplier?.contactEmail) {
            await this.outboxService.writeEvent(
              transaction,
              'SUPPLIER_GRN_NOTIFIED',
              {
                id: updatedDoc.id,
                documentNumber: updatedDoc.grnNumber,
                supplierId: po.supplier.id,
                supplierEmail: po.supplier.contactEmail,
              },
            );
          }
        } else if (
          docType === 'po' &&
          (targetStatus === 'SUBMITTED' || targetStatus === 'PENDING_APPROVAL')
        ) {
          const poWhId = (updatedDoc.warehouseId as string | null) || ((updatedDoc as Record<string, unknown>).purchaseRequest as Record<string, unknown> | null)?.warehouseId as string | null || null;
          await this.outboxService.writeEvent(transaction, 'PO_SUBMITTED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.poNumber,
            supplierId: updatedDoc.supplierId,
            warehouseId: poWhId,
          });
        } else if (docType === 'po' && targetStatus === 'APPROVED') {
          const supplier =
            transaction.supplier &&
            typeof transaction.supplier.findUnique === 'function'
              ? await transaction.supplier.findUnique({
                  where: { id: updatedDoc.supplierId },
                })
              : null;
          if (supplier?.contactEmail) {
            await this.outboxService.writeEvent(
              transaction,
              'SUPPLIER_PO_NOTIFIED',
              {
                id: updatedDoc.id,
                documentNumber: updatedDoc.poNumber,
                supplierId: supplier.id,
                supplierEmail: supplier.contactEmail,
              },
            );
          }

          const user =
            transaction.user &&
            typeof transaction.user.findUnique === 'function'
              ? await transaction.user.findUnique({
                  where: { id: userId },
                  select: { name: true },
                })
              : null;
          const po =
            transaction.purchaseOrder &&
            typeof transaction.purchaseOrder.findUnique === 'function'
              ? await transaction.purchaseOrder.findUnique({
                  where: { id: updatedDoc.id },
                  include: {
                    purchaseRequest: { include: { warehouse: true } },
                  },
                })
              : null;
          const warehouseName = po?.purchaseRequest?.warehouse?.name || 'N/A';

          await this.outboxService.writeEvent(transaction, 'PO_APPROVED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.poNumber,
            warehouseId: po?.purchaseRequest?.warehouseId || undefined,
            warehouseName,
            userName: user?.name || 'N/A',
          });
        } else if (docType === 'adjustment' && targetStatus === 'POSTED') {
          await this.outboxService.writeEvent(
            transaction,
            'ADJUSTMENT_POSTED',
            {
              id: updatedDoc.id,
              documentNumber: updatedDoc.adjustmentNumber,
              warehouseId: updatedDoc.warehouseId,
            },
          );
        } else if (
          docType === 'kitchen_request' &&
          targetStatus === 'SUBMITTED'
        ) {
          await transaction.notificationLog.create({
            data: {
              targetRole: 'WH_KEEPER',
              warehouseId: updatedDoc.warehouseId,
              message: `Kitchen Request ${updatedDoc.requestNumber} is awaiting fulfillment.`,
              documentType: 'KITCHEN_REQUEST',
              documentId: updatedDoc.id,
            },
          });
          await this.outboxService.writeEvent(
            transaction,
            'KITCHEN_REQUEST_SUBMITTED',
            {
              id: updatedDoc.id,
              documentNumber: updatedDoc.requestNumber,
              warehouseId: updatedDoc.warehouseId,
            },
          );
        } else if (
          docType === 'kitchen_request' &&
          targetStatus === 'FULFILLED'
        ) {
          await transaction.notificationLog.create({
            data: {
              targetRole: 'KITCHEN_CHIEF',
              warehouseId: updatedDoc.warehouseId,
              message: `Kitchen Request ${updatedDoc.requestNumber} has been fulfilled.`,
              documentType: 'KITCHEN_REQUEST',
              documentId: updatedDoc.id,
            },
          });
          await this.outboxService.writeEvent(
            transaction,
            'KITCHEN_REQUEST_POSTED',
            {
              id: updatedDoc.id,
              documentNumber: updatedDoc.requestNumber,
              warehouseId: updatedDoc.warehouseId,
              requestedById: updatedDoc.requestedById,
            },
          );
          this.metricsService.postingOperationsCounter.inc({
            document_type: 'KITCHEN_REQUEST',
          });
        } else if (docType === 'stocktake' && targetStatus === 'STARTED') {
          await this.outboxService.writeEvent(
            transaction,
            'STOCKTAKE_STARTED',
            {
              id: updatedDoc.id,
              documentNumber: updatedDoc.sessionNumber,
              warehouseId: updatedDoc.warehouseId,
            },
          );
        } else if (docType === 'stocktake' && targetStatus === 'POSTED') {
          await this.outboxService.writeEvent(transaction, 'STOCKTAKE_POSTED', {
            id: updatedDoc.id,
            documentNumber: updatedDoc.sessionNumber,
            warehouseId: updatedDoc.warehouseId,
          });
        }

        return updatedDoc;
      };

      if (tx) {
        return await execute(tx);
      }
      return await this.prisma.$transaction(execute, { timeout: 30000 });
    } catch (error) {
      // Failed transition logging outside the transaction
      const errorMsg = error instanceof Error ? error.message : String(error);
      const docState = fetchedDoc as DynamicDocument | null;
      const beforeState = docState
        ? {
            status: docState.status,
            version: docState.version,
          }
        : undefined;
      await this.writeAuditLog(
        userId,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        beforeState,
        { error: errorMsg, userRole },
        ipAddress,
      );
      throw error;
    }
  }
}

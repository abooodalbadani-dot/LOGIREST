/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConcurrencyService } from '../../services/concurrency.service';
import { DocumentType as PrismaDocType } from '@prisma/client';
import {
  DocumentType,
  DocumentStatus,
  DocumentAction,
  Role,
  getNextStatusV2,
  canPerformActionV2,
} from '@logirest/shared-types';

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
    document: any,
  ): Promise<void> {
    const normalizedType = docType.toLowerCase();
    let isMutating = false;

    if (normalizedType === 'grn' && action === 'POST') isMutating = true;
    if (normalizedType === 'issue' && action === 'POST') isMutating = true;
    if (normalizedType === 'adjustment' && action === 'POST') isMutating = true;
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
    beforeState: any,
    afterState: any,
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
  ): Promise<any> {
    const docType = this.mapModelToDocType(modelName);
    const targetTable = MODEL_TO_TABLE[modelName] || modelName;

    const existingDoc = await this.prisma[modelName].findUnique({
      where: { id: documentId },
    });

    if (!existingDoc) {
      throw new NotFoundException(
        `Document not found: ${modelName} with ID ${documentId}`,
      );
    }

    // Role Validation Check
    const hasRolePermission = canPerformActionV2(
      docType,
      existingDoc.status as DocumentStatus,
      action,
      userRole,
    );
    if (!hasRolePermission) {
      const errorMsg = `User with role ${userRole} is not authorized to perform action ${action} on ${docType} in status ${existingDoc.status}`;
      await this.writeAuditLog(
        userId,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        { status: existingDoc.status, version: existingDoc.version },
        { error: errorMsg, userRole },
        ipAddress,
      );
      throw new ForbiddenException(errorMsg);
    }

    // Transition Status check
    const targetStatus = getNextStatusV2(
      docType,
      existingDoc.status as DocumentStatus,
      action,
    );
    if (!targetStatus) {
      const errorMsg = `Invalid status transition: Action ${action} is not allowed on ${docType} in status ${existingDoc.status}`;
      await this.writeAuditLog(
        userId,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        { status: existingDoc.status, version: existingDoc.version },
        { error: errorMsg },
        ipAddress,
      );
      throw new BadRequestException(errorMsg);
    }

    // Check warehouse operational locks
    await this.verifyWarehouseLocks(docType, action, existingDoc);

    // Run update in transaction
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const doc = await tx[modelName].findUnique({
            where: { id: documentId },
            select: { status: true, version: true },
          });

          if (!doc) {
            throw new NotFoundException(
              `Document not found: ${modelName} with ID ${documentId}`,
            );
          }

          // Optimistic locking verification
          if (clientVersion !== undefined && doc.version !== clientVersion) {
            await this.concurrencyService.handleConflict(
              documentId,
              modelName,
              clientVersion,
              tx,
            );
          }

          // Perform the status update
          const currentVersion = doc.version;
          const updateResult = await tx[modelName].updateMany({
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
              tx,
            );
          }

          // Fetch updated document to return it
          const updatedDoc = await tx[modelName].findUnique({
            where: { id: documentId },
          });

          // Determine stepNumber for ApprovalEvent
          const stepNumber =
            (await tx.approvalEvent.count({
              where: {
                documentId,
                documentType: this.mapToPrismaDocType(docType),
              },
            })) + 1;

          // Create ApprovalEvent
          await tx.approvalEvent.create({
            data: {
              documentId,
              documentType: this.mapToPrismaDocType(docType),
              fromStatus: doc.status,
              toStatus: targetStatus,
              actionPerformed: action,
              userId,
              userRole: userRole as any,
              stepNumber,
              comments: comments || null,
            },
          });

          // Successful AuditLog inside the transaction
          await tx.auditLog.create({
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

          return updatedDoc;
        },
        {
          timeout: 20000,
        },
      );
    } catch (error) {
      // Failed transition logging outside the transaction
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.writeAuditLog(
        userId,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        { status: existingDoc.status, version: existingDoc.version },
        { error: errorMsg },
        ipAddress,
      );
      throw error;
    }
  }
}

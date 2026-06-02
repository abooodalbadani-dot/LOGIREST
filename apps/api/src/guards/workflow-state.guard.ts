import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import {
  WorkflowService,
  MODEL_TO_TABLE,
} from '../modules/workflow/workflow.service';
import {
  WORKFLOW_ACTION_KEY,
  WorkflowActionMetadata,
} from '../decorators/workflow-action.decorator';
import { DocumentStatus, Role } from '@logirest/shared-types';
import { ScopeValidationService } from '../auth/scope-validation.service';

@Injectable()
export class WorkflowStateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<WorkflowActionMetadata>(
      WORKFLOW_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ipAddress =
      request.ip ||
      (request.headers && request.headers['x-forwarded-for']) ||
      null;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    const idParamName = metadata.idParam || 'id';
    const documentId = request.params[idParamName];

    if (!documentId) {
      throw new BadRequestException(`Missing route parameter: ${idParamName}`);
    }

    const modelName = metadata.modelName;
    const targetTable = MODEL_TO_TABLE[modelName] || modelName;

    // Load document from DB
    const includeConfig =
      modelName === 'purchaseOrder'
        ? { purchaseRequest: { select: { warehouseId: true } } }
        : undefined;
    const existingDoc = await (this.prisma[modelName] as any).findUnique({
      where: { id: documentId },
      include: includeConfig,
    });

    if (!existingDoc) {
      throw new NotFoundException(
        `Document not found: ${modelName} with ID ${documentId}`,
      );
    }

    const docStatus = existingDoc.status as DocumentStatus;
    const action = metadata.action;
    const docType = metadata.docType;

    // Warehouse Scope Validation
    let warehouseId: string | undefined;

    if (
      modelName === 'purchaseRequest' ||
      modelName === 'goodsReceivedNote' ||
      modelName === 'inventoryIssue' ||
      modelName === 'kitchenRequest' ||
      modelName === 'adjustment'
    ) {
      warehouseId = existingDoc.warehouseId;
    } else if (modelName === 'purchaseOrder') {
      warehouseId = existingDoc.purchaseRequest?.warehouseId;
    } else if (modelName === 'transfer') {
      if (action === 'SHIP' || action === 'CANCEL') {
        warehouseId = existingDoc.fromWarehouseId;
      } else if (action === 'RECEIVE' || action === 'POST') {
        warehouseId = existingDoc.toWarehouseId;
      }
    }

    if (warehouseId) {
      try {
        await this.scopeValidationService.validateWarehouse(
          user.id,
          user.role as Role,
          warehouseId,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await this.workflowService.writeAuditLog(
          user.id,
          `WORKFLOW_${action}_FAILED`,
          targetTable,
          documentId,
          { status: docStatus, version: existingDoc.version },
          { error: errorMsg },
          ipAddress,
        );
        throw error;
      }
    }
    // 1. Role Capability Check
    const hasRolePermission = this.workflowService.verifyRolePermission(
      docType,
      docStatus,
      action,
      user.role as Role,
    );

    if (!hasRolePermission) {
      const errorMsg = `User with role ${user.role} is not authorized to perform action ${action} on ${docType} in status ${docStatus}`;
      await this.workflowService.writeAuditLog(
        user.id,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        { status: docStatus, version: existingDoc.version },
        { error: errorMsg, userRole: user.role },
        ipAddress,
      );
      throw new ForbiddenException(errorMsg);
    }

    // 2. Status Transition Check
    const targetStatus = this.workflowService.getNextStatus(
      docType,
      docStatus,
      action,
    );

    if (!targetStatus) {
      const errorMsg = `Invalid status transition: Action ${action} is not allowed on ${docType} in status ${docStatus}`;
      await this.workflowService.writeAuditLog(
        user.id,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        { status: docStatus, version: existingDoc.version },
        { error: errorMsg },
        ipAddress,
      );
      throw new BadRequestException(errorMsg);
    }

    // 3. Warehouse Operational Lock Check
    try {
      await this.workflowService.verifyWarehouseLocks(
        docType,
        action,
        existingDoc,
      );
    } catch (error) {
      // Log the warehouse lock failure
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.workflowService.writeAuditLog(
        user.id,
        `WORKFLOW_${action}_FAILED`,
        targetTable,
        documentId,
        { status: docStatus, version: existingDoc.version },
        { error: errorMsg },
        ipAddress,
      );
      throw error;
    }

    // Save workflow context to the request
    request.workflowContext = {
      document: existingDoc,
      targetStatus,
      docType,
      action,
    };

    return true;
  }
}

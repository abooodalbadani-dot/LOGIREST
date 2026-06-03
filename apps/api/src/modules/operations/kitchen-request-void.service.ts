import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IssueVoidService } from './issue-void.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Role, DocumentType, Prisma } from '@prisma/client';

@Injectable()
export class KitchenRequestVoidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly issueVoidService: IssueVoidService,
    private readonly lockService: LedgerLockService,
  ) {}

  async void(
    kitchenRequestId: string,
    userId: string,
    userRole: Role,
    clientVersion?: number,
    ipAddress?: string,
  ): Promise<unknown> {
    if (userRole !== Role.ADMIN && userRole !== Role.INV_MGR) {
      throw new ForbiddenException(
        'Only System Administrators or Inventory Managers can void documents',
      );
    }
    return this.prisma.$transaction(
      async (tx) => {
        // Lock the document first using SELECT FOR UPDATE
        const lockedDoc = await this.lockService.lockDocument(
          tx,
          kitchenRequestId,
          DocumentType.KITCHEN_REQUEST,
        );
        if (!lockedDoc) {
          throw new NotFoundException(
            `KitchenRequest with ID ${kitchenRequestId} not found`,
          );
        }

        if (lockedDoc.status !== 'FULFILLED') {
          throw new BadRequestException(
            'KitchenRequest must be in FULFILLED status to be voided',
          );
        }

        if (clientVersion !== undefined && lockedDoc.version !== clientVersion) {
          throw new BadRequestException('Version conflict detected');
        }

        const request = await tx.kitchenRequest.findUnique({
          where: { id: kitchenRequestId },
          include: {
            items: {
              include: {
                item: true,
              },
            },
            inventoryIssue: true,
          },
        });

        if (!request) {
          throw new NotFoundException(
            `KitchenRequest with ID ${kitchenRequestId} not found`,
          );
        }

        // Check if any item is frozen/locked in the warehouse
        for (const reqItem of request.items) {
          const whItemCheck = await tx.warehouseItem.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: request.warehouseId,
                itemId: reqItem.itemId,
              },
            },
          });
          if (whItemCheck?.isFrozen) {
            throw new BadRequestException(
              `Cannot void kitchen request: Item ${reqItem.item?.sku || reqItem.itemId} is frozen/locked in warehouse`,
            );
          }
        }

        // If linked to an InventoryIssue, reverse stock within the same transaction
        if (request.inventoryIssue) {
          await this.issueVoidService.void(
            request.inventoryIssue.id,
            userId,
            userRole,
            request.inventoryIssue.version,
            ipAddress,
            tx,
          );
        }

        const updatedRequest = await tx.kitchenRequest.update({
          where: { id: kitchenRequestId },
          data: { status: 'VOIDED', version: lockedDoc.version + 1 },
        });

        const stepNumber =
          (await tx.approvalEvent.count({
            where: {
              documentId: request.id,
              documentType: DocumentType.KITCHEN_REQUEST,
            },
          })) + 1;

        await tx.approvalEvent.create({
          data: {
            documentId: request.id,
            documentType: DocumentType.KITCHEN_REQUEST,
            fromStatus: 'FULFILLED',
            toStatus: 'VOIDED',
            actionPerformed: 'VOID',
            userId,
            userRole,
            stepNumber,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'WORKFLOW_VOID_SUCCESS',
            targetTable: 'kitchen_requests',
            targetId: request.id,
            beforeStateJson: JSON.stringify({
              status: lockedDoc.status,
              version: lockedDoc.version,
            }),
            afterStateJson: JSON.stringify({
              status: 'VOIDED',
              version: lockedDoc.version + 1,
            }),
            ipAddress: ipAddress || null,
          },
        });

        return updatedRequest;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}

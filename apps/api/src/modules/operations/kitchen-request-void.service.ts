import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, DocumentType } from '@prisma/client';

@Injectable()
export class KitchenRequestVoidService {
  constructor(private readonly prisma: PrismaService) {}

  async void(
    kitchenRequestId: string,
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
      const request = await tx.kitchenRequest.findUnique({
        where: { id: kitchenRequestId },
      });

      if (!request) {
        throw new NotFoundException(
          `KitchenRequest with ID ${kitchenRequestId} not found`,
        );
      }

      if (request.status !== 'FULFILLED') {
        throw new BadRequestException(
          'KitchenRequest must be in FULFILLED status to be voided',
        );
      }

      if (clientVersion !== undefined && request.version !== clientVersion) {
        throw new BadRequestException('Version conflict detected');
      }

      const updatedRequest = await tx.kitchenRequest.update({
        where: { id: kitchenRequestId },
        data: { status: 'VOIDED', version: request.version + 1 },
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
          userRole: userRole as any,
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
            status: request.status,
            version: request.version,
          }),
          afterStateJson: JSON.stringify({
            status: 'VOIDED',
            version: request.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedRequest;
    });
  }
}

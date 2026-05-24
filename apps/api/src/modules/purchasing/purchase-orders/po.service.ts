import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentSequenceService } from '../../sequencing/document-sequence.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
  ) {}

  async create(
    body: {
      supplierId: string;
      currencyId: string;
      prId?: string;
      lines: Array<{ itemId: string; quantity: number; unitPrice: number }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let branchId: string | undefined;
      if (body.prId) {
        const pr = await tx.purchaseRequest.findUnique({
          where: { id: body.prId },
          select: { branchId: true },
        });
        if (pr) {
          branchId = pr.branchId;
        }
      }

      if (!branchId) {
        const firstBranch = await tx.branch.findFirst({ select: { id: true } });
        if (!firstBranch) {
          throw new NotFoundException(
            'No active branch found to generate document sequence',
          );
        }
        branchId = firstBranch.id;
      }

      const poNumber = await this.documentSequenceService.generateNext(
        tx,
        DocumentType.PURCHASE_ORDER,
        branchId,
      );

      return tx.purchaseOrder.create({
        data: {
          poNumber,
          prId: body.prId || null,
          supplierId: body.supplierId,
          currencyId: body.currencyId,
          status: 'DRAFT',
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        include: {
          lines: true,
        },
      });
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async approve(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'APPROVE',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async reject(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'REJECT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

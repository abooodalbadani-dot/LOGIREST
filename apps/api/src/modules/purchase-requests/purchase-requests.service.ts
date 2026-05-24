import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentSequenceService } from '../sequencing/document-sequence.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
  ) {}

  async create(
    body: {
      branchId: string;
      warehouseId: string;
      lines: Array<{ itemId: string; quantity: number }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const requestNumber = await this.documentSequenceService.generateNext(
        tx,
        DocumentType.PURCHASE_REQUEST,
        body.branchId,
      );

      return tx.purchaseRequest.create({
        data: {
          requestNumber,
          branchId: body.branchId,
          warehouseId: body.warehouseId,
          createdById: userId,
          status: 'DRAFT',
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
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
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        lines: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Purchase Request with ID ${id} not found`);
    }

    return pr;
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseRequest',
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
      'purchaseRequest',
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
      'purchaseRequest',
      'REJECT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async convertToPo(
    id: string,
    userId: string,
    userRole: Role,
    body: {
      supplierId: string;
      currencyId: string;
      comments?: string;
      version?: number;
      lines?: Array<{ itemId: string; unitPrice: number }>;
      ipAddress?: string;
    },
  ) {
    // 1. Fetch the Purchase Request with its lines
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!pr) {
      throw new NotFoundException(`Purchase Request with ID ${id} not found`);
    }

    if (pr.status !== 'APPROVED') {
      throw new BadRequestException(
        `Only APPROVED Purchase Requests can be converted to Purchase Orders. (Current status: ${pr.status})`,
      );
    }

    // Check if a PO already exists referencing the given prId to prevent duplicate conversion
    const existingPo = await this.prisma.purchaseOrder.findFirst({
      where: { prId: id },
    });
    if (existingPo) {
      throw new ConflictException(
        `Purchase Request ${id} has already been converted to Purchase Order ${existingPo.poNumber}.`,
      );
    }

    // 2. Validate line pricing in body
    const priceMap = new Map<string, number>();
    if (body.lines) {
      for (const line of body.lines) {
        priceMap.set(line.itemId, line.unitPrice);
      }
    }

    // Ensure all PR items have a price provided, or default to 0
    for (const prLine of pr.lines) {
      if (!priceMap.has(prLine.itemId)) {
        throw new BadRequestException(
          `Unit price is missing for item ID: ${prLine.itemId}`,
        );
      }
    }

    // 3. Perform the workflow transition on the Purchase Request first
    // This logs the CONVERT_TO_PO approval event and audit log.
    await this.workflowService.executeTransition(
      id,
      'purchaseRequest',
      'CONVERT_TO_PO',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );

    // 4. Create the Purchase Order in DRAFT status referencing the PR ID
    return this.prisma.$transaction(async (tx) => {
      const poNumber = await this.documentSequenceService.generateNext(
        tx,
        DocumentType.PURCHASE_ORDER,
        pr.branchId,
      );

      try {
        return await tx.purchaseOrder.create({
          data: {
            poNumber,
            prId: id,
            supplierId: body.supplierId,
            currencyId: body.currencyId,
            status: 'DRAFT',
            lines: {
              create: pr.lines.map((prLine) => {
                const unitPrice = priceMap.get(prLine.itemId) || 0;
                return {
                  itemId: prLine.itemId,
                  quantity: prLine.quantity,
                  unitPrice: unitPrice,
                };
              }),
            },
          },
          include: {
            lines: true,
          },
        });
      } catch (error) {
        // Prisma unique constraint violation code is 'P2002'
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as any).code === 'P2002'
        ) {
          throw new ConflictException(
            `Purchase Request ${id} has already been converted to a Purchase Order.`,
          );
        }
        throw error;
      }
    });
  }
}

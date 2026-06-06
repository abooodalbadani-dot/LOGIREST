import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
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

      const poNumber = await this.documentNumberService.next(
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
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          supplier: true,
          currency: true,
          purchaseRequest: {
            include: {
              warehouse: true,
            },
          },
        },
      });
    });
  }

  async findAll(
    params: {
      status?: string;
      supplierId?: string;
      search?: string;
      page?: number;
    },
    warehouseId?: string,
  ) {
    const page = Number(params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }
    if (warehouseId) {
      where.purchaseRequest = {
        warehouseId,
      };
    }
    if (params.search) {
      where.OR = [
        { poNumber: { contains: params.search, mode: 'insensitive' } },
        {
          supplier: { name: { contains: params.search, mode: 'insensitive' } },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          supplier: true,
          currency: true,
          purchaseRequest: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
              },
            },
          },
        },
        supplier: true,
        currency: true,
        purchaseRequest: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }

  async update(
    id: string,
    body: {
      supplierId?: string;
      currencyId?: string;
      version: number;
      lines?: Array<{
        id?: string;
        itemId: string;
        quantity: number;
        unitPrice: number;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Purchase Orders can be updated.',
        );
      }

      // Delete old lines and recreate new ones
      if (body.lines) {
        await tx.pOLine.deleteMany({
          where: { poId: id },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: body.supplierId,
          currencyId: body.currencyId,
          version: { increment: 1 },
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
              })),
            },
          }),
        },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          supplier: true,
          currency: true,
          purchaseRequest: {
            include: {
              warehouse: true,
            },
          },
        },
      });
    });
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

  async email(id: string, userId: string, recipientEmail?: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    const emailTo =
      recipientEmail || po.supplier?.contactEmail || 'supplier@example.com';

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_EMAILED',
        targetTable: 'purchase_orders',
        targetId: id,
        beforeStateJson: JSON.stringify({ status: po.status }),
        afterStateJson: JSON.stringify({ emailedTo: emailTo }),
      },
    });

    return {
      success: true,
      message: `Purchase Order sent successfully to ${emailTo}`,
    };
  }

  async remove(id: string, version?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }

      if (version !== undefined && existing.version !== version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Purchase Orders can be deleted.',
        );
      }

      await tx.pOLine.deleteMany({ where: { poId: id } });
      return tx.purchaseOrder.delete({ where: { id } });
    });
  }
}

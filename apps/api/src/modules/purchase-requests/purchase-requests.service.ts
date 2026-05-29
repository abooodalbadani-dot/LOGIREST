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
    return this.prisma.$transaction(
      async (tx) => {
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
            lines: {
              include: {
                item: {
                  include: {
                    unitOfMeasure: true,
                  },
                },
              },
            },
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
      },
      { timeout: 30000 },
    );
  }

  async findAll(
    params: { status?: string; search?: string; page?: number },
    warehouseId?: string,
  ) {
    const page = Number(params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (params.search) {
      where.OR = [
        { requestNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
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
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
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

  async update(
    id: string,
    body: {
      version: number;
      lines?: Array<{ itemId: string; quantity: number }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Request with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT Purchase Requests can be updated.');
      }

      if (body.lines) {
        await tx.pRLine.deleteMany({
          where: { prId: id },
        });
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          version: { increment: 1 },
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
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
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    });
  }

  async remove(id: string, version?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Request with ID ${id} not found`);
      }

      if (version !== undefined && existing.version !== version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT Purchase Requests can be deleted.');
      }

      await tx.pRLine.deleteMany({ where: { prId: id } });
      return tx.purchaseRequest.delete({ where: { id } });
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

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseRequest',
      'CANCEL',
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

    const existingPo = await this.prisma.purchaseOrder.findFirst({
      where: { prId: id },
    });
    if (existingPo) {
      throw new ConflictException(
        `Purchase Request ${id} has already been converted to Purchase Order ${existingPo.poNumber}.`,
      );
    }

    const priceMap = new Map<string, number>();
    if (body.lines) {
      for (const line of body.lines) {
        priceMap.set(line.itemId, line.unitPrice);
      }
    }

    for (const prLine of pr.lines) {
      if (!priceMap.has(prLine.itemId)) {
        throw new BadRequestException(
          `Unit price is missing for item ID: ${prLine.itemId}`,
        );
      }
    }

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

    return this.prisma.$transaction(
      async (tx) => {
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
      },
      { timeout: 30000 },
    );
  }
}

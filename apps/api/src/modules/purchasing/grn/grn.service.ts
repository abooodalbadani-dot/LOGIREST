import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentSequenceService } from '../../sequencing/document-sequence.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class GrnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
  ) {}

  async create(
    body: {
      poId: string;
      warehouseId: string;
      notes?: string;
      lines: Array<{ itemId: string; lotId?: string | null; quantity: number; unitPrice: number }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find PO to get branchId
      const po = await tx.purchaseOrder.findUnique({
        where: { id: body.poId },
        include: {
          purchaseRequest: true,
        },
      });

      if (!po) {
        throw new NotFoundException(`Purchase Order with ID ${body.poId} not found`);
      }

      let branchId = po.purchaseRequest?.branchId;
      if (!branchId) {
        const wh = await tx.warehouse.findUnique({
          where: { id: body.warehouseId },
          select: { branchId: true },
        });
        branchId = wh?.branchId;
      }

      if (!branchId) {
        const firstBranch = await tx.branch.findFirst({ select: { id: true } });
        if (!firstBranch) {
          throw new NotFoundException('No active branch found to generate document sequence');
        }
        branchId = firstBranch.id;
      }

      const grnNumber = await this.documentSequenceService.generateNext(
        tx,
        DocumentType.GOODS_RECEIVED_NOTE,
        branchId,
      );

      return tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId: body.poId,
          warehouseId: body.warehouseId,
          status: 'DRAFT',
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              lotId: line.lotId || null,
              quantityReceived: line.quantity,
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
              lot: true,
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
              currency: true,
            },
          },
          warehouse: true,
        },
      });
    });
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
        { grnNumber: { contains: params.search, mode: 'insensitive' } },
        { purchaseOrder: { poNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.goodsReceivedNote.findMany({
        where,
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
              lot: true,
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
              currency: true,
            },
          },
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.goodsReceivedNote.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const grn = await this.prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
              },
            },
            lot: true,
          },
        },
        purchaseOrder: {
          include: {
            supplier: true,
            currency: true,
          },
        },
        warehouse: true,
      },
    });

    if (!grn) {
      throw new NotFoundException(`Goods Received Note with ID ${id} not found`);
    }

    return grn;
  }

  async update(
    id: string,
    body: {
      poId?: string;
      warehouseId?: string;
      version: number;
      lines?: Array<{ id?: string; itemId: string; lotId?: string | null; quantity: number; unitPrice: number }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.goodsReceivedNote.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Goods Received Note with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException('Concurrency conflict: The document was modified by another user.');
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT Goods Received Notes can be updated.');
      }

      if (body.lines) {
        await tx.gRNLine.deleteMany({
          where: { grnId: id },
        });
      }

      return tx.goodsReceivedNote.update({
        where: { id },
        data: {
          poId: body.poId,
          warehouseId: body.warehouseId,
          version: { increment: 1 },
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                lotId: line.lotId || null,
                quantityReceived: line.quantity,
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
              lot: true,
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
              currency: true,
            },
          },
          warehouse: true,
        },
      });
    });
  }

  async remove(id: string, version?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.goodsReceivedNote.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Goods Received Note with ID ${id} not found`);
      }

      if (version !== undefined && existing.version !== version) {
        throw new ConflictException('Concurrency conflict: The document was modified by another user.');
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT Goods Received Notes can be deleted.');
      }

      await tx.gRNLine.deleteMany({ where: { grnId: id } });
      return tx.goodsReceivedNote.delete({ where: { id } });
    });
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'goodsReceivedNote',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

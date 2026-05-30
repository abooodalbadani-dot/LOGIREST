import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import {
  AdjustmentDirection,
  AdjustmentReason,
  DocumentType,
} from '@prisma/client';
import { DocumentSequenceService } from '../../sequencing/document-sequence.service';

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
  ) {}

  async create(
    body: {
      warehouseId: string;
      lines: Array<{
        itemId: string;
        lotId?: string;
        quantity: number;
        direction: AdjustmentDirection;
        reason: AdjustmentReason;
        unitCost?: number;
      }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: body.warehouseId },
        select: { branchId: true },
      });
      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID ${body.warehouseId} not found`,
        );
      }

      const adjustmentNumber = await this.documentSequenceService.generateNext(
        tx,
        DocumentType.ADJUSTMENT,
        warehouse.branchId,
      );

      return tx.adjustment.create({
        data: {
          adjustmentNumber,
          warehouseId: body.warehouseId,
          status: 'DRAFT',
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              lotId: line.lotId || null,
              quantity: line.quantity,
              direction: line.direction,
              reason: line.reason,
              unitCost: line.unitCost || null,
            })),
          },
        },
        include: {
          lines: {
            include: {
              item: true,
              lot: true,
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
        { adjustmentNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.adjustment.findMany({
        where,
        include: {
          lines: {
            include: {
              item: true,
              lot: true,
            },
          },
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adjustment.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSummary(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const adjustments = await this.prisma.adjustment.findMany({
      where,
      include: {
        lines: true,
      },
    });

    const total = adjustments.length;
    const pending = adjustments.filter(
      (a) => a.status === 'DRAFT' || a.status === 'SUBMITTED',
    ).length;
    const criticalLosses = adjustments.filter((a) =>
      a.lines.some((l) => l.reason === 'DAMAGE' || l.reason === 'THEFT'),
    ).length;

    return {
      total,
      pending,
      critical_losses: criticalLosses,
    };
  }

  async findOne(id: string) {
    const adjustment = await this.prisma.adjustment.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: true,
            lot: true,
          },
        },
        warehouse: true,
      },
    });

    if (!adjustment) {
      throw new NotFoundException(
        `Inventory Adjustment with ID ${id} not found`,
      );
    }

    return adjustment;
  }

  async update(
    id: string,
    body: {
      version: number;
      warehouseId?: string;
      reason?: string;
      notes?: string;
      lines?: Array<{
        id?: string;
        itemId: string;
        qty: number;
        direction: 'INCREASE' | 'DECREASE';
        unitCost?: number | null;
        lotId?: string | null;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.adjustment.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Adjustment with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT Adjustments can be updated.');
      }

      if (body.lines) {
        await tx.adjustmentLine.deleteMany({
          where: { adjustmentId: id },
        });
      }

      return tx.adjustment.update({
        where: { id },
        data: {
          warehouseId: body.warehouseId,
          version: { increment: 1 },
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                lotId: line.lotId || null,
                quantity: line.qty,
                direction: line.direction === 'INCREASE' ? 'IN' : 'OUT',
                reason: (body.reason as any) || 'CORRECTION',
                unitCost: line.unitCost || null,
              })),
            },
          }),
        },
        include: {
          lines: {
            include: {
              item: true,
              lot: true,
            },
          },
          warehouse: true,
        },
      });
    });
  }

  async edit(
    id: string,
    userId: string,
    userRole: Role,
    body: { version: number; ipAddress?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.adjustment.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Adjustment with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      const updated = await tx.adjustment.update({
        where: { id },
        data: {
          status: 'DRAFT',
          version: { increment: 1 },
        },
        include: {
          lines: {
            include: {
              item: true,
              lot: true,
            },
          },
          warehouse: true,
        },
      });

      const stepNumber =
        (await tx.approvalEvent.count({
          where: {
            documentId: id,
            documentType: 'ADJUSTMENT',
          },
        })) + 1;

      await tx.approvalEvent.create({
        data: {
          documentId: id,
          documentType: 'ADJUSTMENT',
          fromStatus: existing.status,
          toStatus: 'DRAFT',
          actionPerformed: 'EDIT',
          userId,
          userRole: userRole as any,
          stepNumber,
          comments: 'Reset to Draft for editing',
        },
      });

      return updated;
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
      'adjustment',
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
      'adjustment',
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
      'adjustment',
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
      'adjustment',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

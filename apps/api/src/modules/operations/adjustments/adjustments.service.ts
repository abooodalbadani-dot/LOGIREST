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
  Prisma,
  AdjStatus,
} from '@prisma/client';
import { DocumentNumberService } from '../../sequencing/document-number.service';

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
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

      // Pre-creation stock sufficiency check for all OUT (decrease) lines and unit cost check for IN (increase)
      for (const line of body.lines) {
        if (line.direction === AdjustmentDirection.IN) {
          if (
            line.unitCost === undefined ||
            line.unitCost === null ||
            Number(line.unitCost) < 0
          ) {
            throw new BadRequestException(
              `Unit cost is required and must be greater than or equal to zero for manual Adjustment IN.`,
            );
          }
        }

        if (line.direction === AdjustmentDirection.OUT) {
          const whItem = await tx.warehouseItem.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: body.warehouseId,
                itemId: line.itemId,
              },
            },
            select: { qtyOnHand: true },
          });
          const available = Number(whItem?.qtyOnHand ?? 0);
          if (available < line.quantity) {
            throw new BadRequestException(
              `Insufficient stock for DECREASE adjustment: item ${line.itemId} ` +
                `has ${available} on hand, requested ${line.quantity}.`,
            );
          }
        }
      }

      const adjustmentNumber = await this.documentNumberService.next(
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
              unitCost: line.unitCost !== undefined && line.unitCost !== null ? line.unitCost : null,
            })),
          },
        },
        include: {
          lines: {
            include: {
              item: { include: { unitOfMeasure: true, category: true } },
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

    const where: Prisma.AdjustmentWhereInput = {};
    if (params.status) {
      where.status = params.status as AdjStatus;
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
              item: { include: { unitOfMeasure: true, category: true } },
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
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSummary(warehouseId?: string) {
    const where: Prisma.AdjustmentWhereInput = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const [total, pending, criticalLosses] = await Promise.all([
      this.prisma.adjustment.count({ where }),
      this.prisma.adjustment.count({
        where: {
          ...where,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      }),
      this.prisma.adjustment.count({
        where: {
          ...where,
          lines: {
            some: {
              reason: { in: [AdjustmentReason.DAMAGE, AdjustmentReason.THEFT] },
            },
          },
        },
      }),
    ]);

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
            item: { include: { unitOfMeasure: true, category: true } },
            lot: true,
          },
        },
        warehouse: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!adjustment) {
      throw new NotFoundException(
        `Inventory Adjustment with ID ${id} not found`,
      );
    }

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { ...adjustment, approvalEvents };
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
        for (const line of body.lines) {
          const isIncrease =
            line.direction === 'INCREASE' ||
            (line.direction as string) === 'IN';
          if (isIncrease) {
            if (
              line.unitCost === undefined ||
              line.unitCost === null ||
              Number(line.unitCost) < 0
            ) {
              throw new BadRequestException(
                `Unit cost is required and must be greater than or equal to zero for manual Adjustment IN.`,
              );
            }
          }
        }
        await tx.adjustmentLine.deleteMany({
          where: { adjustmentId: id },
        });
      }

      const reason =
        body.reason &&
        Object.values(AdjustmentReason).includes(
          body.reason as AdjustmentReason,
        )
          ? (body.reason as AdjustmentReason)
          : AdjustmentReason.CORRECTION;

      return tx.adjustment.update({
        where: { id },
        data: {
          warehouseId: body.warehouseId,
          version: { increment: 1 },
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => {
                const isIncrease =
                  line.direction === 'INCREASE' ||
                  (line.direction as string) === 'IN';
                return {
                  itemId: line.itemId,
                  lotId: line.lotId || null,
                  quantity: line.qty,
                  direction: isIncrease
                    ? AdjustmentDirection.IN
                    : AdjustmentDirection.OUT,
                  reason: reason,
                  unitCost: line.unitCost !== undefined && line.unitCost !== null ? line.unitCost : null,
                };
              }),
            },
          }),
        },
        include: {
          lines: {
            include: {
              item: { include: { unitOfMeasure: true, category: true } },
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
              item: { include: { unitOfMeasure: true, category: true } },
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
          userRole: userRole,
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

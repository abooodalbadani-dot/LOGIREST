import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { AdjustmentDirection, AdjustmentReason } from '@prisma/client';

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
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
    const adjustmentNumber = `ADJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.adjustment.create({
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
      },
    });
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentSequenceService } from '../../sequencing/document-sequence.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
  ) {}

  async create(
    body: {
      fromWarehouseId: string;
      toWarehouseId: string;
      lines: Array<{ itemId: string; quantityShipped: number }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: body.fromWarehouseId },
        select: { branchId: true },
      });
      if (!warehouse) {
        throw new NotFoundException(
          `Source warehouse with ID ${body.fromWarehouseId} not found`,
        );
      }

      const transferNumber = await this.documentSequenceService.generateNext(
        tx,
        DocumentType.TRANSFER,
        warehouse.branchId,
      );

      return tx.transfer.create({
        data: {
          transferNumber,
          fromWarehouseId: body.fromWarehouseId,
          toWarehouseId: body.toWarehouseId,
          status: 'DRAFT',
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              quantityShipped: line.quantityShipped,
            })),
          },
        },
        include: {
          lines: {
            include: {
              item: true,
            },
          },
        },
      });
    });
  }

  async findOne(id: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock Transfer with ID ${id} not found`);
    }

    return transfer;
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'transfer',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

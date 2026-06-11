import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
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

      const transferNumber = await this.documentNumberService.next(
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
    // Use AND to compose warehouse scope and search independently so neither overwrites the other
    if (warehouseId) {
      where.AND = [
        {
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId },
          ],
        },
      ];
    }
    if (params.search) {
      const searchCondition = {
        OR: [
          { transferNumber: { contains: params.search, mode: 'insensitive' } },
        ],
      };
      if (where.AND) {
        where.AND.push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        include: {
          lines: {
            include: {
              item: true,
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transfer.count({ where }),
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
    const where: any = {};
    if (warehouseId) {
      where.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId },
      ];
    }

    const transfers = await this.prisma.transfer.findMany({
      where,
    });

    const total = transfers.length;
    const pending = transfers.filter(
      (t) => t.status === 'DRAFT' || t.status === 'IN_TRANSIT',
    ).length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;

    return {
      total,
      pending,
      in_transit: inTransit,
      overdue_count: 0,
    };
  }

  async findOne(id: string) {
    const transfer = await this.prisma.transfer.findUnique({
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

  async postToLedger(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'transfer',
      'POST',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

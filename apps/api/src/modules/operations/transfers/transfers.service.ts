import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType, Prisma } from '@prisma/client';

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
      notes?: string;
      lines: Array<{ itemId: string; quantityShipped: number; notes?: string }>;
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
          notes: body.notes || null,
          status: 'DRAFT',
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              quantityShipped: line.quantityShipped,
              notes: line.notes || null,
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
    activeScope?: { branchId?: string; warehouseId?: string },
  ) {
    const page = Number(params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TransferWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    // Use AND to compose warehouse scope and search independently so neither overwrites the other
    where.AND = [];
    if (activeScope?.warehouseId) {
      where.AND.push({
        OR: [
          { fromWarehouseId: activeScope.warehouseId },
          { toWarehouseId: activeScope.warehouseId },
        ],
      });
    }
    if (activeScope?.branchId) {
      where.AND.push({
        OR: [
          { fromWarehouse: { branchId: activeScope.branchId } },
          { toWarehouse: { branchId: activeScope.branchId } },
        ],
      });
    }
    if (params.search) {
      const searchCondition: Prisma.TransferWhereInput = {
        OR: [
          {
            transferNumber: {
              contains: params.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            fromWarehouse: {
              name: {
                contains: params.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          {
            toWarehouse: {
              name: {
                contains: params.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          {
            lines: {
              some: {
                item: {
                  name: {
                    contains: params.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
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

    const transferIds = items.map((t) => t.id);
    const approvalEvents =
      transferIds.length > 0
        ? await this.prisma.approvalEvent.findMany({
            where: {
              documentId: { in: transferIds },
              documentType: DocumentType.TRANSFER,
            },
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const eventsByDocId = new Map<string, typeof approvalEvents>();
    for (const ev of approvalEvents) {
      if (!eventsByDocId.has(ev.documentId)) {
        eventsByDocId.set(ev.documentId, []);
      }
      const existing = eventsByDocId.get(ev.documentId);
      if (existing) {
        existing.push(ev);
      }
    }

    const itemsWithEvents = items.map((t) => ({
      ...t,
      approvalEvents: eventsByDocId.get(t.id) || [],
    }));

    return {
      data: itemsWithEvents,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSummary(warehouseId?: string) {
    const where: Prisma.TransferWhereInput = {};
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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const transfer = await this.prisma.transfer.findFirst({
      where: isUuid
        ? { OR: [{ id }, { transferNumber: id }] }
        : { transferNumber: id },
      include: {
        lines: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
                category: true,
                barcodeMappings: true,
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

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: { documentId: transfer.id, documentType: DocumentType.TRANSFER },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { ...transfer, approvalEvents };
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'transfer',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async postToLedger(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'transfer',
      'POST',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async dispute(
    id: string,
    userId: string,
    userRole: Role,
    body: {
      comments: string;
      version?: number;
      ipAddress?: string;
      disputedLines: Array<{ lineId: string; receivedQty: number }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!transfer) {
        throw new NotFoundException(`Transfer ${id} not found`);
      }

      for (const line of body.disputedLines) {
        await tx.transferLine.update({
          where: { id: line.lineId },
          data: {
            quantityReceived: line.receivedQty,
            varianceReason: body.comments,
          },
        });
      }

      await this.workflowService.executeTransition(
        id,
        'transfer',
        'DISPUTE',
        userId,
        userRole,
        body.comments,
        body.version,
        body.ipAddress,
        tx,
      );

      const updatedTransfer = await tx.transfer.findFirst({
        where: { id },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                  category: true,
                  barcodeMappings: true,
                },
              },
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
        },
      });

      if (!updatedTransfer) {
        throw new NotFoundException(
          `Transfer with ID ${id} not found after dispute`,
        );
      }

      return updatedTransfer;
    });
  }
}

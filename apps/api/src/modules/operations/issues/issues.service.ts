import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async create(
    body: {
      departmentId: string;
      lines: Array<{ itemId: string; quantity: number }>;
    },
    userId: string,
    activeWarehouseId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const warehouse = await tx.warehouse.findUnique({
          where: { id: activeWarehouseId },
          select: { branchId: true },
        });
        if (!warehouse) {
          throw new NotFoundException(
            `Warehouse with ID ${activeWarehouseId} not found`,
          );
        }

        // Pre-deduction stock sufficiency check (optimistic guard before DRAFT is persisted)
        for (const line of body.lines) {
          const whItem = await tx.warehouseItem.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: activeWarehouseId,
                itemId: line.itemId,
              },
            },
            select: { qtyOnHand: true, isFrozen: true },
          });
          if (whItem?.isFrozen) {
            throw new BadRequestException(
              `Cannot create issue: item ${line.itemId} is frozen in this warehouse.`,
            );
          }
          if (!whItem || Number(whItem.qtyOnHand) < line.quantity) {
            throw new BadRequestException(
              `Insufficient stock: requested quantity (${line.quantity}) exceeds available on hand for item ${line.itemId}.`,
            );
          }
        }

        const issueNumber = await this.documentNumberService.next(
          tx,
          DocumentType.INVENTORY_ISSUE,
          warehouse.branchId,
        );

        return tx.inventoryIssue.create({
          data: {
            issueNumber,
            warehouseId: activeWarehouseId,
            departmentId: body.departmentId,
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
                lotAllocations: {
                  include: {
                    lot: true,
                  },
                },
              },
            },
            warehouse: true,
            department: true,
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
        { issueNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryIssue.findMany({
        where,
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
              lotAllocations: {
                include: {
                  lot: true,
                },
              },
            },
          },
          warehouse: true,
          department: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryIssue.count({ where }),
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

  async findOne(id: string) {
    const issue = await this.prisma.inventoryIssue.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
              },
            },
            lotAllocations: {
              include: {
                lot: true,
              },
            },
          },
        },
        department: true,
        warehouse: true,
      },
    });

    if (!issue) {
      throw new NotFoundException(`Inventory Issue with ID ${id} not found`);
    }

    return issue;
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'inventoryIssue',
      'SUBMIT',
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
      'inventoryIssue',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

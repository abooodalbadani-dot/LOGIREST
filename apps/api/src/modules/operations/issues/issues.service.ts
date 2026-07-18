import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType, Prisma, Role, IssueStatus } from '@prisma/client';

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
      kitchenRequestId?: string;
      notes?: string;
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
            notes: body.notes,
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
              })),
            },
            kitchenRequest: body.kitchenRequestId
              ? { connect: { id: body.kitchenRequestId } }
              : undefined,
          },
          include: {
            lines: {
              include: {
                item: {
                  include: {
                    unitOfMeasure: true,
                    category: true,
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
            kitchenRequest: true,
          },
        });
      },
      { timeout: 30000 },
    );
  }

  async findAll(
    params: { status?: string; search?: string; page?: number },
    activeScope?: {
      branchId?: string;
      warehouseId?: string;
      departmentId?: string;
    },
    user?: { id: string; role: Role },
  ) {
    const page = Number(params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryIssueWhereInput = {};
    if (params.status) {
      where.status = params.status as IssueStatus;
    }

    const andConditions: Prisma.InventoryIssueWhereInput[] = [];

    if (user && user.role === Role.KITCHEN_CHIEF) {
      const authorizedDepts = await this.prisma.userDepartmentScope.findMany({
        where: { userId: user.id },
        select: { departmentId: true },
      });
      const deptIds = authorizedDepts.map((d) => d.departmentId);

      if (
        activeScope?.departmentId &&
        deptIds.includes(activeScope.departmentId)
      ) {
        andConditions.push({ departmentId: activeScope.departmentId });
      } else {
        andConditions.push({ departmentId: { in: deptIds } });
      }
    } else {
      if (activeScope?.warehouseId) {
        andConditions.push({ warehouseId: activeScope.warehouseId });
      }
      if (activeScope?.branchId) {
        andConditions.push({ warehouse: { branchId: activeScope.branchId } });
      }
      if (activeScope?.departmentId) {
        andConditions.push({ departmentId: activeScope.departmentId });
      }
    }
    if (params.search) {
      andConditions.push({
        issueNumber: { contains: params.search, mode: 'insensitive' },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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
                  category: true,
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

    const issueIds = items.map((i) => i.id);
    const approvalEvents =
      issueIds.length > 0
        ? await this.prisma.approvalEvent.findMany({
            where: {
              documentId: { in: issueIds },
              documentType: DocumentType.INVENTORY_ISSUE,
            },
            include: { user: { select: { name: true, role: true } } },
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

    const itemsWithEvents = items.map((i) => ({
      ...i,
      approvalEvents: eventsByDocId.get(i.id) || [],
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

  async findOne(id: string) {
    const issue = await this.prisma.inventoryIssue.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
                category: true,
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
        kitchenRequest: {
          select: { id: true, requestNumber: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException(`Inventory Issue with ID ${id} not found`);
    }

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { ...issue, approvalEvents };
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'inventoryIssue',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'inventoryIssue',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }
}

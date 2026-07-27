import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType, Prisma, Role, IssueStatus } from '@prisma/client';
import { toBaseQty } from '@logirest/shared-types';

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
      lines: Array<{
        itemId: string;
        quantity: number;
        uomId?: string;
        lotAllocations?: Array<{
          lotId?: string;
          lotNumber?: string;
          quantityAllocated: number;
        }>;
      }>;
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
          // Normalize quantity to base UOM before comparing with on-hand stock
          let normalizedQtyForCheck = line.quantity;
          if (line.uomId) {
            const itemForCheck = await tx.item.findUnique({
              where: { id: line.itemId },
              select: {
                uomId: true,
                uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
              },
            });
            if (itemForCheck) {
              const conversions = itemForCheck.uomConversions.map((c) => ({
                fromUomId: c.fromUomId,
                toUomId: c.toUomId,
                factor: Number(c.factor),
              }));
              normalizedQtyForCheck = toBaseQty(
                line.quantity,
                line.uomId,
                itemForCheck.uomId,
                conversions,
              );
            }
          }
          if (!whItem || Number(whItem.qtyOnHand) < normalizedQtyForCheck) {
            throw new BadRequestException(
              `Insufficient stock: requested quantity (${normalizedQtyForCheck} base units) exceeds available on hand for item ${line.itemId}.`,
            );
          }
        }

        const issueNumber = await this.documentNumberService.next(
          tx,
          DocumentType.INVENTORY_ISSUE,
          warehouse.branchId,
        );

        const linesToCreate = await Promise.all(
          body.lines.map(async (line) => {
            const allocationsToCreate: Array<{
              lotId: string;
              quantityAllocated: number;
            }> = [];

            if (line.lotAllocations && line.lotAllocations.length > 0) {
              for (const alloc of line.lotAllocations) {
                let lotId = alloc.lotId;
                if (!lotId && alloc.lotNumber) {
                  const lot = await tx.lot.findFirst({
                    where: {
                      itemId: line.itemId,
                      lotNumber: alloc.lotNumber,
                    },
                    select: { id: true, status: true },
                  });
                  if (lot) {
                    if (lot.status === 'QUARANTINE') {
                      throw new BadRequestException(`Cannot allocate quarantined lot: ${alloc.lotNumber}`);
                    }
                    lotId = lot.id;
                  }
                }
                if (lotId) {
                  allocationsToCreate.push({
                    lotId,
                    quantityAllocated: alloc.quantityAllocated,
                  });
                }
              }
            }

            return {
              itemId: line.itemId,
              quantity: line.quantity,
              uomId: line.uomId ?? null,
              ...(allocationsToCreate.length > 0 && {
                lotAllocations: {
                  create: allocationsToCreate,
                },
              }),
            };
          }),
        );

        return tx.inventoryIssue.create({
          data: {
            issueNumber,
            warehouseId: activeWarehouseId,
            departmentId: body.departmentId,
            status: 'DRAFT',
            notes: body.notes,
            lines: {
              create: linesToCreate,
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
    params: { status?: string; search?: string; page?: number; limit?: number },
    activeScope?: {
      branchId?: string;
      warehouseId?: string;
      departmentId?: string;
    },
    user?: { id: string; role: Role },
  ) {
    const page = Number(params.page) || 1;
    const limit = Math.min(Number(params.limit) || 20, 50);
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
        OR: [
          { issueNumber: { contains: params.search, mode: 'insensitive' } },
          { notes: { contains: params.search, mode: 'insensitive' } },
          { warehouse: { name: { contains: params.search, mode: 'insensitive' } } },
          { department: { name: { contains: params.search, mode: 'insensitive' } } },
          {
            lines: {
              some: {
                item: {
                  OR: [
                    { name: { contains: params.search, mode: 'insensitive' } },
                    { sku: { contains: params.search, mode: 'insensitive' } },
                    { barcodeMappings: { some: { barcode: { contains: params.search, mode: 'insensitive' } } } },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryIssue.findMany({
        where,
        select: {
          id: true,
          issueNumber: true,
          status: true,
          warehouseId: true,
          departmentId: true,
          notes: true,
          version: true,
          createdAt: true,
          postedAt: true,
          warehouse: { select: { id: true, name: true, branchId: true } },
          department: { select: { id: true, name: true } },
          kitchenRequest: { select: { id: true, requestNumber: true } },
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
            uom: true,
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

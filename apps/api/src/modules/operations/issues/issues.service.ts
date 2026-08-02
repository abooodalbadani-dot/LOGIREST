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
            const frozenItem = await tx.item.findUnique({
              where: { id: line.itemId },
              select: { name: true, sku: true },
            });
            const wh = await tx.warehouse.findUnique({
              where: { id: activeWarehouseId },
              select: { name: true },
            });
            const itemName = frozenItem?.name || frozenItem?.sku || line.itemId;
            const whName = wh?.name || activeWarehouseId;
            throw new BadRequestException(
              `Cannot create issue: item "${itemName}" is frozen due to an active stocktake in warehouse "${whName}".`,
            );
          }
          // Normalize quantity to base UOM before comparing with on-hand stock
          let normalizedQtyForCheck = line.quantity;
          const itemForCheck = await tx.item.findUnique({
            where: { id: line.itemId },
            select: {
              name: true,
              sku: true,
              uomId: true,
              uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
            },
          });
          if (itemForCheck && line.uomId && itemForCheck.uomId) {
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
          if (!whItem || Number(whItem.qtyOnHand) < normalizedQtyForCheck) {
            const itemLabel = itemForCheck ? `"${itemForCheck.name}" (${itemForCheck.sku})` : `ID ${line.itemId}`;
            throw new BadRequestException(
              `Insufficient stock: requested quantity (${normalizedQtyForCheck} base units) exceeds available on hand for item ${itemLabel}.`,
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

            let uomIdToSave = line.uomId;
            if (!uomIdToSave) {
              const itemRec = await tx.item.findUnique({
                where: { id: line.itemId },
                select: { uomId: true },
              });
              uomIdToSave = itemRec?.uomId || undefined;
            }

            return {
              itemId: line.itemId,
              quantity: line.quantity,
              uomId: uomIdToSave ?? null,
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
            createdById: userId,
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
                uom: true,
              },
            },
            warehouse: true,
            department: true,
            kitchenRequest: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });
      },
      { timeout: 30000 },
    );
  }

  async update(
    id: string,
    body: {
      departmentId?: string;
      destinationDeptId?: string;
      lines?: Array<{
        itemId: string;
        quantity?: number;
        requestedQty?: number;
        uomId?: string;
        lotAllocations?: Array<{
          lotId?: string;
          lotNumber?: string;
          quantityAllocated?: number;
          allocatedQty?: number;
        }>;
      }>;
      notes?: string;
      version?: number;
    },
    userId: string,
    activeWarehouseId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.inventoryIssue.findUnique({
          where: { id },
          include: { lines: true },
        });

        if (!existing) {
          throw new NotFoundException(`Inventory Issue with ID ${id} not found`);
        }

        if (existing.status !== 'DRAFT') {
          throw new BadRequestException(
            `Cannot update issue ${id}: only DRAFT issues can be updated (current status: ${existing.status}).`,
          );
        }

        if (body.version !== undefined && existing.version !== body.version) {
          throw new BadRequestException(
            `Concurrency error: document version mismatch. Expected ${existing.version}, received ${body.version}.`,
          );
        }

        const targetWarehouseId = activeWarehouseId || existing.warehouseId;
        const deptId = body.departmentId || body.destinationDeptId || existing.departmentId;

        let linesToCreate;
        if (body.lines && Array.isArray(body.lines) && body.lines.length > 0) {
          for (const line of body.lines) {
            const qtyVal = Number(line.requestedQty ?? line.quantity ?? 0);
            if (qtyVal <= 0) {
              throw new BadRequestException(`Quantity must be greater than 0 for item ${line.itemId}`);
            }

            const whItem = await tx.warehouseItem.findUnique({
              where: {
                warehouseId_itemId: {
                  warehouseId: targetWarehouseId,
                  itemId: line.itemId,
                },
              },
              select: { qtyOnHand: true, isFrozen: true },
            });

            if (whItem?.isFrozen) {
              const frozenItem = await tx.item.findUnique({
                where: { id: line.itemId },
                select: { name: true, sku: true },
              });
              const itemName = frozenItem?.name || frozenItem?.sku || line.itemId;
              throw new BadRequestException(
                `Cannot update issue: item "${itemName}" is frozen due to an active stocktake.`,
              );
            }

            let normalizedQtyForCheck = qtyVal;
            const itemForCheck = await tx.item.findUnique({
              where: { id: line.itemId },
              select: {
                name: true,
                sku: true,
                uomId: true,
                uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
              },
            });

            if (itemForCheck && line.uomId && itemForCheck.uomId) {
              const conversions = itemForCheck.uomConversions.map((c) => ({
                fromUomId: c.fromUomId,
                toUomId: c.toUomId,
                factor: Number(c.factor),
              }));
              normalizedQtyForCheck = toBaseQty(
                qtyVal,
                line.uomId,
                itemForCheck.uomId,
                conversions,
              );
            }

            if (!whItem || Number(whItem.qtyOnHand) < normalizedQtyForCheck) {
              const itemLabel = itemForCheck ? `"${itemForCheck.name}" (${itemForCheck.sku})` : `ID ${line.itemId}`;
              throw new BadRequestException(
                `Insufficient stock: requested quantity (${normalizedQtyForCheck} base units) exceeds available on hand for item ${itemLabel}.`,
              );
            }
          }

          linesToCreate = await Promise.all(
            body.lines.map(async (line) => {
              const qtyVal = Number(line.requestedQty ?? line.quantity ?? 0);
              const rawAllocations = line.lotAllocations || [];
              const allocationsToCreate: Array<{
                lotId: string;
                quantityAllocated: number;
              }> = [];

              for (const alloc of rawAllocations) {
                const quantityAllocated = Number(alloc.quantityAllocated ?? alloc.allocatedQty ?? 0);
                if (quantityAllocated > 0) {
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
                      quantityAllocated,
                    });
                  }
                }
              }

              let uomIdToSave = line.uomId;
              if (!uomIdToSave) {
                const itemRec = await tx.item.findUnique({
                  where: { id: line.itemId },
                  select: { uomId: true },
                });
                uomIdToSave = itemRec?.uomId || undefined;
              }

              return {
                itemId: line.itemId,
                quantity: qtyVal,
                uomId: uomIdToSave ?? null,
                ...(allocationsToCreate.length > 0 && {
                  lotAllocations: {
                    create: allocationsToCreate,
                  },
                }),
              };
            }),
          );

          await tx.inventoryIssueLine.deleteMany({
            where: { issueId: id },
          });
        }

        const updated = await tx.inventoryIssue.update({
          where: { id },
          data: {
            departmentId: deptId,
            notes: body.notes !== undefined ? body.notes : existing.notes,
            version: { increment: 1 },
            ...(linesToCreate && {
              lines: {
                create: linesToCreate,
              },
            }),
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
                uom: true,
              },
            },
            warehouse: true,
            department: true,
            kitchenRequest: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        return updated;
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
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException(`Inventory Issue with ID ${id} not found`);
    }

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
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

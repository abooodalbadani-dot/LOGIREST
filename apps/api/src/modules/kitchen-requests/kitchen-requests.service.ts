import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { UpdateKitchenRequestDto } from '@logirest/shared-types';
import { DocumentNumberService } from '../sequencing/document-number.service';
import { IssuePostService } from '../operations/issue-post.service';
import { DocumentType, Prisma, Role } from '@prisma/client';

@Injectable()
export class KitchenRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
    private readonly issuePostService: IssuePostService,
  ) {}

  async create(
    body: {
      departmentId: string;
      warehouseId: string;
      notes?: string;
      items: Array<{
        itemId: string;
        quantityRequested: number;
        uomId?: string;
        notes?: string;
      }>;
    },
    userId: string,
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: body.warehouseId },
        select: { branchId: true },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID ${body.warehouseId} not found`,
        );
      }

      const requestNumber = await this.documentNumberService.next(
        tx,
        'KITCHEN_REQUEST',
        warehouse.branchId,
      );

      return tx.kitchenRequest.create({
        data: {
          requestNumber,
          departmentId: body.departmentId,
          warehouseId: body.warehouseId,
          notes: body.notes || null,
          status: 'DRAFT',
          requestedById: userId,
          items: {
            create: body.items.map((item) => ({
              itemId: item.itemId,
              quantityRequested: item.quantityRequested,
              quantityFulfilled: 0,
              uomId: item.uomId || null,
              notes: item.notes || null,
            })),
          },
        },
        include: {
          items: {
            include: {
              uom: true,
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          department: true,
          warehouse: true,
          requestedBy: true,
        },
      });
    };

    const maxAttempts = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await this.prisma.$transaction(execute, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30000,
        });
      } catch (error: unknown) {
        const isKnownError =
          error instanceof Prisma.PrismaClientKnownRequestError;
        const isSerializationError =
          (isKnownError && error.code === 'P2034') ||
          (error instanceof Error &&
            (error.message.includes('40001') ||
              error.message.includes('40P01') ||
              error.message.includes('serialization') ||
              error.message.includes('deadlock')));
        if (isSerializationError && attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
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

    const where: Prisma.KitchenRequestWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }

    const andConditions: Prisma.KitchenRequestWhereInput[] = [];

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
          { requestNumber: { contains: params.search, mode: 'insensitive' } },
          { notes: { contains: params.search, mode: 'insensitive' } },
          { warehouse: { name: { contains: params.search, mode: 'insensitive' } } },
          { department: { name: { contains: params.search, mode: 'insensitive' } } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.kitchenRequest.findMany({
        where,
        select: {
          id: true,
          requestNumber: true,
          departmentId: true,
          warehouseId: true,
          status: true,
          notes: true,
          createdAt: true,
          version: true,
          issueId: true,
          department: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.kitchenRequest.count({ where }),
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
    const request = await this.prisma.kitchenRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            uom: true,
            item: {
              include: {
                unitOfMeasure: true,
              },
            },
          },
        },
        department: true,
        warehouse: true,
        requestedBy: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Kitchen Request with ID ${id} not found`);
    }

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: {
        documentId: request.id,
        documentType: DocumentType.KITCHEN_REQUEST,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { ...request, approvalEvents };
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'kitchenRequest',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async fulfill(
    id: string,
    userId: string,
    userRole: Role,
    body: {
      comments?: string;
      version?: number;
      ipAddress?: string;
      fulfillments?: Array<{ itemId: string; fulfilledQty: number }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const kr = await tx.kitchenRequest.findUnique({
        where: { id },
        include: { items: { include: { item: { select: { name: true, sku: true } } } } },
      });

      if (!kr) {
        throw new NotFoundException(`KitchenRequest with ID ${id} not found`);
      }

      if (kr.status !== 'SUBMITTED') {
        throw new BadRequestException(
          `KitchenRequest must be in SUBMITTED status to be fulfilled. (Current: ${kr.status})`,
        );
      }

      // Pre-fulfillment stock sufficiency check — runs before any state changes
      const linesToCheck = body.fulfillments
        ? body.fulfillments.map((f) => ({
            itemId: f.itemId,
            fulfilledQty: f.fulfilledQty,
          }))
        : kr.items.map((i) => ({
            itemId: i.itemId,
            fulfilledQty: Number(i.quantityRequested),
          }));

      const itemIds = linesToCheck.map((l) => l.itemId);
      const whItems = await tx.warehouseItem.findMany({
        where: {
          warehouseId: kr.warehouseId,
          itemId: { in: itemIds },
        },
      });

      const whItemMap = new Map(
        whItems.map((wi) => [
          wi.itemId,
          Number(wi.qtyOnHand) - Number(wi.qtyAllocated),
        ]),
      );

      for (const lineInput of linesToCheck) {
        const available = whItemMap.get(lineInput.itemId) ?? 0;
        if (available < lineInput.fulfilledQty) {
          const dbItem = kr.items.find((i) => i.itemId === lineInput.itemId);
          const itemLabel = dbItem?.item ? `"${dbItem.item.name}" (${dbItem.item.sku})` : `ID ${lineInput.itemId}`;
          throw new BadRequestException(
            `Insufficient stock: cannot fulfill item ${itemLabel}. ` +
              `Requested: ${lineInput.fulfilledQty}, Available (net of allocations): ${available}.`,
          );
        }
      }

      const linesData: Array<{ itemId: string; quantity: number; uomId?: string | null }> = [];

      if (body.fulfillments) {
        for (const itemInput of body.fulfillments) {
          const dbItem = kr.items.find((i) => i.itemId === itemInput.itemId);
          if (!dbItem) {
            throw new BadRequestException(
              `Item with ID ${itemInput.itemId} is not part of this request`,
            );
          }
          await tx.kitchenRequestItem.update({
            where: { id: dbItem.id },
            data: { quantityFulfilled: itemInput.fulfilledQty },
          });
          linesData.push({
            itemId: itemInput.itemId,
            quantity: itemInput.fulfilledQty,
            uomId: dbItem.uomId,
          });
        }
      } else {
        for (const dbItem of kr.items) {
          await tx.kitchenRequestItem.update({
            where: { id: dbItem.id },
            data: { quantityFulfilled: dbItem.quantityRequested },
          });
          linesData.push({
            itemId: dbItem.itemId,
            quantity: Number(dbItem.quantityRequested),
            uomId: dbItem.uomId,
          });
        }
      }

      // Generate sequence number for the InventoryIssue
      const warehouse = await tx.warehouse.findUnique({
        where: { id: kr.warehouseId },
        select: { branchId: true },
      });
      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID ${kr.warehouseId} not found`,
        );
      }

      const issueNumber = await this.documentNumberService.next(
        tx,
        'INVENTORY_ISSUE',
        warehouse.branchId,
      );

      // Create the InventoryIssue in SUBMITTED status so the posting service accepts it
      const issue = await tx.inventoryIssue.create({
        data: {
          issueNumber,
          warehouseId: kr.warehouseId,
          departmentId: kr.departmentId,
          status: 'SUBMITTED',
          lines: {
            create: linesData.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              uomId: line.uomId || null,
            })),
          },
        },
      });

      // Link the kitchen request to this issue
      await tx.kitchenRequest.update({
        where: { id: kr.id },
        data: { issueId: issue.id },
      });

      // Post the inventory issue atomically (deduct stock, write ledger, update status to POSTED).
      // issuePostService.post() detects the linked kitchenRequest (via issueId set above) and
      // transitions it to FULFILLED internally. A second executeTransition call here would
      // cause a double-FULFILL error within the same transaction.
      await this.issuePostService.post(
        issue.id,
        userId,
        userRole,
        undefined,
        body.ipAddress,
        tx,
      );

      // Fetch and return the now-FULFILLED kitchen request with its full relation set
      const fulfilledKr = await tx.kitchenRequest.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              uom: true,
              item: {
                include: { unitOfMeasure: true },
              },
            },
          },
          department: true,
          warehouse: true,
          requestedBy: true,
        },
      });

      if (!fulfilledKr) {
        throw new NotFoundException(
          `KitchenRequest with ID ${id} not found after fulfillment`,
        );
      }

      return fulfilledKr;
    });
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'kitchenRequest',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateKitchenRequestDto,
    userId: string,
    ipAddress?: string,
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const kr = await tx.kitchenRequest.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!kr) {
        throw new NotFoundException(`KitchenRequest with ID ${id} not found`);
      }

      if (kr.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT kitchen requests can be edited.',
        );
      }

      if (dto.version !== undefined && kr.version !== dto.version) {
        throw new BadRequestException(
          'Concurrency conflict: KitchenRequest version mismatch',
        );
      }

      if (dto.warehouseId) {
        const warehouse = await tx.warehouse.findUnique({
          where: { id: dto.warehouseId },
        });
        if (!warehouse) {
          throw new NotFoundException(
            `Warehouse with ID ${dto.warehouseId} not found`,
          );
        }
      }

      // 1. Delete existing items
      await tx.kitchenRequestItem.deleteMany({
        where: { requestId: id },
      });

      // 2. Update core fields and create new items
      const updated = await tx.kitchenRequest.update({
        where: { id },
        data: {
          departmentId: dto.departmentId || kr.departmentId,
          warehouseId: dto.warehouseId || kr.warehouseId,
          notes: dto.notes !== undefined ? dto.notes : kr.notes,
          version: { increment: 1 },
          items: dto.items
            ? {
                create: dto.items.map((item) => ({
                  itemId: item.itemId,
                  quantityRequested: item.quantityRequested,
                  quantityFulfilled: 0,
                  notes: item.notes || null,
                })),
              }
            : undefined,
        },
        include: {
          items: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          department: true,
          warehouse: true,
        },
      });

      // 3. Log the action in AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: 'KITCHEN_REQUEST_UPDATED',
          targetTable: 'kitchen_requests',
          targetId: id,
          beforeStateJson: JSON.stringify({
            departmentId: kr.departmentId,
            warehouseId: kr.warehouseId,
            version: kr.version,
            items: kr.items.map((i) => ({
              itemId: i.itemId,
              qty: i.quantityRequested,
            })),
          }),
          afterStateJson: JSON.stringify({
            departmentId: updated.departmentId,
            warehouseId: updated.warehouseId,
            version: updated.version,
            items: updated.items.map((i) => ({
              itemId: i.itemId,
              qty: i.quantityRequested,
            })),
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updated;
    };

    const maxAttempts = 3;
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await this.prisma.$transaction(execute, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30000,
        });
      } catch (error: unknown) {
        const isKnownError =
          error instanceof Prisma.PrismaClientKnownRequestError;
        const isSerializationError =
          (isKnownError && error.code === 'P2034') ||
          (error instanceof Error &&
            (error.message.includes('40001') ||
              error.message.includes('40P01') ||
              error.message.includes('serialization') ||
              error.message.includes('deadlock')));
        if (isSerializationError && attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
}

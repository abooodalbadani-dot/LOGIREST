import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Role, UpdateKitchenRequestDto } from '@logirest/shared-types';
import { DocumentSequenceService } from '../sequencing/document-sequence.service';
import { IssuePostService } from '../operations/issue-post.service';

@Injectable()
export class KitchenRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentSequenceService: DocumentSequenceService,
    private readonly issuePostService: IssuePostService,
  ) {}

  async create(
    body: {
      departmentId: string;
      warehouseId: string;
      items: Array<{ itemId: string; quantityRequested: number }>;
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

      const requestNumber = await this.documentSequenceService.generateNext(
        tx,
        'KITCHEN_REQUEST',
        warehouse.branchId,
      );

      return tx.kitchenRequest.create({
        data: {
          requestNumber,
          departmentId: body.departmentId,
          warehouseId: body.warehouseId,
          status: 'DRAFT',
          items: {
            create: body.items.map((item) => ({
              itemId: item.itemId,
              quantityRequested: item.quantityRequested,
              quantityFulfilled: 0,
            })),
          },
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
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (params.search) {
      where.OR = [
        { requestNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.kitchenRequest.findMany({
        where,
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
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.kitchenRequest.findUnique({
      where: { id },
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

    if (!request) {
      throw new NotFoundException(`Kitchen Request with ID ${id} not found`);
    }

    return request;
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'kitchenRequest',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
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
        include: { items: true },
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

      for (const lineInput of linesToCheck) {
        const whItem = await tx.warehouseItem.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: kr.warehouseId,
              itemId: lineInput.itemId,
            },
          },
          select: { qtyOnHand: true },
        });
        const available = Number(whItem?.qtyOnHand ?? 0);
        if (available < lineInput.fulfilledQty) {
          throw new BadRequestException(
            `Insufficient stock: cannot fulfill item ${lineInput.itemId}. ` +
              `Requested: ${lineInput.fulfilledQty}, Available: ${available}.`,
          );
        }
      }

      const linesData: Array<{ itemId: string; quantity: number }> = [];

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

      const issueNumber = await this.documentSequenceService.generateNext(
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
            })),
          },
        },
      });

      // Link the kitchen request to this issue
      await tx.kitchenRequest.update({
        where: { id: kr.id },
        data: { issueId: issue.id },
      });

      // Post the inventory issue atomically (deduct stock, write ledger, update status to POSTED)
      await this.issuePostService.post(
        issue.id,
        userId,
        userRole,
        undefined,
        body.ipAddress,
        tx,
      );

      // Execute the FULFILL transition on the KitchenRequest itself
      return this.workflowService.executeTransition(
        id,
        'kitchenRequest',
        'FULFILL',
        userId,
        userRole,
        body.comments,
        body.version,
        body.ipAddress,
        tx,
      );
    });
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'kitchenRequest',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async update(
    id: string,
    dto: UpdateKitchenRequestDto,
    userId: string,
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
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
          version: { increment: 1 },
          items: dto.items
            ? {
                create: dto.items.map((item) => ({
                  itemId: item.itemId,
                  quantityRequested: item.quantityRequested,
                  quantityFulfilled: 0,
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
    });
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentNumberService } from '../sequencing/document-number.service';
import { DocumentType, Prisma, PRStatus } from '@prisma/client';

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    body: {
      branchId: string;
      warehouseId: string;
      departmentId?: string;
      notes?: string;
      lines: Array<{ itemId: string; quantity: number; uomId?: string }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const requestNumber = await this.documentNumberService.next(
          tx,
          DocumentType.PURCHASE_REQUEST,
          body.branchId,
        );

        const departmentId =
          !body.departmentId ||
          body.departmentId === '' ||
          body.departmentId === body.warehouseId
            ? null
            : body.departmentId;

        return tx.purchaseRequest.create({
          data: {
            requestNumber,
            branchId: body.branchId,
            warehouseId: body.warehouseId,
            departmentId,
            notes: body.notes || null,
            createdById: userId,
            status: 'DRAFT',
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
                uomId: line.uomId || null,
              })),
            },
          },
          include: {
            warehouse: true,
            branch: true,
            lines: {
              include: {
                uom: true,
                item: {
                  include: {
                    unitOfMeasure: true,
                    category: true,
                    uomConversions: {
                      include: {
                        fromUom: { select: { id: true, code: true, name: true } },
                        toUom:   { select: { id: true, code: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });
      },
      { timeout: 30000 },
    );
  }

  async findAll(
    params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      unconverted?: boolean;
    },
    warehouseId?: string,
  ) {
    const page = Number(params.page) || 1;
    const limit = Math.min(Number(params.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseRequestWhereInput = {};
    if (params.status) {
      where.status = params.status as PRStatus;
    }
    if (params.unconverted) {
      where.purchaseOrders = {
        none: {},
      };
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (params.search) {
      where.OR = [
        { requestNumber: { contains: params.search, mode: 'insensitive' } },
        {
          createdBy: { name: { contains: params.search, mode: 'insensitive' } },
        },
        {
          warehouse: { name: { contains: params.search, mode: 'insensitive' } },
        },
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
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        select: {
          id: true,
          requestNumber: true,
          status: true,
          warehouseId: true,
          branchId: true,
          version: true,
          createdAt: true,
          warehouse: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseRequest.count({ where }),
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
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        warehouse: true,
        branch: true,
        lines: {
          include: {
            uom: true,
            item: {
              include: {
                unitOfMeasure: true,
                category: true,
                uomConversions: {
                  include: {
                    fromUom: { select: { id: true, code: true, name: true } },
                    toUom:   { select: { id: true, code: true, name: true } },
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!pr) {
      throw new NotFoundException(`Purchase Request with ID ${id} not found`);
    }

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: {
        documentId: pr.id,
        documentType: DocumentType.PURCHASE_REQUEST,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { ...pr, approvalEvents };
  }

  async update(
    id: string,
    body: {
      version: number;
      notes?: string;
      lines?: Array<{ itemId: string; quantity: number; uomId?: string }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Request with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Purchase Requests can be updated.',
        );
      }

      if (body.lines) {
        await tx.pRLine.deleteMany({
          where: { prId: id },
        });
      }

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          version: { increment: 1 },
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
                uomId: line.uomId || null,
              })),
            },
          }),
        },
        include: {
          warehouse: true,
          branch: true,
          lines: {
            include: {
              uom: true,
              item: {
                include: {
                  unitOfMeasure: true,
                  category: true,
                  uomConversions: {
                    include: {
                      fromUom: { select: { id: true, code: true, name: true } },
                      toUom:   { select: { id: true, code: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    });
  }

  async remove(id: string, version?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Request with ID ${id} not found`);
      }

      if (version !== undefined && existing.version !== version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Purchase Requests can be deleted.',
        );
      }

      await tx.pRLine.deleteMany({ where: { prId: id } });
      return tx.purchaseRequest.delete({ where: { id } });
    });
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    const result = await this.workflowService.executeTransition(
      id,
      'purchaseRequest',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );

    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        createdById: true,
        requestNumber: true,
        lines: {
          select: {
            quantity: true,
          },
        },
      },
    });

    if (pr) {
      const totalQuantity = pr.lines.reduce(
        (sum, line) => sum + Number(line.quantity),
        0,
      );
      this.eventEmitter.emit('pr.submitted', {
        prId: pr.id,
        branchId: pr.branchId,
        creatorId: pr.createdById,
        requestNumber: pr.requestNumber,
        totalValue: totalQuantity,
      });
    }

    return result;
  }

  async approve(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'purchaseRequest',
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
      'purchaseRequest',
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
      'purchaseRequest',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async convertToPo(
    id: string,
    userId: string,
    userRole: Role,
    body: {
      supplierId: string;
      currencyId: string;
      comments?: string;
      version?: number;
      lines?: Array<{ itemId: string; unitPrice: number }>;
      ipAddress?: string;
    },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Fetch the Purchase Request with its lines inside transaction
        const pr = await tx.purchaseRequest.findUnique({
          where: { id },
          include: { lines: true },
        });

        if (!pr) {
          throw new NotFoundException(
            `Purchase Request with ID ${id} not found`,
          );
        }

        if (pr.status !== 'APPROVED') {
          throw new BadRequestException(
            `Only APPROVED Purchase Requests can be converted to Purchase Orders. (Current status: ${pr.status})`,
          );
        }

        const existingPo = await tx.purchaseOrder.findFirst({
          where: { prId: id },
        });
        if (existingPo) {
          throw new ConflictException(
            `Purchase Request ${id} has already been converted to Purchase Order ${existingPo.poNumber}.`,
          );
        }

        const priceMap = new Map<string, number>();
        if (body.lines) {
          for (const line of body.lines) {
            priceMap.set(line.itemId, line.unitPrice);
          }
        }

        for (const prLine of pr.lines) {
          if (!priceMap.has(prLine.itemId)) {
            throw new BadRequestException(
              `Unit price is missing for item ID: ${prLine.itemId}`,
            );
          }
        }

        await this.workflowService.executeTransition(
          id,
          'purchaseRequest',
          'CONVERT_TO_PO',
          userId,
          userRole,
          body.comments,
          body.version,
          body.ipAddress,
          tx,
        );

        const poNumber = await this.documentNumberService.next(
          tx,
          DocumentType.PURCHASE_ORDER,
          pr.branchId,
        );

        try {
          return await tx.purchaseOrder.create({
            data: {
              poNumber,
              prId: id,
              supplierId: body.supplierId,
              currencyId: body.currencyId,
              warehouseId: pr.warehouseId,
              status: 'DRAFT',
              lines: {
                create: pr.lines.map((prLine) => {
                  const unitPrice = priceMap.get(prLine.itemId) || 0;
                  return {
                    itemId: prLine.itemId,
                    quantity: prLine.quantity,
                    uomId: prLine.uomId || null,
                    unitPrice: unitPrice,
                  };
                }),
              },
            },
            include: {
              lines: true,
            },
          });
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            throw new ConflictException(
              `Purchase Request ${id} has already been converted to a Purchase Order.`,
            );
          }
          throw error;
        }
      },
      { timeout: 30000 },
    );
  }
}

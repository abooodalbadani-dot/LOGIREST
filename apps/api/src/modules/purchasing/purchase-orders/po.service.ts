import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { OutboxService } from '../../outbox/outbox.service';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType, Prisma, POStatus, Role } from '@prisma/client';
import { toBaseQty, getConversionFactor } from '@logirest/shared-types';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
    private readonly outboxService: OutboxService,
  ) { }

  async create(
    body: {
      supplierId: string;
      currencyId: string;
      prId?: string;
      isSubmitted?: boolean;
      warehouseId?: string;
      exchangeRate?: number;
      notes?: string | null;
      lines: Array<{ itemId: string; quantity: number; unitPrice: number; uomId?: string; notes?: string | null }>;
    },
    userId: string,
    userRole: Role = Role.PROC_OFFICER,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let branchId: string | undefined;
      let warehouseId: string | undefined = body.warehouseId;

      if (body.prId) {
        const pr = await tx.purchaseRequest.findUnique({
          where: { id: body.prId },
          select: { branchId: true, status: true, warehouseId: true },
        });
        if (!pr) {
          throw new NotFoundException(
            `Purchase Request with ID ${body.prId} not found`,
          );
        }
        if (pr.status !== 'APPROVED') {
          throw new BadRequestException(
            `Only APPROVED Purchase Requests can be converted to Purchase Orders. (Current status: ${pr.status})`,
          );
        }

        const existingPo = await tx.purchaseOrder.findFirst({
          where: { prId: body.prId },
          select: { poNumber: true },
        });
        if (existingPo) {
          throw new ConflictException(
            `Purchase Request ${body.prId} has already been converted to Purchase Order ${existingPo.poNumber}.`,
          );
        }

        branchId = pr.branchId;
        warehouseId = pr.warehouseId;

        await tx.purchaseRequest.update({
          where: { id: body.prId },
          data: { status: 'FULFILLED' },
        });
      }

      if (!branchId && warehouseId) {
        const wh = await tx.warehouse.findUnique({
          where: { id: warehouseId },
          select: { branchId: true },
        });
        if (wh) {
          branchId = wh.branchId;
        }
      }

      if (!branchId) {
        const firstBranch = await tx.branch.findFirst({ select: { id: true } });
        if (!firstBranch) {
          throw new NotFoundException(
            'No active branch found to generate document sequence',
          );
        }
        branchId = firstBranch.id;
      }

      const poNumber = await this.documentNumberService.next(
        tx,
        DocumentType.PURCHASE_ORDER,
        branchId,
      );

      const status: POStatus = body.isSubmitted
        ? POStatus.PENDING_APPROVAL
        : POStatus.DRAFT;

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          prId: body.prId || null,
          supplierId: body.supplierId,
          currencyId: body.currencyId,
          warehouseId: warehouseId || null,
          status,
          notes: body.notes ?? null,
          exchangeRate: body.exchangeRate ?? 1,
          lines: {
            create: body.lines.map((line) => ({
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              uomId: line.uomId || null,
              notes: line.notes ?? null,
            })),
          },
        },
        include: {
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
                      toUom: { select: { id: true, code: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          supplier: true,
          currency: true,
          warehouse: true,
          purchaseRequest: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      if (body.isSubmitted) {
        await tx.approvalEvent.create({
          data: {
            documentId: po.id,
            documentType: DocumentType.PURCHASE_ORDER,
            fromStatus: POStatus.DRAFT,
            toStatus: POStatus.PENDING_APPROVAL,
            actionPerformed: 'SUBMIT',
            userId,
            userRole,
            stepNumber: 1,
          },
        });

        await this.outboxService.writeEvent(tx, 'PO_SUBMITTED', {
          id: po.id,
          documentNumber: po.poNumber,
          supplierId: po.supplierId,
        });
      }

      return po;
    });
  }

  async findAll(
    params: {
      status?: POStatus[] | POStatus | string;
      supplierId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    warehouseId?: string,
  ) {
    const page = Number(params.page) || 1;
    const limit = Math.min(Number(params.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (params.status) {
      if (Array.isArray(params.status)) {
        where.status = { in: params.status as POStatus[] };
      } else {
        where.status = params.status as POStatus;
      }
    }
    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }
    if (warehouseId) {
      where.OR = [
        { warehouseId },
        {
          purchaseRequest: {
            warehouseId,
          },
        },
      ];
    }
    if (params.search) {
      where.OR = [
        { poNumber: { contains: params.search, mode: 'insensitive' } },
        { supplier: { name: { contains: params.search, mode: 'insensitive' } } },
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
      this.prisma.purchaseOrder.findMany({
        where,
        select: {
          id: true,
          poNumber: true,
          status: true,
          supplierId: true,
          warehouseId: true,
          currencyId: true,
          version: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, code: true } },
          warehouse: { select: { id: true, name: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          purchaseRequest: { select: { id: true, requestNumber: true } },
          lines: { select: { quantity: true, unitPrice: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
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
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
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
                    toUom: { select: { id: true, code: true, name: true } },
                  },
                },
              },
            },
          },
        },
        supplier: true,
        currency: true,
        warehouse: true,
        purchaseRequest: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    const grns = await this.prisma.goodsReceivedNote.findMany({
      where: {
        poId: po.id,
        status: { in: ['POSTED', 'RECEIVED', 'SUBMITTED'] },
      },
      select: {
        lines: {
          select: {
            itemId: true,
            quantityReceived: true,
            uomId: true,
          },
        },
      },
    });

    const receivedQtyMap = new Map<string, number>();
    grns.forEach((grn) => {
      grn.lines.forEach((l) => {
        const itemInPo = po.lines.find((pl) => pl.itemId === l.itemId)?.item;
        const primaryUomId = itemInPo?.uomId || '';
        const conversions = (itemInPo?.uomConversions || []).map((c) => ({
          fromUomId: c.fromUomId,
          toUomId: c.toUomId,
          factor: Number(c.factor),
        }));
        const baseQty = toBaseQty(
          Number(l.quantityReceived),
          l.uomId || primaryUomId,
          primaryUomId,
          conversions,
        );
        receivedQtyMap.set(l.itemId, (receivedQtyMap.get(l.itemId) || 0) + baseQty);
      });
    });

    const linesWithRemaining = (po.lines || []).map((line) => {
      const primaryUomId = line.item.uomId;
      const conversions = (line.item.uomConversions || []).map((c) => ({
        fromUomId: c.fromUomId,
        toUomId: c.toUomId,
        factor: Number(c.factor),
      }));

      const grnLineForThisItem = grns.flatMap((g) => g.lines).find((l) => l.itemId === line.itemId);
      const lineUomId = line.uomId || grnLineForThisItem?.uomId || primaryUomId;
      const poLineBaseQty = toBaseQty(
        Number(line.quantity),
        lineUomId,
        primaryUomId,
        conversions,
      );

      const alreadyReceivedBase = receivedQtyMap.get(line.itemId) || 0;
      const remainingBase = Math.max(0, poLineBaseQty - alreadyReceivedBase);

      const factorForLineUom = getConversionFactor(lineUomId, primaryUomId, conversions);
      const rawAlreadyReceived = factorForLineUom > 0 ? alreadyReceivedBase / factorForLineUom : alreadyReceivedBase;
      const rawRemaining = factorForLineUom > 0 ? remainingBase / factorForLineUom : remainingBase;

      const alreadyReceivedInLineUom = Math.round(Number(rawAlreadyReceived) * 10000) / 10000;
      const remainingInLineUom = Math.round(Number(rawRemaining) * 10000) / 10000;

      return {
        ...line,
        receivedQuantity: alreadyReceivedInLineUom,
        remainingQuantity: remainingInLineUom,
      };
    });

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: {
        documentId: po.id,
        documentType: DocumentType.PURCHASE_ORDER,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { ...po, ...(po.lines && { lines: linesWithRemaining }), approvalEvents };
  }

  async update(
    id: string,
    body: {
      supplierId?: string;
      currencyId?: string;
      warehouseId?: string;
      version: number;
      exchangeRate?: number;
      notes?: string | null;
      lines?: Array<{
        id?: string;
        itemId: string;
        quantity: number;
        unitPrice: number;
        uomId?: string;
        notes?: string | null;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Purchase Orders can be updated.',
        );
      }

      // Delete old lines and recreate new ones
      if (body.lines) {
        await tx.pOLine.deleteMany({
          where: { poId: id },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: body.supplierId,
          currencyId: body.currencyId,
          warehouseId: body.warehouseId,
          notes: body.notes !== undefined ? (body.notes ?? null) : undefined,
          exchangeRate: body.exchangeRate !== undefined ? body.exchangeRate : undefined,
          version: { increment: 1 },
          ...(body.lines && {
            lines: {
              create: body.lines.map((line) => ({
                itemId: line.itemId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                uomId: line.uomId || null,
                notes: line.notes ?? null,
              })),
            },
          }),
        },
        include: {
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
                      toUom: { select: { id: true, code: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          supplier: true,
          currency: true,
          warehouse: true,
          purchaseRequest: {
            include: {
              warehouse: true,
            },
          },
        },
      });
    });
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async approve(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'APPROVE',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async reject(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    await this.workflowService.executeTransition(
      id,
      'purchaseOrder',
      'REJECT',
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
      'purchaseOrder',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async email(id: string, userId: string, recipientEmail?: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    const emailTo =
      recipientEmail || po.supplier?.contactEmail || 'supplier@example.com';

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_EMAILED',
        targetTable: 'purchase_orders',
        targetId: id,
        beforeStateJson: JSON.stringify({ status: po.status }),
        afterStateJson: JSON.stringify({ emailedTo: emailTo }),
      },
    });

    return {
      success: true,
      message: `Purchase Order sent successfully to ${emailTo}`,
    };
  }

  async remove(id: string, version?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase Order with ID ${id} not found`);
      }

      if (version !== undefined && existing.version !== version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Purchase Orders can be deleted.',
        );
      }

      await tx.pOLine.deleteMany({ where: { poId: id } });
      return tx.purchaseOrder.delete({ where: { id } });
    });
  }
}

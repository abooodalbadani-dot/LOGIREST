import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role, DocumentType, Prisma, GRStatus } from '@prisma/client';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { toBaseQty } from '@logirest/shared-types';

@Injectable()
export class GrnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  private async validatePoRemainingQuantities(
    tx: Prisma.TransactionClient,
    po: {
      id: string;
      lines: Array<{
        itemId: string;
        quantity: Prisma.Decimal | number;
        uomId?: string | null;
        item: {
          id: string;
          sku: string;
          name: string;
          uomId: string;
          uomConversions?: Array<{ fromUomId: string; toUomId: string; factor: Prisma.Decimal | number }>;
        };
      }>;
    },
    grnLines: Array<{
      itemId: string;
      quantity: number;
      uomId?: string | null;
    }>,
    excludeGrnId?: string,
  ) {
    const previousGrns = await tx.goodsReceivedNote.findMany({
      where: {
        poId: po.id,
        status: { in: ['POSTED', 'RECEIVED', 'SUBMITTED'] },
        ...(excludeGrnId && { id: { not: excludeGrnId } }),
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

    const receivedBaseQtyMap = new Map<string, number>();
    for (const pGrn of previousGrns) {
      for (const line of pGrn.lines) {
        const itemInPo = po.lines.find((pl) => pl.itemId === line.itemId)?.item;
        if (!itemInPo) continue;
        const primaryUomId = itemInPo.uomId;
        const conversions = (itemInPo.uomConversions || []).map((c) => ({
          fromUomId: c.fromUomId,
          toUomId: c.toUomId,
          factor: Number(c.factor),
        }));

        const lineUomId = line.uomId || primaryUomId;
        const baseQty = toBaseQty(
          Number(line.quantityReceived),
          lineUomId,
          primaryUomId,
          conversions,
        );

        const currentTotal = receivedBaseQtyMap.get(line.itemId) || 0;
        receivedBaseQtyMap.set(line.itemId, currentTotal + baseQty);
      }
    }

    const poBaseQtyMap = new Map<string, { totalBaseQty: number; itemCode: string; primaryUomId: string; conversions: Array<{ fromUomId: string; toUomId: string; factor: number }> }>();
    for (const poLine of po.lines) {
      const primaryUomId = poLine.item.uomId;
      const conversions = (poLine.item.uomConversions || []).map((c) => ({
        fromUomId: c.fromUomId,
        toUomId: c.toUomId,
        factor: Number(c.factor),
      }));

      const lineUomId = poLine.uomId || primaryUomId;
      const baseQty = toBaseQty(
        Number(poLine.quantity),
        lineUomId,
        primaryUomId,
        conversions,
      );

      const existingEntry = poBaseQtyMap.get(poLine.itemId);
      if (existingEntry) {
        existingEntry.totalBaseQty += baseQty;
      } else {
        poBaseQtyMap.set(poLine.itemId, {
          totalBaseQty: baseQty,
          itemCode: poLine.item.sku || poLine.item.name,
          primaryUomId,
          conversions,
        });
      }
    }

    const incomingBaseQtyMap = new Map<string, number>();
    for (const grnLine of grnLines) {
      const poInfo = poBaseQtyMap.get(grnLine.itemId);
      if (!poInfo) {
        throw new BadRequestException(
          `Item with ID ${grnLine.itemId} was not included in Purchase Order`,
        );
      }

      const lineUomId = grnLine.uomId || poInfo.primaryUomId;
      const baseQty = toBaseQty(
        grnLine.quantity,
        lineUomId,
        poInfo.primaryUomId,
        poInfo.conversions,
      );

      const currentIncoming = incomingBaseQtyMap.get(grnLine.itemId) || 0;
      incomingBaseQtyMap.set(grnLine.itemId, currentIncoming + baseQty);
    }

    for (const [itemId, incomingBaseQty] of incomingBaseQtyMap.entries()) {
      const poInfo = poBaseQtyMap.get(itemId)!;
      const alreadyReceivedBaseQty = receivedBaseQtyMap.get(itemId) || 0;
      const remainingBaseQty = Math.max(0, poInfo.totalBaseQty - alreadyReceivedBaseQty);

      if (incomingBaseQty > remainingBaseQty + 0.0001) {
        throw new BadRequestException(
          `Cannot receive ${incomingBaseQty.toFixed(2)}. Only ${remainingBaseQty.toFixed(2)} remaining for item ${poInfo.itemCode} in PO.`,
        );
      }
    }
  }

  async create(
    body: {
      poId?: string | null;
      supplierId?: string | null;
      currencyId?: string | null;
      warehouseId: string;
      fxRate?: number | null;
      notes?: string;
      lines: Array<{
        itemId: string;
        lotId?: string | null;
        lotNumber?: string | null;
        expiryDate?: string | null;
        quantity: number;
        unitPrice: number;
        uomId?: string;
      }>;
    },
    userId: string,
    userRole?: Role,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let branchId: string | undefined = undefined;
      let capturedFxRate = body.fxRate ? new Prisma.Decimal(body.fxRate) : new Prisma.Decimal(1);
      const fxRateCapturedAt = new Date();

      if (body.poId) {
        const po = await tx.purchaseOrder.findFirst({
          where: {
            OR: [
              { id: body.poId },
              { poNumber: body.poId },
            ],
          },
          include: {
            purchaseRequest: true,
            currency: true,
            lines: {
              include: {
                item: {
                  include: {
                    uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
                  },
                },
              },
            },
          },
        });

        if (!po) {
          throw new NotFoundException(
            `Purchase Order with ID ${body.poId} not found`,
          );
        }

        const validPoStatuses = ['APPROVED', 'PARTIAL', 'PARTIALLY_RECEIVED', 'ISSUED'];
        if (!validPoStatuses.includes(po.status)) {
          throw new BadRequestException(
            `Cannot create a GRN against a Purchase Order that is not APPROVED, PARTIAL or PARTIALLY_RECEIVED. (Current status: ${po.status})`,
          );
        }

        await this.validatePoRemainingQuantities(tx, po, body.lines);

        branchId = po.purchaseRequest?.branchId;

        if (po.currency && !po.currency.isBase) {
          const baseCurrency = await tx.currency.findFirst({
            where: { isBase: true },
          });

          if (!baseCurrency) {
            throw new BadRequestException('System base currency is not defined.');
          }

          const fx = await tx.fXRate.findFirst({
            where: {
              fromCurrencyId: po.currencyId,
              toCurrencyId: baseCurrency.id,
              effectiveFrom: { lte: fxRateCapturedAt },
            },
            orderBy: { effectiveFrom: 'desc' },
          });

          if (!fx) {
            throw new BadRequestException(
              `No active FX rate found for ${po.currency.code} to ${baseCurrency.code}`,
            );
          }
          capturedFxRate = fx.rate;
        }
      }

      if (!branchId) {
        const wh = await tx.warehouse.findUnique({
          where: { id: body.warehouseId },
          select: { branchId: true },
        });
        branchId = wh?.branchId;
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

      const grnNumber = await this.documentNumberService.next(
        tx,
        DocumentType.GOODS_RECEIVED_NOTE,
        branchId,
      );

      const processedLines = [];
      for (const line of body.lines) {
        const lotId = await this.resolveOrCreateLot(
          tx,
          line.itemId,
          line.lotId,
          line.lotNumber,
          line.expiryDate,
        );

        const foreignPrice = new Prisma.Decimal(line.unitPrice);
        const basePrice = foreignPrice.mul(capturedFxRate).toDecimalPlaces(4);
        const lineUomId = line.uomId ?? null;

        processedLines.push({
          itemId: line.itemId,
          lotId,
          quantityReceived: line.quantity,
          unitPrice: line.unitPrice,
          unitPriceForeign: foreignPrice,
          unitPriceBase: basePrice,
          uomId: lineUomId,
        });
      }

      const createdGrn = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId: body.poId || undefined,
          supplierId: body.supplierId || undefined,
          currencyId: body.currencyId || undefined,
          warehouseId: body.warehouseId,
          status: 'DRAFT',
          notes: body.notes || null,
          createdById: userId,
          fxRate: capturedFxRate,
          fxRateCapturedAt,
          lines: {
            create: processedLines,
          },
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
              lot: true,
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
              currency: true,
              lines: {
                include: {
                  item: true,
                  uom: true,
                },
              },
            },
          },
          supplier: true,
          currency: true,
          warehouse: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.approvalEvent.create({
        data: {
          documentId: createdGrn.id,
          documentType: DocumentType.GOODS_RECEIVED_NOTE,
          fromStatus: 'DRAFT',
          toStatus: 'DRAFT',
          actionPerformed: 'CREATE',
          userId,
          userRole: userRole || Role.WH_KEEPER,
          stepNumber: 1,
        },
      });

      return createdGrn;
    });
  }

  async findAll(
    params: { status?: string; search?: string; page?: number; limit?: number },
    activeScope?: { branchId?: string; warehouseId?: string },
  ) {
    const page = Number(params.page) || 1;
    const limit = Math.min(Number(params.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.GoodsReceivedNoteWhereInput = {};
    if (params.status) {
      where.status = params.status as GRStatus;
    }

    const andConditions: Prisma.GoodsReceivedNoteWhereInput[] = [];

    if (activeScope?.warehouseId) {
      andConditions.push({ warehouseId: activeScope.warehouseId });
    }
    if (activeScope?.branchId) {
      andConditions.push({
        warehouse: {
          branchId: activeScope.branchId,
        },
      });
    }

    if (params.search) {
      andConditions.push({
        OR: [
          { grnNumber: { contains: params.search, mode: 'insensitive' } },
          { purchaseOrder: { poNumber: { contains: params.search, mode: 'insensitive' } } },
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
      this.prisma.goodsReceivedNote.findMany({
        where,
        select: {
          id: true,
          grnNumber: true,
          status: true,
          warehouseId: true,
          supplierId: true,
          currencyId: true,
          poId: true,
          version: true,
          createdAt: true,
          postedAt: true,
          supplier: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          warehouse: { select: { id: true, name: true } },
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              supplierId: true,
              supplier: { select: { id: true, name: true, code: true } },
              currency: { select: { id: true, code: true, symbol: true } },
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.goodsReceivedNote.count({ where }),
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
    const grn = await this.prisma.goodsReceivedNote.findUnique({
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
            lot: true,
            uom: true,
          },
        },
        purchaseOrder: {
          include: {
            supplier: true,
            currency: true,
            lines: {
              include: {
                item: true,
                uom: true,
              },
            },
          },
        },
        supplier: true,
        currency: true,
        warehouse: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!grn) {
      throw new NotFoundException(
        `Goods Received Note with ID ${id} not found`,
      );
    }

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: {
        documentId: id,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { stepNumber: 'asc' },
    });

    return { ...grn, approvalEvents };
  }

  async update(
    id: string,
    body: {
      poId?: string;
      supplierId?: string | null;
      currencyId?: string | null;
      fxRate?: number | null;
      warehouseId?: string;
      notes?: string;
      version: number;
      lines?: Array<{
        id?: string;
        itemId: string;
        uomId?: string;
        lotId?: string | null;
        lotNumber?: string | null;
        expiryDate?: string | null;
        quantity: number;
        unitPrice: number;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.goodsReceivedNote.findUnique({
        where: { id },
        select: { version: true, status: true, poId: true },
      });

      if (!existing) {
        throw new NotFoundException(
          `Goods Received Note with ID ${id} not found`,
        );
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Goods Received Notes can be updated.',
        );
      }

      const effectivePoId = body.poId !== undefined ? body.poId : existing.poId;
      if (effectivePoId && body.lines) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: effectivePoId },
          include: {
            lines: {
              include: {
                item: {
                  include: {
                    uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
                  },
                },
              },
            },
          },
        });
        if (po) {
          const validPoStatuses = ['APPROVED', 'PARTIAL', 'PARTIALLY_RECEIVED', 'ISSUED'];
          if (!validPoStatuses.includes(po.status)) {
            throw new BadRequestException(
              `Cannot create a GRN against a Purchase Order that is not APPROVED, PARTIAL or PARTIALLY_RECEIVED. (Current status: ${po.status})`,
            );
          }
          await this.validatePoRemainingQuantities(tx, po, body.lines, id);
        }
      }

      let processedLines = undefined;
      if (body.lines) {
        await tx.gRNLine.deleteMany({
          where: { grnId: id },
        });

        processedLines = [];
        for (const line of body.lines) {
          const lotId = await this.resolveOrCreateLot(
            tx,
            line.itemId,
            line.lotId,
            line.lotNumber,
            line.expiryDate,
          );
          processedLines.push({
            itemId: line.itemId,
            uomId: line.uomId,
            lotId,
            quantityReceived: line.quantity,
            unitPrice: line.unitPrice,
          });
        }
      }

      return tx.goodsReceivedNote.update({
        where: { id },
        data: {
          poId: body.poId,
          supplierId: body.supplierId,
          currencyId: body.currencyId,
          notes: body.notes,
          warehouseId: body.warehouseId,
          ...(body.fxRate !== undefined && {
            fxRate: body.fxRate ? new Prisma.Decimal(body.fxRate) : new Prisma.Decimal(1),
          }),
          version: { increment: 1 },
          ...(processedLines && {
            lines: {
              create: processedLines,
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
              lot: true,
            },
          },
          purchaseOrder: {
            include: {
              supplier: true,
              currency: true,
              lines: {
                include: {
                  item: true,
                  uom: true,
                },
              },
            },
          },
          supplier: true,
          currency: true,
          warehouse: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  }

  async updateLine(
    grnId: string,
    line: {
      itemId: string;
      lotId?: string | null;
      lotNumber?: string | null;
      expiryDate?: string | null;
      receivedQuantity: number;
      unitPrice: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingGrn = await tx.goodsReceivedNote.findUnique({
        where: { id: grnId },
        select: { fxRate: true, status: true },
      });

      if (!existingGrn) {
        throw new NotFoundException(
          `Goods Received Note with ID ${grnId} not found`,
        );
      }

      if (existingGrn.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Goods Received Notes can be updated.',
        );
      }

      const lotId = await this.resolveOrCreateLot(
        tx,
        line.itemId,
        line.lotId,
        line.lotNumber,
        line.expiryDate,
      );

      const fxRate = existingGrn.fxRate
        ? new Prisma.Decimal(existingGrn.fxRate)
        : new Prisma.Decimal(1);
      const foreignPrice = new Prisma.Decimal(line.unitPrice);
      const basePrice = foreignPrice.mul(fxRate).toDecimalPlaces(4);

      // Check if there is an existing line with this itemId and lotId
      const existingLine = await tx.gRNLine.findFirst({
        where: {
          grnId,
          itemId: line.itemId,
          lotId,
        },
      });

      if (existingLine) {
        await tx.gRNLine.update({
          where: { id: existingLine.id },
          data: {
            quantityReceived: line.receivedQuantity,
            unitPrice: line.unitPrice,
            unitPriceForeign: foreignPrice,
            unitPriceBase: basePrice,
          },
        });
      } else {
        await tx.gRNLine.create({
          data: {
            grnId,
            itemId: line.itemId,
            lotId,
            quantityReceived: line.receivedQuantity,
            unitPrice: line.unitPrice,
            unitPriceForeign: foreignPrice,
            unitPriceBase: basePrice,
          },
        });
      }

      // Increment version of GRN
      await tx.goodsReceivedNote.update({
        where: { id: grnId },
        data: { version: { increment: 1 } },
      });

      return { success: true };
    });
  }

  async remove(id: string, version?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.goodsReceivedNote.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(
          `Goods Received Note with ID ${id} not found`,
        );
      }

      if (version !== undefined && existing.version !== version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Only DRAFT Goods Received Notes can be deleted.',
        );
      }

      await tx.gRNLine.deleteMany({ where: { grnId: id } });
      return tx.goodsReceivedNote.delete({ where: { id } });
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
      'goodsReceivedNote',
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
      'goodsReceivedNote',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  private async resolveOrCreateLot(
    tx: Prisma.TransactionClient,
    itemId: string,
    lotId?: string | null,
    lotNumber?: string | null,
    expiryDate?: string | null,
  ): Promise<string | null> {
    // If lotId is a valid UUID and doesn't start with 'new-', verify its existence
    if (lotId && !lotId.startsWith('new-')) {
      const existing = await tx.lot.findUnique({ where: { id: lotId } });
      if (existing) return existing.id;
    }

    // If we have a lotNumber, resolve or create the Lot
    if (lotNumber && lotNumber.trim().length > 0) {
      const trimmedLotNumber = lotNumber.trim();
      const existing = await tx.lot.findUnique({
        where: { lotNumber: trimmedLotNumber },
      });
      if (existing) {
        if (existing.itemId !== itemId) {
          throw new BadRequestException(
            `Lot number ${trimmedLotNumber} is already registered to another item.`,
          );
        }
        return existing.id;
      }

      // Otherwise, create a new lot
      const created = await tx.lot.create({
        data: {
          itemId,
          lotNumber: trimmedLotNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });
      return created.id;
    }

    return null;
  }
}

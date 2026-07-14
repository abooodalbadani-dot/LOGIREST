import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { DocumentType, Prisma, GRStatus } from '@prisma/client';

@Injectable()
export class GrnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async create(
    body: {
      poId: string;
      warehouseId: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        lotId?: string | null;
        lotNumber?: string | null;
        expiryDate?: string | null;
        quantity: number;
        unitPrice: number;
      }>;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find PO to get branchId
      const po = await tx.purchaseOrder.findUnique({
        where: { id: body.poId },
        include: {
          purchaseRequest: true,
          currency: true,
        },
      });

      if (!po) {
        throw new NotFoundException(
          `Purchase Order with ID ${body.poId} not found`,
        );
      }

      if (po.status !== 'APPROVED') {
        throw new BadRequestException(
          `Cannot create a GRN against a Purchase Order that is not APPROVED. (Current status: ${po.status})`,
        );
      }

      let branchId = po.purchaseRequest?.branchId;
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

      // Task 1.1: Capture FX Rate at Creation
      let capturedFxRate = new Prisma.Decimal(1); // Default to 1 if PO is in base currency
      const fxRateCapturedAt = new Date();

      if (!po.currency.isBase) {
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

        processedLines.push({
          itemId: line.itemId,
          lotId,
          quantityReceived: line.quantity,
          unitPrice: line.unitPrice, // Keep legacy field populated for compat
          unitPriceForeign: foreignPrice,
          unitPriceBase: basePrice,
        });
      }

      return tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId: body.poId,
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
            },
          },
          warehouse: true,
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
          {
            purchaseOrder: {
              poNumber: { contains: params.search, mode: 'insensitive' },
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
            },
          },
          warehouse: true,
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
          },
        },
        purchaseOrder: {
          include: {
            supplier: true,
            currency: true,
          },
        },
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
        user: { select: { id: true, name: true } },
      },
      orderBy: { stepNumber: 'asc' },
    });

    return { ...grn, approvalEvents };
  }

  async update(
    id: string,
    body: {
      poId?: string;
      warehouseId?: string;
      version: number;
      lines?: Array<{
        id?: string;
        itemId: string;
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
        select: { version: true, status: true },
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
          warehouseId: body.warehouseId,
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
            },
          },
          warehouse: true,
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

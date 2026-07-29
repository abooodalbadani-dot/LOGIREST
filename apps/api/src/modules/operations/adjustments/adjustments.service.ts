import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Role } from '@logirest/shared-types';
import { toBaseQty } from '@logirest/shared-types';
import {
  AdjustmentDirection,
  AdjustmentReason,
  DocumentType,
  Prisma,
  AdjStatus,
} from '@prisma/client';
import { DocumentNumberService } from '../../sequencing/document-number.service';

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async create(
    body: {
      warehouseId: string;
      reason?: AdjustmentReason | string;
      notes?: string;
      lines: Array<{
        itemId: string;
        lotId?: string;
        quantity: number;
        uomId?: string;
        direction: AdjustmentDirection;
        reason: AdjustmentReason;
        unitCost?: number;
      }>;
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
      const docReason = String(body.reason || '').trim().toLowerCase();
      const isDecreaseOnly =
        docReason.includes('damage') ||
        docReason.includes('spoilage') ||
        docReason.includes('theft') ||
        docReason.includes('loss');

      if (isDecreaseOnly) {
        for (const line of body.lines) {
          const dirStr = String(line.direction).toUpperCase();
          if (dirStr === 'IN' || dirStr === 'INCREASE') {
            throw new BadRequestException(
              `Cannot specify INCREASE direction when adjustment reason is '${body.reason}'.`,
            );
          }
        }
      }

      // Pre-creation stock sufficiency check for all OUT (decrease) lines and unit cost check for IN (increase)
      for (const line of body.lines) {
        if (line.direction === AdjustmentDirection.IN) {
          if (
            line.unitCost === undefined ||
            line.unitCost === null ||
            Number(line.unitCost) < 0
          ) {
            throw new BadRequestException(
              `Unit cost is required and must be greater than or equal to zero for manual Adjustment IN.`,
            );
          }
        }

        if (line.direction === AdjustmentDirection.OUT) {
          // Fetch the item to get its base UOM and conversions for stock check
          const itemForCheck = await tx.item.findUnique({
            where: { id: line.itemId },
            select: {
              uomId: true,
              uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
            },
          });
          const baseUomId = itemForCheck?.uomId ?? line.itemId;
          const conversions = (itemForCheck?.uomConversions ?? []).map((c) => ({
            fromUomId: c.fromUomId,
            toUomId: c.toUomId,
            factor: Number(c.factor),
          }));
          const rawLineQty = Number((line as { quantity?: number; qty?: number }).quantity ?? (line as { quantity?: number; qty?: number }).qty ?? 0);
          const normalizedQtyForCheck = toBaseQty(
            rawLineQty,
            (line as { uomId?: string }).uomId ?? baseUomId,
            baseUomId,
            conversions,
          );
          const whItem = await tx.warehouseItem.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: body.warehouseId,
                itemId: line.itemId,
              },
            },
            select: { qtyOnHand: true },
          });
          const available = Number(whItem?.qtyOnHand ?? 0);
          if (available < normalizedQtyForCheck) {
            throw new BadRequestException(
              `Insufficient stock for DECREASE adjustment: item ${line.itemId} ` +
                `has ${available} on hand, requested ${normalizedQtyForCheck} (base UOM).`,
            );
          }
        }
      }

      const adjustmentNumber = await this.documentNumberService.next(
        tx,
        DocumentType.ADJUSTMENT,
        warehouse.branchId,
      );

      const preparedLines = await Promise.all(
        body.lines.map(async (line) => {
          // Resolve lot ID
          let resolvedLotId: string | null = null;
          if (line.lotId) {
            const cleanLotNum = line.lotId.replace(/^new-/, '').trim();
            const existingLot = await tx.lot.findFirst({
              where: {
                OR: [
                  { id: line.lotId },
                  { lotNumber: cleanLotNum },
                ],
                itemId: line.itemId,
              },
            });

            if (existingLot) {
              resolvedLotId = existingLot.id;
            } else if (cleanLotNum) {
              const createdLot = await tx.lot.create({
                data: {
                  itemId: line.itemId,
                  lotNumber: cleanLotNum,
                },
              });
              resolvedLotId = createdLot.id;
            }
          }

          const lineUomId = line.uomId ?? null;

          return {
            ...line,
            lotId: resolvedLotId,
            resolvedUomId: lineUomId,
          };
        }),
      );

      // Capture stock snapshots for each line before persisting
      const snapshots = new Map<string, number>();
      for (const line of preparedLines) {
        if (!snapshots.has(line.itemId)) {
          const whItem = await tx.warehouseItem.findUnique({
            where: {
              warehouseId_itemId: {
                warehouseId: body.warehouseId,
                itemId: line.itemId,
              },
            },
            select: { qtyOnHand: true },
          });
          snapshots.set(line.itemId, Number(whItem?.qtyOnHand ?? 0));
        }
      }

      return tx.adjustment.create({
        data: {
          adjustmentNumber,
          warehouseId: body.warehouseId,
          notes: body.notes || null,
          status: 'DRAFT',
          lines: {
            create: preparedLines.map((line) => ({
              itemId: line.itemId,
              lotId: line.lotId || null,
              quantity: Number((line as { quantity?: number; qty?: number }).quantity ?? (line as { quantity?: number; qty?: number }).qty ?? 0),
              uomId: line.resolvedUomId ?? line.uomId ?? null,
              direction: line.direction,
              reason: line.reason,
              unitCost:
                line.unitCost !== undefined && line.unitCost !== null
                  ? line.unitCost
                  : null,
              snapshotQtyBefore: snapshots.get(line.itemId) ?? 0,
            })),
          },
        },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                  category: true,
                  uomConversions: { include: { fromUom: true, toUom: true } },
                },
              },
              lot: true,
              uom: true,
            },
          },
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

    const where: Prisma.AdjustmentWhereInput = {};
    if (params.status) {
      where.status = params.status as AdjStatus;
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (params.search) {
      where.OR = [
        { adjustmentNumber: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
        {
          warehouse: { name: { contains: params.search, mode: 'insensitive' } },
        },
        {
          createdBy: { name: { contains: params.search, mode: 'insensitive' } },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.adjustment.findMany({
        where,
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                  category: true,
                  uomConversions: { include: { fromUom: true, toUom: true } },
                },
              },
              lot: true,
              uom: true,
            },
          },
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adjustment.count({ where }),
    ]);

    const adjIds = items.map((a) => a.id);
    const approvalEvents =
      adjIds.length > 0
        ? await this.prisma.approvalEvent.findMany({
            where: {
              documentId: { in: adjIds },
              documentType: DocumentType.ADJUSTMENT,
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

    const itemsWithEvents = items.map((a) => ({
      ...a,
      approvalEvents: eventsByDocId.get(a.id) || [],
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

  async getSummary(warehouseId?: string) {
    const where: Prisma.AdjustmentWhereInput = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const [total, pending, criticalLosses] = await Promise.all([
      this.prisma.adjustment.count({ where }),
      this.prisma.adjustment.count({
        where: {
          ...where,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      }),
      this.prisma.adjustment.count({
        where: {
          ...where,
          lines: {
            some: {
              reason: { in: [AdjustmentReason.DAMAGE, AdjustmentReason.THEFT] },
            },
          },
        },
      }),
    ]);

    return {
      total,
      pending,
      critical_losses: criticalLosses,
    };
  }

  async findOne(id: string) {
    const adjustment = await this.prisma.adjustment.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
                category: true,
                uomConversions: { include: { fromUom: true, toUom: true } },
              },
            },
            lot: true,
            uom: true,
          },
        },
        warehouse: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!adjustment) {
      throw new NotFoundException(
        `Inventory Adjustment with ID ${id} not found`,
      );
    }

    const isDraft = adjustment.status === 'DRAFT';

    // Only fetch live stock when the document is still in DRAFT.
    // For all other statuses (SUBMITTED, APPROVED, POSTED, etc.) we
    // MUST use the frozen snapshot saved at line-creation time.
    let stockMap = new Map<string, number>();
    if (isDraft) {
      const itemIds = adjustment.lines.map((l) => l.itemId);
      const warehouseItems = await this.prisma.warehouseItem.findMany({
        where: {
          warehouseId: adjustment.warehouseId,
          itemId: { in: itemIds },
        },
        select: { itemId: true, qtyOnHand: true },
      });
      for (const wi of warehouseItems) {
        stockMap.set(wi.itemId, Number(wi.qtyOnHand));
      }
    }

    const enrichedLines = adjustment.lines.map((line) => {
      let qtyBefore: number;
      if (isDraft) {
        // For DRAFT: show live stock so users see real-time feedback
        qtyBefore = stockMap.get(line.itemId) ?? 0;
      } else {
        // For submitted/approved/posted: STRICTLY use the frozen snapshot
        qtyBefore = line.snapshotQtyBefore !== null && line.snapshotQtyBefore !== undefined
          ? Number(line.snapshotQtyBefore)
          : 0;
      }
      const qtyAdjusted = Number(line.quantity ?? 0);
      return {
        ...line,
        qtyBefore,
        qtyAdjusted,
      };
    });

    const approvalEvents = await this.prisma.approvalEvent.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...adjustment,
      lines: enrichedLines,
      approvalEvents,
    };
  }

  async update(
    id: string,
    body: {
      version: number;
      warehouseId?: string;
      reason?: string;
      notes?: string;
      lines?: Array<{
        id?: string;
        itemId: string;
        qty: number;
        uomId?: string;
        direction: 'INCREASE' | 'DECREASE';
        unitCost?: number | null;
        lotId?: string | null;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.adjustment.findUnique({
        where: { id },
        select: { version: true, status: true, warehouseId: true },
      });

      if (!existing) {
        throw new NotFoundException(`Adjustment with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT Adjustments can be updated.');
      }

      if (body.lines) {
        for (const line of body.lines) {
          const isIncrease =
            line.direction === 'INCREASE' ||
            (line.direction as string) === 'IN';
          if (isIncrease) {
            if (
              line.unitCost === undefined ||
              line.unitCost === null ||
              Number(line.unitCost) < 0
            ) {
              throw new BadRequestException(
                `Unit cost is required and must be greater than or equal to zero for manual Adjustment IN.`,
              );
            }
          }
        }
        await tx.adjustmentLine.deleteMany({
          where: { adjustmentId: id },
        });
      }

      const reason =
        body.reason &&
        Object.values(AdjustmentReason).includes(
          body.reason as AdjustmentReason,
        )
          ? (body.reason as AdjustmentReason)
          : AdjustmentReason.CORRECTION;

      let preparedUpdateLines: typeof body.lines = undefined;
      if (body.lines) {
        preparedUpdateLines = await Promise.all(
          body.lines.map(async (line) => {
            let resolvedLotId: string | null = null;
            if (line.lotId) {
              const cleanLotNum = line.lotId.replace(/^new-/, '').trim();
              const existingLot = await tx.lot.findFirst({
                where: {
                  OR: [
                    { id: line.lotId },
                    { lotNumber: cleanLotNum },
                  ],
                  itemId: line.itemId,
                },
              });

              if (existingLot) {
                resolvedLotId = existingLot.id;
              } else if (cleanLotNum) {
                const createdLot = await tx.lot.create({
                  data: {
                    itemId: line.itemId,
                    lotNumber: cleanLotNum,
                  },
                });
                resolvedLotId = createdLot.id;
              }
            }
            return {
              ...line,
              lotId: resolvedLotId,
            };
          }),
        );
      }

      // Capture current stock snapshots for each line before saving
      const updateTargetWarehouseId = body.warehouseId ?? existing.warehouseId;
      const updateSnapshots = new Map<string, number>();
      if (preparedUpdateLines) {
        for (const line of preparedUpdateLines) {
          if (!updateSnapshots.has(line.itemId)) {
            const whItem = await tx.warehouseItem.findUnique({
              where: {
                warehouseId_itemId: {
                  warehouseId: updateTargetWarehouseId,
                  itemId: line.itemId,
                },
              },
              select: { qtyOnHand: true },
            });
            updateSnapshots.set(line.itemId, Number(whItem?.qtyOnHand ?? 0));
          }
        }
      }

      return tx.adjustment.update({
        where: { id },
        data: {
          warehouseId: body.warehouseId,
          notes: body.notes !== undefined ? body.notes : undefined,
          version: { increment: 1 },
          ...(preparedUpdateLines && {
            lines: {
              create: preparedUpdateLines.map((line) => {
                const isIncrease =
                  line.direction === 'INCREASE' ||
                  (line.direction as string) === 'IN';
                return {
                  itemId: line.itemId,
                  lotId: line.lotId || null,
                  quantity: line.qty,
                  uomId: line.uomId ?? null,
                  direction: isIncrease
                    ? AdjustmentDirection.IN
                    : AdjustmentDirection.OUT,
                  reason: reason,
                  unitCost:
                    line.unitCost !== undefined && line.unitCost !== null
                      ? line.unitCost
                      : null,
                  snapshotQtyBefore: updateSnapshots.get(line.itemId) ?? 0,
                };
              }),
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
                  uomConversions: { include: { fromUom: true, toUom: true } },
                },
              },
              lot: true,
              uom: true,
            },
          },
          warehouse: true,
        },
      });
    });
  }

  async edit(
    id: string,
    userId: string,
    userRole: Role,
    body: { version: number; ipAddress?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.adjustment.findUnique({
        where: { id },
        select: { version: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Adjustment with ID ${id} not found`);
      }

      if (existing.version !== body.version) {
        throw new ConflictException(
          'Concurrency conflict: The document was modified by another user.',
        );
      }

      const updated = await tx.adjustment.update({
        where: { id },
        data: {
          status: 'DRAFT',
          version: { increment: 1 },
        },
        include: {
          lines: {
            include: {
              item: { include: { unitOfMeasure: true, category: true } },
              lot: true,
            },
          },
          warehouse: true,
        },
      });

      const stepNumber =
        (await tx.approvalEvent.count({
          where: {
            documentId: id,
            documentType: 'ADJUSTMENT',
          },
        })) + 1;

      await tx.approvalEvent.create({
        data: {
          documentId: id,
          documentType: 'ADJUSTMENT',
          fromStatus: existing.status,
          toStatus: 'DRAFT',
          actionPerformed: 'EDIT',
          userId,
          userRole: userRole,
          stepNumber,
          comments: 'Reset to Draft for editing',
        },
      });

      return updated;
    });
  }

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'adjustment',
      'SUBMIT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }

  async approve(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'adjustment',
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
      'adjustment',
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
      'adjustment',
      'CANCEL',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
  }
}

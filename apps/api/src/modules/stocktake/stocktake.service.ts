import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Role, StocktakeStatus, LockType, Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class StocktakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(body: { warehouseId: string }, userId: string) {
    const sessionNumber = `ST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.stocktakeSession.create({
      data: {
        sessionNumber,
        warehouseId: body.warehouseId,
        status: 'DRAFT',
      },
    });
  }

  async findAll(
    params: { status?: string; search?: string; page?: number },
    warehouseId?: string,
  ) {
    const page = Number(params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: Prisma.StocktakeSessionWhereInput = {};
    if (params.status) {
      where.status = params.status as StocktakeStatus;
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (params.search) {
      where.OR = [
        { sessionNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.stocktakeSession.findMany({
        where,
        include: {
          counts: {
            include: {
              countedBy: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          snapshots: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                  category: true,
                  barcodeMappings: true,
                },
              },
              lot: true,
            },
          },
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stocktakeSession.count({ where }),
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

  async getSummary(warehouseId?: string) {
    const where: Prisma.StocktakeSessionWhereInput = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const sessions = await this.prisma.stocktakeSession.findMany({
      where,
    });

    const total = sessions.length;
    const active = sessions.filter(
      (s) =>
        s.status === 'STARTED' ||
        s.status === 'COUNTING' ||
        s.status === 'REVIEW',
    ).length;
    const completed = sessions.filter((s) => s.status === 'POSTED').length;

    return {
      total,
      active,
      completed,
    };
  }

  async findOne(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const session = await client.stocktakeSession.findUnique({
      where: { id },
      include: {
        counts: {
          include: {
            countedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        snapshots: {
          include: {
            item: {
              include: {
                unitOfMeasure: true,
                category: true,
                barcodeMappings: true,
              },
            },
            lot: true,
          },
        },
        warehouse: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`StocktakeSession with ID ${id} not found`);
    }

    return session;
  }

  async start(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.stocktakeSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundException(`StocktakeSession with ID ${id} not found`);
      }

      if (session.status !== 'DRAFT') {
        throw new BadRequestException(
          'StocktakeSession must be in DRAFT status to start',
        );
      }

      // Lock warehouse
      await tx.warehouse.update({
        where: { id: session.warehouseId },
        data: { isLocked: true },
      });

      // Create WarehouseLock row (Expires in 72 hours)
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await tx.warehouseLock.create({
        data: {
          warehouseId: session.warehouseId,
          lockType: LockType.STOCKTAKE,
          lockedById: userId,
          expiresAt,
          isActive: true,
        },
      });

      // Fetch current inventory positions
      const whItems = await tx.warehouseItem.findMany({
        where: { warehouseId: session.warehouseId },
        include: { item: true },
      });

      const whLots = await tx.warehouseItemLot.findMany({
        where: { warehouseId: session.warehouseId },
        include: { item: true },
      });

      // Capture Snapshots
      const snapshotsToCreate: Array<{
        sessionId: string;
        itemId: string;
        lotId: string | null;
        qtySnapshot: number;
        wacSnapshot: number;
      }> = [];

      // A. Batched / Expiry Lots
      for (const lot of whLots) {
        const parentItem = whItems.find((wi) => wi.itemId === lot.itemId);
        snapshotsToCreate.push({
          sessionId: id,
          itemId: lot.itemId,
          lotId: lot.lotId,
          qtySnapshot: Number(lot.qtyOnHand),
          wacSnapshot: parentItem ? Number(parentItem.wac) : 0,
        });
      }

      // B. Unbatched Items
      for (const item of whItems) {
        if (!item.item.isBatched && !item.item.hasExpiry) {
          snapshotsToCreate.push({
            sessionId: id,
            itemId: item.itemId,
            lotId: null,
            qtySnapshot: Number(item.qtyOnHand),
            wacSnapshot: Number(item.wac),
          });
        }
      }

      if (snapshotsToCreate.length > 0) {
        await tx.stocktakeSnapshot.createMany({
          data: snapshotsToCreate,
        });
      }

      // Execute Workflow transition
      await this.workflowService.executeTransition(
        id,
        'stocktakeSession',
        'START',
        userId,
        userRole,
        body.comments,
        body.version,
        body.ipAddress,
      );

      return this.findOne(id, tx);
    });
  }

  async count(
    id: string,
    counts:
      | Array<{ itemId: string; lotId?: string; qtyCounted: number }>
      | undefined,
    userId: string,
  ) {
    const session = await this.prisma.stocktakeSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`StocktakeSession with ID ${id} not found`);
    }

    if (session.status !== 'STARTED' && session.status !== 'COUNTING') {
      throw new BadRequestException(
        'Can only upload counts to started or counting stocktake sessions',
      );
    }

    const safeCounts = counts ?? [];

    return this.prisma.$transaction(async (tx) => {
      for (const cnt of safeCounts) {
        const lotId = cnt.lotId || null;

        const lotFilter =
          lotId === null
            ? Prisma.sql`"lotId" IS NULL`
            : Prisma.sql`"lotId" = ${lotId}`;

        const lockedRows = await tx.$queryRaw<
          Array<{ id: string; qtyCounted: Prisma.Decimal }>
        >(Prisma.sql`
          SELECT id, "qtyCounted"
          FROM "stocktake_counts"
          WHERE "sessionId" = ${id}
            AND "itemId" = ${cnt.itemId}
            AND ${lotFilter}
          FOR UPDATE
        `);

        if (lockedRows.length > 0) {
          const existingRecord = lockedRows[0];
          const oldQty = Number(existingRecord.qtyCounted);
          const newQty = cnt.qtyCounted;

          await tx.stocktakeCount.update({
            where: { id: existingRecord.id },
            data: {
              qtyCounted: newQty,
              countedById: userId,
              countedAt: new Date(),
            },
          });

          // Write Audit Log
          await this.auditLogService.log(tx, {
            userId,
            action: 'STOCKTAKE_COUNT_UPDATED',
            targetTable: 'stocktake_counts',
            targetId: existingRecord.id,
            beforeState: {
              qtyCounted: oldQty,
              itemId: cnt.itemId,
              lotId,
            },
            afterState: {
              qtyCounted: newQty,
              itemId: cnt.itemId,
              lotId,
            },
          });
        } else {
          const newRecord = await tx.stocktakeCount.create({
            data: {
              sessionId: id,
              itemId: cnt.itemId,
              lotId,
              qtyCounted: cnt.qtyCounted,
              countedById: userId,
            },
          });

          // Write Audit Log
          await this.auditLogService.log(tx, {
            userId,
            action: 'STOCKTAKE_COUNT_CREATED',
            targetTable: 'stocktake_counts',
            targetId: newRecord.id,
            beforeState: {
              qtyCounted: 0,
              itemId: cnt.itemId,
              lotId,
            },
            afterState: {
              qtyCounted: cnt.qtyCounted,
              itemId: cnt.itemId,
              lotId,
            },
          });
        }
      }

      if (session.status === 'STARTED') {
        await tx.stocktakeSession.update({
          where: { id },
          data: { status: 'COUNTING' },
        });
      }

      return { success: true };
    });
  }

  async updateLineItem(
    stocktakeId: string,
    lineId: string,
    body: { counted_qty: number; variance_reason?: string },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.stocktakeSnapshot.findUnique({
        where: { id: lineId },
      });

      if (!snapshot) {
        throw new NotFoundException(
          `Stocktake snapshot line ${lineId} not found`,
        );
      }

      const lotFilter =
        snapshot.lotId === null
          ? Prisma.sql`"lotId" IS NULL`
          : Prisma.sql`"lotId" = ${snapshot.lotId}`;

      const lockedRows = await tx.$queryRaw<
        Array<{ id: string; qtyCounted: Prisma.Decimal }>
      >(Prisma.sql`
        SELECT id, "qtyCounted"
        FROM "stocktake_counts"
        WHERE "sessionId" = ${stocktakeId}
          AND "itemId" = ${snapshot.itemId}
          AND ${lotFilter}
        FOR UPDATE
      `);

      if (lockedRows.length > 0) {
        const existingRecord = lockedRows[0];
        const oldQty = Number(existingRecord.qtyCounted);
        const newQty = body.counted_qty;

        await tx.stocktakeCount.update({
          where: { id: existingRecord.id },
          data: {
            qtyCounted: newQty,
            countedById: userId,
            countedAt: new Date(),
          },
        });

        // Write Audit Log
        await this.auditLogService.log(tx, {
          userId,
          action: 'STOCKTAKE_COUNT_UPDATED',
          targetTable: 'stocktake_counts',
          targetId: existingRecord.id,
          beforeState: {
            qtyCounted: oldQty,
            itemId: snapshot.itemId,
            lotId: snapshot.lotId,
          },
          afterState: {
            qtyCounted: newQty,
            itemId: snapshot.itemId,
            lotId: snapshot.lotId,
          },
        });
      } else {
        const newRecord = await tx.stocktakeCount.create({
          data: {
            sessionId: stocktakeId,
            itemId: snapshot.itemId,
            lotId: snapshot.lotId || null,
            qtyCounted: body.counted_qty,
            countedById: userId,
          },
        });

        // Write Audit Log
        await this.auditLogService.log(tx, {
          userId,
          action: 'STOCKTAKE_COUNT_CREATED',
          targetTable: 'stocktake_counts',
          targetId: newRecord.id,
          beforeState: {
            qtyCounted: 0,
            itemId: snapshot.itemId,
            lotId: snapshot.lotId,
          },
          afterState: {
            qtyCounted: body.counted_qty,
            itemId: snapshot.itemId,
            lotId: snapshot.lotId,
          },
        });
      }

      // Advance status to COUNTING if not already
      const session = await tx.stocktakeSession.findUnique({
        where: { id: stocktakeId },
      });
      if (session && session.status === 'STARTED') {
        await tx.stocktakeSession.update({
          where: { id: stocktakeId },
          data: { status: 'COUNTING' },
        });
      }

      return this.findOne(stocktakeId, tx);
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
      'stocktakeSession',
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
      'stocktakeSession',
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
      'stocktakeSession',
      'REJECT',
      userId,
      userRole,
      body.comments,
      body.version,
      body.ipAddress,
    );
    return this.findOne(id);
  }

  async recount(
    id: string,
    body: { item_ids?: string[]; version?: number; ipAddress?: string },
    userId: string,
    userRole: Role,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.stocktakeSession.findUnique({
        where: { id },
      });
      if (!session) {
        throw new NotFoundException(`StocktakeSession ${id} not found`);
      }

      // 1. Clear existing counts
      await tx.stocktakeCount.deleteMany({
        where: { sessionId: id },
      });

      // 2. Clear existing snapshots
      await tx.stocktakeSnapshot.deleteMany({
        where: { sessionId: id },
      });

      // 3. Fetch current inventory positions to re-generate snapshots
      const whItems = await tx.warehouseItem.findMany({
        where: { warehouseId: session.warehouseId },
        include: { item: true },
      });

      const whLots = await tx.warehouseItemLot.findMany({
        where: { warehouseId: session.warehouseId },
        include: { item: true },
      });

      const snapshotsToCreate: Array<{
        sessionId: string;
        itemId: string;
        lotId: string | null;
        qtySnapshot: number;
        wacSnapshot: number;
      }> = [];

      // A. Batched / Expiry Lots
      for (const lot of whLots) {
        const parentItem = whItems.find((wi) => wi.itemId === lot.itemId);
        snapshotsToCreate.push({
          sessionId: id,
          itemId: lot.itemId,
          lotId: lot.lotId,
          qtySnapshot: Number(lot.qtyOnHand),
          wacSnapshot: parentItem ? Number(parentItem.wac) : 0,
        });
      }

      // B. Unbatched Items
      for (const item of whItems) {
        if (!item.item.isBatched && !item.item.hasExpiry) {
          snapshotsToCreate.push({
            sessionId: id,
            itemId: item.itemId,
            lotId: null,
            qtySnapshot: Number(item.qtyOnHand),
            wacSnapshot: Number(item.wac),
          });
        }
      }

      if (snapshotsToCreate.length > 0) {
        await tx.stocktakeSnapshot.createMany({
          data: snapshotsToCreate,
        });
      }

      await this.workflowService.executeTransition(
        id,
        'stocktakeSession',
        'RECOUNT',
        userId,
        userRole,
        `Full recount requested. Snapshots re-generated.`,
        body.version,
        body.ipAddress,
        tx,
      );

      return this.findOne(id, tx);
    });
  }

  async reviewVariance(
    id: string,
    body: {
      items: Array<{ line_id: string; variance_reason?: string }>;
      version?: number;
      ipAddress?: string;
    },
    userId: string,
    userRole: Role,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.stocktakeSession.findUnique({
        where: { id },
      });
      if (!session) {
        throw new NotFoundException(`StocktakeSession ${id} not found`);
      }

      await this.workflowService.executeTransition(
        id,
        'stocktakeSession',
        'REVIEW_VARIANCE',
        userId,
        userRole,
        'Variance review submitted',
        body.version,
        body.ipAddress,
        tx,
      );

      return this.findOne(id, tx);
    });
  }

  async cancel(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.stocktakeSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundException(`StocktakeSession with ID ${id} not found`);
      }

      await tx.warehouse.update({
        where: { id: session.warehouseId },
        data: { isLocked: false },
      });

      await tx.warehouseLock.updateMany({
        where: { warehouseId: session.warehouseId, isActive: true },
        data: { isActive: false },
      });

      await tx.warehouseItem.updateMany({
        where: { warehouseId: session.warehouseId, isFrozen: true },
        data: { isFrozen: false },
      });

      await this.workflowService.executeTransition(
        id,
        'stocktakeSession',
        'CANCEL',
        userId,
        userRole,
        body.comments,
        body.version,
        body.ipAddress,
        tx,
      );

      return this.findOne(id, tx);
    });
  }
}

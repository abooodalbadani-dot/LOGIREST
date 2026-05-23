import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { Role, StocktakeStatus, LockType } from '@prisma/client';

@Injectable()
export class StocktakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
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

  async findOne(id: string) {
    const session = await this.prisma.stocktakeSession.findUnique({
      where: { id },
      include: {
        counts: {
          include: {
            countedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        snapshots: true,
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
      return this.workflowService.executeTransition(
        id,
        'stocktakeSession',
        'START',
        userId,
        userRole,
        body.comments,
        body.version,
        body.ipAddress,
      );
    });
  }

  async count(
    id: string,
    counts: Array<{ itemId: string; lotId?: string; qtyCounted: number }>,
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

    // In a transaction, upsert counts and transition to COUNTING status if currently STARTED
    return this.prisma.$transaction(async (tx) => {
      for (const cnt of counts) {
        const countKey = {
          sessionId: id,
          itemId: cnt.itemId,
          lotId: cnt.lotId || null,
        };

        // Check if count already exists
        const existingCount = await tx.stocktakeCount.findFirst({
          where: countKey,
        });

        if (existingCount) {
          await tx.stocktakeCount.update({
            where: { id: existingCount.id },
            data: {
              qtyCounted: cnt.qtyCounted,
              countedById: userId,
              countedAt: new Date(),
            },
          });
        } else {
          await tx.stocktakeCount.create({
            data: {
              sessionId: id,
              itemId: cnt.itemId,
              lotId: cnt.lotId || null,
              qtyCounted: cnt.qtyCounted,
              countedById: userId,
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

  async submit(
    id: string,
    userId: string,
    userRole: Role,
    body: { comments?: string; version?: number; ipAddress?: string },
  ) {
    return this.workflowService.executeTransition(
      id,
      'stocktakeSession',
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
      'stocktakeSession',
      'APPROVE',
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
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.stocktakeSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new NotFoundException(`StocktakeSession with ID ${id} not found`);
      }

      // Release locks
      await tx.warehouse.update({
        where: { id: session.warehouseId },
        data: { isLocked: false },
      });

      await tx.warehouseLock.updateMany({
        where: { warehouseId: session.warehouseId, isActive: true },
        data: { isActive: false },
      });

      // Execute Workflow transition
      return this.workflowService.executeTransition(
        id,
        'stocktakeSession',
        'CANCEL',
        userId,
        userRole,
        body.comments,
        body.version,
        body.ipAddress,
      );
    });
  }
}

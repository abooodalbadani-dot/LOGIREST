import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  InventoryBalanceQuery,
  InventoryLotsQuery,
  InventoryMovementsQuery,
} from '@logirest/shared-types';
import { LotStatus, Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(warehouseId: string, query: InventoryBalanceQuery) {
    const whereClause: any = { warehouseId };

    if (query.itemId) {
      whereClause.itemId = query.itemId;
    }

    if (query.categoryId || query.search) {
      whereClause.item = {};
      if (query.categoryId) {
        whereClause.item.categoryId = query.categoryId;
      }
      if (query.search) {
        whereClause.item.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ];
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.warehouseItem.findMany({
        where: whereClause,
        include: {
          item: {
            include: {
              category: true,
              unitOfMeasure: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          item: {
            name: 'asc',
          },
        },
      }),
      this.prisma.warehouseItem.count({
        where: whereClause,
      }),
    ]);

    const data = items.map((wItem) => ({
      itemId: wItem.itemId,
      itemCode: wItem.item.sku,
      itemName: wItem.item.name,
      categoryName: wItem.item.category.name,
      onHandQty: Number(wItem.qtyOnHand),
      weightedAvgCost: Number(wItem.wac),
      defaultUomSymbol: wItem.item.unitOfMeasure.code,
    }));

    return {
      data,
      meta: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getLots(warehouseId: string, query: InventoryLotsQuery) {
    const whereClause: any = { warehouseId };

    if (query.itemId) {
      whereClause.itemId = query.itemId;
    }

    if (query.status) {
      whereClause.lot = {
        status: query.status,
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [lots, total] = await Promise.all([
      this.prisma.warehouseItemLot.findMany({
        where: whereClause,
        include: {
          item: true,
          lot: true,
        },
        skip,
        take: limit,
        orderBy: {
          lot: {
            expiryDate: 'asc',
          },
        },
      }),
      this.prisma.warehouseItemLot.count({
        where: whereClause,
      }),
    ]);

    const data = lots.map((wLot) => ({
      lotId: wLot.lotId,
      lotNumber: wLot.lot.lotNumber,
      itemId: wLot.itemId,
      itemCode: wLot.item.sku,
      itemName: wLot.item.name,
      onHandQty: Number(wLot.qtyOnHand),
      expiryDate: wLot.lot.expiryDate,
      status: wLot.lot.status,
    }));

    return {
      data,
      meta: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getMovements(warehouseId: string, query: InventoryMovementsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const itemIdFilter = query.itemId
      ? Prisma.sql`AND sl."itemId" = ${query.itemId}`
      : Prisma.empty;

    // Retrieve raw movements with calculated running balance using window functions (T024)
    const rawMovements = await this.prisma.$queryRaw<any[]>`
      WITH movements_with_balance AS (
        SELECT 
          sl.id,
          sl."postedAt" as "timestamp",
          sl."itemId",
          i.sku as "itemCode",
          i.name as "itemName",
          sl."documentType" as "transactionType",
          sl."documentId" as "documentReference",
          sl.quantity::float as quantity,
          SUM(sl.quantity) OVER (
            PARTITION BY sl."itemId" 
            ORDER BY sl."postedAt" ASC, sl.id ASC
          )::float as "balanceAfter",
          sl."postedAt" as raw_posted_at
        FROM stock_ledger sl
        INNER JOIN items i ON i.id = sl."itemId"
        WHERE sl."warehouseId" = ${warehouseId}
          ${itemIdFilter}
      )
      SELECT m.*, COALESCE(u.name, 'System User') as "performedByUserName"
      FROM movements_with_balance m
      LEFT JOIN LATERAL (
        SELECT usr.name
        FROM approval_events ae
        INNER JOIN users usr ON usr.id = ae."userId"
        WHERE ae."documentId" = m."documentReference" 
          AND ae."documentType" = m."transactionType"::"DocumentType"
        ORDER BY ae."stepNumber" DESC
        LIMIT 1
      ) u ON true
      WHERE 1=1
        ${query.startDate ? Prisma.sql`AND m.raw_posted_at >= ${new Date(query.startDate)}` : Prisma.empty}
        ${query.endDate ? Prisma.sql`AND m.raw_posted_at <= ${new Date(query.endDate)}` : Prisma.empty}
      ORDER BY m.raw_posted_at DESC, m.id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Retrieve total count matching the filters
    const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM stock_ledger sl
      WHERE sl."warehouseId" = ${warehouseId}
        ${itemIdFilter}
        ${query.startDate ? Prisma.sql`AND sl."postedAt" >= ${new Date(query.startDate)}` : Prisma.empty}
        ${query.endDate ? Prisma.sql`AND sl."postedAt" <= ${new Date(query.endDate)}` : Prisma.empty}
    `;
    const total = Number(totalResult[0]?.count || 0);

    const data = rawMovements.map((movement) => ({
      id: movement.id,
      timestamp: movement.timestamp,
      itemId: movement.itemId,
      itemName: movement.itemName,
      transactionType: movement.transactionType,
      documentReference: movement.documentReference,
      quantity: Number(movement.quantity),
      balanceAfter: Number(movement.balanceAfter),
      performedByUserName: movement.performedByUserName,
    }));

    return {
      data,
      meta: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async scanBarcode(warehouseId: string, barcode: string) {
    const mapping = await this.prisma.barcodeMapping.findUnique({
      where: { barcode },
      include: {
        item: {
          include: {
            unitOfMeasure: true,
          },
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(
        `No item registered for barcode '${barcode}'`,
      );
    }

    const activeLots = await this.prisma.warehouseItemLot.findMany({
      where: {
        warehouseId,
        itemId: mapping.itemId,
        qtyOnHand: { gt: 0 },
      },
      include: {
        lot: true,
      },
      orderBy: {
        lot: {
          expiryDate: 'asc',
        },
      },
    });

    return {
      itemId: mapping.itemId,
      itemCode: mapping.item.sku,
      itemName: mapping.item.name,
      uomId: mapping.item.uomId,
      uomSymbol: mapping.item.unitOfMeasure.code,
      conversionFactor: 1.0, // Base UoM conversion factor is always 1.0 for main scanning
      activeLots: activeLots.map((wLot) => ({
        lotId: wLot.lotId,
        lotNumber: wLot.lot.lotNumber,
        onHandQty: Number(wLot.qtyOnHand),
        expiryDate: wLot.lot.expiryDate,
      })),
    };
  }

  async unfreeze(
    itemId: string,
    warehouseId: string,
    userId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const whItem = await this.prisma.warehouseItem.findUnique({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId,
        },
      },
    });

    if (!whItem) {
      throw new NotFoundException(
        `Warehouse item with ID ${itemId} not found in the active warehouse.`,
      );
    }

    if (!whItem.isFrozen) {
      throw new BadRequestException('Warehouse item is not frozen.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.warehouseItem.update({
        where: {
          warehouseId_itemId: {
            warehouseId,
            itemId,
          },
        },
        data: {
          isFrozen: false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'INVENTORY_UNFREEZE',
          targetTable: 'warehouse_items',
          targetId: `${warehouseId}_${itemId}`,
          beforeStateJson: JSON.stringify({
            qtyOnHand: Number(whItem.qtyOnHand),
            qtyAllocated: Number(whItem.qtyAllocated),
            wac: Number(whItem.wac),
            isFrozen: whItem.isFrozen,
          }),
          afterStateJson: JSON.stringify({
            qtyOnHand: Number(updated.qtyOnHand),
            qtyAllocated: Number(updated.qtyAllocated),
            wac: Number(updated.wac),
            isFrozen: updated.isFrozen,
            unfreezeReason: reason,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updated;
    });
  }

  async quarantineLot(lotId: string, userId: string) {
    const lot = await this.prisma.lot.findUnique({
      where: { id: lotId },
    });

    if (!lot) {
      throw new NotFoundException(`Lot with ID ${lotId} not found.`);
    }

    if (lot.status === 'QUARANTINE') {
      return lot;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lot.update({
        where: { id: lotId },
        data: {
          status: 'QUARANTINE',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOT_QUARANTINE',
          targetTable: 'lots',
          targetId: lotId,
          beforeStateJson: JSON.stringify({ status: lot.status }),
          afterStateJson: JSON.stringify({ status: 'QUARANTINE' }),
        },
      });

      return updated;
    });
  }

  async releaseQuarantineLot(lotId: string, userId: string) {
    const lot = await this.prisma.lot.findUnique({
      where: { id: lotId },
    });

    if (!lot) {
      throw new NotFoundException(`Lot with ID ${lotId} not found.`);
    }

    if (lot.status !== 'QUARANTINE') {
      throw new BadRequestException('Lot is not currently quarantined.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lot.update({
        where: { id: lotId },
        data: {
          status: 'ACTIVE',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOT_RELEASE_QUARANTINE',
          targetTable: 'lots',
          targetId: lotId,
          beforeStateJson: JSON.stringify({ status: 'QUARANTINE' }),
          afterStateJson: JSON.stringify({ status: 'ACTIVE' }),
        },
      });

      return updated;
    });
  }

  async getWarehouseLock(warehouseId: string) {
    const now = new Date();
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { isLocked: true },
    });

    const activeLock = await this.prisma.warehouseLock.findFirst({
      where: {
        warehouseId,
        isActive: true,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    const isLocked = !!(warehouse?.isLocked || activeLock);

    const activeSession = await this.prisma.stocktakeSession.findFirst({
      where: {
        warehouseId,
        status: {
          in: ['STARTED', 'COUNTING', 'REVIEW'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isLocked,
      sessionId: activeSession?.id || activeLock?.id || null,
      sessionNumber:
        activeSession?.sessionNumber ||
        (activeLock ? `LOCK-${activeLock.lockType}` : null),
      lockStartedAt:
        activeSession?.createdAt?.toISOString() ||
        activeLock?.createdAt?.toISOString() ||
        null,
    };
  }
}

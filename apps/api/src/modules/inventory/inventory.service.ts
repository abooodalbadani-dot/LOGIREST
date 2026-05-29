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
import { LotStatus } from '@prisma/client';

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

    const items = await this.prisma.warehouseItem.findMany({
      where: whereClause,
      include: {
        item: {
          include: {
            category: true,
            unitOfMeasure: true,
          },
        },
      },
    });

    return items.map((wItem) => ({
      itemId: wItem.itemId,
      itemCode: wItem.item.sku,
      itemName: wItem.item.name,
      categoryName: wItem.item.category.name,
      onHandQty: Number(wItem.qtyOnHand),
      weightedAvgCost: Number(wItem.wac),
      defaultUomSymbol: wItem.item.unitOfMeasure.code,
    }));
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

    const lots = await this.prisma.warehouseItemLot.findMany({
      where: whereClause,
      include: {
        item: true,
        lot: true,
      },
      orderBy: {
        lot: {
          expiryDate: 'asc',
        },
      },
    });

    return lots.map((wLot) => ({
      lotId: wLot.lotId,
      lotNumber: wLot.lot.lotNumber,
      itemId: wLot.itemId,
      itemCode: wLot.item.sku,
      itemName: wLot.item.name,
      onHandQty: Number(wLot.qtyOnHand),
      expiryDate: wLot.lot.expiryDate,
      status: wLot.lot.status,
    }));
  }

  async getMovements(warehouseId: string, query: InventoryMovementsQuery) {
    const whereClause: any = { warehouseId };

    if (query.itemId) {
      whereClause.itemId = query.itemId;
    }

    if (query.startDate || query.endDate) {
      whereClause.postedAt = {};
      if (query.startDate) {
        whereClause.postedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereClause.postedAt.lte = new Date(query.endDate);
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, movements] = await Promise.all([
      this.prisma.stockLedger.count({ where: whereClause }),
      this.prisma.stockLedger.findMany({
        where: whereClause,
        include: {
          item: true,
          lot: true,
        },
        orderBy: {
          postedAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const data = movements.map((movement) => ({
      id: movement.id,
      timestamp: movement.postedAt,
      itemId: movement.itemId,
      itemName: movement.item.name,
      transactionType: movement.documentType,
      documentReference: movement.documentId, // Reference the triggering doc uuid/name
      quantity: Number(movement.quantity),
      balanceAfter: 0, // Calculated progressively in UI or placeholder
      performedByUserName: 'System User', // Logged user name
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { isLocked: true },
    });

    const activeLock = await this.prisma.warehouseLock.findFirst({
      where: {
        warehouseId,
        isActive: true,
      },
    });

    const isLocked = !!(warehouse?.isLocked || activeLock);

    const activeSession = await this.prisma.stocktakeSession.findFirst({
      where: {
        warehouseId,
        status: {
          notIn: ['POSTED', 'CANCELLED'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isLocked,
      sessionId: activeSession?.id || activeLock?.id || null,
      sessionNumber: activeSession?.sessionNumber || (activeLock ? `LOCK-${activeLock.lockType}` : null),
      lockStartedAt: activeSession?.createdAt?.toISOString() || activeLock?.createdAt?.toISOString() || null,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
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
        status: query.status as LotStatus,
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
      throw new NotFoundException(`No item registered for barcode '${barcode}'`);
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
}

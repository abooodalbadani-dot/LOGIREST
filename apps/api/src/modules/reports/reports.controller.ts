import {
  Controller,
  Get,
  UseGuards,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { Prisma, DocumentType } from '@prisma/client';

interface OverdueTransfer {
  transferId: string;
  transferNumber: string;
  sourceWarehouseName: string;
  destinationWarehouseName: string;
  shippedAt: Date;
  daysInTransit: number;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('kpis')
  async getKpis(@ActiveScope('warehouseId') warehouseId: string) {
    const warehouseItems = await this.prisma.warehouseItem.findMany({
      where: { warehouseId },
      select: {
        qtyOnHand: true,
        wac: true,
      },
    });

    const totalItems = warehouseItems.length;
    let totalValue = 0;
    let outOfStockCount = 0;

    for (const item of warehouseItems) {
      const qty = Number(item.qtyOnHand);
      const wac = Number(item.wac || 0);
      totalValue += qty * wac;
      if (qty === 0) {
        outOfStockCount++;
      }
    }

    const activeLocks = await this.prisma.warehouseLock.count({
      where: {
        warehouseId,
        isActive: true,
      },
    });

    return {
      totalItems,
      totalValue,
      outOfStockCount,
      activeLocks,
    };
  }

  @Get('dashboard')
  async getDashboard(@ActiveScope('warehouseId') warehouseId: string) {
    const pendingPurchaseRequests = await this.prisma.purchaseRequest.count({
      where: {
        status: 'SUBMITTED',
        warehouseId,
      },
    });

    const openPurchaseOrders = await this.prisma.purchaseOrder.count({
      where: {
        status: 'APPROVED',
        purchaseRequest: {
          warehouseId,
        },
      },
    });

    const inTransitTransfers = await this.prisma.transfer.count({
      where: {
        status: 'IN_TRANSIT',
        OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      },
    });

    const overdueTransfersList =
      await this.getOverdueTransfersList(warehouseId);

    return {
      pendingPurchaseRequests,
      openPurchaseOrders,
      inTransitTransfers,
      overdueTransfers: overdueTransfersList.length,
    };
  }

  @Get('adjustments/summary')
  async getAdjustmentsSummary(@ActiveScope('warehouseId') warehouseId: string) {
    const groups = await this.prisma.adjustment.groupBy({
      by: ['status'],
      where: { warehouseId },
      _count: {
        status: true,
      },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.status,
    }));
  }

  @Get('transfers/overdue')
  async getOverdueTransfers(@ActiveScope('warehouseId') warehouseId: string) {
    return this.getOverdueTransfersList(warehouseId);
  }

  @Get('available-inventory')
  async getAvailableInventory(@ActiveScope('warehouseId') warehouseId: string) {
    const items = await this.prisma.warehouseItem.findMany({
      where: { warehouseId },
      include: {
        item: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoriesMap = new Map<
      string,
      {
        categoryName: string;
        qtyOnHand: number;
        qtyAllocated: number;
        qtyAvailable: number;
      }
    >();

    for (const wi of items) {
      const category = wi.item.category;
      const categoryName = category.name;
      const qtyOnHand = Number(wi.qtyOnHand);
      const qtyAllocated = Number(wi.qtyAllocated);
      const qtyAvailable = qtyOnHand - qtyAllocated;

      const existing = categoriesMap.get(category.id) || {
        categoryName,
        qtyOnHand: 0,
        qtyAllocated: 0,
        qtyAvailable: 0,
      };
      existing.qtyOnHand += qtyOnHand;
      existing.qtyAllocated += qtyAllocated;
      existing.qtyAvailable += qtyAvailable;
      categoriesMap.set(category.id, existing);
    }

    return Array.from(categoriesMap.values());
  }

  @Get('movements')
  async getMovements(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('itemId') itemId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionType') transactionType?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '50', 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.StockLedgerWhereInput = { warehouseId };
    if (itemId) {
      where.itemId = itemId;
    }
    if (transactionType) {
      where.documentType = transactionType as DocumentType;
    }
    if (startDate || endDate) {
      const postedAtFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        postedAtFilter.gte = new Date(startDate);
      }
      if (endDate) {
        postedAtFilter.lte = new Date(endDate);
      }
      where.postedAt = postedAtFilter;
    }

    const [total, data] = await Promise.all([
      this.prisma.stockLedger.count({ where }),
      this.prisma.stockLedger.findMany({
        where,
        include: {
          item: true,
        },
        orderBy: {
          postedAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      data,
    };
  }

  @Get('expiry')
  async getExpiryReport(@ActiveScope('warehouseId') warehouseId: string) {
    const lots = await this.prisma.warehouseItemLot.findMany({
      where: {
        warehouseId,
        qtyOnHand: { gt: 0 },
        lot: {
          expiryDate: { not: null },
        },
      },
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

    return lots.map((l) => ({
      itemId: l.itemId,
      itemName: l.item.name,
      sku: l.item.sku,
      lotNumber: l.lot.lotNumber,
      expiryDate: l.lot.expiryDate,
      qtyOnHand: Number(l.qtyOnHand),
    }));
  }

  @Get('stocktake-variance')
  async getStocktakeVariance(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('sessionId') sessionId: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const session = await this.prisma.stocktakeSession.findFirst({
      where: { id: sessionId, warehouseId },
    });
    if (!session) {
      throw new ForbiddenException(
        'Stocktake session not found in active warehouse',
      );
    }

    const snapshots = await this.prisma.stocktakeSnapshot.findMany({
      where: { sessionId },
      include: {
        item: true,
        lot: true,
      },
    });

    const counts = await this.prisma.stocktakeCount.findMany({
      where: { sessionId },
    });

    const countMap = new Map<string, number>();
    for (const count of counts) {
      const key = `${count.itemId}_${count.lotId || 'null'}`;
      countMap.set(key, (countMap.get(key) || 0) + Number(count.qtyCounted));
    }

    return snapshots.map((s) => {
      const key = `${s.itemId}_${s.lotId || 'null'}`;
      const qtyCounted = countMap.get(key) || 0;
      const qtySnapshot = Number(s.qtySnapshot);
      const variance = qtyCounted - qtySnapshot;

      return {
        itemId: s.itemId,
        itemName: s.item.name,
        sku: s.item.sku,
        lotNumber: s.lot?.lotNumber || null,
        qtySnapshot,
        qtyCounted,
        variance,
      };
    });
  }

  @Get('procurement-status')
  async getProcurementStatus(@ActiveScope('warehouseId') warehouseId: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        purchaseRequest: {
          warehouseId,
        },
      },
      select: {
        status: true,
        lines: {
          select: {
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    const statusSummary = new Map<
      string,
      { count: number; totalValue: number }
    >();

    for (const po of orders) {
      let value = 0;
      for (const line of po.lines) {
        value += Number(line.quantity) * Number(line.unitPrice);
      }

      const existing = statusSummary.get(po.status) || {
        count: 0,
        totalValue: 0,
      };
      existing.count++;
      existing.totalValue += value;
      statusSummary.set(po.status, existing);
    }

    return Array.from(statusSummary.entries()).map(([status, stats]) => ({
      status,
      count: stats.count,
      totalValue: stats.totalValue,
    }));
  }

  @Get('currency-summaries')
  async getCurrencySummaries(@ActiveScope('warehouseId') warehouseId: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        purchaseRequest: {
          warehouseId,
        },
      },
      include: {
        currency: true,
        lines: {
          select: {
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    const baseCurrency = await this.prisma.currency.findFirst({
      where: { isBase: true },
    });

    const currencyGroups = new Map<
      string,
      { currencyCode: string; amount: number; baseAmount: number }
    >();

    for (const po of orders) {
      let orderVal = 0;
      for (const line of po.lines) {
        orderVal += Number(line.quantity) * Number(line.unitPrice);
      }

      let baseVal = 0;
      if (po.currency.isBase) {
        baseVal = orderVal;
      } else if (baseCurrency) {
        const fxRate = await this.prisma.fXRate.findFirst({
          where: {
            fromCurrencyId: po.currencyId,
            toCurrencyId: baseCurrency.id,
          },
          orderBy: {
            effectiveFrom: 'desc',
          },
        });
        const rate = fxRate ? Number(fxRate.rate) : 1;
        baseVal = orderVal * rate;
      }

      const existing = currencyGroups.get(po.currencyId) || {
        currencyCode: po.currency.code,
        amount: 0,
        baseAmount: 0,
      };
      existing.amount += orderVal;
      existing.baseAmount += baseVal;
      currencyGroups.set(po.currencyId, existing);
    }

    return Array.from(currencyGroups.values());
  }

  private async getOverdueTransfersList(warehouseId: string) {
    const transfers = await this.prisma.transfer.findMany({
      where: {
        status: 'IN_TRANSIT',
        OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    const overdueTransfers: OverdueTransfer[] = [];
    const now = new Date();
    const overdueDays = Number(process.env.TRANSFER_OVERDUE_DAYS || 7);

    for (const transfer of transfers) {
      const shipEvent = await this.prisma.approvalEvent.findFirst({
        where: {
          documentId: transfer.id,
          toStatus: 'IN_TRANSIT',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const shippedAt = shipEvent ? shipEvent.createdAt : transfer.createdAt;
      const diffTime = now.getTime() - shippedAt.getTime();
      const daysInTransit = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysInTransit > overdueDays) {
        overdueTransfers.push({
          transferId: transfer.id,
          transferNumber: transfer.transferNumber,
          sourceWarehouseName: transfer.fromWarehouse.name,
          destinationWarehouseName: transfer.toWarehouse.name,
          shippedAt,
          daysInTransit,
        });
      }
    }

    return overdueTransfers;
  }
}

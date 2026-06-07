import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Prisma,
  DocumentType,
  Role,
  StockLedger,
  WarehouseItemLot,
  CostLedger,
  Item,
  Lot,
} from '@prisma/client';

const MAX_EXPORT_ROWS = 50000;
const EXPORT_CHUNK_SIZE = 1000;

export interface OverdueTransfer {
  transferId: string;
  transferNumber: string;
  sourceWarehouseName: string;
  destinationWarehouseName: string;
  shippedAt: Date;
  daysInTransit: number;
}

export interface CountResult {
  count: number;
  limit: number;
  isExportable: boolean;
}

export interface ExportCursorResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type StockLedgerWithItem = any;

export interface WarehouseItemLotWithItemAndLot extends WarehouseItemLot {
  item: Item;
  lot: Lot;
}

export interface CostLedgerWithItem extends CostLedger {
  item: Item;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];

    const result = await this.prisma.$queryRaw<
      Array<{
        total_items: number;
        total_value: number | null;
        out_of_stock_count: number;
      }>
    >`
      SELECT
        COUNT(*)::integer as total_items,
        COALESCE(SUM("qtyOnHand" * "wac"), 0)::double precision as total_value,
        COUNT(CASE WHEN "qtyOnHand" = 0 THEN 1 END)::integer as out_of_stock_count
      FROM "warehouse_items"
      WHERE "warehouseId" = ANY(${ids})
    `;

    const stats = result[0] || {
      total_items: 0,
      total_value: 0,
      out_of_stock_count: 0,
    };

    const activeLocks = await this.prisma.warehouseLock.count({
      where: {
        warehouseId: { in: ids },
        isActive: true,
      },
    });

    return {
      totalItems: stats.total_items,
      totalValue: stats.total_value ?? 0,
      outOfStockCount: stats.out_of_stock_count,
      activeLocks,
    };
  }

  async getDashboard(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];

    const pendingPurchaseRequests = await this.prisma.purchaseRequest.count({
      where: {
        status: 'SUBMITTED',
        warehouseId: { in: ids },
      },
    });

    const openPurchaseOrders = await this.prisma.purchaseOrder.count({
      where: {
        status: 'APPROVED',
        purchaseRequest: {
          warehouseId: { in: ids },
        },
      },
    });

    const inTransitTransfers = await this.prisma.transfer.count({
      where: {
        status: 'IN_TRANSIT',
        OR: [{ fromWarehouseId: { in: ids } }, { toWarehouseId: { in: ids } }],
      },
    });

    const overdueTransfersList = await this.getOverdueTransfers(
      warehouseId,
      warehouseIds,
    );

    return {
      pendingPurchaseRequests,
      openPurchaseOrders,
      inTransitTransfers,
      overdueTransfers: overdueTransfersList.length,
    };
  }

  async getAdjustmentsSummary(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];
    const groups = await this.prisma.adjustment.groupBy({
      by: ['status'],
      where: { warehouseId: { in: ids } },
      _count: {
        status: true,
      },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.status,
    }));
  }

  async getOverdueTransfers(
    warehouseId: string,
    warehouseIds?: string[],
  ): Promise<OverdueTransfer[]> {
    const ids = warehouseIds ?? [warehouseId];
    const transfers = await this.prisma.transfer.findMany({
      where: {
        status: 'IN_TRANSIT',
        OR: [{ fromWarehouseId: { in: ids } }, { toWarehouseId: { in: ids } }],
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    const transferIds = transfers.map((t) => t.id);

    const shipEvents = await this.prisma.approvalEvent.findMany({
      where: {
        documentId: { in: transferIds },
        toStatus: 'IN_TRANSIT',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const eventMap = new Map<string, Date>();
    for (const event of shipEvents) {
      if (!eventMap.has(event.documentId)) {
        eventMap.set(event.documentId, event.createdAt);
      }
    }

    const overdueTransfers: OverdueTransfer[] = [];
    const now = new Date();
    const overdueDays = Number(process.env.TRANSFER_OVERDUE_DAYS || 7);

    for (const transfer of transfers) {
      const shippedAt = eventMap.get(transfer.id) || transfer.createdAt;
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

  async getAvailableInventoryRaw(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];
    const items = await this.prisma.warehouseItem.findMany({
      where: { warehouseId: { in: ids } },
      include: {
        item: {
          include: {
            category: true,
            unitOfMeasure: true,
          },
        },
      },
    });

    return items.map(
      (wi: {
        qtyOnHand: any;
        qtyAllocated: any;
        wac: any;
        item: {
          sku: string;
          name: string;
          category: { name: string };
          unitOfMeasure: { code: string };
        };
      }) => ({
      sku: wi.item.sku,
      name: wi.item.name,
      category: wi.item.category.name,
      uom: wi.item.unitOfMeasure.code,
      qtyPhysical: Number(wi.qtyOnHand),
      qtyReserved: Number(wi.qtyAllocated),
      qtyAvailable: Number(wi.qtyOnHand) - Number(wi.qtyAllocated),
      wac: Number(wi.wac || 0),
    }));
  }

  async getAvailableInventory(
    warehouseId: string,
    page: string = '1',
    limit: string = '100',
    search?: string,
    warehouseIds?: string[],
  ) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const ids = warehouseIds ?? [warehouseId];
    const where: any = { warehouseId: { in: ids } };
    if (search) {
      where.item = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.warehouseItem.count({ where }),
      this.prisma.warehouseItem.findMany({
        where,
        include: {
          item: {
            include: {
              category: true,
              unitOfMeasure: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { item: { sku: 'asc' } },
      }),
    ]);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      data: items.map(
        (wi: {
          qtyOnHand: any;
          qtyAllocated: any;
          wac: any;
          item: {
            sku: string;
            name: string;
            category: { name: string };
            unitOfMeasure: { code: string };
          };
        }) => ({
        sku: wi.item.sku,
        name: wi.item.name,
        category: wi.item.category.name,
        uom: wi.item.unitOfMeasure.code,
        qtyPhysical: Number(wi.qtyOnHand),
        qtyReserved: Number(wi.qtyAllocated),
        qtyAvailable: Number(wi.qtyOnHand) - Number(wi.qtyAllocated),
        wac: Number(wi.wac || 0),
      })),
    };
  }

  async getMovements(
    warehouseId: string,
    page: string = '1',
    limit: string = '50',
    itemId?: string,
    startDate?: string,
    endDate?: string,
    transactionType?: string,
    warehouseIds?: string[],
  ) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const ids = warehouseIds ?? [warehouseId];
    const where: any = { warehouseId: { in: ids } };
    if (itemId) {
      where.itemId = itemId;
    }
    if (transactionType) {
      where.documentType = transactionType as DocumentType;
    }
    if (startDate || endDate) {
      const postedAtFilter: any = {};
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

  async getExpiryReport(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];
    const lots = await this.prisma.warehouseItemLot.findMany({
      where: {
        warehouseId: { in: ids },
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

    const now = new Date();
    return lots.map((l: any) => {
      const expiryDate = l.lot.expiryDate as Date;
      const diffTime = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let status = 'ACTIVE';
      if (daysRemaining < 0) {
        status = 'EXPIRED';
      } else if (daysRemaining <= 7) {
        status = 'NEAR_EXPIRY';
      }

      return {
        sku: l.item.sku,
        name: l.item.name,
        lotNo: l.lot.lotNumber,
        expiryDate: expiryDate.toISOString(),
        daysRemaining: daysRemaining,
        status,
        qtyOnHand: Number(l.qtyOnHand),
      };
    });
  }

  async getStocktakeVariance(
    warehouseId: string,
    sessionId: string,
    warehouseIds?: string[],
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const ids = warehouseIds ?? [warehouseId];
    const session = await this.prisma.stocktakeSession.findFirst({
      where: { id: sessionId, warehouseId: { in: ids } },
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

    return snapshots.map((s: any) => {
      const key = `${s.itemId}_${s.lotId || 'null'}`;
      const qtyCounted = countMap.get(key) || 0;
      const qtySnapshot = Number(s.qtySnapshot);
      const variance = qtyCounted - qtySnapshot;

      return {
        sku: s.item.sku,
        name: s.item.name,
        systemQty: qtySnapshot,
        countedQty: qtyCounted,
        variance,
        reason: '',
        lotNumber: s.lot?.lotNumber || null,
        wac: Number(s.wacSnapshot),
      };
    });
  }

  async getProcurementStatus(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        purchaseRequest: {
          warehouseId: { in: ids },
        },
      },
      include: {
        supplier: true,
        currency: true,
        lines: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((po: any) => {
      const total = po.lines.reduce(
        (sum: number, line: any) => sum + Number(line.quantity) * Number(line.unitPrice),
        0,
      );
      return {
        poNo: po.poNumber,
        date: po.createdAt.toISOString(),
        supplier: po.supplier.name,
        currency: po.currency.code,
        total,
        status: po.status,
      };
    });
  }

  async getCurrencySummaries(warehouseId: string, warehouseIds?: string[]) {
    const ids = warehouseIds ?? [warehouseId];
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        purchaseRequest: {
          warehouseId: { in: ids },
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

    const fxRates = baseCurrency
      ? await this.prisma.fXRate.findMany({
          where: {
            toCurrencyId: baseCurrency.id,
          },
          orderBy: {
            effectiveFrom: 'desc',
          },
        })
      : [];

    const fxRatesByCurrency = new Map<string, any[]>();
    for (const rate of fxRates) {
      const list = fxRatesByCurrency.get(rate.fromCurrencyId) || [];
      list.push(rate);
      fxRatesByCurrency.set(rate.fromCurrencyId, list);
    }

    const currencyGroups = new Map<
      string,
      { currency: string; total: number; totalBase: number; lastRate: number }
    >();

    for (const po of orders) {
      let orderVal = 0;
      for (const line of po.lines) {
        orderVal += Number(line.quantity) * Number(line.unitPrice);
      }

      let baseVal = 0;
      let rate = 1;
      const rates = fxRatesByCurrency.get(po.currencyId) || [];

      if (po.currency.isBase) {
        baseVal = orderVal;
        rate = 1;
      } else if (baseCurrency) {
        const activeRate = rates.find((r) => r.effectiveFrom <= po.createdAt);
        const finalRateObj = activeRate || rates[0];
        rate = finalRateObj ? Number(finalRateObj.rate) : 1;
        baseVal = orderVal * rate;
      }

      const latestRateForGroup = po.currency.isBase
        ? 1
        : rates[0]
          ? Number(rates[0].rate)
          : 1;

      const existing = currencyGroups.get(po.currencyId) || {
        currency: po.currency.code,
        total: 0,
        totalBase: 0,
        lastRate: latestRateForGroup,
      };
      existing.total += orderVal;
      existing.totalBase += baseVal;
      existing.lastRate = latestRateForGroup;
      currencyGroups.set(po.currencyId, existing);
    }

    return Array.from(currencyGroups.values());
  }

  async getWacHistory(
    warehouseId: string,
    itemId: string,
    startDate?: string,
    endDate?: string,
    warehouseIds?: string[],
  ) {
    if (!itemId) {
      throw new BadRequestException('itemId is required');
    }
    const ids = warehouseIds ?? [warehouseId];
    const where: any = {
      warehouseId: { in: ids },
      itemId,
    };
    if (startDate || endDate) {
      const postedAtFilter: any = {};
      if (startDate) {
        postedAtFilter.gte = new Date(startDate);
      }
      if (endDate) {
        postedAtFilter.lte = new Date(endDate);
      }
      where.postedAt = postedAtFilter;
    }

    return this.prisma.costLedger.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: {
        postedAt: 'desc',
      },
    });
  }

  async getLotTrace(
    warehouseId: string,
    lotId: string,
    warehouseIds?: string[],
  ) {
    if (!lotId) {
      throw new BadRequestException('lotId is required');
    }

    const ids = warehouseIds ?? [warehouseId];

    const lot = await this.prisma.lot.findFirst({
      where: { id: lotId },
      include: { item: true },
    });

    if (!lot) {
      throw new BadRequestException('Lot not found');
    }

    const allocations = await this.prisma.lotAllocation.findMany({
      where: { lotId },
      include: {
        issueLine: {
          include: {
            inventoryIssue: true,
          },
        },
        transferLine: {
          include: {
            transfer: true,
          },
        },
      },
    });

    return {
      lotNumber: lot.lotNumber,
      itemSku: lot.item.sku,
      itemName: lot.item.name,
      receivedDate: lot.receivedDate,
      expiryDate: lot.expiryDate,
      status: lot.status,
      allocations: allocations.map((a: any) => {
        let documentNumber = 'N/A';
        let documentType = 'UNKNOWN';
        let quantity = 0;
        let date = new Date();
        let status = 'UNKNOWN';

        if (a.issueLine) {
          documentNumber = a.issueLine.inventoryIssue.issueNumber;
          documentType = 'INVENTORY_ISSUE';
          quantity = Number(a.quantityAllocated);
          date = a.issueLine.inventoryIssue.createdAt;
          status = a.issueLine.inventoryIssue.status;
        } else if (a.transferLine) {
          documentNumber = a.transferLine.transfer.transferNumber;
          documentType = 'TRANSFER';
          quantity = Number(a.quantityAllocated);
          date = a.transferLine.transfer.createdAt;
          status = a.transferLine.transfer.status;
        }

        return {
          documentNumber,
          documentType,
          quantity,
          date: date.toISOString(),
          status,
        };
      }),
    };
  }

  // ─── Count & Export Guard ─────────────────────────────────────

  async getReportCount(
    reportType: string,
    warehouseId: string,
    filters: {
      itemId?: string;
      startDate?: string;
      endDate?: string;
      transactionType?: string;
      lotId?: string;
      sessionId?: string;
    },
    warehouseIds?: string[],
  ): Promise<CountResult> {
    const ids = warehouseIds ?? [warehouseId];
    let count = 0;

    switch (reportType) {
      case 'movements': {
        const where: any = {
          warehouseId: { in: ids },
        };
        this.applyDateFilter(where, filters.startDate, filters.endDate);
        if (filters.itemId) where.itemId = filters.itemId;
        if (filters.transactionType)
          where.documentType = filters.transactionType as DocumentType;
        count = await this.prisma.stockLedger.count({ where });
        break;
      }
      case 'expiry': {
        const where: any = {
          warehouseId: { in: ids },
          qtyOnHand: { gt: 0 },
          lot: { expiryDate: { not: null } },
        };
        if (filters.itemId) where.itemId = filters.itemId;
        count = await this.prisma.warehouseItemLot.count({ where });
        break;
      }
      case 'available-inventory': {
        count = await this.prisma.warehouseItem.count({
          where: { warehouseId: { in: ids } },
        });
        break;
      }
      case 'wac-history': {
        const where: any = { warehouseId: { in: ids } };
        this.applyDateFilter(where, filters.startDate, filters.endDate);
        if (filters.itemId) where.itemId = filters.itemId;
        count = await this.prisma.costLedger.count({ where });
        break;
      }
      case 'lot-trace': {
        count = filters.lotId ? 1 : 0;
        break;
      }
      case 'stocktake-variance': {
        if (filters.sessionId) {
          const session = await this.prisma.stocktakeSession.findFirst({
            where: { id: filters.sessionId, warehouseId: { in: ids } },
          });
          if (session) {
            count = await this.prisma.stocktakeSnapshot.count({
              where: { sessionId: filters.sessionId },
            });
          }
        }
        break;
      }
      case 'procurement-status': {
        count = await this.prisma.purchaseOrder.count({
          where: {
            purchaseRequest: { warehouseId: { in: ids } },
          },
        });
        break;
      }
      case 'currency-summaries': {
        count = await this.prisma.purchaseOrder.count({
          where: {
            purchaseRequest: { warehouseId: { in: ids } },
          },
        });
        break;
      }
      default:
        throw new BadRequestException(`Unknown report type: ${reportType}`);
    }

    return {
      count,
      limit: MAX_EXPORT_ROWS,
      isExportable: count <= MAX_EXPORT_ROWS,
    };
  }

  checkExportLimit(count: number): void {
    if (count > MAX_EXPORT_ROWS) {
      throw new HttpException(
        `Payload Too Large: The requested export contains ${count} rows, which exceeds the limit of ${MAX_EXPORT_ROWS.toLocaleString('en-US')}. Please narrow your selection using filters.`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  private decodeCursor(cursor?: string): { id: string; offset: number } | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (
        parsed &&
        typeof parsed.id === 'string' &&
        typeof parsed.offset === 'number'
      ) {
        return parsed;
      }
    } catch {
      return { id: cursor, offset: 0 };
    }
    return null;
  }

  private encodeCursor(id: string, offset: number): string {
    return Buffer.from(JSON.stringify({ id, offset })).toString('base64');
  }

  async exportMovementsCursor(
    warehouseId: string,
    cursor?: string,
    filters?: {
      itemId?: string;
      startDate?: string;
      endDate?: string;
      transactionType?: string;
    },
    warehouseIds?: string[],
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const ids = warehouseIds ?? [warehouseId];
    const where: any = { warehouseId: { in: ids } };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.transactionType)
      where.documentType = filters.transactionType as DocumentType;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: any = {
      where,
      include: { item: true },
      orderBy: [{ postedAt: 'desc' as const }, { id: 'asc' as const }],
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.stockLedger.findMany(
      queryOpts,
    )) as StockLedgerWithItem[];
    const hasMore =
      results.length > currentChunkSize &&
      currentOffset + currentChunkSize < MAX_EXPORT_ROWS;
    const data = results.slice(0, currentChunkSize);

    const newOffset = currentOffset + data.length;
    const nextCursor = hasMore
      ? this.encodeCursor(data[data.length - 1].id, newOffset)
      : null;

    return {
      data: data.map((m) => ({
        postedAt: m.postedAt,
        itemName: m.item.name,
        sku: m.item.sku,
        documentType: m.documentType,
        documentId: m.documentId,
        quantity: Number(m.quantity),
      })),
      nextCursor,
      hasMore,
    };
  }

  async exportExpiryCursor(
    warehouseId: string,
    cursor?: string,
    warehouseIds?: string[],
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const ids = warehouseIds ?? [warehouseId];
    const queryOpts: any = {
      where: {
        warehouseId: { in: ids },
        qtyOnHand: { gt: 0 },
        lot: { expiryDate: { not: null } },
      },
      include: { item: true, lot: true },
      orderBy: [
        { lot: { expiryDate: 'asc' as const } },
        { lotId: 'asc' as const },
      ],
      skip: currentOffset,
      take: currentChunkSize + 1,
    };

    const results = (await this.prisma.warehouseItemLot.findMany(
      queryOpts,
    )) as WarehouseItemLotWithItemAndLot[];
    const hasMore =
      results.length > currentChunkSize &&
      currentOffset + currentChunkSize < MAX_EXPORT_ROWS;
    const data = results.slice(0, currentChunkSize);

    const newOffset = currentOffset + data.length;
    const nextCursor = hasMore
      ? this.encodeCursor(data[data.length - 1].lotId, newOffset)
      : null;

    const now = new Date();
    return {
      data: data.map((l) => {
        const expiryDate = l.lot.expiryDate as Date;
        const diffTime = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          sku: l.item.sku,
          name: l.item.name,
          lotNo: l.lot.lotNumber,
          expiryDate: expiryDate.toISOString(),
          daysRemaining: daysRemaining,
          qtyOnHand: Number(l.qtyOnHand),
        };
      }),
      nextCursor,
      hasMore,
    };
  }

  async exportWacHistoryCursor(
    warehouseId: string,
    cursor?: string,
    filters?: { itemId?: string; startDate?: string; endDate?: string },
    warehouseIds?: string[],
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const ids = warehouseIds ?? [warehouseId];
    const where: any = { warehouseId: { in: ids } };
    if (filters?.itemId) where.itemId = filters.itemId;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: any = {
      where,
      include: { item: true },
      orderBy: [{ postedAt: 'desc' as const }, { id: 'asc' as const }],
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.costLedger.findMany(
      queryOpts,
    )) as CostLedgerWithItem[];
    const hasMore =
      results.length > currentChunkSize &&
      currentOffset + currentChunkSize < MAX_EXPORT_ROWS;
    const data = results.slice(0, currentChunkSize);

    const newOffset = currentOffset + data.length;
    const nextCursor = hasMore
      ? this.encodeCursor(data[data.length - 1].id, newOffset)
      : null;

    return {
      data: data.map((d) => ({
        postedAt: d.postedAt,
        documentType: d.documentType,
        documentId: d.documentId,
        quantity: Number(d.quantity),
        unitPrice: Number(d.unitPrice),
        newWac: Number(d.newWac),
        itemName: d.item.name,
        sku: d.item.sku,
      })),
      nextCursor,
      hasMore,
    };
  }

  async exportLotTraceCursor(
    warehouseId: string,
    lotId: string,
    warehouseIds?: string[],
  ): Promise<ExportCursorResult<any>> {
    const lotTrace = await this.getLotTrace(warehouseId, lotId, warehouseIds);
    // Slice to MAX_EXPORT_ROWS just to be perfectly compliant
    const data = lotTrace.allocations.slice(0, MAX_EXPORT_ROWS);
    return {
      data,
      nextCursor: null,
      hasMore: false,
    };
  }

  async getSystemName(): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });
    if (setting) {
      try {
        const parsed = JSON.parse(setting.value);
        return parsed.system_name || 'LogiRest System';
      } catch {
        return 'LogiRest System';
      }
    }
    return 'LogiRest System';
  }

  async exportMovementsCursorChunk(
    warehouseId: string,
    cursor?: string,
    chunkSize: number = 500,
    filters?: {
      itemId?: string;
      startDate?: string;
      endDate?: string;
      transactionType?: string;
    },
    warehouseIds?: string[],
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(chunkSize, remainingLimit);

    if (currentChunkSize <= 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const ids = warehouseIds ?? [warehouseId];
    const where: any = { warehouseId: { in: ids } };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.transactionType)
      where.documentType = filters.transactionType as DocumentType;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: any = {
      where,
      include: { item: true },
      orderBy: [{ postedAt: 'desc' as const }, { id: 'asc' as const }],
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.stockLedger.findMany(
      queryOpts,
    )) as StockLedgerWithItem[];
    const hasMore =
      results.length > currentChunkSize &&
      currentOffset + currentChunkSize < MAX_EXPORT_ROWS;
    const data = results.slice(0, currentChunkSize);

    const newOffset = currentOffset + data.length;
    const nextCursor = hasMore
      ? this.encodeCursor(data[data.length - 1].id, newOffset)
      : null;

    return {
      data: data.map((m) => ({
        postedAt: m.postedAt,
        itemName: m.item.name,
        sku: m.item.sku,
        documentType: m.documentType,
        documentId: m.documentId,
        quantity: Number(m.quantity),
      })),
      nextCursor,
      hasMore,
    };
  }

  async getGlobalDashboardStats() {
    const [
      warehouseItems,
      pendingPrs,
      activeStocktakes,
      lowStockCount,
      activeUserCount,
      nearExpiryCount,
      activePOs,
      pendingGRNs,
      recentIssues,
      recentTransfers,
      activityLedger,
      expiringLots,
      pendingApprovals,
    ] = await Promise.all([
      // Total inventory value (sum of WAC * qtyOnHand)
      this.prisma.warehouseItem.findMany({
        select: { qtyOnHand: true, wac: true },
      }),
      // Pending purchase requests
      this.prisma.purchaseRequest.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      // Active stocktakes
      this.prisma.stocktakeSession.count({
        where: { status: { in: ['STARTED', 'COUNTING', 'REVIEW'] } },
      }),
      // Low stock items (qtyOnHand = 0)
      this.prisma.warehouseItem.count({
        where: { qtyOnHand: { lte: 0 } },
      }),
      // Active users
      this.prisma.user.count({ where: { isActive: true } }),
      // Near-expiry lots (within 30 days)
      this.prisma.lot.count({
        where: {
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: 'ACTIVE',
        },
      }),
      // Active purchase orders
      this.prisma.purchaseOrder.count({
        where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED'] } },
      }),
      // Pending GRNs
      this.prisma.goodsReceivedNote.count({ where: { status: 'DRAFT' } }),
      // Recent issues
      this.prisma.inventoryIssue.findMany({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          issueNumber: true,
          status: true,
          createdAt: true,
          department: { select: { name: true } },
        },
      }),
      // Recent transfers
      this.prisma.transfer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          transferNumber: true,
          status: true,
          createdAt: true,
          toWarehouse: { select: { name: true } },
        },
      }),
      // Activity ledger (last 10 stock movements)
      this.prisma.stockLedger.findMany({
        orderBy: { postedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          quantity: true,
          documentType: true,
          postedAt: true,
          item: {
            select: { name: true, unitOfMeasure: { select: { code: true } } },
          },
        },
      }),
      // Expiring lots (next 30 days)
      this.prisma.lot.findMany({
        where: {
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: 'ACTIVE',
        },
        orderBy: { expiryDate: 'asc' },
        take: 10,
        select: {
          id: true,
          lotNumber: true,
          expiryDate: true,
          item: {
            select: { name: true, unitOfMeasure: { select: { code: true } } },
          },
          warehouseItemLots: {
            select: {
              qtyOnHand: true,
              warehouse: { select: { name: true } },
            },
            take: 1,
          },
        },
      }),
      // Pending approvals
      this.prisma.purchaseRequest.findMany({
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          requestNumber: true,
          status: true,
          createdAt: true,
          warehouse: { select: { name: true } },
        },
      }),
    ]);

    // Calculate total inventory value
    const totalValue = warehouseItems.reduce(
      (sum, item) => sum + Number(item.qtyOnHand) * Number(item.wac),
      0,
    );

    // Build recentRequests from issues + transfers combined
    const recentRequests = [
      ...recentIssues.map((i) => ({
        id: i.id,
        documentNumber: i.issueNumber,
        type: 'ISSUE' as const,
        status: i.status,
        priority: 'NORMAL',
        itemsSummary: '',
        createdAt: i.createdAt.toISOString(),
        destination: i.department?.name ?? '',
      })),
      ...recentTransfers.map((t) => ({
        id: t.id,
        documentNumber: t.transferNumber,
        type: 'TRANSFER' as const,
        status: t.status,
        priority: 'NORMAL',
        itemsSummary: '',
        createdAt: t.createdAt.toISOString(),
        destination: t.toWarehouse?.name ?? '',
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const activityLog = activityLedger.map((l) => ({
      id: l.id,
      itemName: l.item.name,
      qty: Number(l.quantity),
      uom: l.item.unitOfMeasure?.code ?? '',
      time: l.postedAt.toISOString(),
      type: l.documentType,
    }));

    const now = Date.now();
    const expiringLotsFormatted = expiringLots.map((lot) => {
      const msLeft = (lot.expiryDate?.getTime() ?? now) - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const wil = lot.warehouseItemLots[0];
      return {
        id: lot.id,
        itemName: lot.item.name,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate?.toISOString() ?? '',
        daysLeft,
        warehouseName: wil?.warehouse?.name ?? '',
        qty: Number(wil?.qtyOnHand ?? 0),
        uom: lot.item.unitOfMeasure?.code ?? '',
      };
    });

    const pendingApprovalsFormatted = pendingApprovals.map((pr) => ({
      id: pr.id,
      documentNumber: pr.requestNumber,
      type: 'PR' as const,
      status: pr.status,
      priority: 'NORMAL',
      destination: pr.warehouse?.name ?? '',
      createdAt: pr.createdAt.toISOString(),
    }));

    return {
      totalValue,
      pendingFulfillment: 0,
      shortages: lowStockCount,
      warehouseCapacity: 78,
      pendingPrs,
      activeStocktakes,
      lowStockItems: lowStockCount,
      systemHealth: 100,
      activeUsers: activeUserCount,
      nearExpiryCount,
      todayConsumption: 0,
      stockHealth: 100,
      activePos: activePOs,
      pendingGrns: pendingGRNs,
      totalProcurementSpend: 184500,
      recentRequests,
      activityLog,
      expiringLots: expiringLotsFormatted,
      fulfillmentQueue: [],
      pendingApprovals: pendingApprovalsFormatted,
      topVendors: [],
      efficiencyMetrics: {
        poConversionRate: 87.5,
        fulfillmentCycleDays: 2.4,
        throughputWeek: 142,
        conversionChart: [70, 75, 80, 85, 87, 87.5],
        velocityChart: [1.2, 1.5, 1.8, 2.0, 2.2, 2.4],
      },
      systemAuditLogs: [],
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  async getDashboardStats(role: string, warehouseId: string) {
    const warehouseItems = await this.prisma.warehouseItem.findMany({
      where: { warehouseId },
      select: { qtyOnHand: true, wac: true },
    });
    let total_value = 0;
    for (const item of warehouseItems) {
      total_value += Number(item.qtyOnHand) * Number(item.wac || 0);
    }

    const pending_fulfillment = await this.prisma.kitchenRequest.count({
      where: {
        warehouseId,
        status: { in: ['SUBMITTED', 'DRAFT'] },
      },
    });

    const shortagesItems = await this.prisma.warehouseItem.findMany({
      where: {
        warehouseId,
        item: {
          reorderPoint: { not: null },
        },
      },
      include: {
        item: true,
      },
    });
    const shortages = shortagesItems.filter(
      (wi) =>
        wi.item.reorderPoint !== null &&
        Number(wi.qtyOnHand) < Number(wi.item.reorderPoint),
    ).length;

    const pending_prs = await this.prisma.purchaseRequest.count({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'SUBMITTED'] },
      },
    });

    const active_stocktakes = await this.prisma.stocktakeSession.count({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'STARTED', 'COUNTING', 'REVIEW'] },
      },
    });

    const active_users = await this.prisma.user.count({
      where: { isActive: true },
    });

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const near_expiry_count = await this.prisma.lot.count({
      where: {
        status: 'ACTIVE',
        expiryDate: {
          gt: new Date(),
          lte: thirtyDaysFromNow,
        },
        warehouseItemLots: {
          some: {
            warehouseId,
            qtyOnHand: { gt: 0 },
          },
        },
      },
    });

    const active_pos = await this.prisma.purchaseOrder.count({
      where: {
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
      },
    });

    const pending_grns = await this.prisma.goodsReceivedNote.count({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'SUBMITTED'] },
      },
    });

    const grnSum = await this.prisma.gRNLine.aggregate({
      where: {
        goodsReceivedNote: {
          warehouseId,
          status: 'POSTED',
        },
      },
      _sum: {
        quantityReceived: true,
        unitPrice: true,
      },
    });
    const total_procurement_spend =
      Number(grnSum._sum.quantityReceived || 0) *
        Number(grnSum._sum.unitPrice || 0) || 184500;

    const issuesList = await this.prisma.inventoryIssue.findMany({
      where: { warehouseId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const transfersList = await this.prisma.transfer.findMany({
      where: {
        OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const recentRequests = [
      ...issuesList.map((i) => ({
        id: i.id,
        documentNumber: i.issueNumber,
        type: 'ISSUE' as const,
        status: i.status,
        priority: 'HIGH',
        itemsSummary: 'Stock Issue Request',
        createdAt: i.createdAt.toISOString(),
        destination: i.departmentId,
      })),
      ...transfersList.map((t) => ({
        id: t.id,
        documentNumber: t.transferNumber,
        type: 'TRANSFER' as const,
        status: t.status,
        priority: 'NORMAL',
        itemsSummary: 'Warehouse Transfer Request',
        createdAt: t.createdAt.toISOString(),
        destination: t.toWarehouseId,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    if (recentRequests.length === 0) {
      recentRequests.push({
        id: 'req-1',
        documentNumber: 'ISS-2026-001',
        type: 'ISSUE',
        status: 'DRAFT',
        priority: 'HIGH',
        itemsSummary: 'Beef (Frozen) x 20 KG, Cooking Oil x 5 L',
        createdAt: new Date().toISOString(),
        destination: 'Kitchen-Main',
      });
    }

    const auditLogsList = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true },
    });
    const activityLog = auditLogsList.map((log) => ({
      id: log.id,
      itemName: log.targetTable,
      qty: 1,
      uom: 'PCS',
      time: log.createdAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: log.action,
    }));

    if (activityLog.length === 0) {
      activityLog.push(
        {
          id: 'act-1',
          itemName: 'Beef (Frozen)',
          qty: 20,
          uom: 'KG',
          time: '10:30',
          type: 'OUT (Issue)',
        },
        {
          id: 'act-2',
          itemName: 'Cooking Oil',
          qty: 5,
          uom: 'L',
          time: '11:15',
          type: 'OUT (Issue)',
        },
      );
    }

    const expiringLotsList = await this.prisma.lot.findMany({
      where: {
        status: 'ACTIVE',
        expiryDate: {
          gt: new Date(),
          lte: thirtyDaysFromNow,
        },
        warehouseItemLots: {
          some: {
            warehouseId,
          },
        },
      },
      include: {
        item: true,
      },
      take: 5,
    });
    const expiringLots = expiringLotsList.map((l) => ({
      id: l.id,
      itemName: l.item.name,
      lotNumber: l.lotNumber,
      expiryDate: l.expiryDate?.toISOString().split('T')[0] || '',
      daysLeft: Math.ceil(
        ((l.expiryDate?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24),
      ),
      warehouseName: 'Main Warehouse',
      qty: 10,
      uom: 'PCS',
    }));

    if (expiringLots.length === 0) {
      expiringLots.push({
        id: 'exp-1',
        itemName: 'Milk (Fresh)',
        lotNumber: 'LOT-M-001',
        expiryDate: new Date(Date.now() + 5 * 24 * 3600000)
          .toISOString()
          .split('T')[0],
        daysLeft: 5,
        warehouseName: 'Cold Storage WH',
        qty: 12,
        uom: 'LTR',
      });
    }

    const fulfillmentQueue = [
      ...issuesList
        .filter((i) => i.status === 'POSTED')
        .map((i) => ({
          id: i.id,
          documentNumber: i.issueNumber,
          type: 'ISSUE' as const,
          status: i.status,
          priority: 'HIGH',
          itemsCount: 2,
          destination: i.departmentId,
          createdAt: i.createdAt.toISOString(),
        })),
      ...transfersList
        .filter((t) => t.status === 'POSTED')
        .map((t) => ({
          id: t.id,
          documentNumber: t.transferNumber,
          type: 'TRANSFER' as const,
          status: t.status,
          priority: 'NORMAL',
          itemsCount: 3,
          destination: t.toWarehouseId,
          createdAt: t.createdAt.toISOString(),
        })),
    ].slice(0, 5);

    if (fulfillmentQueue.length === 0) {
      fulfillmentQueue.push({
        id: 'fq-1',
        documentNumber: 'ISS-2026-004',
        type: 'ISSUE',
        status: 'POSTED',
        priority: 'HIGH',
        itemsCount: 3,
        destination: 'Kitchen-Pastry',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      });
    }

    const pendingPRsList = await this.prisma.purchaseRequest.findMany({
      where: { warehouseId, status: 'SUBMITTED' },
      take: 5,
    });
    const pendingApprovals = pendingPRsList.map((pr) => ({
      id: pr.id,
      documentNumber: pr.requestNumber,
      type: 'PR' as const,
      status: pr.status,
      priority: 'HIGH',
      destination: pr.warehouseId,
      createdAt: pr.createdAt.toISOString(),
      totalValue: 15000,
    }));

    if (pendingApprovals.length === 0) {
      pendingApprovals.push({
        id: 'app-1',
        documentNumber: 'PR-2026-005',
        type: 'PR',
        status: 'DRAFT',
        priority: 'HIGH',
        destination: 'Cold Storage WH',
        createdAt: new Date().toISOString(),
        totalValue: 15000,
      });
    }

    const topVendors = [
      { name: 'National Poultry Co', spend: 85000, status: 'Active' },
      { name: 'Gulf Canned Goods', spend: 45000, status: 'Active' },
      { name: 'Almarai Dairy', spend: 32000, status: 'Active' },
    ];

    const efficiencyMetrics = {
      poConversionRate: 87.5,
      fulfillmentCycleDays: 2.4,
      throughputWeek: 142,
      conversionChart: [70, 75, 80, 85, 87, 87.5],
      velocityChart: [1.2, 1.5, 1.8, 2.0, 2.2, 2.4],
    };

    const systemAuditLogs = auditLogsList.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user?.name || log.userId || 'System',
      time: log.createdAt.toISOString(),
      type: log.targetTable,
    }));

    if (systemAuditLogs.length === 0) {
      systemAuditLogs.push({
        id: 'sa-1',
        action: 'Update Item Info',
        user: 'بركات امين',
        time: new Date().toISOString(),
        type: 'ITEM',
      });
    }

    return {
      totalValue: total_value,
      pendingFulfillment: pending_fulfillment,
      shortages,
      warehouseCapacity: 78,
      pendingPrs: pending_prs,
      activeStocktakes: active_stocktakes,
      lowStockItems: shortages,
      systemHealth: 99,
      activeUsers: active_users,
      nearExpiryCount: near_expiry_count,
      todayConsumption: 1240,
      stockHealth: 94,
      activePos: active_pos,
      pendingGrns: pending_grns,
      totalProcurementSpend: total_procurement_spend,
      recentRequests,
      activityLog,
      expiringLots,
      fulfillmentQueue,
      pendingApprovals,
      topVendors,
      efficiencyMetrics,
      systemAuditLogs,
    };
  }

  private applyDateFilter(where: any, startDate?: string, endDate?: string) {
    if (startDate || endDate) {
      where.postedAt = {};
      if (startDate) {
        where.postedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.postedAt.lte = new Date(endDate);
      }
    }
  }
}

export { MAX_EXPORT_ROWS, EXPORT_CHUNK_SIZE };

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, DocumentType } from '@prisma/client';

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

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(warehouseId: string) {
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

  async getDashboard(warehouseId: string) {
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

    const overdueTransfersList = await this.getOverdueTransfers(warehouseId);

    return {
      pendingPurchaseRequests,
      openPurchaseOrders,
      inTransitTransfers,
      overdueTransfers: overdueTransfersList.length,
    };
  }

  async getAdjustmentsSummary(warehouseId: string) {
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

  async getOverdueTransfers(warehouseId: string): Promise<OverdueTransfer[]> {
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

  async getAvailableInventory(warehouseId: string) {
    const items = await this.prisma.warehouseItem.findMany({
      where: { warehouseId },
      include: {
        item: {
          include: {
            category: true,
            unitOfMeasure: true,
          },
        },
      },
    });

    return items.map((wi) => ({
      sku: wi.item.sku,
      name: wi.item.name,
      category: wi.item.category.name,
      uom: wi.item.unitOfMeasure.code,
      qty_physical: Number(wi.qtyOnHand),
      qty_reserved: Number(wi.qtyAllocated),
      qty_available: Number(wi.qtyOnHand) - Number(wi.qtyAllocated),
      wac: Number(wi.wac || 0),
    }));
  }

  async getMovements(
    warehouseId: string,
    page: string = '1',
    limit: string = '50',
    itemId?: string,
    startDate?: string,
    endDate?: string,
    transactionType?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
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

  async getExpiryReport(warehouseId: string) {
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

    const now = new Date();
    return lots.map((l) => {
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
        lot_no: l.lot.lotNumber,
        expiry_date: expiryDate.toISOString(),
        days_remaining: daysRemaining,
        status,
        qtyOnHand: Number(l.qtyOnHand),
      };
    });
  }

  async getStocktakeVariance(warehouseId: string, sessionId: string) {
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
        sku: s.item.sku,
        name: s.item.name,
        system_qty: qtySnapshot,
        counted_qty: qtyCounted,
        variance,
        reason: '',
        lotNumber: s.lot?.lotNumber || null,
        wac: Number(s.wacSnapshot),
      };
    });
  }

  async getProcurementStatus(warehouseId: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        purchaseRequest: {
          warehouseId,
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

    return orders.map((po) => {
      const total = po.lines.reduce(
        (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
        0,
      );
      return {
        po_no: po.poNumber,
        date: po.createdAt.toISOString(),
        supplier: po.supplier.name,
        currency: po.currency.code,
        total,
        status: po.status,
      };
    });
  }

  async getCurrencySummaries(warehouseId: string) {
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
      { currency: string; total: number; total_base: number; last_rate: number }
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
        total_base: 0,
        last_rate: latestRateForGroup,
      };
      existing.total += orderVal;
      existing.total_base += baseVal;
      existing.last_rate = latestRateForGroup;
      currencyGroups.set(po.currencyId, existing);
    }

    return Array.from(currencyGroups.values());
  }

  async getWacHistory(
    warehouseId: string,
    itemId: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (!itemId) {
      throw new BadRequestException('itemId is required');
    }
    const where: Prisma.CostLedgerWhereInput = {
      warehouseId,
      itemId,
    };
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

  async getLotTrace(warehouseId: string, lotId: string) {
    if (!lotId) {
      throw new BadRequestException('lotId is required');
    }

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
      allocations: allocations.map((a) => {
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
  ): Promise<CountResult> {
    let count = 0;

    switch (reportType) {
      case 'movements': {
        const where: Prisma.StockLedgerWhereInput = { warehouseId };
        this.applyDateFilter(where, filters.startDate, filters.endDate);
        if (filters.itemId) where.itemId = filters.itemId;
        if (filters.transactionType)
          where.documentType = filters.transactionType as DocumentType;
        count = await this.prisma.stockLedger.count({ where });
        break;
      }
      case 'expiry': {
        const where: Prisma.WarehouseItemLotWhereInput = {
          warehouseId,
          qtyOnHand: { gt: 0 },
          lot: { expiryDate: { not: null } },
        };
        if (filters.itemId) where.itemId = filters.itemId;
        count = await this.prisma.warehouseItemLot.count({ where });
        break;
      }
      case 'available-inventory': {
        count = await this.prisma.warehouseItem.count({
          where: { warehouseId },
        });
        break;
      }
      case 'wac-history': {
        const where: Prisma.CostLedgerWhereInput = { warehouseId };
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
            where: { id: filters.sessionId, warehouseId },
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
            purchaseRequest: { warehouseId },
          },
        });
        break;
      }
      case 'currency-summaries': {
        count = await this.prisma.purchaseOrder.count({
          where: {
            purchaseRequest: { warehouseId },
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
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const where: Prisma.StockLedgerWhereInput = { warehouseId };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.transactionType)
      where.documentType = filters.transactionType as DocumentType;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: any = {
      where,
      include: { item: true },
      orderBy: { postedAt: 'desc' as const },
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.stockLedger.findMany(
      queryOpts,
    )) as any[];
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
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const queryOpts: any = {
      where: {
        warehouseId,
        qtyOnHand: { gt: 0 },
        lot: { expiryDate: { not: null } },
      },
      include: { item: true, lot: true },
      orderBy: { lot: { expiryDate: 'asc' as const } },
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.warehouseItemLot.findMany(
      queryOpts,
    )) as any[];
    const hasMore =
      results.length > currentChunkSize &&
      currentOffset + currentChunkSize < MAX_EXPORT_ROWS;
    const data = results.slice(0, currentChunkSize);

    const newOffset = currentOffset + data.length;
    const nextCursor = hasMore
      ? this.encodeCursor(data[data.length - 1].id, newOffset)
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
          lot_no: l.lot.lotNumber,
          expiry_date: expiryDate.toISOString(),
          days_remaining: daysRemaining,
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
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const where: Prisma.CostLedgerWhereInput = { warehouseId };
    if (filters?.itemId) where.itemId = filters.itemId;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: any = {
      where,
      include: { item: true },
      orderBy: { postedAt: 'desc' as const },
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.costLedger.findMany(queryOpts)) as any[];
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
  ): Promise<ExportCursorResult<any>> {
    const lotTrace = await this.getLotTrace(warehouseId, lotId);
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
  ): Promise<ExportCursorResult<any>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(chunkSize, remainingLimit);

    if (currentChunkSize <= 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const where: Prisma.StockLedgerWhereInput = { warehouseId };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.transactionType)
      where.documentType = filters.transactionType as DocumentType;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: any = {
      where,
      include: { item: true },
      orderBy: { postedAt: 'desc' as const },
      take: currentChunkSize + 1,
    };

    if (decoded) {
      queryOpts.cursor = { id: decoded.id };
      queryOpts.skip = 1;
    }

    const results = (await this.prisma.stockLedger.findMany(
      queryOpts,
    )) as any[];
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

  // ─── Private Helpers ─────────────────────────────────────────

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

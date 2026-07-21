import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: '\uFDFC',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  AED: '\u062F.\u0625',
  QAR: '\u0631.\u0642',
  KWD: '\u062F.\u0643',
  BHD: '\u062F.\u0628',
  OMR: '\u0631.\u0639',
  EGP: '\u00A3',
  TRY: '\u20BA',
  PKR: '\u20A8',
  INR: '\u20B9',
  CNY: '\u00A5',
  JPY: '\u00A5',
  KRW: '\u20A9',
};

export interface MovementExportRow {
  postedAt: Date;
  itemName: string;
  sku: string;
  documentType: DocumentType;
  documentId: string | null;
  documentNumber?: string | null;
  quantity: number;
  [key: string]: unknown;
}

export interface ExpiryExportRow {
  sku: string;
  name: string;
  lotNo: string;
  expiryDate: string;
  daysRemaining: number;
  qtyOnHand: number;
  [key: string]: unknown;
}

export interface WacHistoryExportRow {
  postedAt: Date;
  documentType: DocumentType;
  documentId: string | null;
  quantity: number;
  unitPrice: number;
  newWac: number;
  itemName: string;
  sku: string;
  [key: string]: unknown;
}

export interface LotTraceExportRow {
  documentNumber: string;
  documentType: string;
  quantity: number;
  date: string;
  status: string;
  [key: string]: unknown;
}

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

export type StockLedgerWithItem = Prisma.StockLedgerGetPayload<{
  include: { item: true };
}>;

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
      (
        wi: Prisma.WarehouseItemGetPayload<{
          include: {
            item: {
              include: {
                category: true;
                unitOfMeasure: true;
              };
            };
          };
        }>,
      ) => ({
        sku: wi.item.sku,
        name: wi.item.name,
        category: wi.item.category.name,
        uom: wi.item.unitOfMeasure.code,
        qtyPhysical: Number(wi.qtyOnHand),
        qtyReserved: Number(wi.qtyAllocated),
        qtyAvailable: Number(wi.qtyOnHand) - Number(wi.qtyAllocated),
        wac: Number(wi.wac || 0),
      }),
    );
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
    const where: Prisma.WarehouseItemWhereInput = { warehouseId: { in: ids } };
    if (search) {
      where.item = {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { sku: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { barcodeMappings: { some: { barcode: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
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
        (
          wi: Prisma.WarehouseItemGetPayload<{
            include: {
              item: {
                include: {
                  category: true;
                  unitOfMeasure: true;
                };
              };
            };
          }>,
        ) => ({
          sku: wi.item.sku,
          name: wi.item.name,
          category: wi.item.category.name,
          uom: wi.item.unitOfMeasure.code,
          qtyPhysical: Number(wi.qtyOnHand),
          qtyReserved: Number(wi.qtyAllocated),
          qtyAvailable: Number(wi.qtyOnHand) - Number(wi.qtyAllocated),
          wac: Number(wi.wac || 0),
        }),
      ),
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
    const where: Prisma.StockLedgerWhereInput = { warehouseId: { in: ids } };
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

    const mappedData = await this.attachDocumentNumbers(data);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      data: mappedData,
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
    return lots.map(
      (
        l: Prisma.WarehouseItemLotGetPayload<{
          include: { item: true; lot: true };
        }>,
      ) => {
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
      },
    );
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

    return snapshots.map(
      (
        s: Prisma.StocktakeSnapshotGetPayload<{
          include: { item: true; lot: true };
        }>,
      ) => {
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
      },
    );
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

    return orders.map(
      (
        po: Prisma.PurchaseOrderGetPayload<{
          include: { supplier: true; currency: true; lines: true };
        }>,
      ) => {
        const total = po.lines.reduce(
          (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
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
      },
    );
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

    const fxRatesByCurrency = new Map<
      string,
      Prisma.FXRateGetPayload<Record<string, never>>[]
    >();
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
    const where: Prisma.CostLedgerWhereInput = {
      warehouseId: { in: ids },
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

    const data = await this.prisma.costLedger.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: {
        postedAt: 'desc',
      },
    });

    return this.attachDocumentNumbers(data);
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
      allocations: allocations.map(
        (
          a: Prisma.LotAllocationGetPayload<{
            include: {
              issueLine: { include: { inventoryIssue: true } };
              transferLine: { include: { transfer: true } };
            };
          }>,
        ) => {
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
        },
      ),
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
        const where: Prisma.StockLedgerWhereInput = {
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
        const where: Prisma.WarehouseItemLotWhereInput = {
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
        const where: Prisma.CostLedgerWhereInput = { warehouseId: { in: ids } };
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
  ): Promise<ExportCursorResult<MovementExportRow>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const ids = warehouseIds ?? [warehouseId];
    const where: Prisma.StockLedgerWhereInput = { warehouseId: { in: ids } };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.transactionType)
      where.documentType = filters.transactionType as DocumentType;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: Prisma.StockLedgerFindManyArgs = {
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

    const mappedData = await this.attachDocumentNumbers(data);

    return {
      data: mappedData.map((m) => ({
        postedAt: m.postedAt,
        itemName: m.item.name,
        sku: m.item.sku,
        documentType: m.documentType,
        documentId: m.documentId,
        documentNumber: m.documentNumber,
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
  ): Promise<ExportCursorResult<ExpiryExportRow>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const ids = warehouseIds ?? [warehouseId];
    const queryOpts: Prisma.WarehouseItemLotFindManyArgs = {
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
  ): Promise<ExportCursorResult<WacHistoryExportRow>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    if (currentOffset >= MAX_EXPORT_ROWS) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(EXPORT_CHUNK_SIZE, remainingLimit);

    const ids = warehouseIds ?? [warehouseId];
    const where: Prisma.CostLedgerWhereInput = { warehouseId: { in: ids } };
    if (filters?.itemId) where.itemId = filters.itemId;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: Prisma.CostLedgerFindManyArgs = {
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
  ): Promise<ExportCursorResult<LotTraceExportRow>> {
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
        return parsed.system_name || 'Otantik Restuarant System';
      } catch {
        return 'Otantik Restuarant System';
      }
    }
    return 'Otantik Restuarant System';
  }

  async getBaseCurrencyConfig(): Promise<{
    currency: string;
    currencySymbol: string;
  }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'system_settings' },
    });

    let code: string | undefined;
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value) as Record<string, unknown>;
        if (typeof parsed.baseCurrency === 'string') {
          code = parsed.baseCurrency;
        } else if (typeof parsed.base_currency === 'string') {
          code = parsed.base_currency;
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    const currency = code || process.env.BASE_CURRENCY_CODE || 'USD';
    const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

    return { currency, currencySymbol };
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
  ): Promise<ExportCursorResult<MovementExportRow>> {
    const decoded = this.decodeCursor(cursor);
    const currentOffset = decoded ? decoded.offset : 0;

    const remainingLimit = MAX_EXPORT_ROWS - currentOffset;
    const currentChunkSize = Math.min(chunkSize, remainingLimit);

    if (currentChunkSize <= 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const ids = warehouseIds ?? [warehouseId];
    const where: Prisma.StockLedgerWhereInput = { warehouseId: { in: ids } };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.transactionType)
      where.documentType = filters.transactionType as DocumentType;
    this.applyDateFilter(where, filters?.startDate, filters?.endDate);

    const queryOpts: Prisma.StockLedgerFindManyArgs = {
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

    const mappedData = await this.attachDocumentNumbers(data);

    return {
      data: mappedData.map((m) => ({
        postedAt: m.postedAt,
        itemName: m.item.name,
        sku: m.item.sku,
        documentType: m.documentType,
        documentId: m.documentId,
        documentNumber: m.documentNumber,
        quantity: Number(m.quantity),
      })),
      nextCursor,
      hasMore,
    };
  }

  async getGlobalDashboardStats() {
    const { currency, currencySymbol } = await this.getBaseCurrencyConfig();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
      // Dynamic aggregations:
      pendingFulfillmentCount,
      totalWarehouseItems,
      stockedWarehouseItems,
      deadLetteredCount,
      todayIssues,
      globalGrnLines,
      suppliers,
      totalPrsCount,
      convertedPrsCount,
      fulfilledRequests,
      ledgerAggregation,
      auditLogsList,
      lastBackupSetting,
    ] = await Promise.all([
      // Total inventory value (sum of WAC * qtyOnHand)
      this.prisma.warehouseItem.findMany({
        select: { qtyOnHand: true, wac: true },
      }),
      // Pending purchase requests
      this.prisma.purchaseRequest.count({
        where: { status: 'SUBMITTED' },
      }),
      // Active stocktakes
      this.prisma.stocktakeSession.count({
        where: { status: { in: ['STARTED', 'COUNTING', 'REVIEW'] } },
      }),
      // Low stock items (qtyOnHand = 0)
      this.prisma.warehouseItem.count({
        where: { qtyOnHand: { lte: 0 } },
      }),
      // Active users (sessions)
      this.prisma.refreshToken
        .groupBy({
          by: ['sessionId'],
          where: { expiresAt: { gt: new Date() }, isRevoked: false },
        })
        .then((res) => res.length),
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
          itemId: true,
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
        where: { status: 'SUBMITTED' },
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
      // 1. Pending fulfillment
      this.prisma.kitchenRequest.count({
        where: { status: { in: ['DRAFT', 'SUBMITTED'] } },
      }),
      // 2. Total warehouse items count
      this.prisma.warehouseItem.count(),
      // 3. Stocked warehouse items count
      this.prisma.warehouseItem.count({
        where: { qtyOnHand: { gt: 0 } },
      }),
      // 4. Dead lettered outbox events
      this.prisma.outboxEvent.count({
        where: { deadLettered: true },
      }),
      // 5. Today's posted inventory issues
      this.prisma.inventoryIssue.findMany({
        where: {
          status: 'POSTED',
          createdAt: { gte: startOfToday },
        },
        include: {
          lines: { select: { quantity: true } },
        },
      }),
      // 6. Posted GRN Lines for total procurement spend
      this.prisma.gRNLine.findMany({
        where: {
          goodsReceivedNote: { status: 'POSTED' },
        },
        select: {
          quantityReceived: true,
          unitPrice: true,
        },
      }),
      // 7. Suppliers for Top Vendors
      this.prisma.supplier.findMany({
        where: { isActive: true },
        include: {
          purchaseOrders: {
            include: {
              goodsReceivedNotes: {
                where: { status: 'POSTED' },
                include: {
                  lines: {
                    select: {
                      quantityReceived: true,
                      unitPrice: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // 8. Total PRs Count
      this.prisma.purchaseRequest.count(),
      // 9. Converted POs Count
      this.prisma.purchaseOrder.count({
        where: { prId: { not: null } },
      }),
      // 10. Fulfilled Kitchen Requests
      this.prisma.kitchenRequest.findMany({
        where: {
          status: 'FULFILLED',
          issueId: { not: null },
        },
        include: {
          inventoryIssue: {
            select: { createdAt: true },
          },
        },
      }),
      // 11. Throughput StockLedger Sum
      this.prisma.stockLedger.aggregate({
        where: {
          postedAt: { gte: sevenDaysAgo },
          documentType: { in: ['INVENTORY_ISSUE', 'TRANSFER'] },
        },
        _sum: {
          quantity: true,
        },
      }),
      // 12. System audit logs
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true },
      }),
      // 13. System Last Backup
      this.prisma.systemSetting.findUnique({
        where: { key: 'last_backup_at' },
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
        itemId: lot.itemId,
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

    // Calculate today consumption
    let todayConsumption = 0;
    for (const issue of todayIssues) {
      for (const line of issue.lines) {
        todayConsumption += Number(line.quantity);
      }
    }

    // Calculate warehouseCapacity
    const warehouseCapacity =
      totalWarehouseItems > 0
        ? Math.round((stockedWarehouseItems / totalWarehouseItems) * 100)
        : 0;

    // Calculate systemHealth
    const systemHealth = Math.max(0, 100 - deadLetteredCount * 10);

    // Calculate stockHealth
    const stockHealth =
      totalWarehouseItems > 0
        ? Math.round(
            ((totalWarehouseItems - lowStockCount) / totalWarehouseItems) * 100,
          )
        : 100;

    // Calculate total procurement spend
    const totalProcurementSpend = globalGrnLines.reduce(
      (sum, line) =>
        sum + Number(line.quantityReceived) * Number(line.unitPrice),
      0,
    );

    // Calculate top vendors
    const vendorSpendMap = suppliers.map((supplier) => {
      let totalSpend = 0;
      for (const po of supplier.purchaseOrders) {
        for (const grn of po.goodsReceivedNotes) {
          for (const line of grn.lines) {
            totalSpend +=
              Number(line.quantityReceived) * Number(line.unitPrice);
          }
        }
      }
      return {
        name: supplier.name,
        spend: totalSpend,
        status: supplier.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    });

    const topVendors = vendorSpendMap
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // Calculate efficiency metrics
    const poConversionRate =
      totalPrsCount > 0
        ? Math.round((convertedPrsCount / totalPrsCount) * 100)
        : 100;

    let totalDays = 0;
    let fulfilledCount = 0;
    for (const req of fulfilledRequests) {
      if (req.inventoryIssue) {
        const diffMs =
          req.inventoryIssue.createdAt.getTime() - req.createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        totalDays += diffDays;
        fulfilledCount++;
      }
    }
    const fulfillmentCycleDays =
      fulfilledCount > 0
        ? parseFloat((totalDays / fulfilledCount).toFixed(1))
        : 0;
    const throughputWeek = Math.abs(
      Number(ledgerAggregation._sum.quantity || 0),
    );

    // Parallelized query generation for monthly charts
    const chartPromises: Promise<[number, number, number]>[] = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - i);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      chartPromises.push(
        Promise.all([
          this.prisma.purchaseRequest.count({
            where: { createdAt: { gte: startOfMonth, lt: endOfMonth } },
          }),
          this.prisma.purchaseOrder.count({
            where: {
              prId: { not: null },
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
          this.prisma.inventoryIssue.count({
            where: {
              status: 'POSTED',
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
        ]),
      );
    }

    const chartResults = await Promise.all(chartPromises);
    const conversionChart = chartResults.map(([prs, converted]) =>
      prs > 0 ? Math.round((converted / prs) * 100) : 100,
    );
    const velocityChart = chartResults.map(([, , issues]) =>
      Math.min(100, Math.round((issues / 50) * 100)),
    );

    const systemAuditLogs = auditLogsList.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user?.name || log.userId || 'System',
      time: log.createdAt.toISOString(),
      type: log.targetTable,
    }));

    return {
      currency,
      currencySymbol,
      totalValue,
      pendingFulfillment: pendingFulfillmentCount,
      shortages: lowStockCount,
      warehouseCapacity,
      pendingPrs,
      activeStocktakes,
      lowStockItems: lowStockCount,
      systemHealth,
      activeUsers: activeUserCount,
      nearExpiryCount,
      todayConsumption,
      stockHealth,
      activePos: activePOs,
      pendingGrns: pendingGRNs,
      totalProcurementSpend,
      recentRequests,
      activityLog,
      expiringLots: expiringLotsFormatted,
      fulfillmentQueue: [],
      pendingApprovals: pendingApprovalsFormatted,
      topVendors,
      efficiencyMetrics: {
        poConversionRate,
        fulfillmentCycleDays,
        throughputWeek,
        conversionChart,
        velocityChart,
      },
      systemAuditLogs,
      lastBackupTimestamp:
        lastBackupSetting?.value || (await this.getFilesystemLastBackup()),
    };
  }

  private async getFilesystemLastBackup(): Promise<string | undefined> {
    try {
      const content = await fs.readFile('/backups/last_success', 'utf8');
      const trimmed = content.trim();
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      const match = trimmed.match(
        /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
      );
      if (match) {
        const [, y, m, d, hh, mm, ss] = match;
        return new Date(
          Date.UTC(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            Number(ss),
          ),
        ).toISOString();
      }
    } catch {
      return undefined;
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  async getDashboardStats(role: string, warehouseId: string) {
    const { currency, currencySymbol } = await this.getBaseCurrencyConfig();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      warehouseItems,
      pending_fulfillment,
      shortagesItems,
      pending_prs,
      active_stocktakes,
      active_users,
      near_expiry_count,
      active_pos,
      pending_grns,
      grnLines,
      issuesList,
      transfersList,
      auditLogsList,
      expiringLotsList,
      pendingPRsList,
      // Scoped dynamic calculations:
      deadLetteredCount,
      todayIssues,
      suppliers,
      totalPrsCount,
      convertedPrsCount,
      fulfilledRequests,
      ledgerAggregation,
      pendingIssues,
      pendingTransfers,
      lastBackupSetting,
    ] = await Promise.all([
      this.prisma.warehouseItem.findMany({
        where: { warehouseId },
        select: { qtyOnHand: true, wac: true },
      }),
      this.prisma.kitchenRequest.count({
        where: {
          warehouseId,
          status: { in: ['SUBMITTED', 'DRAFT'] },
        },
      }),
      this.prisma.warehouseItem.findMany({
        where: {
          warehouseId,
          item: {
            reorderPoint: { not: null },
          },
        },
        include: {
          item: true,
        },
      }),
      this.prisma.purchaseRequest.count({
        where: {
          warehouseId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      }),
      this.prisma.stocktakeSession.count({
        where: {
          warehouseId,
          status: { in: ['DRAFT', 'STARTED', 'COUNTING', 'REVIEW'] },
        },
      }),
      this.prisma.refreshToken
        .groupBy({
          by: ['sessionId'],
          where: { expiresAt: { gt: new Date() }, isRevoked: false },
        })
        .then((res) => res.length),
      this.prisma.lot.count({
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
      }),
      this.prisma.purchaseOrder.count({
        where: {
          status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
        },
      }),
      this.prisma.goodsReceivedNote.count({
        where: {
          warehouseId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      }),
      this.prisma.gRNLine.findMany({
        where: {
          goodsReceivedNote: {
            warehouseId,
            status: 'POSTED',
          },
        },
        select: {
          quantityReceived: true,
          unitPrice: true,
        },
      }),
      this.prisma.inventoryIssue.findMany({
        where: {
          warehouseId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
        include: {
          department: { select: { name: true } },
          lines: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.transfer.findMany({
        where: {
          OR: [
            { fromWarehouseId: warehouseId, status: { in: ['DRAFT', 'SUBMITTED'] } },
            { toWarehouseId: warehouseId, status: 'IN_TRANSIT' },
          ],
        },
        include: {
          toWarehouse: { select: { name: true } },
          lines: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true },
      }),
      this.prisma.lot.findMany({
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
          item: {
            include: {
              unitOfMeasure: true,
            },
          },
          warehouseItemLots: {
            where: { warehouseId },
            include: {
              warehouse: true,
            },
          },
        },
        take: 5,
      }),
      this.prisma.purchaseRequest.findMany({
        where: { warehouseId, status: 'SUBMITTED' },
        include: {
          warehouse: { select: { name: true } },
          lines: {
            include: {
              item: {
                include: {
                  warehouseItems: {
                    where: { warehouseId },
                    select: { wac: true },
                  },
                },
              },
            },
          },
        },
        take: 5,
      }),
      this.prisma.outboxEvent.count({
        where: { deadLettered: true },
      }),
      this.prisma.inventoryIssue.findMany({
        where: {
          warehouseId,
          createdAt: { gte: startOfToday },
          status: 'POSTED',
        },
        include: {
          lines: { select: { quantity: true } },
        },
      }),
      this.prisma.supplier.findMany({
        where: { isActive: true },
        include: {
          purchaseOrders: {
            include: {
              goodsReceivedNotes: {
                where: {
                  status: 'POSTED',
                  warehouseId,
                },
                include: {
                  lines: {
                    select: {
                      quantityReceived: true,
                      unitPrice: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.purchaseRequest.count({
        where: { warehouseId },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          prId: { not: null },
          purchaseRequest: { warehouseId },
        },
      }),
      this.prisma.kitchenRequest.findMany({
        where: {
          warehouseId,
          status: 'FULFILLED',
          issueId: { not: null },
        },
        include: {
          inventoryIssue: {
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.stockLedger.aggregate({
        where: {
          warehouseId,
          postedAt: { gte: sevenDaysAgo },
          documentType: { in: ['INVENTORY_ISSUE', 'TRANSFER'] },
        },
        _sum: {
          quantity: true,
        },
      }),
      this.prisma.inventoryIssue.findMany({
        where: {
          warehouseId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
        include: {
          department: { select: { name: true } },
          lines: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.transfer.findMany({
        where: {
          OR: [
            { fromWarehouseId: warehouseId, status: { in: ['DRAFT', 'SUBMITTED'] } },
            { toWarehouseId: warehouseId, status: 'IN_TRANSIT' },
          ],
        },
        include: {
          toWarehouse: { select: { name: true } },
          lines: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'last_backup_at' },
      }),
    ]);

    let total_value = 0;
    for (const item of warehouseItems) {
      total_value += Number(item.qtyOnHand) * Number(item.wac || 0);
    }

    const shortages = shortagesItems.filter(
      (wi) =>
        wi.item.reorderPoint !== null &&
        Number(wi.qtyOnHand) < Number(wi.item.reorderPoint),
    ).length;

    const total_procurement_spend = grnLines.reduce(
      (sum, line) =>
        sum + Number(line.quantityReceived) * Number(line.unitPrice),
      0,
    );

    const recentRequests = [
      ...issuesList.map((i) => ({
        id: i.id,
        documentNumber: i.issueNumber,
        type: 'ISSUE' as const,
        status: i.status,
        priority: 'HIGH',
        itemsSummary: 'Stock Issue Request',
        createdAt: i.createdAt.toISOString(),
        destination: i.department?.name || i.departmentId,
      })),
      ...transfersList.map((t) => ({
        id: t.id,
        documentNumber: t.transferNumber,
        type: 'TRANSFER' as const,
        status: t.status,
        priority: 'NORMAL',
        itemsSummary: 'Warehouse Transfer Request',
        createdAt: t.createdAt.toISOString(),
        destination: t.toWarehouse?.name || t.toWarehouseId,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

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

    const expiringLots = expiringLotsList.map((l) => {
      const wil = l.warehouseItemLots[0];
      return {
        id: l.id,
        itemId: l.itemId,
        itemName: l.item.name,
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate?.toISOString().split('T')[0] || '',
        daysLeft: Math.ceil(
          ((l.expiryDate?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24),
        ),
        warehouseName: wil?.warehouse?.name || 'Main Warehouse',
        qty: Number(wil?.qtyOnHand || 0),
        uom: l.item.unitOfMeasure?.code || 'PCS',
      };
    });

    const fulfillmentQueue = [
      ...pendingIssues.map((i) => ({
        id: i.id,
        documentNumber: i.issueNumber,
        type: 'ISSUE' as const,
        status: i.status,
        priority: 'HIGH',
        itemsCount: i.lines.length,
        destination: i.department?.name || i.departmentId,
        createdAt: i.createdAt.toISOString(),
      })),
      ...pendingTransfers.map((t) => ({
        id: t.id,
        documentNumber: t.transferNumber,
        type: 'TRANSFER' as const,
        status: t.status,
        priority: t.status === 'IN_TRANSIT' ? 'HIGH' : 'NORMAL',
        itemsCount: t.lines.length,
        destination: t.toWarehouse?.name || t.toWarehouseId,
        createdAt: t.createdAt.toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const pendingApprovals = pendingPRsList.map((pr) => {
      const totalVal = pr.lines.reduce((sum, line) => {
        const wac = Number(line.item.warehouseItems[0]?.wac || 0);
        return sum + Number(line.quantity) * wac;
      }, 0);
      return {
        id: pr.id,
        documentNumber: pr.requestNumber,
        type: 'PR' as const,
        status: pr.status,
        priority: 'HIGH',
        destination: pr.warehouse?.name || pr.warehouseId,
        createdAt: pr.createdAt.toISOString(),
        totalValue: totalVal,
      };
    });

    // Scoped capacity
    const totalItemsInWarehouse = warehouseItems.length;
    const stockedItemsInWarehouse = warehouseItems.filter(
      (item) => Number(item.qtyOnHand) > 0,
    ).length;

    const warehouseCapacity =
      totalItemsInWarehouse > 0
        ? Math.round((stockedItemsInWarehouse / totalItemsInWarehouse) * 100)
        : 0;

    // Scoped system health (global dead letters check)
    const systemHealth = Math.max(0, 100 - deadLetteredCount * 10);

    // Scoped stock health
    const stockHealth =
      totalItemsInWarehouse > 0
        ? Math.round(
            ((totalItemsInWarehouse - shortages) / totalItemsInWarehouse) * 100,
          )
        : 100;

    // Scoped today's consumption
    let todayConsumption = 0;
    for (const issue of todayIssues) {
      for (const line of issue.lines) {
        todayConsumption += Number(line.quantity);
      }
    }

    const vendorSpendMap = suppliers.map((supplier) => {
      let totalSpend = 0;
      for (const po of supplier.purchaseOrders) {
        for (const grn of po.goodsReceivedNotes) {
          for (const line of grn.lines) {
            totalSpend +=
              Number(line.quantityReceived) * Number(line.unitPrice);
          }
        }
      }
      return {
        name: supplier.name,
        spend: totalSpend,
        status: supplier.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    });

    const topVendors = vendorSpendMap
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    const poConversionRate =
      totalPrsCount > 0
        ? Math.round((convertedPrsCount / totalPrsCount) * 100)
        : 100;

    let totalDays = 0;
    let fulfilledCount = 0;
    for (const req of fulfilledRequests) {
      if (req.inventoryIssue) {
        const diffMs =
          req.inventoryIssue.createdAt.getTime() - req.createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        totalDays += diffDays;
        fulfilledCount++;
      }
    }
    const fulfillmentCycleDays =
      fulfilledCount > 0
        ? parseFloat((totalDays / fulfilledCount).toFixed(1))
        : 0;
    const throughputWeek = Math.abs(
      Number(ledgerAggregation._sum.quantity || 0),
    );

    // Parallelized query generation for scoped monthly charts
    const chartPromises: Promise<[number, number, number]>[] = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - i);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      chartPromises.push(
        Promise.all([
          this.prisma.purchaseRequest.count({
            where: {
              warehouseId,
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
          this.prisma.purchaseOrder.count({
            where: {
              prId: { not: null },
              purchaseRequest: { warehouseId },
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
          this.prisma.inventoryIssue.count({
            where: {
              warehouseId,
              status: 'POSTED',
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
        ]),
      );
    }

    const chartResults = await Promise.all(chartPromises);
    const conversionChart = chartResults.map(([prs, converted]) =>
      prs > 0 ? Math.round((converted / prs) * 100) : 100,
    );
    const velocityChart = chartResults.map(([, , issues]) =>
      Math.min(100, Math.round((issues / 50) * 100)),
    );

    const efficiencyMetrics = {
      poConversionRate,
      fulfillmentCycleDays,
      throughputWeek,
      conversionChart,
      velocityChart,
    };

    const systemAuditLogs = auditLogsList.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user?.name || log.userId || 'System',
      time: log.createdAt.toISOString(),
      type: log.targetTable,
    }));

    return {
      currency,
      currencySymbol,
      totalValue: total_value,
      pendingFulfillment: pending_fulfillment,
      shortages,
      warehouseCapacity,
      pendingPrs: pending_prs,
      activeStocktakes: active_stocktakes,
      lowStockItems: shortages,
      systemHealth,
      activeUsers: active_users,
      nearExpiryCount: near_expiry_count,
      todayConsumption,
      stockHealth,
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
      lastBackupTimestamp:
        lastBackupSetting?.value || (await this.getFilesystemLastBackup()),
    };
  }

  async getKitchenChiefDashboardStats(departmentId: string) {
    const { currency, currencySymbol } = await this.getBaseCurrencyConfig();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      pendingRequests,
      pendingItems,
      todayIssues,
      recentRequestsForHealth,
      recentKitchenRequests,
      recentIssuesForLog,
      // Kitchen specific dynamic dependencies:
      deadLetteredCount,
      activeUsersCount,
    ] = await Promise.all([
      // 1. Pending requests count
      this.prisma.kitchenRequest.count({
        where: {
          departmentId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      }),
      // 2. Pending items requested vs fulfilled
      this.prisma.kitchenRequestItem.findMany({
        where: {
          kitchenRequest: {
            departmentId,
            status: { in: ['DRAFT', 'SUBMITTED'] },
          },
        },
        select: {
          quantityRequested: true,
          quantityFulfilled: true,
        },
      }),
      // 3. Today's consumption issues
      this.prisma.inventoryIssue.findMany({
        where: {
          departmentId,
          status: 'POSTED',
          createdAt: { gte: startOfToday },
        },
        include: {
          lines: {
            select: {
              quantity: true,
            },
          },
        },
      }),
      // 4. Last 30 days requests for stock health
      this.prisma.kitchenRequestItem.findMany({
        where: {
          kitchenRequest: {
            departmentId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: 'FULFILLED',
          },
        },
        select: {
          quantityRequested: true,
          quantityFulfilled: true,
        },
      }),
      // 5. Recent Requests list (Kitchen Requests)
      this.prisma.kitchenRequest.findMany({
        where: { departmentId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          department: { select: { name: true } },
          items: {
            include: {
              item: true,
            },
          },
        },
      }),
      // 6. Recent consumption logs (posted Issues)
      this.prisma.inventoryIssue.findMany({
        where: {
          departmentId,
          status: 'POSTED',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
        },
      }),
      // 7. Dead lettered outbox events
      this.prisma.outboxEvent.count({
        where: { deadLettered: true },
      }),
      // 8. Active users (sessions)
      this.prisma.refreshToken
        .groupBy({
          by: ['sessionId'],
          where: { expiresAt: { gt: new Date() }, isRevoked: false },
        })
        .then((res) => res.length),
    ]);

    // Calculate shortages
    const shortages = pendingItems.filter(
      (item) => Number(item.quantityRequested) > Number(item.quantityFulfilled),
    ).length;

    // Calculate today consumption
    let todayConsumption = 0;
    for (const issue of todayIssues) {
      for (const line of issue.lines) {
        todayConsumption += Number(line.quantity);
      }
    }

    // Calculate stock health
    let totalRequested = 0;
    let totalFulfilled = 0;
    for (const item of recentRequestsForHealth) {
      totalRequested += Number(item.quantityRequested);
      totalFulfilled += Number(item.quantityFulfilled);
    }
    const stockHealth =
      totalRequested > 0
        ? Math.round((totalFulfilled / totalRequested) * 100)
        : 100;

    // Build recent requests formatted for schema
    const recentRequests = recentKitchenRequests.map((req) => ({
      id: req.id,
      documentNumber: req.requestNumber,
      type: 'ISSUE' as const,
      status: req.status,
      priority: 'NORMAL',
      itemsSummary: req.items
        .map((i) => `${i.item.name} x ${Number(i.quantityRequested)}`)
        .join(', '),
      createdAt: req.createdAt.toISOString(),
      destination: req.department?.name || req.departmentId,
    }));

    // Build activity log
    const activityLog: Array<{
      id: string;
      itemName: string;
      qty: number;
      uom: string;
      time: string;
      type: string;
    }> = [];
    for (const issue of recentIssuesForLog) {
      for (const line of issue.lines) {
        activityLog.push({
          id: line.id,
          itemName: line.item.name,
          qty: Number(line.quantity),
          uom: line.item.unitOfMeasure?.code ?? 'PCS',
          time: issue.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          type: 'OUT (Issue)',
        });
      }
    }

    // Calculate systemHealth
    const systemHealth = Math.max(0, 100 - deadLetteredCount * 10);

    return {
      currency,
      currencySymbol,
      totalValue: 0,
      pendingFulfillment: pendingRequests,
      shortages,
      warehouseCapacity: 0,
      pendingPrs: 0,
      activeStocktakes: 0,
      lowStockItems: shortages,
      systemHealth,
      activeUsers: activeUsersCount,
      nearExpiryCount: 0,
      todayConsumption,
      stockHealth,
      activePos: 0,
      pendingGrns: 0,
      totalProcurementSpend: 0,
      recentRequests,
      activityLog: activityLog.slice(0, 5),
      expiringLots: [],
      fulfillmentQueue: [],
      pendingApprovals: [],
      topVendors: [],
      efficiencyMetrics: {
        poConversionRate: 0,
        fulfillmentCycleDays: 0,
        throughputWeek: 0,
        conversionChart: [0, 0, 0, 0, 0, 0],
        velocityChart: [0, 0, 0, 0, 0, 0],
      },
      systemAuditLogs: [],
    };
  }

  private applyDateFilter(
    where: Prisma.StockLedgerWhereInput | Prisma.CostLedgerWhereInput,
    startDate?: string,
    endDate?: string,
  ) {
    if (startDate || endDate) {
      const postedAtFilter: { gte?: Date; lte?: Date } = {};
      if (startDate) {
        postedAtFilter.gte = new Date(startDate);
      }
      if (endDate) {
        postedAtFilter.lte = new Date(endDate);
      }
      where.postedAt = postedAtFilter;
    }
  }

  private async attachDocumentNumbers<
    T extends { documentId: string; documentType: DocumentType },
  >(
    data: T[],
  ): Promise<
    (T & {
      documentNumber: string | null;
      from: string | null;
      to: string | null;
      user: string | null;
    })[]
  > {
    if (!data.length) return [];

    const grnIds = data
      .filter((m) => m.documentType === 'GOODS_RECEIVED_NOTE')
      .map((m) => m.documentId);
    const adjustmentIds = data
      .filter((m) => m.documentType === 'ADJUSTMENT')
      .map((m) => m.documentId);
    const transferIds = data
      .filter((m) => m.documentType === 'TRANSFER')
      .map((m) => m.documentId);
    const issueIds = data
      .filter((m) => m.documentType === 'INVENTORY_ISSUE')
      .map((m) => m.documentId);

    const [grns, adjustments, transfers, issues] = await Promise.all([
      grnIds.length
        ? this.prisma.goodsReceivedNote.findMany({
            where: { id: { in: grnIds } },
            select: {
              id: true,
              grnNumber: true,
              purchaseOrder: {
                select: { supplier: { select: { name: true } } },
              },
              warehouse: { select: { name: true } },
              createdBy: { select: { name: true } },
            },
          })
        : [],
      adjustmentIds.length
        ? this.prisma.adjustment.findMany({
            where: { id: { in: adjustmentIds } },
            select: {
              id: true,
              adjustmentNumber: true,
              warehouse: { select: { name: true } },
              createdBy: { select: { name: true } },
            },
          })
        : [],
      transferIds.length
        ? this.prisma.transfer.findMany({
            where: { id: { in: transferIds } },
            select: {
              id: true,
              transferNumber: true,
              fromWarehouse: { select: { name: true } },
              toWarehouse: { select: { name: true } },
            },
          })
        : [],
      issueIds.length
        ? this.prisma.inventoryIssue.findMany({
            where: { id: { in: issueIds } },
            select: {
              id: true,
              issueNumber: true,
              warehouse: { select: { name: true } },
              department: { select: { name: true } },
              createdBy: { select: { name: true } },
            },
          })
        : [],
    ]);

    const docMap = new Map<
      string,
      {
        documentNumber: string;
        from: string | null;
        to: string | null;
        user: string | null;
      }
    >();

    grns.forEach((g) =>
      docMap.set(g.id, {
        documentNumber: g.grnNumber,
        from: g.purchaseOrder?.supplier?.name || null,
        to: g.warehouse?.name || null,
        user: g.createdBy?.name || null,
      }),
    );

    adjustments.forEach((a) =>
      docMap.set(a.id, {
        documentNumber: a.adjustmentNumber,
        from: a.warehouse?.name || null,
        to: a.warehouse?.name || null,
        user: a.createdBy?.name || null,
      }),
    );

    transfers.forEach((t) =>
      docMap.set(t.id, {
        documentNumber: t.transferNumber,
        from: t.fromWarehouse?.name || null,
        to: t.toWarehouse?.name || null,
        user: null,
      }),
    );

    issues.forEach((i) =>
      docMap.set(i.id, {
        documentNumber: i.issueNumber,
        from: i.warehouse?.name || null,
        to: i.department?.name || null,
        user: i.createdBy?.name || null,
      }),
    );

    return data.map((m) => {
      const doc = docMap.get(m.documentId);
      return {
        ...m,
        documentNumber: doc?.documentNumber || null,
        from: doc?.from || null,
        to: doc?.to || null,
        user: doc?.user || null,
      };
    });
  }
}

export { MAX_EXPORT_ROWS, EXPORT_CHUNK_SIZE };

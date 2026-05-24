import {
  Controller,
  Get,
  UseGuards,
  Query,
  Res,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { Prisma, DocumentType } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';

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

  @Get('procurement-status')
  async getProcurementStatus(@ActiveScope('warehouseId') warehouseId: string) {
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

    const fxMap = new Map<string, number>();
    for (const rate of fxRates) {
      if (!fxMap.has(rate.fromCurrencyId)) {
        fxMap.set(rate.fromCurrencyId, Number(rate.rate));
      }
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
      if (po.currency.isBase) {
        baseVal = orderVal;
        rate = 1;
      } else if (baseCurrency) {
        rate = fxMap.get(po.currencyId) ?? 1;
        baseVal = orderVal * rate;
      }

      const existing = currencyGroups.get(po.currencyId) || {
        currency: po.currency.code,
        total: 0,
        total_base: 0,
        last_rate: rate,
      };
      existing.total += orderVal;
      existing.total_base += baseVal;
      existing.last_rate = rate;
      currencyGroups.set(po.currencyId, existing);
    }

    return Array.from(currencyGroups.values());
  }

  @Get('wac-history')
  async getWacHistory(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('itemId') itemId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
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

  @Get('lot-trace')
  async getLotTrace(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('lotId') lotId: string,
  ) {
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

  // ─── ExcelJS Exports ──────────────────────────────────────────────

  @Get('movements/export')
  async exportMovements(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Res() res: Response,
    @Query('itemId') itemId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionType') transactionType?: string,
  ) {
    const result = await this.getMovements(
      warehouseId,
      '1',
      '1000000', // Unlimited fetch for exports
      itemId,
      startDate,
      endDate,
      transactionType,
    );

    const formattedData = result.data.map((m) => ({
      postedAt: m.postedAt,
      itemName: m.item.name,
      sku: m.item.sku,
      documentType: m.documentType,
      documentId: m.documentId,
      quantity: Number(m.quantity),
    }));

    await this.generateXlsxResponse(
      res,
      'stock-movements',
      'Stock Movements',
      userName,
      [
        { header: 'Date', key: 'postedAt', width: 25, isDate: true },
        { header: 'Item Name', key: 'itemName', width: 35 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Transaction Type', key: 'documentType', width: 25 },
        { header: 'Document Ref', key: 'documentId', width: 35 },
        { header: 'Quantity', key: 'quantity', width: 15, isNumber: true },
      ],
      formattedData,
    );
  }

  @Get('expiry/export')
  async exportExpiry(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Res() res: Response,
  ) {
    const data = await this.getExpiryReport(warehouseId);

    await this.generateXlsxResponse(
      res,
      'expiry-report',
      'Lot Expiry Report',
      userName,
      [
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Item Name', key: 'name', width: 35 },
        { header: 'Lot Number', key: 'lot_no', width: 25 },
        { header: 'Expiry Date', key: 'expiry_date', width: 25, isDate: true },
        { header: 'Qty On Hand', key: 'qtyOnHand', width: 15, isNumber: true },
        {
          header: 'Days Remaining',
          key: 'days_remaining',
          width: 18,
          isNumber: true,
        },
        { header: 'Status', key: 'status', width: 15 },
      ],
      data,
      (ws) => {
        // Expiry Highlight Customizer
        ws.eachRow((row, rowNum) => {
          if (rowNum < 6) return;
          const daysVal = Number(row.getCell(6).value);
          if (daysVal < 0) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFECACA' }, // Light Red
              };
            });
          } else if (daysVal <= 7) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF08A' }, // Light Yellow
              };
            });
          }
        });
      },
    );
  }

  @Get('available-inventory/export')
  async exportAvailableInventory(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Res() res: Response,
  ) {
    const data = await this.getAvailableInventory(warehouseId);

    const formattedData = data.map((d) => ({
      ...d,
      total_value: d.qty_physical * d.wac,
    }));

    await this.generateXlsxResponse(
      res,
      'available-inventory',
      'Available Inventory',
      userName,
      [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Item Name', key: 'name', width: 35 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'UoM', key: 'uom', width: 12 },
        {
          header: 'Qty On Hand',
          key: 'qty_physical',
          width: 18,
          isNumber: true,
        },
        {
          header: 'Qty Allocated',
          key: 'qty_reserved',
          width: 18,
          isNumber: true,
        },
        {
          header: 'Qty Available',
          key: 'qty_available',
          width: 18,
          isNumber: true,
        },
        { header: 'WAC', key: 'wac', width: 15, isNumber: true },
        {
          header: 'Total Value',
          key: 'total_value',
          width: 18,
          isNumber: true,
        },
      ],
      formattedData,
      (ws) => {
        // Summary Footer
        const lastRowIndex = ws.rowCount;
        const footerRow = ws.addRow([]);
        footerRow.getCell(8).value = 'Total Inventory Value:';
        footerRow.getCell(8).font = { bold: true };
        footerRow.getCell(9).value = { formula: `SUM(I6:I${lastRowIndex})` };
        footerRow.getCell(9).font = { bold: true };
        footerRow.getCell(9).numFmt = '#,##0.00';
      },
    );
  }

  @Get('stocktake-variance/export')
  async exportStocktakeVariance(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Query('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const data = await this.getStocktakeVariance(warehouseId, sessionId);

    const formattedData = data.map((d) => ({
      ...d,
      variance_value: d.variance * d.wac,
    }));

    await this.generateXlsxResponse(
      res,
      'stocktake-variance',
      'Stocktake Variance Report',
      userName,
      [
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Item Name', key: 'name', width: 35 },
        { header: 'Lot Number', key: 'lotNumber', width: 25 },
        { header: 'System Qty', key: 'system_qty', width: 15, isNumber: true },
        {
          header: 'Counted Qty',
          key: 'counted_qty',
          width: 15,
          isNumber: true,
        },
        { header: 'Variance', key: 'variance', width: 15, isNumber: true },
        { header: 'WAC', key: 'wac', width: 15, isNumber: true },
        {
          header: 'Variance Value',
          key: 'variance_value',
          width: 18,
          isNumber: true,
        },
      ],
      formattedData,
      (ws) => {
        // Red/Green Customizer
        ws.eachRow((row, rowNum) => {
          if (rowNum < 6) return;
          const varianceCell = row.getCell(6);
          const val = Number(varianceCell.value);
          if (val > 0) {
            varianceCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD1FAE5' }, // Light Green
            };
            varianceCell.font = { bold: true, color: { argb: 'FF065F46' } };
          } else if (val < 0) {
            varianceCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' }, // Light Red
            };
            varianceCell.font = { bold: true, color: { argb: 'FF991B1B' } };
          }
        });
      },
    );
  }

  @Get('procurement-status/export')
  async exportProcurementStatus(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Res() res: Response,
  ) {
    const data = await this.getProcurementStatus(warehouseId);

    await this.generateXlsxResponse(
      res,
      'procurement-status',
      'Procurement Status Report',
      userName,
      [
        { header: 'PO Number', key: 'po_no', width: 25 },
        { header: 'Date', key: 'date', width: 25, isDate: true },
        { header: 'Supplier Name', key: 'supplier', width: 35 },
        { header: 'Currency', key: 'currency', width: 15 },
        { header: 'Total Value', key: 'total', width: 18, isNumber: true },
        { header: 'Status', key: 'status', width: 18 },
      ],
      data,
    );
  }

  @Get('wac-history/export')
  async exportWacHistory(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Query('itemId') itemId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const data = await this.getWacHistory(
      warehouseId,
      itemId,
      startDate,
      endDate,
    );

    const formattedData = data.map((d) => ({
      postedAt: d.postedAt,
      documentType: d.documentType,
      documentId: d.documentId,
      quantity: Number(d.quantity),
      unitPrice: Number(d.unitPrice),
      newWac: Number(d.newWac),
      itemName: d.item.name,
      sku: d.item.sku,
    }));

    await this.generateXlsxResponse(
      res,
      'wac-history',
      'Weighted Average Cost (WAC) History',
      userName,
      [
        { header: 'Date', key: 'postedAt', width: 25, isDate: true },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Item Name', key: 'itemName', width: 35 },
        { header: 'Document Type', key: 'documentType', width: 25 },
        { header: 'Document Ref', key: 'documentId', width: 35 },
        { header: 'Qty Adjusted', key: 'quantity', width: 15, isNumber: true },
        { header: 'Unit Price', key: 'unitPrice', width: 15, isNumber: true },
        { header: 'New WAC', key: 'newWac', width: 15, isNumber: true },
      ],
      formattedData,
    );
  }

  @Get('lot-trace/export')
  async exportLotTrace(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Query('lotId') lotId: string,
    @Res() res: Response,
  ) {
    const data = await this.getLotTrace(warehouseId, lotId);

    await this.generateXlsxResponse(
      res,
      'lot-traceability',
      `Lot Traceability Report - ${data.lotNumber}`,
      userName,
      [
        { header: 'Doc Number', key: 'documentNumber', width: 25 },
        { header: 'Doc Type', key: 'documentType', width: 25 },
        { header: 'Allocated Qty', key: 'quantity', width: 18, isNumber: true },
        { header: 'Transaction Date', key: 'date', width: 25, isDate: true },
      ],
      data.allocations,
    );
  }

  // ─── Private Logic Helper ────────────────────────────────────────

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

  private async generateXlsxResponse(
    res: Response,
    filename: string,
    title: string,
    userName: string,
    columns: {
      header: string;
      key: string;
      width: number;
      isNumber?: boolean;
      isDate?: boolean;
    }[],
    data: Record<string, unknown>[],
    customStyler?: (worksheet: ExcelJS.Worksheet) => void,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-]/g, '-');

    // 1. Add Branding Title
    const titleRow = worksheet.addRow(['LogiRest Inventory Management System']);
    titleRow.font = {
      name: 'Helvetica Neue',
      size: 16,
      bold: true,
      color: { argb: 'FF1E3A8A' },
    };

    // 2. Add Report Subject
    const subjectRow = worksheet.addRow([title]);
    subjectRow.font = { name: 'Helvetica Neue', size: 12, bold: true };

    // 3. Add Metadata Row
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const metaRow = worksheet.addRow([
      `Generated At: ${nowStr} | Generated By: ${userName || 'System'}`,
    ]);
    metaRow.font = {
      name: 'Helvetica Neue',
      size: 10,
      italic: true,
      color: { argb: 'FF64748B' },
    };

    // Row 4 is spacer
    worksheet.addRow([]);

    // 5. Add headers at Row 5
    const headerHeaders = columns.map((c) => c.header);
    const headerRow = worksheet.addRow(headerHeaders);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      cell.font = {
        name: 'Helvetica Neue',
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 6. Populate data
    for (const item of data) {
      const rowValues = columns.map((col) => {
        const val = item[col.key];
        if (col.isDate && val) {
          if (
            typeof val === 'string' ||
            typeof val === 'number' ||
            val instanceof Date
          ) {
            return new Date(val);
          }
        }
        if (col.isNumber && val !== undefined && val !== null) {
          if (typeof val === 'number' || typeof val === 'string') {
            return Number(val);
          }
        }
        return (val as ExcelJS.CellValue) ?? '';
      });
      worksheet.addRow(rowValues);
    }

    // 7. Auto fit columns widths
    columns.forEach((col, index) => {
      const excelCol = worksheet.getColumn(index + 1);
      excelCol.width = col.width;
    });

    // 8. Run custom stylers (e.g. highlights, variance coloring, sum row footers)
    if (customStyler) {
      customStyler(worksheet);
    }

    // Send HTTP Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${sanitizedFilename}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

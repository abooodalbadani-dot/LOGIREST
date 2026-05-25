import {
  Controller,
  Get,
  UseGuards,
  Query,
  Res,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';

const MAX_EXPORT_ROWS = 50000;

@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  async getKpis(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getKpis(warehouseId);
  }

  @Get('dashboard')
  async getDashboard(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getDashboard(warehouseId);
  }

  @Get('adjustments/summary')
  async getAdjustmentsSummary(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getAdjustmentsSummary(warehouseId);
  }

  @Get('transfers/overdue')
  async getOverdueTransfers(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getOverdueTransfers(warehouseId);
  }

  @Get('available-inventory')
  async getAvailableInventory(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getAvailableInventory(warehouseId);
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
    return this.reportsService.getMovements(
      warehouseId,
      page,
      limit,
      itemId,
      startDate,
      endDate,
      transactionType,
    );
  }

  @Get('expiry')
  async getExpiryReport(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getExpiryReport(warehouseId);
  }

  @Get('stocktake-variance')
  async getStocktakeVariance(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('sessionId') sessionId: string,
  ) {
    return this.reportsService.getStocktakeVariance(warehouseId, sessionId);
  }

  @Get('procurement-status')
  async getProcurementStatus(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getProcurementStatus(warehouseId);
  }

  @Get('currency-summaries')
  async getCurrencySummaries(@ActiveScope('warehouseId') warehouseId: string) {
    return this.reportsService.getCurrencySummaries(warehouseId);
  }

  @Get('wac-history')
  async getWacHistory(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('itemId') itemId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getWacHistory(warehouseId, itemId, startDate, endDate);
  }

  @Get('lot-trace')
  async getLotTrace(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('lotId') lotId: string,
  ) {
    return this.reportsService.getLotTrace(warehouseId, lotId);
  }

  // ─── T024: Count Endpoint ──────────────────────────────────────

  @Get('count')
  async getCount(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('type') type: string,
    @Query('itemId') itemId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionType') transactionType?: string,
    @Query('lotId') lotId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    if (!type) {
      throw new BadRequestException('type query parameter is required');
    }
    return this.reportsService.getReportCount(type, warehouseId, {
      itemId,
      startDate,
      endDate,
      transactionType,
      lotId,
      sessionId,
    });
  }

  // ─── T024: Export with Cursor-Based Pagination ────────────────

  @Get('export')
  async exportReport(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('type') type: string,
    @Query('cursor') cursor?: string,
    @Query('itemId') itemId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionType') transactionType?: string,
    @Query('lotId') lotId?: string,
  ) {
    if (!type) {
      throw new BadRequestException('type query parameter is required');
    }

    const countResult = await this.reportsService.getReportCount(type, warehouseId, {
      itemId,
      startDate,
      endDate,
      transactionType,
      lotId,
    });

    this.reportsService.checkExportLimit(countResult.count);

    switch (type) {
      case 'movements':
        return this.reportsService.exportMovementsCursor(warehouseId, cursor, {
          itemId,
          startDate,
          endDate,
          transactionType,
        });
      case 'expiry':
        return this.reportsService.exportExpiryCursor(warehouseId, cursor);
      case 'wac-history':
        return this.reportsService.exportWacHistoryCursor(warehouseId, cursor, {
          itemId,
          startDate,
          endDate,
        });
      case 'lot-trace':
        if (!lotId) throw new BadRequestException('lotId is required for lot-trace export');
        return this.reportsService.exportLotTraceCursor(warehouseId, lotId);
      case 'available-inventory':
      case 'stocktake-variance':
      case 'procurement-status':
      case 'currency-summaries':
        throw new BadRequestException(
          `Direct cursor export not supported for ${type}. Use the dedicated export endpoint.`,
        );
      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }
  }

  // ─── ExcelJS Exports ──────────────────────────────────────────

  private async checkAndExport(
    warehouseId: string,
    fetchData: () => Promise<Record<string, unknown>[]>,
    res: Response,
    filename: string,
    title: string,
    userName: string,
    columns: { header: string; key: string; width: number; isNumber?: boolean; isDate?: boolean }[],
    customStyler?: (worksheet: ExcelJS.Worksheet) => void,
  ) {
    let data = await fetchData();
    if (data.length > MAX_EXPORT_ROWS) {
      data = data.slice(0, MAX_EXPORT_ROWS);
    }
    await this.generateXlsxResponse(res, filename, title, userName, columns, data, customStyler);
  }

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
    await this.checkAndExport(
      warehouseId,
      async () => {
        const result = await this.reportsService.getMovements(
          warehouseId,
          '1',
          (MAX_EXPORT_ROWS + 1).toString(),
          itemId,
          startDate,
          endDate,
          transactionType,
        );
        return result.data.map((m: any) => ({
          postedAt: m.postedAt,
          itemName: m.item.name,
          sku: m.item.sku,
          documentType: m.documentType,
          documentId: m.documentId,
          quantity: Number(m.quantity),
        }));
      },
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
    );
  }

  @Get('expiry/export')
  async exportExpiry(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Res() res: Response,
  ) {
    await this.checkAndExport(
      warehouseId,
      () => this.reportsService.getExpiryReport(warehouseId),
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
        { header: 'Days Remaining', key: 'days_remaining', width: 18, isNumber: true },
        { header: 'Status', key: 'status', width: 15 },
      ],
      (ws) => {
        ws.eachRow((row, rowNum) => {
          if (rowNum < 6) return;
          const daysVal = Number(row.getCell(6).value);
          if (daysVal < 0) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFECACA' },
              };
            });
          } else if (daysVal <= 7) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF08A' },
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
    await this.checkAndExport(
      warehouseId,
      async () => {
        const data = await this.reportsService.getAvailableInventory(warehouseId);
        return data.map((d: any) => ({
          ...d,
          total_value: d.qty_physical * d.wac,
        }));
      },
      res,
      'available-inventory',
      'Available Inventory',
      userName,
      [
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Item Name', key: 'name', width: 35 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'UoM', key: 'uom', width: 12 },
        { header: 'Qty On Hand', key: 'qty_physical', width: 18, isNumber: true },
        { header: 'Qty Allocated', key: 'qty_reserved', width: 18, isNumber: true },
        { header: 'Qty Available', key: 'qty_available', width: 18, isNumber: true },
        { header: 'WAC', key: 'wac', width: 15, isNumber: true },
        { header: 'Total Value', key: 'total_value', width: 18, isNumber: true },
      ],
      (ws) => {
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
    await this.checkAndExport(
      warehouseId,
      async () => {
        const data = await this.reportsService.getStocktakeVariance(warehouseId, sessionId);
        return data.map((d: any) => ({
          ...d,
          variance_value: d.variance * d.wac,
        }));
      },
      res,
      'stocktake-variance',
      'Stocktake Variance Report',
      userName,
      [
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Item Name', key: 'name', width: 35 },
        { header: 'Lot Number', key: 'lotNumber', width: 25 },
        { header: 'System Qty', key: 'system_qty', width: 15, isNumber: true },
        { header: 'Counted Qty', key: 'counted_qty', width: 15, isNumber: true },
        { header: 'Variance', key: 'variance', width: 15, isNumber: true },
        { header: 'WAC', key: 'wac', width: 15, isNumber: true },
        { header: 'Variance Value', key: 'variance_value', width: 18, isNumber: true },
      ],
      (ws) => {
        ws.eachRow((row, rowNum) => {
          if (rowNum < 6) return;
          const varianceCell = row.getCell(6);
          const val = Number(varianceCell.value);
          if (val > 0) {
            varianceCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD1FAE5' },
            };
            varianceCell.font = { bold: true, color: { argb: 'FF065F46' } };
          } else if (val < 0) {
            varianceCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' },
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
    await this.checkAndExport(
      warehouseId,
      () => this.reportsService.getProcurementStatus(warehouseId),
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
    await this.checkAndExport(
      warehouseId,
      async () => {
        const data = await this.reportsService.getWacHistory(warehouseId, itemId, startDate, endDate);
        return data.map((d: any) => ({
          postedAt: d.postedAt,
          documentType: d.documentType,
          documentId: d.documentId,
          quantity: Number(d.quantity),
          unitPrice: Number(d.unitPrice),
          newWac: Number(d.newWac),
          itemName: d.item.name,
          sku: d.item.sku,
        }));
      },
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
    );
  }

  @Get('lot-trace/export')
  async exportLotTrace(
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('name') userName: string,
    @Query('lotId') lotId: string,
    @Res() res: Response,
  ) {
    await this.checkAndExport(
      warehouseId,
      async () => {
        const trace = await this.reportsService.getLotTrace(warehouseId, lotId);
        return trace.allocations as Record<string, unknown>[];
      },
      res,
      'lot-traceability',
      `Lot Traceability Report`,
      userName,
      [
        { header: 'Doc Number', key: 'documentNumber', width: 25 },
        { header: 'Doc Type', key: 'documentType', width: 25 },
        { header: 'Allocated Qty', key: 'quantity', width: 18, isNumber: true },
        { header: 'Transaction Date', key: 'date', width: 25, isDate: true },
      ],
    );
  }

  // ─── Private: XLSX Response Generator ─────────────────────────

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

    const titleRow = worksheet.addRow(['LogiRest Inventory Management System']);
    titleRow.font = {
      name: 'Helvetica Neue',
      size: 16,
      bold: true,
      color: { argb: 'FF1E3A8A' },
    };

    const subjectRow = worksheet.addRow([title]);
    subjectRow.font = { name: 'Helvetica Neue', size: 12, bold: true };

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

    worksheet.addRow([]);

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

    columns.forEach((col, index) => {
      const excelCol = worksheet.getColumn(index + 1);
      excelCol.width = col.width;
    });

    if (customStyler) {
      customStyler(worksheet);
    }

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

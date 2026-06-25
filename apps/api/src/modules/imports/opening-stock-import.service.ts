import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdjustmentsService } from '../operations/adjustments/adjustments.service';
import { AdjustmentPostService } from '../operations/adjustment-post.service';
import { AdjustmentDirection, AdjustmentReason, Role } from '@prisma/client';
import * as ExcelJS from 'exceljs';

interface ImportRow {
  __rowNumber: number;
  [key: string]: unknown;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function getCellValue(cell: ExcelJS.Cell): unknown {
  const val = cell.value;
  if (val === null || val === undefined) {
    return undefined;
  }
  if (isObject(val)) {
    if ('result' in val) {
      return val.result;
    }
    if ('text' in val) {
      return val.text;
    }
  }
  return val;
}

interface ValidRow {
  itemId: string;
  quantity: number;
  unitCost: number;
  lotNumber?: string;
  expiryDate?: Date;
  isBatched: boolean;
  hasExpiry: boolean;
  rowNum: number;
}

@Injectable()
export class OpeningStockImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly adjustmentPostService: AdjustmentPostService,
  ) {}

  async importOpeningStock(fileBuffer: Buffer, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const rows: ImportRow[] = [];
    const headers: string[] = [];

    // Row 1 contains the headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      headers.push(cell.text.trim());
    });

    // Check required columns
    const requiredCols = ['warehouseCode', 'itemSku', 'quantity', 'unitCost'];
    for (const col of requiredCols) {
      if (!headers.includes(col)) {
        throw new BadRequestException(
          `Invalid template: "${col}" column is missing.`,
        );
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const rowData: ImportRow = { __rowNumber: rowNumber };

      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        rowData[header] = getCellValue(cell);
      });

      rows.push(rowData);
    });

    const results = {
      total: rows.length,
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    // Construct in-memory maps of Warehouses and Items for fast lookup
    const warehouseMap = new Map<string, string>(); // code -> id
    const itemMap = new Map<
      string,
      { id: string; isBatched: boolean; hasExpiry: boolean }
    >(); // sku -> details

    const warehouses = await this.prisma.warehouse.findMany({
      select: { id: true, code: true },
    });
    warehouses.forEach((w) => {
      warehouseMap.set(w.code.trim().toUpperCase(), w.id);
    });

    const items = await this.prisma.item.findMany({
      select: { id: true, sku: true, isBatched: true, hasExpiry: true },
    });
    items.forEach((item) => {
      itemMap.set(item.sku.trim().toUpperCase(), {
        id: item.id,
        isBatched: item.isBatched,
        hasExpiry: item.hasExpiry,
      });
    });

    // Group valid rows by warehouseId
    const validRowsByWarehouse = new Map<string, ValidRow[]>();

    for (const row of rows) {
      const rowNum = row.__rowNumber;
      try {
        const warehouseCode =
          typeof row.warehouseCode === 'string' ||
          typeof row.warehouseCode === 'number'
            ? String(row.warehouseCode).trim().toUpperCase()
            : '';
        const itemSku =
          typeof row.itemSku === 'string' || typeof row.itemSku === 'number'
            ? String(row.itemSku).trim().toUpperCase()
            : '';
        const qtyRaw = row.quantity;
        const unitCostRaw = row.unitCost;
        const lotNumber =
          typeof row.lotNumber === 'string' || typeof row.lotNumber === 'number'
            ? String(row.lotNumber).trim()
            : undefined;
        const expiryDateRaw = row.expiryDate;

        if (!warehouseCode) {
          throw new BadRequestException('Warehouse code is required');
        }
        if (!itemSku) {
          throw new BadRequestException('Item SKU is required');
        }
        if (qtyRaw === undefined || qtyRaw === null) {
          throw new BadRequestException('Quantity is required');
        }
        const quantity = Number(qtyRaw);
        if (isNaN(quantity) || quantity <= 0) {
          throw new BadRequestException('Quantity must be a positive number');
        }

        if (unitCostRaw === undefined || unitCostRaw === null) {
          throw new BadRequestException('Unit cost is required');
        }
        const unitCost = Number(unitCostRaw);
        if (isNaN(unitCost) || unitCost < 0) {
          throw new BadRequestException(
            'Unit cost must be a non-negative number',
          );
        }

        const warehouseId = warehouseMap.get(warehouseCode);
        if (!warehouseId) {
          throw new NotFoundException(
            `Warehouse with code "${warehouseCode}" not found`,
          );
        }

        const itemInfo = itemMap.get(itemSku);
        if (!itemInfo) {
          throw new NotFoundException(`Item with SKU "${itemSku}" not found`);
        }

        const requiresLot = itemInfo.isBatched || itemInfo.hasExpiry;
        if (requiresLot && !lotNumber) {
          throw new BadRequestException(
            `Item SKU "${itemSku}" requires a lot number`,
          );
        }

        let expiryDate: Date | undefined;
        if (expiryDateRaw) {
          if (expiryDateRaw instanceof Date) {
            expiryDate = expiryDateRaw;
          } else if (typeof expiryDateRaw === 'number') {
            // Excel serial date conversion (Excel base date is Dec 30, 1899)
            expiryDate = new Date((expiryDateRaw - 25569) * 86400 * 1000);
          } else if (typeof expiryDateRaw === 'string') {
            expiryDate = new Date(expiryDateRaw);
          } else {
            throw new BadRequestException('Invalid expiry date format');
          }
          if (isNaN(expiryDate.getTime())) {
            throw new BadRequestException('Invalid expiry date format');
          }
        }

        if (itemInfo.hasExpiry && !expiryDate) {
          throw new BadRequestException(
            `Item SKU "${itemSku}" tracks expiry and requires an expiry date`,
          );
        }

        let whGroup = validRowsByWarehouse.get(warehouseId);
        if (!whGroup) {
          whGroup = [];
          validRowsByWarehouse.set(warehouseId, whGroup);
        }

        whGroup.push({
          itemId: itemInfo.id,
          quantity,
          unitCost,
          lotNumber,
          expiryDate,
          isBatched: itemInfo.isBatched,
          hasExpiry: itemInfo.hasExpiry,
          rowNum,
        });
      } catch (error: unknown) {
        results.failedCount++;
        const message =
          error instanceof Error ? error.message : 'Validation error occurred';
        results.errors.push({
          row: rowNum,
          message,
        });
      }
    }

    // Process each warehouse group
    for (const [warehouseId, groupRows] of validRowsByWarehouse.entries()) {
      try {
        const linesToCreate: Array<{
          itemId: string;
          lotId?: string;
          quantity: number;
          direction: AdjustmentDirection;
          reason: AdjustmentReason;
          unitCost: number;
        }> = [];

        for (const r of groupRows) {
          let lotId: string | undefined;
          if (r.isBatched || r.hasExpiry) {
            const lotNumberVal = r.lotNumber!;
            let lot = await this.prisma.lot.findUnique({
              where: { lotNumber: lotNumberVal },
            });

            if (!lot) {
              lot = await this.prisma.lot.create({
                data: {
                  itemId: r.itemId,
                  lotNumber: lotNumberVal,
                  receivedDate: new Date(),
                  expiryDate: r.expiryDate || null,
                  status: 'ACTIVE',
                },
              });
            } else if (lot.itemId !== r.itemId) {
              throw new BadRequestException(
                `Lot number "${lotNumberVal}" already exists but belongs to a different item`,
              );
            }
            lotId = lot.id;
          }

          linesToCreate.push({
            itemId: r.itemId,
            lotId,
            quantity: r.quantity,
            direction: AdjustmentDirection.IN,
            reason: AdjustmentReason.ADMIN_OVERRIDE,
            unitCost: r.unitCost,
          });
        }

        // 1. Create Adjustment (generates adjustment number and saves as DRAFT)
        const adj = await this.adjustmentsService.create(
          {
            warehouseId,
            lines: linesToCreate,
          },
          userId,
        );

        // 2. Programmatically update status to APPROVED
        await this.prisma.adjustment.update({
          where: { id: adj.id },
          data: { status: 'APPROVED' },
        });

        // 3. Post adjustment (updates ledgers, WAC, on-hand counts)
        await this.adjustmentPostService.post(adj.id, userId, Role.ADMIN);

        results.successCount += groupRows.length;
      } catch (error: unknown) {
        results.failedCount += groupRows.length;
        const message =
          error instanceof Error ? error.message : 'Ledger write error';
        groupRows.forEach((r) => {
          results.errors.push({
            row: r.rowNum,
            message: `Warehouse group post failed: ${message}`,
          });
        });
      }
    }

    return results;
  }
}

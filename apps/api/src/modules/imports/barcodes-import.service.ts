import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { BarcodesService } from '../master-data/barcodes/barcodes.service';
import { PrismaService } from '../../database/prisma.service';
import * as ExcelJS from 'exceljs';

interface ImportRow {
  __rowNumber: number;
  [key: string]: unknown;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function cleanStringValue(val: unknown): string {
  if (typeof val === 'string') {
    return val.trim();
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val).trim();
  }
  return '';
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

@Injectable()
export class BarcodesImportService {
  constructor(
    private readonly barcodesService: BarcodesService,
    private readonly prisma: PrismaService,
  ) {}

  async importBarcodes(fileBuffer: Buffer, userId: string, ipAddress?: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const rows: ImportRow[] = [];
    const headers: string[] = [];

    // Row 1 contains headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      headers.push(cell.text.trim());
    });

    const findHeaderKey = (keys: string[]): string | undefined => {
      return headers.find((h) =>
        keys.some((k) => k.toLowerCase() === h.toLowerCase()),
      );
    };

    const itemCodeKey = findHeaderKey(['ItemCode', 'itemCode', 'Item_Code']);
    const barcodeKey = findHeaderKey(['Barcode', 'barcode']);

    const unitKey = findHeaderKey(['Unit', 'unit', 'Uom', 'uom', 'UomCode']);

    if (!itemCodeKey) {
      throw new BadRequestException(
        'Invalid template: "ItemCode" column is missing.',
      );
    }
    if (!barcodeKey) {
      throw new BadRequestException(
        'Invalid template: "Barcode" column is missing.',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
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

    // Load UoM map for fast lookups
    const uomMap = new Map<string, string>(); // code/name -> id
    const uoms = await this.prisma.unitOfMeasure.findMany({
      select: { id: true, code: true, name: true },
    });
    uoms.forEach((u) => {
      uomMap.set(u.code.trim().toUpperCase(), u.id);
      uomMap.set(u.name.trim().toUpperCase(), u.id);
    });

    const seenBarcodes = new Set<string>();

    for (const row of rows) {
      try {
        const itemCode = cleanStringValue(row[itemCodeKey]).toUpperCase();
        const barcode = cleanStringValue(row[barcodeKey]);
        const unitStr = unitKey ? cleanStringValue(row[unitKey]).toUpperCase() : '';

        if (!itemCode) {
          throw new BadRequestException('ItemCode is required');
        }
        if (!barcode) {
          throw new BadRequestException('Barcode is required');
        }

        if (seenBarcodes.has(barcode.toUpperCase())) {
          throw new BadRequestException(
            `Duplicate Barcode "${barcode}" found in spreadsheet`,
          );
        }
        seenBarcodes.add(barcode.toUpperCase());

        // Resolve Item ID & UOMs by SKU (itemCode)
        const item = await this.prisma.item.findUnique({
          where: { sku: itemCode },
          select: {
            id: true,
            uomId: true,
            uomConversions: { select: { fromUomId: true } },
          },
        });

        if (!item) {
          throw new NotFoundException(
            `Item with Code (SKU) "${itemCode}" not found.`,
          );
        }

        let targetUomId = item.uomId; // Default to primary UOM
        if (unitStr) {
          const resolvedUomId = uomMap.get(unitStr);
          if (!resolvedUomId) {
            throw new NotFoundException(
              `Unit of Measure "${unitStr}" specified for barcode not found. Verify it is defined in Master Data.`,
            );
          }

          // Check if resolved UOM is either the primary UOM or a secondary UOM for this item
          const isPrimary = resolvedUomId === item.uomId;
          const isSecondary = item.uomConversions.some(
            (c) => c.fromUomId === resolvedUomId,
          );

          if (!isPrimary && !isSecondary) {
            throw new BadRequestException(
              `Unit "${unitStr}" is neither the Primary Unit nor a Secondary Unit defined for item "${itemCode}".`,
            );
          }

          targetUomId = resolvedUomId;
        }

        await this.barcodesService.create(
          {
            itemId: item.id,
            uomId: targetUomId,
            code: barcode,
          },
          userId,
          ipAddress,
        );

        results.successCount++;
      } catch (error: unknown) {
        results.failedCount++;
        const message =
          error instanceof Error ? error.message : 'Unknown creation error';
        results.errors.push({
          row: row.__rowNumber,
          message,
        });
      }
    }

    return results;
  }
}

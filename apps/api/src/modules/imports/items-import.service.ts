import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
export class ItemsImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importItems(fileBuffer: Buffer, userId: string) {
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

    // Check required columns (case-sensitive to match frontend)
    const requiredCols = ['Name', 'Code', 'Category', 'Unit'];
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

    // Load category and UoM maps for fast lookups
    const categoryMap = new Map<string, string>(); // code/name -> id
    const uomMap = new Map<string, string>(); // code/name -> id

    const categories = await this.prisma.category.findMany({
      select: { id: true, code: true, name: true },
    });
    categories.forEach((cat) => {
      categoryMap.set(cat.code.trim().toUpperCase(), cat.id);
      categoryMap.set(cat.name.trim().toUpperCase(), cat.id);
    });

    const uoms = await this.prisma.unitOfMeasure.findMany({
      select: { id: true, code: true, name: true },
    });
    uoms.forEach((uom) => {
      uomMap.set(uom.code.trim().toUpperCase(), uom.id);
      uomMap.set(uom.name.trim().toUpperCase(), uom.id);
    });

    // Keep track of SKUs seen in this sheet to catch duplicates before DB hit
    const seenSkus = new Set<string>();

    for (const row of rows) {
      const rowNum = row.__rowNumber;
      try {
        const name = cleanStringValue(row.Name);
        const code = cleanStringValue(row.Code).toUpperCase();
        const categoryStr = cleanStringValue(row.Category).toUpperCase();
        const unitStr = cleanStringValue(row.Unit).toUpperCase();

        const lotTrackedRaw = cleanStringValue(row.LotTracked).toLowerCase();
        const lotTracked =
          lotTrackedRaw === 'true' ||
          lotTrackedRaw === 'yes' ||
          lotTrackedRaw === '1' ||
          lotTrackedRaw === 'y';

        const statusRaw = cleanStringValue(row.Status).toLowerCase();
        // If Status column is blank, default to active (true), otherwise parse
        const isActive =
          statusRaw === '' ||
          statusRaw === 'active' ||
          statusRaw === 'true' ||
          statusRaw === 'yes' ||
          statusRaw === '1' ||
          statusRaw === 'y';

        if (!name) {
          throw new BadRequestException('Item Name is required');
        }
        if (!code) {
          throw new BadRequestException('Item Code (SKU) is required');
        }
        if (!categoryStr) {
          throw new BadRequestException('Category is required');
        }
        if (!unitStr) {
          throw new BadRequestException('Unit is required');
        }

        // Check SKU duplication in current spreadsheet
        if (seenSkus.has(code)) {
          throw new BadRequestException(
            `Duplicate Item Code (SKU) "${code}" found in spreadsheet`,
          );
        }
        seenSkus.add(code);

        // Resolve Category
        const categoryId = categoryMap.get(categoryStr);
        if (!categoryId) {
          throw new NotFoundException(
            `Category "${categoryStr}" not found. Verify it is defined in Master Data.`,
          );
        }

        // Resolve Unit of Measure
        const uomId = uomMap.get(unitStr);
        if (!uomId) {
          throw new NotFoundException(
            `Unit of Measure "${unitStr}" not found. Verify it is defined in Master Data.`,
          );
        }

        // Check SKU duplication in DB
        const existingItem = await this.prisma.item.findUnique({
          where: { sku: code },
          select: { id: true },
        });
        if (existingItem) {
          throw new BadRequestException(
            `Item with Code (SKU) "${code}" already exists in the system`,
          );
        }

        // Create Item record
        await this.prisma.item.create({
          data: {
            name,
            sku: code,
            categoryId,
            uomId,
            isBatched: lotTracked,
            hasExpiry: lotTracked, // Standard logic: batching is paired with lot expiry tracing
            isActive,
          },
        });

        results.successCount++;
      } catch (error: unknown) {
        results.failedCount++;
        const message =
          error instanceof Error ? error.message : 'Unknown creation error';
        results.errors.push({
          row: rowNum,
          message,
        });
      }
    }

    return results;
  }
}

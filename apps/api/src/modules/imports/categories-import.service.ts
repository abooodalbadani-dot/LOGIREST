import { Injectable, BadRequestException } from '@nestjs/common';
import { CategoriesService } from '../master-data/categories/categories.service';
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
export class CategoriesImportService {
  constructor(private readonly categoriesService: CategoriesService) {}

  async importCategories(
    fileBuffer: Buffer,
    userId: string,
    ipAddress?: string,
  ) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const rows: ImportRow[] = [];
    const headers: string[] = [];

    // Row 1 contains the column headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      headers.push(cell.text.trim());
    });

    // Check required columns supporting standard case formats
    const findHeaderKey = (keys: string[]): string | undefined => {
      return headers.find((h) =>
        keys.some((k) => k.toLowerCase() === h.toLowerCase()),
      );
    };

    const nameKey = findHeaderKey(['Name', 'name']);
    const codeKey = findHeaderKey(['Code', 'code']);

    if (!nameKey) {
      throw new BadRequestException(
        'Invalid template: "Name" column is missing.',
      );
    }
    if (!codeKey) {
      throw new BadRequestException(
        'Invalid template: "Code" column is missing.',
      );
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

    // Track duplicate names or codes in spreadsheet to catch duplicates before calling CategoriesService.create()
    const seenNames = new Set<string>();
    const seenCodes = new Set<string>();

    for (const row of rows) {
      try {
        const name = cleanStringValue(row[nameKey]);
        const code = cleanStringValue(row[codeKey]);

        if (!name) {
          throw new BadRequestException('Category Name is required');
        }
        if (!code) {
          throw new BadRequestException('Category Code is required');
        }

        const nameUpper = name.toUpperCase();
        const codeUpper = code.toUpperCase();

        if (seenNames.has(nameUpper)) {
          throw new BadRequestException(
            `Duplicate Category Name "${name}" found in spreadsheet`,
          );
        }
        if (seenCodes.has(codeUpper)) {
          throw new BadRequestException(
            `Duplicate Category Code "${code}" found in spreadsheet`,
          );
        }

        seenNames.add(nameUpper);
        seenCodes.add(codeUpper);

        // Call CategoriesService.create(). Note: description is ignored since the Prisma model has no description field
        await this.categoriesService.create(
          {
            name,
            code,
          },
          userId,
          ipAddress,
        );

        results.successCount++;
      } catch (error: unknown) {
        results.failedCount++;
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during creation';
        results.errors.push({
          row: row.__rowNumber,
          message,
        });
      }
    }

    return results;
  }
}

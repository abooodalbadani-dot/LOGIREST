import { Injectable, BadRequestException } from '@nestjs/common';
import { UomService } from '../master-data/units-of-measure/uom.service';
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
export class UomsImportService {
  constructor(private readonly uomService: UomService) {}

  async importUoms(fileBuffer: Buffer, userId: string, ipAddress?: string) {
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
      if (rowNumber === 1) return; // Skip header
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

    const seenNames = new Set<string>();
    const seenCodes = new Set<string>();

    for (const row of rows) {
      try {
        const name = cleanStringValue(row[nameKey]);
        const code = cleanStringValue(row[codeKey]).toUpperCase();

        if (!name) {
          throw new BadRequestException('UOM Name is required');
        }
        if (!code) {
          throw new BadRequestException('UOM Code is required');
        }

        if (seenNames.has(name.toUpperCase())) {
          throw new BadRequestException(
            `Duplicate UOM Name "${name}" found in spreadsheet`,
          );
        }
        if (seenCodes.has(code)) {
          throw new BadRequestException(
            `Duplicate UOM Code "${code}" found in spreadsheet`,
          );
        }

        seenNames.add(name.toUpperCase());
        seenCodes.add(code);

        await this.uomService.create(
          {
            name,
            code,
            isActive: true,
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

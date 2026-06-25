import { Injectable, BadRequestException } from '@nestjs/common';
import { SuppliersService } from '../master-data/suppliers/suppliers.service';
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

@Injectable()
export class SuppliersImportService {
  constructor(private readonly suppliersService: SuppliersService) {}

  async importSuppliers(
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

    // We expect headers: code, name, contactName, contactEmail, contactPhone
    const nameIndex = headers.indexOf('name');
    if (nameIndex === -1) {
      throw new BadRequestException(
        'Invalid template: "name" column is missing.',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const rowData: ImportRow = { __rowNumber: rowNumber };

      // Map row cells using headers
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

    for (const row of rows) {
      try {
        const name =
          typeof row.name === 'string' || typeof row.name === 'number'
            ? String(row.name).trim()
            : undefined;
        const code =
          typeof row.code === 'string' || typeof row.code === 'number'
            ? String(row.code).trim()
            : undefined;
        const contactName =
          typeof row.contactName === 'string' ||
          typeof row.contactName === 'number'
            ? String(row.contactName).trim()
            : undefined;
        const contactEmail =
          typeof row.contactEmail === 'string' ||
          typeof row.contactEmail === 'number'
            ? String(row.contactEmail).trim()
            : undefined;
        const contactPhone =
          typeof row.contactPhone === 'string' ||
          typeof row.contactPhone === 'number'
            ? String(row.contactPhone).trim()
            : undefined;

        if (!name) {
          throw new BadRequestException('Supplier name is required');
        }

        await this.suppliersService.create(
          {
            code,
            name,
            contactName,
            contactEmail,
            contactPhone,
            isActive: true,
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

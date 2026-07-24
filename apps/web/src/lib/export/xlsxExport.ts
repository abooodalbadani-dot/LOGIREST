import * as XLSX from 'xlsx';
import { format } from 'date-fns';

import { getExportRowValue } from './exportValueResolver';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExcelExportOptions {
  scope?: string;
}

/**
 * Parses values to preserve numeric types in Excel.
 * Converts stringified numbers back to numbers.
 */
function parseNumericValue(val: unknown): unknown {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  
  const str = String(val).trim();
  
  // Ensure we don't accidentally cast empty strings or phone numbers or codes with leading zeroes to numbers
  if (str !== '' && !str.startsWith('0') && !isNaN(Number(str)) && isFinite(Number(str))) {
    return Number(str);
  }
  return str;
}

/**
 * Generates an Excel file with report metadata at the top and auto-fit columns.
 */
export function generateExcelWithBranding(
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
  filename: string,
  title: string = 'Report',
  options?: ExcelExportOptions
) {
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
  
  // Metadata Rows (Rows 1-4)
  const metadata = [
    [title],
    [options?.scope ? `Scope: ${options.scope}` : 'Scope: Global'],
    [`Generated: ${dateStr}`],
    [`Total Rows: ${rows.length}`],
    [] // Row 5: Empty spacer
  ];
  
  const headers = columns.map(col => col.header);
  
  // Map rows based on keys while preserving numeric data types
  const data = rows.map(row => 
    columns.map(col => parseNumericValue(getExportRowValue(row, col.key)))
  );
  
  // Construct spreadsheet data (Headers on Row 5, Data on Row 6+)
  const worksheetData = [
    ...metadata,
    headers,
    ...data
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Calculate and apply dynamic column widths (Auto-fit)
  const colWidths = columns.map((col, colIdx) => {
    let maxLen = col.header.length;
    
    // Evaluate lengths of data cells in this column
    for (const row of data) {
      const cellVal = row[colIdx];
      if (cellVal !== null && cellVal !== undefined) {
        const valLen = String(cellVal).length;
        if (valLen > maxLen) {
          maxLen = valLen;
        }
      }
    }
    
    // Set column width with safety padding (default to 10 minimum)
    return { wch: Math.max(maxLen + 3, 10) };
  });
  
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}

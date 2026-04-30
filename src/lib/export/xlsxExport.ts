import * as XLSX from 'xlsx';
import { getExcelBrandingHeader } from './exportBranding';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Generates an Excel file with restaurant branding injected at the top.
 */
export function generateExcelWithBranding(columns: ExcelColumn[], rows: Record<string, unknown>[], filename: string) {
  const brandingHeader = getExcelBrandingHeader();
  const headers = columns.map(col => col.header);
  
  // Map rows based on keys
  const data = rows.map(row => columns.map(col => row[col.key]));
  
  // Construct the spreadsheet data starting with branding, then headers, then data
  const worksheetData = [
    ...brandingHeader,
    headers,
    ...data
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Apply column widths if provided
  if (columns.some(col => col.width)) {
    // Offset for branding rows if necessary? 
    // In aoa_to_sheet, column widths are global for the sheet.
    worksheet['!cols'] = columns.map(col => ({ wch: col.width ?? 10 }));
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

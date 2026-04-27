import * as XLSX from 'xlsx';

export function generateCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function generateExcel(columns: ExcelColumn[], rows: Record<string, unknown>[], filename: string) {
  // Extract headers
  const headers = columns.map(col => col.header);
  
  // Map rows based on keys
  const data = rows.map(row => columns.map(col => row[col.key]));
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Apply widths if provided
  if (columns.some(col => col.width)) {
    worksheet['!cols'] = columns.map(col => ({ wch: col.width ?? 10 }));
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
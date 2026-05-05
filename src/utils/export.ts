import { generateExcelWithBranding, ExcelColumn } from '@/lib/export/xlsxExport';

export { type ExcelColumn };

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

export function generateExcel(columns: ExcelColumn[], rows: Record<string, unknown>[], filename: string) {
 return generateExcelWithBranding(columns, rows, filename);
}

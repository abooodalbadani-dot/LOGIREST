'use client';

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { FileText, FileSpreadsheet, ChevronDown, Download, Loader2 } from 'lucide-react';
import { generateExcelWithBranding, ExcelColumn } from '@/lib/export/xlsxExport';
import { dispatchPrintJob } from '@/lib/export/printDispatcher';
import { useSystemPrintSettings } from '@/features/admin/hooks/useSystemPrintSettings';

interface ExportMenuProps {
 data: Record<string, unknown>[];
 columns: { header: string; key: string }[];
 filename: string;
 title: string;
}

export function ExportMenu({ data, columns, filename, title }: ExportMenuProps) {
 const { user, activeScope } = useAuth();
 const { locale } = useLocale();
 const [isExporting, setIsExporting] = useState(false);
 const { data: settings, isLoading: isLoadingSettings } = useSystemPrintSettings();

 const isAr = locale === 'ar';
 
 // Localized string map
 const labels = {
  trigger: isAr ? 'تصدير / طباعة' : 'Export / Print',
  pdf: isAr ? 'تصدير PDF (بياني)' : 'Export PDF (Vector)',
  excel: isAr ? 'تصدير Excel (منظم)' : 'Export Excel (Structured)',
  loading: isAr ? 'جاري التحضير...' : 'Preparing...',
 };

 /**
  * Resolves the textual label of the current operational scope.
  */
 const getScopeLabel = (): string => {
  if (!user || !activeScope) return isAr ? 'عام (شامل)' : 'Global';

  if (activeScope.departmentId) {
   const deptScope = user.scopes.find(s => s.departmentId === activeScope.departmentId);
   return deptScope?.department?.name || (isAr ? `قسم: ${activeScope.departmentId}` : `Dept: ${activeScope.departmentId}`);
  }

  if (activeScope.warehouseId) {
   const whScope = user.scopes.find(s => s.warehouseId === activeScope.warehouseId);
   return whScope?.warehouse?.name || (isAr ? `مستودع: ${activeScope.warehouseId}` : `Warehouse: ${activeScope.warehouseId}`);
  }

  if (activeScope.branchId) {
   // Find branch scope that is not scoped to a sub-department or warehouse
   const branchScope = user.scopes.find(
    s => s.branchId === activeScope.branchId && !s.warehouseId && !s.departmentId
   );
   return branchScope?.branch?.name || (isAr ? `فرع: ${activeScope.branchId}` : `Branch: ${activeScope.branchId}`);
  }

  return isAr ? 'عام (شامل)' : 'Global';
 };

 /**
  * Resolves the operator identity for document generation auditing.
  */
 const getUserLabel = (): string => {
  if (!user) return '';
  return `${user.name || user.email} (${user.role})`;
 };

 const handleExportPDF = async (e: React.MouseEvent) => {
  e.preventDefault();
  if (isExporting || isLoadingSettings) return;
  setIsExporting(true);

  try {
   await dispatchPrintJob({
    columns,
    data,
    filename,
    title,
    scope: getScopeLabel(),
    generatedBy: getUserLabel(),
    settings,
    locale: locale as 'ar' | 'en',
   });
  } catch (err) {
   console.error('Failed to generate PDF report', err);
  } finally {
   setIsExporting(false);
  }
 };

 const handleExportExcel = async (e: React.MouseEvent) => {
  e.preventDefault();
  if (isExporting) return;
  setIsExporting(true);

  try {
   const excelCols: ExcelColumn[] = columns.map(c => ({
    header: c.header,
    key: c.key,
   }));

   generateExcelWithBranding(excelCols, data, filename, title, {
    scope: getScopeLabel(),
   });
  } catch (err) {
   console.error('Failed to generate Excel sheet', err);
  } finally {
   setIsExporting(false);
  }
 };

 return (
  <DropdownMenu>
   <DropdownMenuTrigger asChild>
    <Button
     variant="default"
     disabled={isExporting || isLoadingSettings}
     className="w-full sm:w-auto flex items-center justify-center gap-2 h-10 px-6 bg-operational-cyan hover:bg-operational-cyan/90 text-white dark:text-white font-bold uppercase rounded-xl shadow-sm shadow-operational-cyan/20 transition-all text-xs"
    >
     {isExporting || isLoadingSettings ? (
      <Loader2 className="h-4 w-4 animate-spin" />
     ) : (
      <Download className="h-4 w-4" />
     )}
     <span>{isExporting || isLoadingSettings ? labels.loading : labels.trigger}</span>
     <ChevronDown className="h-4 w-4 opacity-60" />
    </Button>
   </DropdownMenuTrigger>

   <DropdownMenuContent align={isAr ? 'start' : 'end'} className="min-w-[180px]">
    <DropdownMenuItem onClick={handleExportPDF} className="flex items-center gap-2 cursor-pointer">
     <FileText className="w-4 h-4 text-rose-500" />
     <span>{labels.pdf}</span>
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleExportExcel} className="flex items-center gap-2 cursor-pointer">
     <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
     <span>{labels.excel}</span>
    </DropdownMenuItem>
   </DropdownMenuContent>
  </DropdownMenu>
 );
}

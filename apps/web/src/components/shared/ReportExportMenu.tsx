'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations, useLocale } from 'next-intl';
import { generateCSV, generateExcel } from '@/utils/export';
import { generatePDF } from '@/lib/export/pdfExport';
import { format } from 'date-fns';
import {
 Download,
 FileText,
 FileSpreadsheet,
 AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { getTokenCookie } from '@/lib/api/cookies';
import { checkReportCount } from '@/features/reports/api/reportsApi';
import { translateToEnglish } from '../../lib/export/translate';

const BASE = (typeof window === 'undefined' ? process.env.API_URL : null) ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const MAX_EXPORT_ROWS = 50000;

interface ExportColumn {
 header: string;
 key: string;
 width?: number;
}

interface CountCheckParams {
 type: string;
 itemId?: string;
 startDate?: string;
 endDate?: string;
 transactionType?: string;
 lotId?: string;
 sessionId?: string;
}

interface ReportExportMenuProps {
 columns: ExportColumn[];
 data: Record<string, string | number | boolean | null | undefined>[];
 filename: string;
 title: string;
 exportRoute?: string;
 countCheckParams?: CountCheckParams;
}

const sanitizeRowValue = (
  colKey: string,
  val: unknown,
  locale: 'ar' | 'en'
): string => {
  if (val === null || val === undefined) return '';

  // Relational/nested object safety net: Drill down into objects before formatting
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    
    // Check if it's an Item-like object (code/sku and name)
    if ('name' in obj && ('sku' in obj || 'code' in obj || 'barcode' in obj)) {
      const code = (obj.sku || obj.code || obj.barcode || '') as string;
      const name = (obj.name || '') as string;
      return code ? `${code} - ${name}` : name;
    }
    
    // Check if it's a User-like object
    if ('fullName' in obj || 'name' in obj || 'email' in obj) {
      return (obj.fullName || obj.name || obj.email || '') as string;
    }
    
    // Check if it's a Warehouse/Branch/Supplier/etc. (name)
    if ('name' in obj) {
      return (obj.name || '') as string;
    }
    
    // Fallback: If it's a generic object but has an id
    if ('id' in obj) {
      const idVal = String(obj.id);
      return idVal.length > 8 ? idVal.substring(0, 8).toUpperCase() : idVal;
    }
  }

  const valStr = String(val).trim();
  if (!valStr) return '';

  // 1. Intercept and Format Dates:
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (isoDateRegex.test(valStr)) {
    try {
      const date = new Date(valStr);
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch {
      return valStr;
    }
  }

  // 2. Translate and Format Enums (for STATUS and TYPE columns)
  const colKeyUpper = colKey.toUpperCase();
  if (colKeyUpper.includes('STATUS') || colKeyUpper.includes('TYPE')) {
    const valUpper = valStr.toUpperCase();
    const exportTypeMap: Record<string, string> = {
      'GOODS_RECEIVED_NOTE': locale === 'ar' ? 'استلام بضاعة' : 'Goods Received Note',
      'ADJUSTMENT': locale === 'ar' ? 'تسوية مخزون' : 'Adjustment',
      'TRANSFER': locale === 'ar' ? 'تحويل مخزني' : 'Transfer',
      'INVENTORY_ISSUE': locale === 'ar' ? 'صرف مخزني' : 'Inventory Issue',
      'NEAR_EXPIRY': locale === 'ar' ? 'قارب على الانتهاء' : 'Near Expiry',
      'ACTIVE': locale === 'ar' ? 'نشط' : 'Active',
      'INACTIVE': locale === 'ar' ? 'غير نشط' : 'Inactive',
      'DRAFT': locale === 'ar' ? 'مسودة' : 'Draft',
      'SUBMITTED': locale === 'ar' ? 'تم التقديم' : 'Submitted',
      'APPROVED': locale === 'ar' ? 'تمت الموافقة' : 'Approved',
      'REJECTED': locale === 'ar' ? 'مرفوض' : 'Rejected',
      'FULFILLED': locale === 'ar' ? 'مكتمل' : 'Fulfilled'
    };

    if (exportTypeMap[valUpper]) {
      return exportTypeMap[valUpper];
    }
  }

  // 3. Truncate UUIDs:
  if (colKeyUpper.includes('REFERENCE') || colKeyUpper.includes('REF') || colKeyUpper.includes('DOCUMENT_NUMBER') || colKeyUpper.includes('ID')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(valStr)) {
      return valStr.substring(0, 8).toUpperCase();
    }
  }

  return valStr;
};

export function ReportExportMenu({
 columns,
 data,
 filename,
 title,
 exportRoute,
 countCheckParams,
}: ReportExportMenuProps) {
 const t = useTranslations('reports.export');
 const locale = useLocale() as 'ar' | 'en';
 const { warehouseId, branchId } = useOperationalScope();
 const [countState, setCountState] = useState<{
  count: number;
  isExportable: boolean;
  checked: boolean;
 }>({ count: 0, isExportable: true, checked: false });

 useEffect(() => {
  if (countCheckParams) {
   checkReportCount(countCheckParams.type, countCheckParams as unknown as Record<string, string | undefined>)
    .then((result) => {
     setCountState({
      count: result.count,
      isExportable: result.isExportable,
      checked: true,
     });
    })
    .catch(() => {
     setCountState((prev) => ({ ...prev, checked: true }));
    });
  } else {
   setCountState((prev) => ({ ...prev, checked: true }));
  }
 }, [countCheckParams]);

 const handleExportCSV = () => {
  const headers = columns.map((c) => translateToEnglish(c.header));
  const rows = data.map((row) =>
   columns.map((c) => {
    const sanitized = sanitizeRowValue(c.key, row[c.key], locale);
    return translateToEnglish(sanitized);
   })
  );
  generateCSV(headers, rows, filename);
 };

 const handleExportExcel = async () => {
  if (countCheckParams && !countState.isExportable) {
   return;
  }

  if (exportRoute) {
   try {
    const token = getTokenCookie();
    const headers: Record<string, string> = {
     ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (warehouseId) headers['x-warehouse-id'] = warehouseId;
    if (branchId) headers['x-branch-id'] = branchId;

    const res = await fetch(`${BASE}${exportRoute}`, {
     method: 'GET',
     credentials: 'include',
     headers,
    });

    if (!res.ok) {
     const errorBody = await res.text().catch(() => '');
     throw new Error(errorBody || 'Failed to export file');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const contentDisposition = res.headers.get('content-disposition');
    let downloadName = `${filename}.xlsx`;
    if (contentDisposition) {
     const match = contentDisposition.match(/filename="?([^"]+)"?/);
     if (match && match[1]) {
      downloadName = match[1];
     }
    }
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
   } catch (error) {
    console.error('Export error:', error);
   }
  } else {
   const englishColumns = columns.map((c) => ({
    ...c,
    header: translateToEnglish(c.header),
   }));
   const englishData = data.map((row) => {
    const cleanRow: Record<string, string | number | boolean | null | undefined> = {};
    for (const col of columns) {
     const val = row[col.key];
     const sanitized = sanitizeRowValue(col.key, val, locale);
     cleanRow[col.key] = typeof sanitized === 'string' ? translateToEnglish(sanitized) : sanitized;
    }
    return cleanRow;
   });
   generateExcel(englishColumns, englishData, filename);
  }
 };

  const handleExportPDF = () => {
   const englishColumns = columns.map((c) => ({
    ...c,
    header: translateToEnglish(c.header),
   }));
   const englishData = data.map((row) => {
    const cleanRow: Record<string, string | number | boolean | null | undefined> = {};
    for (const col of columns) {
     const val = row[col.key];
     const sanitized = sanitizeRowValue(col.key, val, locale);
     cleanRow[col.key] = (locale === 'en' && typeof sanitized === 'string') 
      ? translateToEnglish(sanitized) 
      : sanitized;
    }
    return cleanRow;
   });
   const englishTitle = translateToEnglish(title);
   generatePDF(englishColumns, englishData, filename, englishTitle);
  };

 const exportDisabled =
  countCheckParams !== undefined && !countState.isExportable;

 return (
  <div className="flex items-center gap-3">
   {exportDisabled && (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-label-xs font-semibold max-w-[320px]">
     <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
     <span>
      Export limit exceeded (maximum{' '}
      {MAX_EXPORT_ROWS.toLocaleString()} rows). Please narrow your
      selection by applying Date or Warehouse filters to enable export.
     </span>
    </div>
   )}
   <DropdownMenu>
    <DropdownMenuTrigger asChild>
     <Button
      variant="default"
      size="sm"
      disabled={exportDisabled}
      className={cn(
       'h-10 px-6 flex items-center gap-2 rounded-xl bg-white dark:bg-[#1A2234] border border-gray-300 dark:border-gray-700 text-[#0B1220] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 font-bold uppercase shadow-sm transition-all text-xs',
       exportDisabled && 'opacity-50 cursor-not-allowed',
      )}
     >
      <Download className="w-4 h-4" />
      {t('button')}
     </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
     align="end"
     className="w-48 bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 shadow-lg z-50 rounded-2xl p-1 animate-in fade-in zoom-in-95 duration-200"
    >
     <DropdownMenuItem
      onClick={handleExportCSV}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-label-xs font-bold uppercase text-muted-foreground transition-colors"
     >
      <FileText className="w-4 h-4 text-cyan-500/70" />
      {t('csv')}
     </DropdownMenuItem>
     <DropdownMenuItem
      onClick={handleExportExcel}
      disabled={exportDisabled}
      className={cn(
       'flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-label-xs font-bold uppercase text-muted-foreground transition-colors',
       exportDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      )}
     >
      <FileSpreadsheet className="w-4 h-4 text-emerald-500/70" />
      {t('excel')}
     </DropdownMenuItem>
     <DropdownMenuItem
      onClick={handleExportPDF}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-label-xs font-bold uppercase text-muted-foreground transition-colors"
     >
      <FileText className="w-4 h-4 text-rose-500/70" />
      {t('pdf')}
     </DropdownMenuItem>
    </DropdownMenuContent>
   </DropdownMenu>
  </div>
 );
}

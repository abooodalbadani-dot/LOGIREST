'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { generateCSV, generateExcel } from '@/utils/export';
import { generatePDF } from '@/lib/export/pdfExport';
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

export function ReportExportMenu({
  columns,
  data,
  filename,
  title,
  exportRoute,
  countCheckParams,
}: ReportExportMenuProps) {
  const t = useTranslations('reports.export');
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
    const rows = data.map((row) => columns.map((c) => translateToEnglish(String(row[c.key] ?? ''))));
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
        for (const key of Object.keys(row)) {
          const val = row[key];
          cleanRow[key] = typeof val === 'string' ? translateToEnglish(val) : val;
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
      for (const key of Object.keys(row)) {
        const val = row[key];
        cleanRow[key] = typeof val === 'string' ? translateToEnglish(val) : val;
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
            variant="secondary"
            size="sm"
            disabled={exportDisabled}
            className={cn(
              'h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-label-xxs font-semibold uppercase transition-all border-none',
              exportDisabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Download className="w-3.5 h-3.5" />
            {t('button')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-surface-container-lowest border-none shadow-2xl rounded-2xl p-1 animate-in fade-in zoom-in-95 duration-200"
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

'use client';

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
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { getTokenCookie } from '@/lib/api/cookies';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ReportExportMenuProps {
  columns: ExportColumn[];
  data: Record<string, string | number | boolean | null | undefined>[];
  filename: string;
  title: string;
  exportRoute?: string;
}

export function ReportExportMenu({ columns, data, filename, title, exportRoute }: ReportExportMenuProps) {
  const t = useTranslations('reports.export');
  const { warehouseId, branchId } = useOperationalScope();

  const handleExportCSV = () => {
    const headers = columns.map(c => c.header);
    const rows = data.map(row => columns.map(c => String(row[c.key] ?? '')));
    generateCSV(headers, rows, filename);
  };

  const handleExportExcel = async () => {
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
          throw new Error('Failed to export file');
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
      generateExcel(columns, data, filename);
    }
  };

  const handleExportPDF = () => {
    generatePDF(columns, data, filename, title);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="secondary"
          size="sm"
          className={cn(
            "h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-label-xxs font-semibold uppercase transition-all border-none",
            ''
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {t('button')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-surface-container-lowest border-none shadow-2xl rounded-2xl p-1 animate-in fade-in zoom-in-95 duration-200">
        <DropdownMenuItem 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-label-xs font-bold uppercase text-muted-foreground transition-colors"
        >
          <FileText className="w-4 h-4 text-cyan-500/70" />
          {t('csv')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-label-xs font-bold uppercase text-muted-foreground transition-colors"
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
  );
}

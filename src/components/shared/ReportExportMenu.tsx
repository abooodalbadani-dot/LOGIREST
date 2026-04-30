'use client';

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
import { Download, FileText, Table as TableIcon, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ReportExportMenuProps {
  columns: ExportColumn[];
  data: any[];
  filename: string;
  title: string;
}

export function ReportExportMenu({ columns, data, filename, title }: ReportExportMenuProps) {
  const t = useTranslations('reports.export');
  const locale = useLocale();

  const handleExportCSV = () => {
    const headers = columns.map(c => c.header);
    const rows = data.map(row => columns.map(c => String(row[c.key] ?? '')));
    generateCSV(headers, rows, filename);
  };

  const handleExportExcel = () => {
    generateExcel(columns, data, filename);
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
            "h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-[9px] font-black uppercase transition-all border-none",
            locale === 'ar' ? 'tracking-normal' : 'tracking-[0.08em]'
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {t('button')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-surface-container-lowest border-none shadow-2xl rounded-2xl p-1 animate-in fade-in zoom-in-95 duration-200">
        <DropdownMenuItem 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors"
        >
          <FileText className="w-4 h-4 text-cyan-500/70" />
          {t('csv')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500/70" />
          {t('excel')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/[0.05] focus:bg-primary/[0.05] text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors"
        >
          <FileText className="w-4 h-4 text-rose-500/70" />
          {t('pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

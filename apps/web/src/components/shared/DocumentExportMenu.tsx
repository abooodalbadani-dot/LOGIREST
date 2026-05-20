'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Download, Printer, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function DocumentExportMenu() {
  const t = useTranslations('common');

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info(t('export_pdf_coming_soon') || 'PDF export coming soon');
  };

  const handleExportExcel = () => {
    toast.info(t('export_excel_coming_soon') || 'Excel export coming soon');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl bg-surface-container-high border-white/5"
        >
          <Download className="w-4 h-4 me-2" />
          {t('export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="w-4 h-4 me-2" />
          {t('print')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="w-4 h-4 me-2" />
          {t('export_pdf')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <Table className="w-4 h-4 me-2" />
          {t('export_excel')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

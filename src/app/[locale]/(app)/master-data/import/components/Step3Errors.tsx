'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Download, ArrowLeft, ArrowRight, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Step3ErrorsProps {
  wizard: any;
  locale: string;
}

export function Step3Errors({ wizard, locale }: Step3ErrorsProps) {
  const t = useTranslations('master_data.import');
  const tc = useTranslations('common');

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'row',
      header: 'Row',
      cell: ({ row }) => <span className="font-mono text-muted-foreground font-bold">#{row.original.row}</span>,
    },
    {
      accessorKey: 'column',
      header: 'Field',
      cell: ({ row }) => <span className="font-black uppercase text-[10px] tracking-wider text-cyan-500/70">{row.original.column}</span>,
    },
    {
      accessorKey: 'severity',
      header: 'Level',
      cell: ({ row }) => (
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm",
          row.original.severity === 'error' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
        )}>
          {row.original.severity}
        </span>
      ),
    },
    {
      accessorKey: 'message',
      header: 'Description',
      cell: ({ row }) => <span className="font-medium text-xs">{row.original.message}</span>,
    },
    {
      accessorKey: 'value',
      header: 'Current Value',
      cell: ({ row }) => <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm font-mono opacity-60">{String(row.original.value || 'NULL')}</code>,
    },
  ], []);

  const downloadErrorReport = () => {
    const ws = XLSX.utils.json_to_sheet(wizard.errors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');
    XLSX.writeFile(wb, `import_errors_${wizard.importType}.xlsx`);
  };

  const hasCriticalErrors = wizard.errors.some((e: any) => e.severity === 'error');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
             </div>
             <div>
                <h3 className="text-xl font-black tracking-tight">{t('error_step')}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Review issues and correct your file</p>
             </div>
          </div>

          <Button 
            variant="outline" 
            className="h-12 rounded-xl border-red-500/20 hover:bg-red-500/5 text-red-500 font-bold"
            onClick={downloadErrorReport}
          >
             <Download className="w-4 h-4 mr-2" />
             {t('download_error_report')}
          </Button>
       </div>

       <div className="bg-muted/5 rounded-[2.5rem] border border-foreground/5 overflow-hidden">
          <DataTable 
            columns={columns} 
            data={wizard.errors}
            searchable={false}
          />
       </div>

       <div className="flex gap-4 justify-between mt-4">
          <Button 
            variant="outline" 
            className="h-14 px-8 rounded-2xl border-muted-foreground/10"
            onClick={wizard.prevStep}
          >
             <ArrowLeft className={cn("w-4 h-4", locale === 'ar' ? "ml-2" : "mr-2")} />
             Back to Validation
          </Button>

          <div className="flex gap-4">
             <Button 
               variant="outline"
               className="h-14 px-8 rounded-2xl border-muted-foreground/10"
               onClick={wizard.reset}
             >
                {tc('cancel')}
             </Button>
             
             {!hasCriticalErrors && (
               <Button 
                 className="h-14 px-10 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-widest text-[11px]"
                 onClick={wizard.nextStep}
               >
                  {t('commit_step')}
                  <ArrowRight className={cn("w-4 h-4", locale === 'ar' ? "mr-2 rotate-180" : "ml-2")} />
               </Button>
             )}
          </div>
       </div>
    </div>
  );
}

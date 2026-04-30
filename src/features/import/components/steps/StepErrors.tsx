'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface StepErrorsProps {
  wizard: any;
  locale: string;
}

export function StepErrors({ wizard, locale }: StepErrorsProps) {
  const t = useTranslations('master_data.import');
  const tc = useTranslations('common');
  const isRtl = locale === 'ar';

  const errors = wizard.errors.filter((e: any) => e.severity === 'error');
  
  const downloadErrorReport = () => {
    // Get unique row numbers with errors
    const errorRows = Array.from(new Set(errors.map((e: any) => e.row)));
    
    // Filter original data for those rows (row number in error is index + 2)
    const dataWithErrors = wizard.data.filter((_: any, idx: number) => 
      errorRows.includes(idx + 2)
    );

    // Map errors to the data rows for better context in Excel
    const reportData = dataWithErrors.map((row: any, idx: number) => {
      const rowNum = errorRows[idx];
      const rowErrors = errors.filter((e: any) => e.row === rowNum);
      return {
        ...row,
        IMPORT_ERRORS: rowErrors.map((e: any) => `${e.column}: ${e.message}`).join('; ')
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.writeFile(wb, `error_report_${wizard.importType}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 py-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-xl font-black tracking-tight">{t('errors_found', { count: errors.length })}</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{t('error_step')}</p>
             </div>
          </div>
          <Button 
            variant="outline" 
            className="h-12 rounded-xl border-muted-foreground/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            onClick={downloadErrorReport}
          >
             <Download className={cn("w-4 h-4 text-red-500", isRtl ? "ml-2" : "mr-2")} />
             <span className="font-bold tracking-tight">{t('download_error_report')}</span>
          </Button>
       </div>

       <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-background/50 backdrop-blur-md">
          <div className="overflow-x-auto">
             <table className="w-full text-left" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead>
                   <tr className="border-b border-foreground/5 bg-muted/30">
                      <th className={cn("p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-center w-20", isRtl ? "text-right" : "text-left")}>{t('row')}</th>
                      <th className={cn("p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50", isRtl ? "text-right" : "text-left")}>{t('field')}</th>
                      <th className={cn("p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50", isRtl ? "text-right" : "text-left")}>{t('value')}</th>
                      <th className={cn("p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50", isRtl ? "text-right" : "text-left")}>{t('error_message')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                   {errors.map((error: any, idx: number) => (
                      <tr key={idx} className="hover:bg-red-500/[0.02] transition-colors group">
                         <td className="p-6 font-mono text-xs font-black text-center opacity-40 group-hover:opacity-100 transition-opacity" dir="ltr">
                            #{error.row}
                         </td>
                         <td className="p-6 font-black tracking-tight text-sm uppercase opacity-80">
                            {error.column}
                         </td>
                         <td className="p-6" dir="ltr">
                            <span className="bg-muted px-2 py-1 rounded text-[10px] font-mono opacity-60">
                               {String(error.value || 'N/A')}
                            </span>
                         </td>
                         <td className="p-6">
                            <div className="flex items-center gap-2 text-red-500 font-bold tracking-tight text-sm">
                               <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                               {error.message}
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </Card>

       <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 h-14 rounded-2xl border-muted-foreground/10 hover:bg-muted-foreground/5"
            onClick={wizard.goToUpload}
          >
             <RefreshCw className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
             <span className="font-bold tracking-tight">{t('re_upload')}</span>
          </Button>
       </div>
    </div>
  );
}

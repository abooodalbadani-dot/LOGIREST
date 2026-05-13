'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

import { WizardReturn } from '../../hooks/useImportWizard';
import { ValidationError } from '@/lib/import/validation';

interface StepErrorsProps {
 wizard: WizardReturn;
 locale: string;
}

export function StepErrors({ wizard, locale }: StepErrorsProps) {
 const t = useTranslations('master_data.import');
 const isRtl = locale === 'ar';

 const handleExportErrors = () => {
 if (wizard.errors.length === 0) return;

 // Get unique row numbers with errors
 const errorRowIndices = Array.from(new Set(wizard.errors.map((e: ValidationError) => e.row - 2))) as number[];
 
 // Map error rows to a new format including error messages
 const errorRows = errorRowIndices.map((idx: number) => {
 const rowData = { ...wizard.data[idx] };
 const rowErrors = wizard.errors.filter((e: ValidationError) => e.row === idx + 2);
 rowData.Validation_Errors = rowErrors.map((e: ValidationError) => `[${e.column}] ${e.message}`).join('; ');
 return rowData;
 });

 const ws = XLSX.utils.json_to_sheet(errorRows);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');
 XLSX.writeFile(wb, `${wizard.entity}_import_errors.xlsx`);
 };

 return (
 <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
 <div className="flex items-center gap-6 p-8 rounded-2xl bg-red-500/5 border border-red-500/10">
 <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
 <AlertCircle className="w-10 h-10" />
 </div>
 <div>
  <h2 className="text-headline-lg font-semibold text-red-500">
  {t('errors_found_title', { count: wizard.errors.length })}
  </h2>
 <p className="text-muted-foreground text-body-md font-medium leading-relaxed">
 {t('errors_found_description')}
 </p>
 </div>
 </div>

 {/* Error Table */}
 <div className="rounded-2xl overflow-hidden bg-surface-container-low/30 shadow-inner">
 <div className="overflow-x-auto">
  <table className="w-full text-start">
  <thead>
  <tr className="bg-surface-container-low/50">
  <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60">{t('row')}</th>
  <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60">{t('column')}</th>
  <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60">{t('value')}</th>
  <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60">{t('error_message')}</th>
  </tr>
  </thead>
 <tbody className="">
 {wizard.errors.slice(0, 10).map((error: ValidationError, i: number) => (
 <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
 <td className="px-6 py-4 font-mono dir-ltr text-label-sm font-bold text-red-400">
 #{error.row}
 </td>
 <td className="px-6 py-4">
  <span className="text-label-xs font-semibold bg-red-500/10 text-red-500 px-2.5 py-1 rounded-md">
  {error.column}
  </span>
 </td>
 <td className="px-6 py-4 text-body-md font-mono text-muted-foreground/60 break-all">
 {error.value !== undefined && error.value !== null ? String(error.value) : '—'}
 </td>
 <td className="px-6 py-4 text-body-md font-medium text-muted-foreground leading-relaxed">
 {error.message}
 </td>
 </tr>
 ))}

 </tbody>
 </table>
 </div>
 {wizard.errors.length > 10 && (
 <div className="p-4 text-center bg-surface-container-low/20">
  <p className="text-label-xs font-semibold text-muted-foreground/40">
  {t('showing_first_n_errors', { count: 10, total: wizard.errors.length })}
  </p>
 </div>
 )}
 </div>

 {/* Actions */}
  <div className="flex flex-col sm:flex-row gap-4 items-center pt-4">
  <Button 
  variant="outline" 
  onClick={handleExportErrors}
  className="w-full sm:w-auto px-8 h-12 rounded-xl border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all active:scale-95 group"
  >
  <Download className="w-5 h-5 me-3 transition-transform group-hover:translate-y-1" />
  <span className="font-bold text-label-sm">{t('export_error_report')}</span>
  </Button>
  
  <div className="flex-1" />

  <Button 
  variant="ghost" 
  onClick={() => wizard.transitionTo('UPLOAD')}
  className="w-full sm:w-auto px-8 h-12 rounded-xl font-bold text-label-sm hover:bg-surface-container-high transition-all active:scale-95"
  >
  <RotateCcw className={cn("w-4 h-4 me-3", isRtl && "rotate-180")} />
  {t('try_again')}
  </Button>
  </div>
 </div>
 );
}

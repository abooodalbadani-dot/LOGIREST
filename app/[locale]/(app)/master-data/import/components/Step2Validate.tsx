'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Database, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { validateImportData } from '@/lib/import/validation';
import { ImportWizardState, ValidationError } from '../types';

interface Step2ValidateProps {
 wizard: ImportWizardState;
 locale: string;
}

export function Step2Validate({ wizard, locale }: Step2ValidateProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');

 useEffect(() => {
  // Trigger validation once
  if (wizard.data.length > 0 && !wizard.isValidating && wizard.errors.length === 0) {
   const results = validateImportData(wizard.importType, wizard.data);
   // Wait a bit to show the animation (for UX)
   setTimeout(() => {
    wizard.setValidationResults(results.errors);
   }, 1500);
  }
 }, []);


 if (wizard.isValidating) {
 return (
 <div className="flex flex-col items-center justify-center py-24 gap-8">
 <div className="relative">
 <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse" />
 <div className="relative">
 <Loader2 className="w-24 h-24 text-cyan-500 animate-spin opacity-20" />
 <Database className="w-10 h-10 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
 </div>
 </div>
 <div className="text-center">
 <h3 className="text-headline-lg font-semibold mb-2 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
 {t('validating')}
 </h3>
 <p className="text-label-xs text-muted-foreground font-semibold uppercase opacity-60">
 {t('processing_entries', { count: wizard.data.length })}
 </p>
 </div>
 </div>
 );
 }

 const errorCount = wizard.errors.filter((e: ValidationError) => e.severity === 'error').length;
 const warningCount = wizard.errors.filter((e: ValidationError) => e.severity === 'warning').length;

 return (
 <div className="max-w-2xl mx-auto flex flex-col gap-6 py-12">
 <Card className={cn(
 "p-10 rounded-[2.5rem] flex flex-col items-center gap-8 border-none shadow-2xl relative overflow-hidden transition-all duration-700",
 errorCount > 0 ? "bg-red-500/5 shadow-red-500/5" : "bg-emerald-500/5 shadow-emerald-500/5"
 )}>
 {/* Status Icon */}
 <div className={cn(
 "w-24 h-24 rounded-full flex items-center justify-center relative",
 errorCount > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
 )}>
 <div className="absolute inset-0 bg-current opacity-10 animate-ping rounded-full" />
 {errorCount > 0 ? <AlertCircle className="w-12 h-12 relative z-10" /> : <CheckCircle2 className="w-12 h-12 relative z-10" />}
 </div>

 <div className="text-center">
 <h3 className="text-headline-lg font-semibold mb-2">
 {t('validation_complete')}
 </h3>
 {errorCount > 0 ? (
 <p className="text-muted-foreground font-medium">{t('errors_found', { count: errorCount })}</p>
 ) : (
 <p className="text-muted-foreground font-medium">{t('no_errors')}</p>
 )}
 </div>

 <div className="grid grid-cols-3 gap-4 w-full">
 <div className="bg-background/40 backdrop-blur-sm p-5 rounded-[1.5rem] flex flex-col items-center border border-foreground/5">
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-1">{t('total_records')}</span>
 <span className="text-headline-lg font-display font-bold">{wizard.data.length}</span>
 </div>
 <div className="bg-background/40 backdrop-blur-sm p-5 rounded-[1.5rem] flex flex-col items-center border border-foreground/5">
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-1">{t('errors')}</span>
 <span className={cn("text-headline-lg font-display font-bold", errorCount > 0 ? "text-red-500" : "text-emerald-500/40")}>
 {errorCount}
 </span>
 </div>
 <div className="bg-background/40 backdrop-blur-sm p-5 rounded-[1.5rem] flex flex-col items-center border border-foreground/5">
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-1">{t('warnings')}</span>
 <span className={cn("text-headline-lg font-display font-bold", warningCount > 0 ? "text-amber-500" : "text-muted-foreground/20")}>
 {warningCount}
 </span>
 </div>
 </div>

 <div className="flex gap-4 w-full mt-4">
 <Button 
 variant="outline" 
 className="flex-1 h-14 rounded-2xl border-muted-foreground/10 hover:bg-muted-foreground/5"
 onClick={wizard.reset}
 >
 <ArrowLeft className={cn("w-4 h-4", locale === 'ar' ? "ml-2" : "mr-2")} />
 {tc('cancel')}
 </Button>
 <Button 
 className={cn(
 "flex-1 h-14 rounded-2xl font-semibold uppercase text-label-xs shadow-lg transition-all active:scale-95",
 errorCount > 0 
 ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
 : "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20 text-white"
 )}
 onClick={wizard.nextStep}
 >
 {errorCount > 0 ? t('error_step') : t('commit_step')}
 <ArrowRight className={cn("w-4 h-4", locale === 'ar' ? "mr-2 rotate-180" : "ml-2")} />
 </Button>
 </div>
 </Card>
 </div>
 );
}

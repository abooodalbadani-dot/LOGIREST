'use client';

import { useTranslations } from 'next-intl';
import { Save, CheckCircle2, ChevronRight, Loader2, ArrowLeft, Database, AlertCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';

import { WizardReturn } from '../../hooks/useImportWizard';

interface StepCommitProps {
 wizard: WizardReturn;
 locale: string;
}

export function StepCommit({ wizard, locale }: StepCommitProps) {
 const t = useTranslations('master_data.import');
 const router = useRouter();
 const isRtl = locale === 'ar';

  const isSuccess = wizard.step === 'SUCCESS';

  const successCount = wizard.successCount ?? 0;
  const failedCount = wizard.failedCount ?? 0;
  const errors = wizard.errors ?? [];

  const isFullSuccess = failedCount === 0;
  const isPartialSuccess = successCount > 0 && failedCount > 0;
  const isFullFailure = successCount === 0 && failedCount > 0;

  const handleFinish = () => {
    if (wizard.entity === 'uoms') {
      router.push('/master-data/units-of-measure');
    } else if (wizard.entity === 'openingStock') {
      router.push('/inventory/balance');
    } else {
      router.push(`/master-data/${wizard.entity}`);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-10 py-10 animate-in fade-in zoom-in duration-200">
        {/* Status Header */}
        <div className="flex flex-col items-center justify-center text-center gap-6">
          <div className="relative">
            {isFullSuccess && (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-[3000ms]" />
                <div className="w-24 h-24 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-neon-emerald">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              </>
            )}
            {isPartialSuccess && (
              <>
                <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping duration-[3000ms]" />
                <div className="w-24 h-24 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12" />
                </div>
              </>
            )}
            {isFullFailure && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping duration-[3000ms]" />
                <div className="w-24 h-24 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <XCircle className="w-12 h-12" />
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 w-full max-w-2xl mx-auto">
            <h2 className={cn(
              "text-headline-lg font-semibold",
              isFullSuccess && "text-emerald-500",
              isPartialSuccess && "text-amber-500",
              isFullFailure && "text-red-500"
            )}>
              {isFullSuccess && t('success_title')}
              {isPartialSuccess && t('partial_success_title')}
              {isFullFailure && t('failure_title')}
            </h2>
            <p className="text-muted-foreground text-body-md leading-relaxed font-medium">
              {isFullSuccess && t('success_description', { count: successCount })}
              {isPartialSuccess && t('partial_success_description', { successCount, failedCount })}
              {isFullFailure && t('failure_description', { failedCount })}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Success Count (if not full failure) */}
          {successCount > 0 && (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm/50 space-y-1">
              <p className="text-label-xs font-bold text-muted-foreground opacity-60">
                {t('imported_records')}
              </p>
              <p className="text-headline-lg font-semibold font-mono dir-ltr text-emerald-500">
                {successCount}
              </p>
            </div>
          )}

          {/* Card 2: Failed Count (if any failure) */}
          {failedCount > 0 && (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm/50 space-y-1">
              <p className="text-label-xs font-bold text-muted-foreground opacity-60">
                {t('failed_records')}
              </p>
              <p className="text-headline-lg font-semibold font-mono dir-ltr text-red-500">
                {failedCount}
              </p>
            </div>
          )}

          {/* Card 3: Status */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm/50 space-y-1 text-center">
            <p className="text-label-xs font-bold text-muted-foreground opacity-60">
              {t('status')}
            </p>
            <p className={cn(
              "text-body-md font-bold leading-9",
              isFullSuccess && "text-emerald-500",
              isPartialSuccess && "text-amber-500",
              isFullFailure && "text-red-500"
            )}>
              {isFullSuccess && t('committed')}
              {isPartialSuccess && t('partial_success_title')}
              {isFullFailure && t('failure_title')}
            </p>
          </div>
        </div>

        {/* Error Log Section (if warning or failure state with errors) */}
        {errors.length > 0 && (
          <div className="space-y-4 pt-4 text-start">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-title-sm font-bold uppercase tracking-wider">
                {t('error_log')}
              </h3>
              <span className="text-[11px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
                {errors.length}
              </span>
            </div>
            
            <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm/30 max-h-[320px] overflow-y-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
                    <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60 text-start">{t('row')}</th>
                    <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60 text-start">{t('column')}</th>
                    <th className="px-6 py-4 text-label-xs font-semibold text-muted-foreground/60 text-start">{t('error_message')}</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((error, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-b-0 hover:bg-card/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono dir-ltr text-label-sm font-bold text-red-400">
                        {error.row > 0 ? `#${error.row}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-label-xs font-semibold bg-red-500/10 text-red-500 px-2.5 py-1 rounded-md">
                          {error.column}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-md font-medium text-muted-foreground leading-relaxed">
                        {error.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6">
          {!isFullFailure && (
            <Button 
              onClick={handleFinish}
              className="w-full sm:w-auto px-16 h-16 rounded-2xl font-semibold text-body-md bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors shadow-neon-sm group transition-all hover:scale-105 active:scale-95"
            >
              {t('view_records_cta')}
              {isRtl ? (
                <ArrowLeft className="w-5 h-5 ms-4 transition-transform group-hover:-translate-x-2" />
              ) : (
                <ChevronRight className="w-5 h-5 ms-4 transition-transform group-hover:translate-x-2" />
              )}
            </Button>
          )}

          {!isFullSuccess && (
            <Button 
              variant="outline"
              onClick={wizard.reset}
              className={cn(
                "w-full sm:w-auto px-16 h-16 rounded-2xl font-semibold text-body-md transition-all active:scale-95 hover:scale-105 hover:bg-surface-container-high flex items-center justify-center gap-2",
                isFullFailure ? "bg-brand-gold hover:bg-brand-gold-hover text-white hover:text-white shadow-neon-sm" : "border-border bg-card"
              )}
            >
              <RotateCcw className={cn("w-5 h-5", isRtl && "rotate-180")} />
              {isFullFailure ? t('try_again') : t('reupload_cta')}
            </Button>
          )}
        </div>
      </div>
    );
  }

 return (
 <div className="flex flex-col gap-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
 <div className="space-y-4 w-full">
 <h2 className="text-headline-lg font-semibold text-foreground">
 {t('commit_title')}
 </h2>
 <p className="text-muted-foreground text-body-md leading-relaxed w-full">
 {t('commit_description')}
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="p-8 rounded-2xl bg-card border border-border shadow-sm/50 space-y-4 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <Database className="w-20 h-20" />
 </div>
 <p className="text-label-xs font-semibold text-muted-foreground/40">{t('entity_type')}</p>
 <p className="text-headline-lg font-semibold text-cyan-500">{wizard.entity}</p>
 </div>

 <div className="p-8 rounded-2xl bg-card border border-border shadow-sm/50 space-y-4 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <Save className="w-20 h-20" />
 </div>
 <p className="text-label-xs font-semibold text-muted-foreground/40">{t('total_records')}</p>
 <p className="text-headline-lg font-semibold font-mono dir-ltr">{wizard.metadata?.recordCount || 0}</p>
 </div>

 <div className="p-8 rounded-2xl bg-card border border-border shadow-sm/50 space-y-4 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <AlertCircle className="w-20 h-20" />
 </div>
 <p className="text-label-xs font-semibold text-muted-foreground/40">{t('idempotency_key')}</p>
 <p className="text-label-xs font-mono dir-ltr text-muted-foreground/60 break-all">{wizard.idempotencyKey}</p>
 </div>
 </div>

 <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex gap-4 items-center">
 <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
 <AlertCircle className="w-6 h-6" />
 </div>
 <p className="text-label-sm font-bold text-amber-500/80 leading-relaxed">
 {t('commit_warning')}
 </p>
 </div>

 <div className="flex flex-col sm:flex-row gap-4 items-center justify-end pt-4">
 <Button 
 variant="ghost" 
 onClick={() => wizard.transitionTo('UPLOAD')}
 className="w-full sm:w-auto px-10 h-14 rounded-xl font-bold text-label-sm transition-all active:scale-95"
 >
 {t('cancel')}
 </Button>
 
 <Button 
 disabled={wizard.isCommitting}
 onClick={wizard.handleCommit}
 className="w-full sm:w-auto px-16 h-14 rounded-xl font-semibold text-label-sm bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors shadow-neon-sm transition-all active:scale-95"
 >
 {wizard.isCommitting ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin me-4" />
 {t('committing')}
 </>
 ) : (
 <>
 <Save className="w-5 h-5 me-4" />
 {t('confirm_import')}
 </>
 )}
 </Button>
 </div>
 </div>
 );
}



'use client';

import { useTranslations } from 'next-intl';
import { Save, CheckCircle2, ChevronRight, Loader2, ArrowLeft, Database, AlertCircle } from 'lucide-react';
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
 const tc = useTranslations('common');
 const router = useRouter();
 const isRtl = locale === 'ar';

 const isSuccess = wizard.step === 'SUCCESS';

 const handleFinish = () => {
 router.push(`/${locale}/master-data/${wizard.entity}`);
 };

 if (isSuccess) {
 return (
 <div className="flex flex-col items-center justify-center gap-10 py-16 text-center animate-in fade-in zoom-in duration-700">
 <div className="relative">
 <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-[3000ms]" />
 <div className="w-32 h-32 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-neon-emerald">
 <CheckCircle2 className="w-16 h-16" />
 </div>
 </div>

 <div className="space-y-4 max-w-lg">
 <h2 className="text-headline-lg font-semibold uppercase text-emerald-500">
 {t('success_title')}
 </h2>
 <p className="text-muted-foreground text-body-md leading-relaxed font-medium">
 {t('success_description', { count: wizard.metadata?.recordCount ?? 0 })}
 </p>
 </div>

 <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-6">
 <div className="flex-1 p-6 rounded-2xl bg-surface-container-low/50 border border-white/5 space-y-1">
 <p className="text-label-xs font-bold text-muted-foreground uppercase opacity-60">{t('imported_records')}</p>
 <p className="text-headline-lg font-semibold font-mono dir-ltr text-emerald-500">{wizard.metadata?.recordCount || 0}</p>
 </div>
 <div className="flex-1 p-6 rounded-2xl bg-surface-container-low/50 border border-white/5 space-y-1 text-center">
 <p className="text-label-xs font-bold text-muted-foreground uppercase opacity-60">{t('status')}</p>
 <p className="text-body-md font-bold text-emerald-500 uppercase leading-9">{t('committed')}</p>
 </div>
 </div>

 <Button 
 onClick={handleFinish}
 className="px-16 h-16 rounded-2xl font-semibold uppercase text-body-md primary-gradient shadow-neon-sm group transition-all hover:scale-105 active:scale-95"
 >
 {t('view_records_cta')}
 {isRtl ? (
 <ArrowLeft className="w-5 h-5 ms-4 transition-transform group-hover:-translate-x-2" />
 ) : (
 <ChevronRight className="w-5 h-5 ms-4 transition-transform group-hover:translate-x-2" />
 )}
 </Button>
 </div>
 );
 }

 return (
 <div className="flex flex-col gap-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="space-y-4">
 <h2 className="text-headline-lg font-semibold uppercase text-foreground">
 {t('commit_title')}
 </h2>
 <p className="text-muted-foreground text-body-md leading-relaxed max-w-2xl">
 {t('commit_description')}
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="p-8 rounded-3xl bg-surface-container-low/50 border border-white/5 space-y-4 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <Database className="w-20 h-20" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('entity_type')}</p>
 <p className="text-headline-lg font-semibold uppercase text-cyan-500">{wizard.entity}</p>
 </div>

 <div className="p-8 rounded-3xl bg-surface-container-low/50 border border-white/5 space-y-4 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <Save className="w-20 h-20" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('total_records')}</p>
 <p className="text-headline-lg font-semibold font-mono dir-ltr">{wizard.metadata?.recordCount || 0}</p>
 </div>

 <div className="p-8 rounded-3xl bg-surface-container-low/50 border border-white/5 space-y-4 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
 <AlertCircle className="w-20 h-20" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('idempotency_key')}</p>
 <p className="text-label-xs font-mono dir-ltr text-muted-foreground/60 break-all">{wizard.idempotencyKey}</p>
 </div>
 </div>

 <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex gap-4 items-center">
 <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
 <AlertCircle className="w-6 h-6" />
 </div>
 <p className="text-label-sm font-bold text-amber-500/80 uppercase leading-relaxed">
 {t('commit_warning')}
 </p>
 </div>

 <div className={cn(
 "flex flex-col sm:flex-row gap-4 items-center justify-end pt-4",
 isRtl && "sm:flex-row-reverse"
 )}>
 <Button 
 variant="ghost" 
 onClick={() => wizard.transitionTo('UPLOAD')}
 className="w-full sm:w-auto px-10 h-14 rounded-xl font-bold uppercase text-label-sm transition-all active:scale-95"
 >
 {t('cancel')}
 </Button>
 
 <Button 
 disabled={wizard.isCommitting}
 onClick={wizard.handleCommit}
 className="w-full sm:w-auto px-16 h-14 rounded-xl font-semibold uppercase text-label-sm primary-gradient shadow-neon-sm transition-all active:scale-95"
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

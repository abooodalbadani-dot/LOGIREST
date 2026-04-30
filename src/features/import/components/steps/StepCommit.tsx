'use client';

import { useTranslations } from 'next-intl';
import { Save, Loader2, CheckCircle2, ArrowRight, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface StepCommitProps {
  wizard: any;
  locale: string;
}

export function StepCommit({ wizard, locale }: StepCommitProps) {
  const t = useTranslations('master_data.import');
  const tc = useTranslations('common');
  const isRtl = locale === 'ar';
  const router = useRouter();

  if (wizard.currentStep === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-8 animate-in zoom-in duration-700">
         <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 relative z-10 border-none shadow-[0_0_40px_rgba(16,185,129,0.2)]">
               <CheckCircle2 className="w-12 h-12" />
            </div>
         </div>
         <div className="text-center">
            <h3 className="text-3xl font-black tracking-tight mb-4 text-emerald-500">
               {t('import_success', { count: wizard.successCount })}
            </h3>
            <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
               All records have been successfully synchronized with the inventory engine. You can now view and manage them in the respective modules.
            </p>
         </div>
         <Button 
           className="h-16 px-12 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-cyan-500/20 group"
           onClick={() => router.push(`/${locale}/master-data/${wizard.importType}`)}
         >
            {t('go_to_list', { entity: t(wizard.importType) })}
            <ArrowRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-1", isRtl ? "mr-2 rotate-180" : "ml-2")} />
         </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-12">
       <Card className="p-10 rounded-[2.5rem] border-none shadow-2xl bg-background/50 backdrop-blur-md flex flex-col items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
             <Database className="w-48 h-48" />
          </div>

          <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 border-none shadow-[0_0_30px_rgba(6,182,212,0.1)]">
             <Save className="w-10 h-10" />
          </div>

          <div className="text-center">
             <h3 className="text-2xl font-black tracking-tight mb-2">{t('commit_step')}</h3>
             <p className="text-muted-foreground font-medium">
                {t('commit_warning', { count: wizard.data.length })}
             </p>
          </div>

          <div className="w-full bg-amber-500/5 border border-amber-500/10 p-6 rounded-2xl flex gap-4 items-start">
             <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <AlertCircle className="w-5 h-5" />
             </div>
             <div className="flex flex-col gap-1">
                <p className="text-xs font-black uppercase tracking-widest text-amber-500/60">Data Integrity Notice</p>
                <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
                   Records will be inserted atomically. If a duplicate SKU or Code is found, it will be updated. This operation cannot be undone.
                </p>
             </div>
          </div>

          {/* Idempotency Key Display (Internal Only) */}
          <div className="flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
             <span className="text-[8px] font-mono uppercase tracking-widest">Idempotency Key:</span>
             <span className="text-[8px] font-mono">{wizard.idempotencyKey}</span>
          </div>

          <div className="flex gap-4 w-full mt-4">
             <Button 
               variant="outline" 
               className="flex-1 h-14 rounded-2xl border-muted-foreground/10 hover:bg-muted-foreground/5"
               onClick={wizard.goToUpload}
               disabled={wizard.isCommitting}
             >
                {tc('cancel')}
             </Button>
             <Button 
               className="flex-1 h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
               onClick={wizard.commit}
               disabled={wizard.isCommitting}
             >
                {wizard.isCommitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('commit_step')}...
                  </>
                ) : (
                  <>
                    {t('commit_step')}
                    <Save className={cn("w-4 h-4", isRtl ? "mr-2" : "ml-2")} />
                  </>
                )}
             </Button>
          </div>
       </Card>
    </div>
  );
}

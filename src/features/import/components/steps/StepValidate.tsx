'use client';

import { useTranslations } from 'next-intl';
import { Database, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StepValidateProps {
  wizard: any;
  locale: string;
}

export function StepValidate({ wizard, locale }: StepValidateProps) {
  const t = useTranslations('master_data.import');
  const tc = useTranslations('common');
  const isRtl = locale === 'ar';

  if (wizard.isValidating || wizard.currentStep === 'VALIDATING') {
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
            <h3 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              {t('validating')}
            </h3>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-60">
              Processing {wizard.data.length} entries for data integrity
            </p>
         </div>
      </div>
    );
  }

  // This part shouldn't really be visible if the state machine works perfectly (it transitions to ERRORS or COMMIT)
  // But we keep it as a fallback or for review if needed
  return null;
}

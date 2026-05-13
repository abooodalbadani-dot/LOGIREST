'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Database, Loader2 } from 'lucide-react';
import { validateImportData } from '@/lib/import/validation';

import { WizardReturn } from '../../hooks/useImportWizard';

interface StepValidateProps {
 wizard: WizardReturn;
}

export function StepValidate({ wizard }: StepValidateProps) {
 const t = useTranslations('master_data.import');

 useEffect(() => {
 const runValidation = async () => {
 // Simulate validation delay for better UX
 await new Promise(resolve => setTimeout(resolve, 2000));
 
 const result = validateImportData(wizard.entity, wizard.data);
 wizard.setValidationResults(result.errors);
 };

 runValidation();
 }, [wizard]);

 return (
 <div className="flex flex-col items-center justify-center gap-12 py-20 animate-in fade-in zoom-in-95 duration-200">
 <div className="relative">
 {/* Pulsing rings */}
 <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping duration-[2000ms]" />
 <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-pulse duration-[1500ms]" />
 
 <div className="relative w-32 h-32 rounded-2xl bg-surface-container-low flex items-center justify-center shadow-2xl">
 <Database className="w-16 h-16 text-cyan-500" />
 <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-background shadow-lg flex items-center justify-center">
 <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
 </div>
 </div>
 </div>

 <div className="text-center space-y-4">
 <h2 className="text-headline-lg font-semibold uppercase text-foreground">
 {t('validating_title')}
 </h2>
 <div className="flex items-center justify-center gap-3">
 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.3s]" />
 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" />
 <p className="text-muted-foreground text-label-sm font-bold uppercase ms-2">
 {t('integrity_check_in_progress')}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 w-full max-w-md">
 <div className="p-6 rounded-2xl bg-surface-container-low/50 space-y-1">
 <p className="text-label-xs font-bold text-muted-foreground uppercase opacity-60">{t('total_records')}</p>
 <p className="text-headline-lg font-semibold font-mono dir-ltr">{wizard.metadata?.recordCount || 0}</p>
 </div>
 <div className="p-6 rounded-2xl bg-surface-container-low/50 space-y-1">
 <p className="text-label-xs font-bold text-muted-foreground uppercase opacity-60">{t('status')}</p>
 <p className="text-body-md font-bold text-cyan-500 uppercase leading-9 animate-pulse">{t('analyzing')}</p>
 </div>
 </div>
 </div>
 );
}

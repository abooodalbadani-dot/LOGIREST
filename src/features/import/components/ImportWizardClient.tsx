'use client';

import { useTranslations } from 'next-intl';
import { useImportWizard, ImportType, ImportStep } from '../hooks/useImportWizard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { ImportIcon, Upload, Database, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepUpload } from './steps/StepUpload';
import { StepValidate } from './steps/StepValidate';
import { StepErrors } from './steps/StepErrors';
import { StepCommit } from './steps/StepCommit';

interface ImportWizardClientProps {
  type: ImportType;
  locale: string;
}

export function ImportWizardClient({ type, locale }: ImportWizardClientProps) {
  const t = useTranslations('master_data.import');
  const tc = useTranslations('common');
  const wizard = useImportWizard(type);

  const isRtl = locale === 'ar';

  const steps: { id: ImportStep; label: string; icon: any }[] = [
    { id: 'UPLOAD', label: t('upload_step'), icon: Upload },
    { id: 'VALIDATING', label: t('validate_step'), icon: Database },
    { id: 'ERRORS', label: t('error_step'), icon: AlertCircle },
    { id: 'COMMIT', label: t('commit_step'), icon: Save },
  ];

  const getEntityTitle = () => {
    switch (type) {
      case 'items': return t('items');
      case 'uoms': return t('uoms');
      case 'barcodes': return t('barcodes');
      default: return '';
    }
  };

  const getStepIndex = (step: ImportStep) => {
    return steps.findIndex(s => s.id === step);
  };

  const currentStepIndex = getStepIndex(wizard.currentStep === 'SUCCESS' ? 'COMMIT' : wizard.currentStep);

  return (
    <div className="flex flex-col gap-6 p-6">
      <Breadcrumb
        items={[
          { label: tc('navigation.master_data'), href: '/master-data' },
          { label: t('title'), href: '/master-data/import' },
          { label: getEntityTitle() },
        ]}
      />

      <PageHeader
        title={`${t('title')} — ${getEntityTitle()}`}
        description={t('select_type')}
        icon={<ImportIcon className="w-5 h-5 text-cyan-500" />}
      />

      {/* Stepper */}
      <div 
        className={cn(
          "grid grid-cols-4 gap-4 relative",
          isRtl && "flex-row-reverse"
        )}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
         {/* Connector Line */}
         <div className="absolute top-5 left-[12.5%] right-[12.5%] h-px bg-muted-foreground/10 -z-0" />
         
         {steps.map((step, idx) => {
           const stepIdx = idx;
           const isActive = wizard.currentStep === step.id || (wizard.currentStep === 'SUCCESS' && step.id === 'COMMIT');
           const isCompleted = wizard.currentStep === 'SUCCESS' || getStepIndex(wizard.currentStep) > stepIdx;
           const StepIcon = step.icon;

           return (
             <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
               <div 
                 className={cn(
                   "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-background",
                   isActive && "border-cyan-500 bg-cyan-500/10 text-cyan-500 scale-110 shadow-[0_0_20px_rgba(6,182,212,0.2)]",
                   isCompleted && "border-emerald-500 bg-emerald-500/10 text-emerald-500",
                   !isActive && !isCompleted && "border-muted-foreground/20 text-muted-foreground/40"
                 )}
               >
                 {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
               </div>
               <span 
                 className={cn(
                   "text-[10px] font-black uppercase tracking-[0.2em] text-center px-2",
                   isActive ? "text-cyan-500" : isCompleted ? "text-emerald-500" : "text-muted-foreground/40"
                 )}
               >
                 {step.label}
               </span>
             </div>
           );
         })}
      </div>

      {/* Step Content */}
      <div className="mt-4">
        {wizard.currentStep === 'UPLOAD' && <StepUpload wizard={wizard} locale={locale} />}
        {wizard.currentStep === 'VALIDATING' && <StepValidate wizard={wizard} locale={locale} />}
        {wizard.currentStep === 'ERRORS' && <StepErrors wizard={wizard} locale={locale} />}
        {(wizard.currentStep === 'COMMIT' || wizard.currentStep === 'SUCCESS') && <StepCommit wizard={wizard} locale={locale} />}
      </div>
    </div>
  );
}

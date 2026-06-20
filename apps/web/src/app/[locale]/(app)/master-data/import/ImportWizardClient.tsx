'use client';

import { useTranslations } from 'next-intl';
import { useImportWizard, ImportType, ImportStep } from '@/features/import/hooks/useImportWizard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { ImportIcon, Upload, CheckCircle2, AlertCircle, Save, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Step1Upload } from './components/Step1Upload';
import { Step2Validate } from './components/Step2Validate';
import { Step3Errors } from './components/Step3Errors';
import { Step4Commit } from './components/Step4Commit';
import { ImportWizardState } from './types';

interface ImportWizardClientProps {
 type: ImportType;
 locale: string;
}

export function ImportWizardClient({ type, locale }: ImportWizardClientProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');
 const baseWizard = useImportWizard(type);

 // Adapt baseWizard to ImportWizardState
 const wizard: ImportWizardState = {
 ...baseWizard,
 importType: type,
 isValidating: baseWizard.step === 'VALIDATING',
 successCount: baseWizard.step === 'SUCCESS' ? baseWizard.data.length : 0,
 nextStep: () => {
  const steps: ImportStep[] = ['UPLOAD', 'VALIDATING', 'ERRORS', 'COMMIT', 'SUCCESS'];
  const currentIndex = steps.indexOf(baseWizard.step);
  if (currentIndex < steps.length - 1) {
  baseWizard.transitionTo(steps[currentIndex + 1]);
  }
 },
 prevStep: () => {
  const steps: ImportStep[] = ['UPLOAD', 'VALIDATING', 'ERRORS', 'COMMIT', 'SUCCESS'];
  const currentIndex = steps.indexOf(baseWizard.step);
  if (currentIndex > 0) {
  baseWizard.transitionTo(steps[currentIndex - 1]);
  }
 },
 };

 const steps = [
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

 return (
 <div className="w-full min-w-0 gap-6 flex-1 flex-col flex">
  <Breadcrumb
  items={[
   { label: tc('navigation.master_data'), href: '/master-data' },
   { label: t('title'), href: '/master-data/import' },
   { label: getEntityTitle() },
  ]}
  />

  <div className="flex items-center justify-between">
  <PageHeader 
   title={getEntityTitle()} 
   subtitle={t('wizard_desc')}
   icon={<ImportIcon className="w-10 h-10 text-foreground" />}
  />
  </div>

  {/* Stepper */}
  <div className="grid grid-cols-4 gap-4 p-4 bg-card border border-border shadow-sm rounded-3xl border border-primary/5">
  {steps.map((step, idx) => {
   const isActive = step.id === wizard.step;
   const isCompleted = steps.findIndex(s => s.id === wizard.step) > idx;

   return (
   <div 
    key={step.id}
    className={cn(
    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-500",
    isActive ? "bg-muted/50 shadow-sm shadow-cyan-500/5 ring-1 ring-cyan-500/20" : "opacity-40"
    )}
   >
    <div className={cn(
    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
    isActive ? "bg-cyan-500 text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
    )}>
    <step.icon className="w-5 h-5" />
    </div>
    <span 
    className={cn(
     "text-label-xs font-semibold uppercase text-center",
     isActive ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground/40"
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
  {wizard.step === 'UPLOAD' && <Step1Upload wizard={wizard} locale={locale} />}
  {wizard.step === 'VALIDATING' && <Step2Validate wizard={wizard} />}
  {wizard.step === 'ERRORS' && <Step3Errors wizard={wizard} />}
  {wizard.step === 'COMMIT' && <Step4Commit wizard={wizard} />}
  {wizard.step === 'SUCCESS' && (
   <div className="flex flex-col items-center gap-4 p-12 bg-card border border-border shadow-sm rounded-2xl border border-primary/5 min-w-0">
   <CheckCircle2 className="w-16 h-16 text-foreground" />
   <h3 className="text-title-lg font-bold">{t('success_title')}</h3>
   <p className="text-muted-foreground">{t('success_description')}</p>
   <button 
    onClick={() => wizard.reset()}
    className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
   >
    {tc('actions.done')}
   </button>
   </div>
  )}
  </div>
 </div>
 );
}

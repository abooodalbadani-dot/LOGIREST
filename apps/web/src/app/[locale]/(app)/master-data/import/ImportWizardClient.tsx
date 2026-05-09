'use client';

import { useTranslations } from 'next-intl';
import { useImportWizard, ImportType } from '@/features/import/hooks/useImportWizard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { ImportIcon, Upload, CheckCircle2, AlertCircle, Save, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Step1Upload } from './components/Step1Upload';
import { Step2Validate } from './components/Step2Validate';
import { Step3Errors } from './components/Step3Errors';
import { Step4Commit } from './components/Step4Commit';

interface ImportWizardClientProps {
 type: ImportType;
 locale: string;
}

export function ImportWizardClient({ type, locale }: ImportWizardClientProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');
 const wizard = useImportWizard(type);

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

 const currentStepIndex = steps.findIndex(s => s.id === wizard.step);

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
 <div className="grid grid-cols-4 gap-4 relative">
 {/* Connector Line */}
 <div className="absolute top-5 left-[12.5%] right-[12.5%] h-px bg-muted-foreground/10 -z-0" />
 
 {steps.map((step, index) => {
 const isActive = wizard.step === step.id;
 const isCompleted = currentStepIndex > index || wizard.step === 'SUCCESS';
 const StepIcon = step.icon;

 return (
 <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
 <div 
 className={cn(
 "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
 isActive && "border-cyan-500 bg-cyan-500/10 text-cyan-500 scale-110 shadow-[0_0_20px_rgba(6,182,212,0.2)]",
 isCompleted && "border-emerald-500 bg-emerald-500/10 text-emerald-500",
 !isActive && !isCompleted && "border-muted-foreground/20 bg-background text-muted-foreground/40"
 )}
 >
 {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
 </div>
 <span 
 className={cn(
 "text-label-xs font-semibold uppercase text-center",
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
 {wizard.step === 'UPLOAD' && <Step1Upload wizard={wizard} locale={locale} />}
 {wizard.step === 'VALIDATING' && <Step2Validate wizard={wizard} locale={locale} />}
 {wizard.step === 'ERRORS' && <Step3Errors wizard={wizard} locale={locale} />}
 {wizard.step === 'COMMIT' && <Step4Commit wizard={wizard} locale={locale} />}
 {wizard.step === 'SUCCESS' && (
 <div className="flex flex-col items-center gap-4 p-12 bg-surface-container-lowest rounded-2xl border border-primary/5">
 <CheckCircle2 className="w-16 h-16 text-emerald-500" />
 <h3 className="text-title-lg font-bold">{t('success_title')}</h3>
 <p className="text-muted-foreground">{t('success_description')}</p>
 <button 
 onClick={() => wizard.reset()}
 className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold"
 >
 {tc('actions.done')}
 </button>
 </div>
 )}
 </div>
 </div>
 );
}

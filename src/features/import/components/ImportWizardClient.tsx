'use client';

import { useTranslations } from 'next-intl';
import { useImportWizard } from '../hooks/useImportWizard';
import { ImportEntity } from '@/lib/import/templates';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { ImportIcon, Upload, CheckCircle2, AlertCircle, Save, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepUpload } from './steps/StepUpload';
import { StepValidate } from './steps/StepValidate';
import { StepErrors } from './steps/StepErrors';
import { StepCommit } from './steps/StepCommit';

interface ImportWizardClientProps {
 entity: ImportEntity;
 locale: string;
}

export function ImportWizardClient({ entity, locale }: ImportWizardClientProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');
 const wizard = useImportWizard(entity);
 const isRtl = locale === 'ar';

 const steps = [
 { id: 'UPLOAD', label: t('upload_step'), icon: Upload, order: 1 },
 { id: 'VALIDATING', label: t('validate_step'), icon: Database, order: 2 },
 { id: 'ERRORS', label: t('error_step'), icon: AlertCircle, order: 3 },
 { id: 'COMMIT', label: t('commit_step'), icon: Save, order: 4 },
 ];

 const getEntityTitle = () => {
 switch (entity) {
 case 'items': return t('items');
 case 'uoms': return t('uoms');
 case 'barcodes': return t('barcodes');
 default: return '';
 }
 };

 const currentStepOrder = steps.find(s => s.id === (wizard.step === 'SUCCESS' ? 'COMMIT' : wizard.step))?.order || 1;

 return (
 <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
 <Breadcrumb
 items={[
 { label: tc('navigation.master_data'), href: `/${locale}/master-data` },
 { label: t('title'), href: `/${locale}/master-data/import` },
 { label: getEntityTitle() },
 ]}
 />

 <PageHeader
 title={`${t('title')} — ${getEntityTitle()}`}
 description={t('select_type')}
 />

 {/* Stepper Container */}
 <div 
 className={cn(
 "flex items-center justify-between relative px-10 py-8",
 isRtl && "flex-row-reverse"
 )}
 >
 {/* Connector Line */}
 <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-muted-foreground/10 -translate-y-1/2 z-0 mx-20" />
 
 {steps.map((step) => {
 const isActive = wizard.step === step.id || (wizard.step === 'SUCCESS' && step.id === 'COMMIT');
 const isCompleted = currentStepOrder > step.order || (wizard.step === 'SUCCESS' && step.id === 'COMMIT');
 const StepIcon = step.icon;

 return (
 <div key={step.id} className="flex flex-col items-center gap-4 relative z-10 bg-background px-4">
 <div 
 className={cn(
 "w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500",
 isActive && "border-cyan-500 bg-cyan-500/10 text-cyan-500 scale-110 shadow-[0_0_20px_rgba(6,182,212,0.2)]",
 isCompleted && !isActive && "border-emerald-500 bg-emerald-500/10 text-emerald-500",
 !isActive && !isCompleted && "border-muted-foreground/20 bg-background text-muted-foreground/40"
 )}
 >
 {isCompleted && !isActive ? <CheckCircle2 className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
 </div>
 
 <div className="flex flex-col items-center">
 <span className="text-label-xs font-semibold opacity-30 mb-0.5">0{step.order}</span>
 <span 
 className={cn(
 "text-label-xs font-bold uppercase text-center whitespace-nowrap",
 isActive ? "text-cyan-500" : isCompleted ? "text-emerald-500" : "text-muted-foreground/40"
 )}
 >
 {step.label}
 </span>
 </div>
 </div>
 );
 })}
 </div>

 {/* Step Content */}
 <div className="mt-4 bg-surface-container-lowest/50 rounded-2xl p-8 border border-white/5 shadow-xl relative overflow-hidden min-h-[400px]">
 {/* Subtle grid background */}
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.03),transparent)] pointer-events-none" />
 
 <div className="relative z-10">
 {wizard.step === 'UPLOAD' && <StepUpload wizard={wizard} locale={locale} />}
 {wizard.step === 'VALIDATING' && <StepValidate wizard={wizard} locale={locale} />}
 {wizard.step === 'ERRORS' && <StepErrors wizard={wizard} locale={locale} />}
 {(wizard.step === 'COMMIT' || wizard.step === 'SUCCESS') && <StepCommit wizard={wizard} locale={locale} />}
 </div>
 </div>
 </div>
 );
}

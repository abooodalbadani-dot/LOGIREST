'use client';

import { useTranslations } from 'next-intl';
import { useImportWizard, ImportType, ImportStep } from '@/features/import/hooks/useImportWizard';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { ImportIcon, Upload, CheckCircle2, AlertCircle, Save, Database, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Step1Upload } from './components/Step1Upload';
import { Step2Validate } from './components/Step2Validate';
import { Step3Errors } from './components/Step3Errors';
import { Step4Commit } from './components/Step4Commit';
import { ImportWizardState, ValidationError } from './types';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

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
    successCount: baseWizard.successCount ?? 0,
    failedCount: baseWizard.failedCount ?? 0,
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

  const columns = useMemo<ColumnDef<ValidationError>[]>(() => [
    {
      accessorKey: 'row',
      header: t('row'),
      cell: ({ row }) => <span className="font-mono text-muted-foreground font-bold">#{row.original.row}</span>,
    },
    {
      accessorKey: 'column',
      header: 'Field',
      cell: ({ row }) => <span className="font-semibold uppercase text-label-xs text-foreground/70">{row.original.column}</span>,
    },
    {
      accessorKey: 'severity',
      header: t('status'),
      cell: ({ row }) => (
        <span className={cn(
          "text-label-xxs font-semibold uppercase tracking-normal px-2 py-0.5 rounded-sm",
          row.original.severity === 'error' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
        )}>
          {t(row.original.severity)}
        </span>
      ),
    },
    {
      accessorKey: 'message',
      header: t('error_message'),
      cell: ({ row }) => <span className="font-medium text-label-sm">{row.original.message}</span>,
    },
  ], [t]);

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
          <>
            {wizard.failedCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-8 bg-card border border-border shadow-sm rounded-[2rem] border-primary/5 min-w-0 animate-in zoom-in duration-500">
                <div className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 relative z-10" />
                </div>
                
                <div className="text-center">
                  <h3 className="text-headline-lg font-semibold mb-3">
                    {t('success_title')}
                  </h3>
                  <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                    {t('success_description', { count: wizard.successCount })}
                  </p>
                </div>

                <button 
                  onClick={() => wizard.reset()}
                  className="mt-4 px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
                >
                  {tc('actions.done')}
                </button>
              </div>
            ) : wizard.successCount > 0 ? (
              <div className="flex flex-col gap-6 bg-card border border-border shadow-sm rounded-[2rem] border-primary/5 p-8 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col items-center justify-center py-10 gap-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full" />
                    <AlertTriangle className="w-12 h-12 text-amber-500 relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-headline-lg font-semibold mb-2">{t('partial_success_title')}</h3>
                    <p className="text-muted-foreground max-w-xl font-medium">
                      {t('partial_success_description', { successCount: wizard.successCount, failedCount: wizard.failedCount })}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/60 my-2" />

                <h4 className="text-title-sm font-semibold text-foreground/80">{t('error_log')}</h4>
                
                <div className="flex-1 w-full min-h-[300px]">
                  <DataTable columns={columns} data={wizard.errors} />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button 
                    onClick={() => wizard.reset()}
                    className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {tc('actions.done')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 bg-card border border-border shadow-sm rounded-[2rem] border-primary/5 p-8 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col items-center justify-center py-10 gap-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full" />
                    <XCircle className="w-12 h-12 text-red-500 relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-headline-lg font-semibold mb-2">{t('failure_title')}</h3>
                    <p className="text-muted-foreground max-w-xl font-medium">
                      {t('failure_description', { failedCount: wizard.failedCount })}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/60 my-2" />

                <h4 className="text-title-sm font-semibold text-foreground/80">{t('error_log')}</h4>

                <div className="flex-1 w-full min-h-[300px]">
                  <DataTable columns={columns} data={wizard.errors} />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button 
                    onClick={() => wizard.reset()}
                    className="px-8 py-4 border border-border bg-card text-foreground rounded-2xl font-bold hover:bg-muted transition-colors"
                  >
                    {t('try_again')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

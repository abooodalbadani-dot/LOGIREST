'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, CheckCircle2, Loader2, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Step = 'upload' | 'validate' | 'review' | 'commit';

export function ImportWizard({ locale }: { locale: string }) {
  const t = useTranslations('masterData.import');
  const [step, setStep] = useState<Step>('upload');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [recordCount, setRecordCount] = useState(0);

  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: t('step_upload') },
    { key: 'validate', label: t('step_validate') },
    { key: 'review', label: t('step_review') },
    { key: 'commit', label: t('step_commit') },
  ];

  const handleUpload = () => {
    setIsValidating(true);
    // Simulate validation
    setTimeout(() => {
      setRecordCount(150);
      setIsValidating(false);
      setStep('validate');
    }, 2000);
  };

  const handleImport = () => {
    setIsImporting(true);
    // Simulate import
    setTimeout(() => {
      setIsImporting(false);
      setStep('commit');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground uppercase">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          {t('description')}
        </p>
      </div>

      {/* Stepper Header */}
      <div className="flex justify-between relative px-4">
        <div className="absolute top-1/2 start-0 w-full h-px bg-surface-container-highest -z-10 -translate-y-1/2" />
        {steps.map((s, i) => {
          const isActive = step === s.key;
          const isDone = steps.findIndex(x => x.key === step) > i;
          return (
            <div key={s.key} className="flex flex-col items-center gap-3 px-6 relative z-10">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-semibold transition-all duration-300 border-none ${
                isActive ? 'bg-status-active text-primary-foreground scale-110 shadow-neon-sm' : 
                isDone ? 'bg-status-success/20 text-status-success' : 'bg-surface-container-low text-muted-foreground opacity-50'
              }`}>
                {isDone ? <CheckCircle2 className="w-7 h-7" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${isActive ? 'text-status-active' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-surface-container-lowest border-none rounded-xl overflow-hidden transition-all duration-500 shadow-sm relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <div className="p-10">
          {step === 'upload' && (
            <div className="flex flex-col items-center gap-8 py-10">
              <div className="w-24 h-24 rounded-lg bg-surface-container-low flex items-center justify-center relative overflow-hidden group border-none">
                <div className="absolute inset-0 bg-status-active/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Upload className="w-10 h-10 text-muted-foreground group-hover:text-status-active transition-colors" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold uppercase tracking-tight">{t('select_file')}</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                  Upload your Items, UoMs, or Barcodes. Please use the official CSV template to ensure data integrity.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="gap-2 rounded-md border-none bg-surface-container-low hover:bg-surface-container-high transition-all hover:scale-[0.98] active:scale-95 px-6">
                  <Download className="w-4 h-4" /> DOWNLOAD TEMPLATE
                </Button>
                <Button onClick={handleUpload} disabled={isValidating} className="min-w-[160px] rounded-md font-semibold uppercase tracking-[0.08em] transition-all hover:scale-[0.98] hover:brightness-110 active:scale-95 primary-gradient border-none shadow-neon-sm">
                  {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('upload_cta')}
                </Button>
              </div>
            </div>
          )}

          {step === 'validate' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-5 p-8 rounded-lg bg-status-success/10 text-status-success border-none">
                <div className="w-14 h-14 rounded-md bg-status-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wider text-xl">{t('validation_success', { count: recordCount })}</p>
                  <p className="text-xs opacity-70 font-semibold uppercase tracking-[0.08em]">Integrity Check Complete</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 px-2">Preview Data</h4>
                <div className="border-none rounded-lg p-8 bg-surface-container-low font-mono text-sm leading-relaxed text-muted-foreground/80 shadow-inner">
                  <div className="flex items-center gap-4 py-3 border-b border-surface-container-high/30 text-[10px] font-semibold tracking-[0.08em] opacity-40 uppercase">
                    <span className="w-20">CODE</span>
                    <span className="w-40">NAME</span>
                    <span className="w-32">CATEGORY</span>
                    <span className="text-right flex-1">PRICE</span>
                  </div>
                  <div className="flex items-center gap-4 py-4 border-b border-surface-container-high/10">
                    <span className="w-20 font-semibold text-foreground">ITEM-001</span>
                    <span className="w-40">Organic Kale</span>
                    <span className="w-32">Vegetables</span>
                    <span className="text-right flex-1 text-status-active font-semibold">10.50 SAR</span>
                  </div>
                  <div className="flex items-center gap-4 py-4 border-b border-surface-container-high/10">
                    <span className="w-20 font-semibold text-foreground">ITEM-002</span>
                    <span className="w-40">Almond Milk</span>
                    <span className="w-32">Dairy</span>
                    <span className="text-right flex-1 text-status-active font-semibold">15.00 SAR</span>
                  </div>
                  <div className="flex items-center gap-4 py-3">
                    <span className="w-20 font-semibold opacity-40">...</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-8 border-none">
                <Button variant="ghost" onClick={() => setStep('upload')} className="rounded-md font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:bg-surface-container-high transition-all hover:scale-[0.98] active:scale-95 px-8">BACK</Button>
                <Button onClick={() => setStep('review')} className="rounded-md font-semibold uppercase tracking-[0.08em] px-10 hover:scale-[0.98] hover:brightness-110 active:scale-95 transition-all primary-gradient border-none shadow-neon-sm">CONTINUE TO REVIEW</Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold uppercase tracking-tight">Final Review</h3>
                <p className="text-muted-foreground text-sm">Please confirm the data summary before committing to the database.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-lg bg-surface-container-low border-none space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Records Found</p>
                  <p className="text-5xl font-semibold text-status-active">{recordCount}</p>
                </div>
                <div className="p-8 rounded-lg bg-surface-container-low border-none space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                    <Upload className="w-12 h-12" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Validation Errors</p>
                  <p className="text-5xl font-semibold text-status-success">0</p>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-status-warning/10 border-none flex gap-4 items-center">
                <div className="shrink-0 w-10 h-10 rounded-md bg-status-warning/20 flex items-center justify-center text-status-warning">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <p className="text-[10px] text-status-warning/80 font-semibold uppercase tracking-[0.08em] leading-relaxed">
                  NOTE: This action will insert new records or update existing ones based on unique handles. This operation cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-8 border-none">
                <Button variant="ghost" onClick={() => setStep('validate')} className="rounded-md font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:bg-surface-container-high transition-all hover:scale-[0.98] active:scale-95 px-8">BACK</Button>
                <Button onClick={handleImport} disabled={isImporting} className="min-w-[200px] h-12 rounded-md font-semibold uppercase tracking-[0.08em] hover:scale-[0.98] hover:brightness-110 active:scale-95 transition-all primary-gradient border-none shadow-neon-sm">
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : t('import_now')}
                </Button>
              </div>
            </div>
          )}
          {step === 'commit' && (
            <div className="flex flex-col items-center gap-8 py-10 text-center animate-in fade-in zoom-in duration-700 relative z-10">
              <div className="w-24 h-24 rounded-lg bg-status-success/10 flex items-center justify-center border-none shadow-neon-sm text-status-success">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-semibold uppercase tracking-tight text-status-success">
                  {t('import_success', { count: recordCount })}
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed font-semibold">
                  The master data has been successfully synchronized. All system nodes have been notified of the changes. You can now manage these entities in their respective modules.
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = `/${locale}/master-data/items`}
                className="rounded-md font-semibold uppercase tracking-[0.08em] px-12 h-14 group transition-all hover:gap-8 primary-gradient border-none shadow-neon-sm"
              >
                VIEW ITEMS <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

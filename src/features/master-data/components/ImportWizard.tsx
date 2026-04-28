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
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">
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
            <div key={s.key} className="flex flex-col items-center gap-3 bg-background px-6">
              <div className={`w-10 h-10 rounded-sm flex items-center justify-center text-sm font-black transition-all duration-300 border-2 ${
                isActive ? 'bg-operational-cyan border-operational-cyan text-primary-foreground scale-110 shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.3)]' : 
                isDone ? 'bg-surface-container-highest border-status-success text-status-success' : 'bg-surface-container-low border-surface-container-highest text-muted-foreground opacity-50'
              }`}>
                {isDone ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-operational-cyan' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="bg-surface-container-low border-surface-container-highest rounded-sm overflow-hidden transition-all duration-500 shadow-2xl">
        <div className="p-10">
          {step === 'upload' && (
            <div className="flex flex-col items-center gap-8 py-10">
              <div className="w-24 h-24 rounded-sm bg-surface-container-highest flex items-center justify-center border border-surface-container-highest/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-operational-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Upload className="w-10 h-10 text-muted-foreground group-hover:text-operational-cyan transition-colors" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tight">{t('select_file')}</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                  Upload your Items, UoMs, or Barcodes. Please use the official CSV template to ensure data integrity.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="gap-2 rounded-sm border-surface-container-highest hover:bg-surface-container-highest transition-colors">
                  <Download className="w-4 h-4" /> DOWNLOAD TEMPLATE
                </Button>
                <Button onClick={handleUpload} disabled={isValidating} className="min-w-[160px] rounded-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                  {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('upload_cta')}
                </Button>
              </div>
            </div>
          )}

          {step === 'validate' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-5 p-6 rounded-sm bg-status-success/5 border border-status-success/20 text-status-success">
                <div className="w-12 h-12 rounded-sm bg-status-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-wider text-lg">{t('validation_success', { count: recordCount })}</p>
                  <p className="text-sm opacity-70 font-medium">All mandatory fields are present and data formats are correct.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Preview Data</h4>
                <div className="border border-surface-container-highest rounded-sm p-6 bg-surface-container-lowest/50 font-mono text-sm leading-relaxed text-muted-foreground/80 opacity-80 backdrop-blur-sm">
                  <div className="flex items-center gap-4 py-2 border-b border-surface-container-highest/30">
                    <span className="w-20 text-muted-foreground">CODE</span>
                    <span className="w-40 text-muted-foreground">NAME</span>
                    <span className="w-32 text-muted-foreground">CATEGORY</span>
                    <span className="text-muted-foreground text-right flex-1">PRICE</span>
                  </div>
                  <div className="flex items-center gap-4 py-2 border-b border-surface-container-highest/10">
                    <span className="w-20 font-bold">ITEM-001</span>
                    <span className="w-40">Organic Kale</span>
                    <span className="w-32">Vegetables</span>
                    <span className="text-right flex-1 text-operational-cyan">10.50 SAR</span>
                  </div>
                  <div className="flex items-center gap-4 py-2 border-b border-surface-container-highest/10">
                    <span className="w-20 font-bold">ITEM-002</span>
                    <span className="w-40">Almond Milk</span>
                    <span className="w-32">Dairy</span>
                    <span className="text-right flex-1 text-operational-cyan">15.00 SAR</span>
                  </div>
                  <div className="flex items-center gap-4 py-2">
                    <span className="w-20 font-bold opacity-40">...</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-highest">
                <Button variant="ghost" onClick={() => setStep('upload')} className="rounded-sm font-black uppercase tracking-widest text-muted-foreground">BACK</Button>
                <Button onClick={() => setStep('review')} className="rounded-sm font-black uppercase tracking-widest px-8">CONTINUE TO REVIEW</Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Final Review</h3>
                <p className="text-muted-foreground text-sm">Please confirm the data summary before committing to the database.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-sm bg-surface-container-highest/30 border border-surface-container-highest space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Records Found</p>
                  <p className="text-4xl font-black text-operational-cyan">{recordCount}</p>
                </div>
                <div className="p-6 rounded-sm bg-surface-container-highest/30 border border-surface-container-highest space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Validation Errors</p>
                  <p className="text-4xl font-black text-status-success">0</p>
                </div>
              </div>

              <div className="p-4 rounded-sm bg-status-warning/5 border border-status-warning/20 flex gap-3 items-start">
                <div className="shrink-0 text-status-warning p-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <p className="text-sm text-status-warning/80 font-medium leading-relaxed">
                  NOTE: This action will insert new records or update existing ones based on the unique identifier handles. This operation cannot be easily undone.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-highest">
                <Button variant="ghost" onClick={() => setStep('validate')} className="rounded-sm font-black uppercase tracking-widest text-muted-foreground">BACK</Button>
                <Button onClick={handleImport} disabled={isImporting} className="min-w-[180px] rounded-sm font-black uppercase tracking-widest">
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : t('import_now')}
                </Button>
              </div>
            </div>
          )}

          {step === 'commit' && (
            <div className="flex flex-col items-center gap-8 py-10 text-center animate-in fade-in zoom-in duration-700">
              <div className="w-24 h-24 rounded-sm bg-status-success/10 flex items-center justify-center border-2 border-status-success shadow-[0_0_30px_rgba(var(--status-success-rgb),0.2)]">
                <CheckCircle2 className="w-12 h-12 text-status-success" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tight text-status-success">
                  {t('import_success', { count: recordCount })}
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed font-medium">
                  The master data has been successfully synchronized. All system nodes have been notified of the changes. You can now manage these entities in their respective modules.
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = `/${locale}/master-data/items`}
                className="rounded-sm font-black uppercase tracking-[0.2em] px-10 h-12 group transition-all hover:gap-6"
              >
                VIEW ITEMS <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

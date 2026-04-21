'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, CheckCircle2, AlertCircle, Loader2, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Step = 'upload' | 'validate' | 'review' | 'commit';

export function ImportWizard() {
  const t = useTranslations('masterData.import');
  const [step, setStep] = useState<Step>('upload');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

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
      setErrorCount(0);
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
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      {/* Stepper Header */}
      <div className="flex justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-surface-3 -z-10 -translate-y-1/2" />
        {steps.map((s, i) => {
          const isActive = step === s.key;
          const isDone = steps.findIndex(x => x.key === step) > i;
          return (
            <div key={s.key} className="flex flex-col items-center gap-2 bg-surface-1 px-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 
                isDone ? 'bg-green-500 text-white' : 'bg-surface-3 text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="p-8 bg-surface-2 border-surface-3 overflow-hidden transition-all duration-300">
        {step === 'upload' && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="w-20 h-20 rounded-full bg-surface-3 flex items-center justify-center animate-pulse">
              <Upload className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">{t('select_file')}</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Upload your Items, UoMs, or Barcodes. Please use the official CSV template to ensure data integrity.
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Download Template
              </Button>
              <Button onClick={handleUpload} disabled={isValidating} className="min-w-[140px]">
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('upload_cta')}
              </Button>
            </div>
          </div>
        )}

        {step === 'validate' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-medium">{t('validation_success', { count: recordCount })}</p>
                <p className="text-sm opacity-80">All mandatory fields are present and data formats are correct.</p>
              </div>
            </div>
            <div className="border border-surface-3 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h4>
              <div className="text-sm space-y-2 font-mono opacity-70">
                <p>ITEM-001 | Item A | Category 1 | 10.50 SAR</p>
                <p>ITEM-002 | Item B | Category 1 | 15.00 SAR</p>
                <p>ITEM-003 | Item C | Category 2 | 8.25 SAR</p>
                <p>...</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-3">
              <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={() => setStep('review')}>Continue to Review</Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Final Review</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-3/50 border border-surface-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Records Found</p>
                <p className="text-2xl font-bold">{recordCount}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-3/50 border border-surface-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Errors</p>
                <p className="text-2xl font-bold text-green-400">0</p>
              </div>
            </div>
            <p className="text-sm text-yellow-400/80 italic">
              Note: This action will insert new records or update existing ones based on the 'code' handle.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-3">
              <Button variant="ghost" onClick={() => setStep('validate')}>Back</Button>
              <Button onClick={handleImport} disabled={isImporting} className="min-w-[140px]">
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('import_now')}
              </Button>
            </div>
          </div>
        )}

        {step === 'commit' && (
          <div className="flex flex-col items-center gap-6 py-12 text-center text-balance animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">{t('import_success', { count: recordCount })}</h3>
              <p className="text-muted-foreground">The master data has been updated and is now available across the system.</p>
            </div>
            <Button onClick={() => window.location.href = './items'}>
              View Items <ChevronRight className="w-4 h-4 ms-2" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

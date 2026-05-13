'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Scan, Camera, X, CheckCircle2, RefreshCw, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

export default function ScannerClient() {
  const t = useTranslations('operational.inventory');
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('scanning');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (status === 'scanning') {
      const timer = setTimeout(() => {
        // Mock scan logic
        setResult('LOT-2024-9942');
        setStatus('success');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const resetScanner = () => {
    setResult(null);
    setStatus('scanning');
  };

  const handleLoadData = () => {
    startTransition(() => {
      router.push('/inventory/lots');
    });
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-foreground flex flex-col items-center justify-center p-6 selection:bg-operational-cyan/30">
      
      {/* Full-Screen Loading Overlay to prevent "flipping" feel */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] bg-surface-ledger/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-operational-cyan animate-spin" />
            <div className="absolute inset-0 blur-xl bg-operational-cyan/20 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-headline-sm font-bold text-white tracking-wider">{t('scanner.active')}</p>
            <div className="flex gap-1 justify-center">
              <div className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-700">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-operational-cyan/10 border border-operational-cyan/20 mb-2">
            <Scan className="w-4 h-4 text-operational-cyan" />
            <span className="text-label-xs font-semibold uppercase text-operational-cyan">{t('scanner.active')}</span>
          </div>
          <h1 className="text-headline-lg font-semibold" dir="auto" style={{ unicodeBidi: 'isolate' }}>{t('barcode_scanner')}</h1>
          <p className="text-label-sm font-medium text-muted-foreground/80" dir="auto" style={{ unicodeBidi: 'isolate' }}>{t('scanner.description')}</p>
        </div>

        {/* Scanner Viewport */}
        <div className="relative aspect-square w-full bg-surface-ledger rounded-[3rem] border border-surface-variant/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center group">
          
          {/* Decorative Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          {status === 'scanning' && (
            <>
              {/* Scanning Animation */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[2px] bg-operational-cyan shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] animate-[scan_2s_ease-in-out_infinite]" />
              
              {/* Viewfinder Corners */}
              <div className="absolute top-12 start-12 w-12 h-12 border-t-4 border-s-4 border-operational-cyan rounded-ss-2xl opacity-40" />
              <div className="absolute top-12 end-12 w-12 h-12 border-t-4 border-e-4 border-operational-cyan rounded-se-2xl opacity-40" />
              <div className="absolute bottom-12 start-12 w-12 h-12 border-b-4 border-s-4 border-operational-cyan rounded-bs-2xl opacity-40" />
              <div className="absolute bottom-12 end-12 w-12 h-12 border-b-4 border-e-4 border-operational-cyan rounded-be-2xl opacity-40" />

              <div className="relative z-10 flex flex-col items-center gap-4 text-white">
                <Camera className="w-16 h-16 animate-pulse text-operational-cyan" />
                <p className="text-label-sm font-bold text-operational-cyan/80">{t('scanner.align_tip')}</p>
                <Button 
                  onClick={resetScanner}
                  className="mt-4 !bg-white/10 hover:!bg-white/20 !text-white rounded-full h-12 px-8 gap-2 border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-95 shadow-operational-cyan/10"
                >
                  <RotateCcw className="w-5 h-5 text-operational-cyan" />
                  <span className="font-bold">{t('scanner.rescan_matrix')}</span>
                </Button>
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="relative z-10 flex flex-col items-center gap-6 animate-in zoom-in duration-500 text-white">
              <div className="w-24 h-24 rounded-full bg-status-success/10 flex items-center justify-center border border-status-success/20">
                <CheckCircle2 className="w-12 h-12 text-status-success" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-label-sm font-medium text-white/70" dir="auto" style={{ unicodeBidi: 'isolate' }}>{t('scanner.identified_record')}</p>
                <p className="text-headline-lg font-semibold text-status-success uppercase" dir="auto" style={{ unicodeBidi: 'isolate' }}><span dir="ltr" className="font-mono">{result}</span></p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-[320px]">
                <Button 
                  onClick={handleLoadData}
                  className="w-full h-14 bg-status-success hover:bg-status-success/90 !text-white rounded-2xl font-bold text-label-sm shadow-xl shadow-status-success/30 active:scale-[0.98] transition-all border border-status-success/20"
                >
                  {t('scanner.load_operational_data')}
                </Button>
                <Button 
                  onClick={resetScanner}
                  className="w-full h-12 !bg-white/10 hover:!bg-white/20 !text-white font-bold text-label-xs gap-3 active:scale-[0.98] transition-all rounded-xl border border-white/20 shadow-lg backdrop-blur-md shadow-operational-cyan/10"
                >
                  <RefreshCw className="w-5 h-5 text-operational-cyan" />
                  <span className="font-bold">{t('scanner.rescan_matrix')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* System Logs / Helper */}
        <div className="bg-surface-container-low/30 p-6 rounded-[2rem] border border-surface-variant/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-operational-cyan rounded-full" />
            <h3 className="text-label-sm font-semibold uppercase">{t('scanner.protocol_version')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-surface-container-low/50 rounded-xl border border-surface-variant/10">
              <p className="text-label-xs font-bold text-muted-foreground/80 mb-1">{t('scanner.battery_level')}</p>
              <p className="text-body-md font-semibold">94%</p>
            </div>
            <div className="p-3 bg-surface-container-low/50 rounded-xl border border-surface-variant/10">
              <p className="text-label-xs font-bold text-muted-foreground/80 mb-1">{t('scanner.ai_confidence')}</p>
              <p className="text-body-md font-semibold text-operational-cyan">99.8%</p>
            </div>
          </div>
        </div>

        {/* Exit Button */}
        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="rounded-full w-14 h-14 bg-surface-container-low border border-surface-variant/10 hover:bg-status-error/10 hover:text-status-error transition-all shadow-xl"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

      </div>

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 30%; }
          50% { top: 70%; }
        }
      `}</style>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Scan, Camera, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScannerClient() {
  const t = useTranslations('operational.inventory');
  const [isScanning, setIsScanning] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('scanning');

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

  return (
    <div className="min-h-screen bg-surface-container-lowest text-foreground flex flex-col items-center justify-center p-6 selection:bg-operational-cyan/30">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-operational-cyan/10 border border-operational-cyan/20 mb-2">
              <Scan className="w-4 h-4 text-operational-cyan" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-operational-cyan">Scanner Active</span>
           </div>
           <h1 className="text-3xl font-black tracking-tight" dir="auto" style={{ unicodeBidi: 'isolate' }}>{t('barcode_scanner')}</h1>
           <p className="text-[11px] font-black text-muted-foreground/60/40 uppercase tracking-widest" dir="auto" style={{ unicodeBidi: 'isolate' }}>Identify assets via optical matrix scan</p>
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

               <div className="relative z-10 flex flex-col items-center gap-4 text-operational-cyan/40">
                  <Camera className="w-16 h-16 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Align Code within frame</p>
               </div>
             </>
           )}

           {status === 'success' && (
             <div className="relative z-10 flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-full bg-status-success/10 flex items-center justify-center border border-status-success/20">
                   <CheckCircle2 className="w-12 h-12 text-status-success" />
                </div>
                <div className="text-center space-y-1">
                   <p className="text-[10px] font-black text-muted-foreground/60/40 uppercase tracking-widest" dir="auto" style={{ unicodeBidi: 'isolate' }}>Identified Record:</p>
                   <p className="text-3xl font-black tracking-tighter text-status-success uppercase" dir="auto" style={{ unicodeBidi: 'isolate' }}><span dir="ltr" className="font-mono">{result}</span></p>
                </div>
                <div className="flex flex-col gap-3 w-64">
                   <Button 
                    onClick={() => window.location.href = `/${t('lots.route') || 'inventory/lots'}`}
                    className="w-full h-12 bg-status-success hover:bg-status-success/90 text-white rounded-2xl font-black uppercase tracking-widest text-[11px]"
                   >
                     Load Operational Data
                   </Button>
                   <Button 
                    variant="ghost" 
                    onClick={resetScanner}
                    className="w-full h-10 text-muted-foreground/60/40 hover:text-foreground font-black uppercase tracking-widest text-[10px] gap-2"
                   >
                     <RefreshCw className="w-3 h-3" />
                     Rescan matrix
                   </Button>
                </div>
             </div>
           )}
        </div>

        {/* System Logs / Helper */}
        <div className="bg-surface-container-low/30 p-6 rounded-[2rem] border border-surface-variant/10 space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-operational-cyan rounded-full" />
              <h3 className="text-xs font-black uppercase tracking-widest">Scanner Protocol v4.2</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-container-low/50 rounded-xl border border-surface-variant/10">
                 <p className="text-[9px] font-black text-muted-foreground/60/40 uppercase mb-1 tracking-tighter">Battery Level</p>
                 <p className="text-sm font-black">94%</p>
              </div>
              <div className="p-3 bg-surface-container-low/50 rounded-xl border border-surface-variant/10">
                 <p className="text-[9px] font-black text-muted-foreground/60/40 uppercase mb-1 tracking-tighter">AI Confidence</p>
                 <p className="text-sm font-black text-operational-cyan">99.8%</p>
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

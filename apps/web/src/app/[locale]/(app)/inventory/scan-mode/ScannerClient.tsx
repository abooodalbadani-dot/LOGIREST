'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Scan,
  X,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Package,
  ArrowRight,
  Search,
  Layers,
  Barcode,
  AlertCircle,
  Sparkles,
  Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { CameraBarcodeScanner } from '@/components/shared/CameraBarcodeScanner';

interface ScannedItem {
  id: string;
  code: string;
  name: string;
  barcode?: string | null;
  primaryUom?: { id: string; name?: string; code?: string } | null;
  category?: { id: string; name?: string } | null;
}

export default function ScannerClient() {
  const locale = useLocale();
  const t = useTranslations('operational.inventory');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const router = useRouter();
  const { playSound } = useAudioFeedback();

  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [resultCode, setResultCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'scanning' | 'searching' | 'success' | 'error'>('scanning');
  const [isPending, startTransition] = useTransition();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger Sensory Feedback (Haptic Vibration + High-Pitched Web Audio Beep)
  const triggerSensoryFeedback = () => {
    // 1. Physical Haptic Vibration
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200]);
      } catch {
        // Suppress vibration errors
      }
    }

    // 2. High-Pitched Success Beep (Web Audio API)
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz high beep
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // Suppress audio context errors
    }

    // 3. Audio feedback hook
    playSound('scan');
  };

  // Auto-focus manual/hardware input field in scanning mode
  useEffect(() => {
    if (status === 'scanning') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-execute lookup when barcodeInput is received from USB scanner or typed
  useEffect(() => {
    const clean = barcodeInput.trim();
    if (!clean || status !== 'scanning') return;

    const timer = setTimeout(() => {
      if (clean.length >= 3) {
        executeLookup(clean);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [barcodeInput, status]);

  const executeLookup = async (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) return;

    // Trigger haptic vibration and audio beep immediately upon scanning
    triggerSensoryFeedback();

    setStatus('searching');
    setErrorMessage(null);

    try {
      const itemArraySchema = z.object({
        data: z.array(
          z.object({
            id: z.string(),
            code: z.string().nullable().optional(),
            barcode: z.string().nullable().optional(),
            name: z.string(),
            primaryUom: z.object({ id: z.string(), name: z.string().optional(), code: z.string().optional() }).nullable().optional(),
            category: z.object({ id: z.string(), name: z.string().optional() }).nullable().optional(),
          })
        ),
      });

      let res = await apiClient.get(
        `/items?search=${encodeURIComponent(cleanCode)}`,
        itemArraySchema
      );

      let items = res.data;

      // Fallback: If search yielded no items, explicitly query by barcode filter
      if (!items || items.length === 0) {
        res = await apiClient.get(
          `/items?barcode=${encodeURIComponent(cleanCode)}`,
          itemArraySchema
        );
        items = res.data;
      }

      const found = items.find(
        (i) =>
          i.code?.toLowerCase() === cleanCode.toLowerCase() ||
          i.barcode?.toLowerCase() === cleanCode.toLowerCase()
      ) || items[0]; // fallback to first match

      if (found) {
        setScannedItem({
          id: found.id,
          code: found.code || cleanCode,
          name: found.name,
          barcode: found.barcode,
          primaryUom: found.primaryUom,
          category: found.category,
        });
        setResultCode(found.code || cleanCode);
        setStatus('success');
      } else {
        setScannedItem(null);
        setResultCode(cleanCode);
        setStatus('error');
        setErrorMessage(
          locale === 'ar'
            ? 'لا يوجد صنف في النظام يطابق الكود المقروء'
            : 'No item record in master data matches the scanned code'
        );
        playSound('error');
      }
    } catch {
      setScannedItem(null);
      setResultCode(cleanCode);
      setStatus('error');
      setErrorMessage(
        locale === 'ar'
          ? 'فشل البحث في النظام. يرجى التحقق من الاتصال'
          : 'Search failed. Please check your connection'
      );
      playSound('error');
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput) {
      executeLookup(barcodeInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (barcodeInput) {
        executeLookup(barcodeInput);
      }
    }
  };

  const resetScanner = () => {
    setScannedItem(null);
    setResultCode(null);
    setBarcodeInput('');
    setErrorMessage(null);
    setStatus('scanning');
  };

  const handleLoadStockLots = () => {
    startTransition(() => {
      router.push(`/inventory/lots?search=${encodeURIComponent(resultCode || '')}`);
    });
  };

  const handleViewItemDetails = () => {
    if (scannedItem?.id) {
      startTransition(() => {
        router.push(`/master-data/items/${scannedItem.id}`);
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 animate-in fade-in duration-500">

      {/* Navigation Full-Screen Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-lg flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-label-md font-bold text-foreground tracking-wide animate-pulse">
            {t('scanner.active') || 'Loading Item Data...'}
          </p>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 my-auto">

        {/* Top Header */}
        <div className="text-center space-y-3 mb-4 mt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold mb-2 shadow-[0_0_15px_rgba(196,162,118,0.15)]">
            <Scan className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {status === 'scanning' ? (t('scanner.active') || 'Scanner Active') : (t('barcode_scanner') || 'Barcode Scanner')}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">
            {t('barcode_scanner') || 'Scanner'}
          </h1>
          <p className="text-[11px] font-bold text-muted-foreground/80 max-w-2xl mx-auto uppercase tracking-wider">
            {t('scanner.description') || 'Scan barcode or use external device'}
          </p>
        </div>

        {/* Dynamic Viewport Container */}
        {(status === 'scanning' || status === 'searching') ? (
          <div className="w-full max-w-[380px] flex flex-col gap-6">
            <div className="w-full relative aspect-square rounded-3xl border border-brand-gold/20 bg-surface-container shadow-[0_0_40px_rgba(196,162,118,0.05)] overflow-hidden flex flex-col items-center justify-center group">
              {/* Unobstructed Camera Feed */}
              <div className="absolute inset-0 w-full h-full z-0 mix-blend-screen">
                <CameraBarcodeScanner
                  onScanSuccess={(barcode) => {
                    if (status === 'scanning') {
                      setBarcodeInput(barcode);
                      executeLookup(barcode);
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Viewfinder Target & Laser Line */}
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="relative w-[70%] h-[70%] flex items-center justify-center">
                  {/* Laser Line */}
                  <div className="absolute w-full h-[2px] bg-brand-gold shadow-[0_0_20px_2px_rgba(196,162,118,0.8)] animate-[scan_2.5s_ease-in-out_infinite] z-20" />

                  {/* Tech Reticle Corners (Cyan) */}
                  <div className="absolute left-0 top-0 w-8 h-8 border-t-[3px] border-l-[3px] border-brand-gold/80 rounded-tl-xl shadow-[0_0_15px_rgba(196,162,118,0.4)]" />
                  <div className="absolute right-0 top-0 w-8 h-8 border-t-[3px] border-r-[3px] border-brand-gold/80 rounded-tr-xl shadow-[0_0_15px_rgba(196,162,118,0.4)]" />
                  <div className="absolute left-0 bottom-0 w-8 h-8 border-b-[3px] border-l-[3px] border-brand-gold/80 rounded-bl-xl shadow-[0_0_15px_rgba(196,162,118,0.4)]" />
                  <div className="absolute right-0 bottom-0 w-8 h-8 border-b-[3px] border-r-[3px] border-brand-gold/80 rounded-br-xl shadow-[0_0_15px_rgba(196,162,118,0.4)]" />
                </div>
              </div>

              {/* Searching Loading Overlay */}
              {status === 'searching' && (
                <div className="absolute inset-0 bg-surface-lowest/90 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4 text-foreground">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-gold/20 rounded-full blur-xl animate-pulse" />
                    <Loader2 className="w-12 h-12 text-brand-gold animate-spin relative z-10" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-brand-gold animate-pulse">{tc('loading') || 'Searching...'}</p>
                </div>
              )}
            </div>

            {/* Manual Input Field (Outside Camera Box) */}
            <form onSubmit={handleManualSearch} className="w-full relative z-20">
              <div className="relative w-full group/input">
                <Keyboard className="w-5 h-5 absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-brand-gold transition-colors" />
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={locale === 'ar' ? 'اكتب الباركود يدوياً...' : 'Type barcode manually...'}
                  className="h-14 w-full ps-12 pe-4 bg-surface-lowest border border-border/80 hover:border-brand-gold/40 text-foreground placeholder:text-muted-foreground/50 text-sm font-mono font-bold rounded-2xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold shadow-sm outline-none transition-all"
                />
              </div>
            </form>
          </div>
        ) : (
          /* Success / Error Card Container */
          <div className="w-full max-w-[400px] bg-surface-lowest border border-border/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Background Glows */}
            {status === 'success' && <div className="absolute -top-20 -right-20 w-40 h-40 bg-status-success/10 rounded-full blur-3xl pointer-events-none" />}
            {status === 'error' && <div className="absolute -top-20 -right-20 w-40 h-40 bg-status-error/10 rounded-full blur-3xl pointer-events-none" />}

            {status === 'success' && scannedItem && (
              <>
                {/* Header Status */}
                <div className="w-full flex flex-col items-center text-center space-y-2 relative z-10">
                  <div className="w-14 h-14 rounded-full bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success shadow-[0_0_15px_rgba(34,197,94,0.15)] mb-2">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-status-success">
                    {t('scanner.identified_record') || 'Record Identified'}
                  </span>
                  <h2 className="text-xl font-extrabold text-foreground line-clamp-2">
                    {scannedItem.name}
                  </h2>
                </div>

                {/* Item Info Summary Card with Top-Right Details Link */}
                <div className="w-full bg-surface-container/50 border border-border rounded-2xl p-4 shadow-sm relative space-y-0 divide-y divide-border/60 z-10">
                  <div className="flex justify-between items-center pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {locale === 'ar' ? 'ملخص الصنف' : 'Item Summary'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewItemDetails}
                      className="text-[10px] font-bold text-brand-gold hover:text-brand-gold hover:bg-brand-gold/10 gap-1.5 rounded-lg h-7 px-2.5 transition-all"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{locale === 'ar' ? 'تفاصيل الصنف' : 'Item Details'}</span>
                      <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center text-xs py-3">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-brand-gold" />
                      {locale === 'ar' ? 'كود الصنف' : 'Item Code'}:
                    </span>
                    <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                      {scannedItem.code}
                    </span>
                  </div>

                  {scannedItem.barcode && (
                    <div className="flex justify-between items-center text-xs py-3">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Scan className="w-3.5 h-3.5 text-brand-gold" />
                        {locale === 'ar' ? 'الباركوود' : 'Barcode'}:
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {scannedItem.barcode}
                      </span>
                    </div>
                  )}

                  {scannedItem.primaryUom && (
                    <div className="flex justify-between items-center text-xs py-3">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-brand-gold" />
                        {locale === 'ar' ? 'وحدة القياس' : 'Unit of Measure'}:
                      </span>
                      <span className="font-bold text-foreground bg-surface-container-highest px-2 py-0.5 rounded-md text-[10px] uppercase">
                        {scannedItem.primaryUom.name || scannedItem.primaryUom.code || scannedItem.primaryUom.id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Clean Action Buttons Hierarchy */}
                <div className="flex flex-col gap-3 w-full pt-2 relative z-10">
                  <Button
                    onClick={handleLoadStockLots}
                    className="w-full h-12 bg-brand-gold hover:bg-brand-gold/90 text-black font-extrabold text-[11px] uppercase tracking-wider rounded-xl gap-2 shadow-[0_0_15px_rgba(196,162,118,0.25)] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{locale === 'ar' ? 'متابعة وأرصدة المخزون' : 'CONFIRM & VIEW STOCK LOTS'}</span>
                    <ArrowRight className="w-4 h-4 ms-auto rtl:rotate-180" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetScanner}
                    className="w-full h-11 border-border/60 hover:bg-surface-container text-foreground font-bold text-[11px] uppercase tracking-wider rounded-xl gap-2 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand-gold" />
                    <span>{locale === 'ar' ? 'إعادة المسح الضوئي' : 'RESCAN MATRIX'}</span>
                  </Button>
                </div>
              </>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center justify-between space-y-6 text-foreground relative z-10">
                <div className="flex flex-col items-center text-center space-y-3 mt-4">
                  <div className="w-16 h-16 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center text-status-error shadow-[0_0_15px_rgba(239,68,68,0.15)] mb-2">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-status-error tracking-tight">
                    {te('not_found') || 'Item Not Found'}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground max-w-sm text-center">
                    {errorMessage}
                  </p>
                  {resultCode && (
                    <span className="font-mono text-sm font-bold bg-status-error/10 text-status-error px-3 py-1 rounded-lg border border-status-error/20 mt-2">
                      {resultCode}
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={resetScanner}
                  className="w-full h-12 border-border/60 hover:bg-surface-container text-foreground font-bold text-[11px] uppercase tracking-wider rounded-xl gap-2 transition-all mt-4"
                >
                  <RotateCcw className="w-4 h-4 text-brand-gold" />
                  <span>{locale === 'ar' ? 'إعادة المسح الضوئي' : 'RESCAN MATRIX'}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Exit Action */}
        <div className="flex justify-center mt-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="rounded-xl h-11 px-6 bg-surface-container/50 hover:bg-status-error/10 text-muted-foreground hover:text-status-error border border-border/50 hover:border-status-error/30 transition-all gap-2"
          >
            <X className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{locale === 'ar' ? 'إغلاق الماسح الضوئي' : 'Close Scanner'}</span>
          </Button>
        </div>

      </div>

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 18%; }
          50% { top: 82%; }
        }
      `}</style>
    </div>
  );
}

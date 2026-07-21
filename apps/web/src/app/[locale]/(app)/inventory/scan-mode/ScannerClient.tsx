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
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-1">
            <Scan className="w-4 h-4" />
            <span className="text-label-xs font-bold uppercase tracking-wider">
              {status === 'scanning' ? (t('scanner.active') || 'Awaiting scan...') : (t('barcode_scanner') || 'Barcode Scanner')}
            </span>
          </div>
          <h1 className="text-headline-md font-extrabold text-foreground tracking-tight">
            {t('barcode_scanner') || 'Barcode & QR Scanner'}
          </h1>
          <p className="text-body-sm font-medium text-muted-foreground max-w-full mx-auto">
            {t('scanner.description') || 'Align code within viewfinder or use hardware USB barcode scanner'}
          </p>
        </div>

        {/* Dynamic Viewport Container (Scanning Mode = Camera Box, Success Mode = Padded Expandable Card) */}
        {(status === 'scanning' || status === 'searching') ? (
          <div className="w-full relative aspect-square max-w-[420px] rounded-3xl border border-border/80 bg-black shadow-2xl overflow-hidden flex flex-col items-center justify-between group">
            {/* Unobstructed Camera Feed */}
            <div className="absolute inset-0 w-full h-full z-0">
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

            {/* Viewfinder Target & Laser Line (ONLY 4 Golden Reticle Corners & Laser Line) */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="relative w-[75%] h-[75%] border border-primary/20 rounded-3xl flex items-center justify-center">
                {/* Laser Line */}
                <div className="w-full h-0.5 bg-primary/90 shadow-[0_0_15px_rgba(202,174,133,0.9)] animate-[scan_2.2s_infinite]" />
                {/* Golden Reticle Corners */}
                <div className="absolute left-0 top-0 w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-2xl shadow-sm" />
                <div className="absolute right-0 top-0 w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-2xl shadow-sm" />
                <div className="absolute left-0 bottom-0 w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-2xl shadow-sm" />
                <div className="absolute right-0 bottom-0 w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-2xl shadow-sm" />
              </div>
            </div>

            {/* Searching Loading Overlay */}
            {status === 'searching' && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-label-sm font-bold animate-pulse">{tc('loading') || 'Searching Master Data...'}</p>
              </div>
            )}

            {/* Docked Bottom Sheet / Toolbar (Auto-Recognizes Barcode Automatically) */}
            <div className="relative z-20 w-full p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 mt-auto">
              <form onSubmit={handleManualSearch} className="w-full">
                <div className="relative w-full">
                  <Keyboard className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={locale === 'ar' ? 'امسح بالماسح الضوئي اليدوي أو اكتب الباركوود...' : 'Scan with USB device or type barcode...'}
                    className="h-11 w-full ps-9 pe-4 bg-black/90 border border-white/30 text-white placeholder:text-white/60 text-label-xs font-mono rounded-xl focus:border-primary focus:ring-1 focus:ring-primary shadow-inner outline-none transition-all"
                  />
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Success / Error Card Container (Expands naturally, zero height truncation) */
          <div className="w-full max-w-[460px] bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-5 animate-in zoom-in-95 duration-300">
            {status === 'success' && scannedItem && (
              <>
                {/* Header Status */}
                <div className="w-full flex items-start justify-between">
                  <div className="flex-1 flex flex-col items-center text-center space-y-1.5">
                    <div className="w-14 h-14 rounded-2xl bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success shadow-lg shadow-status-success/10 mb-1">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <span className="text-label-xs font-extrabold uppercase tracking-widest text-status-success">
                      {t('scanner.identified_record') || 'Record Identified'}
                    </span>
                    <h2 className="text-headline-sm font-bold text-foreground">
                      {scannedItem.name}
                    </h2>
                  </div>
                </div>

                {/* Item Info Summary Card with Top-Right Details Link */}
                <div className="w-full bg-surface-container-low/40 border border-border rounded-2xl p-4 shadow-sm relative space-y-0 divide-y divide-border/60">
                  <div className="flex justify-between items-center pb-2.5">
                    <span className="text-label-xs font-bold uppercase text-muted-foreground">
                      {locale === 'ar' ? 'ملخص الصنف' : 'Item Summary'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewItemDetails}
                      className="text-label-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5 rounded-lg h-7 px-2"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{locale === 'ar' ? 'تفاصيل الصنف' : 'Item Details'}</span>
                      <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center text-label-xs py-2.5">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-primary" />
                      {locale === 'ar' ? 'كود الصنف' : 'Item Code'}:
                    </span>
                    <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-0.5 rounded-md border border-border">
                      {scannedItem.code}
                    </span>
                  </div>

                  {scannedItem.barcode && (
                    <div className="flex justify-between items-center text-label-xs py-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Scan className="w-3.5 h-3.5 text-primary" />
                        {locale === 'ar' ? 'الباركوود' : 'Barcode'}:
                      </span>
                      <span className="font-mono font-medium text-muted-foreground">
                        {scannedItem.barcode}
                      </span>
                    </div>
                  )}

                  {scannedItem.primaryUom && (
                    <div className="flex justify-between items-center text-label-xs py-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        {locale === 'ar' ? 'وحدة القياس' : 'Unit of Measure'}:
                      </span>
                      <span className="font-bold text-foreground">
                        {scannedItem.primaryUom.name || scannedItem.primaryUom.code || scannedItem.primaryUom.id}
                      </span>
                    </div>
                  )}

                  {scannedItem.category && (
                    <div className="flex justify-between items-center text-label-xs py-2.5">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        {locale === 'ar' ? 'التصنيف' : 'Category'}:
                      </span>
                      <span className="font-semibold text-foreground">
                        {scannedItem.category.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Clean Action Buttons Hierarchy */}
                <div className="flex flex-col gap-2.5 w-full pt-1">
                  <Button
                    onClick={handleLoadStockLots}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-label-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{locale === 'ar' ? 'متابعة وأرصدة المخزون' : 'CONFIRM & VIEW STOCK LOTS'}</span>
                    <ArrowRight className="w-4 h-4 ms-auto rtl:rotate-180" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetScanner}
                    className="w-full h-11 border-border/80 hover:bg-muted text-foreground font-bold text-label-xs rounded-xl gap-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span>{locale === 'ar' ? 'إعادة المسح الضوئي' : 'RESCAN MATRIX'}</span>
                  </Button>
                </div>
              </>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center justify-between space-y-6 text-foreground">
                <div className="flex flex-col items-center text-center space-y-2 mt-2">
                  <div className="w-16 h-16 rounded-2xl bg-status-error/10 border border-status-error/20 flex items-center justify-center text-status-error shadow-lg shadow-status-error/10">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-headline-sm font-bold text-status-error">
                    {te('not_found') || 'Item Not Found'}
                  </h3>
                  <p className="text-body-xs font-medium text-muted-foreground max-w-3xl text-center">
                    {errorMessage}
                  </p>
                  {resultCode && (
                    <span className="font-mono text-label-sm font-bold bg-status-error/10 text-status-error px-3 py-1 rounded-lg border border-status-error/20 mt-2">
                      {resultCode}
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={resetScanner}
                  className="w-full h-12 border-border/80 hover:bg-muted text-foreground font-bold text-label-xs rounded-xl gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-primary" />
                  <span>{locale === 'ar' ? 'إعادة المسح الضوئي' : 'RESCAN MATRIX'}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Exit Action */}
        <div className="flex justify-center mt-2">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="rounded-full h-11 px-6 bg-card border border-border hover:bg-status-error/10 hover:border-status-error/30 hover:text-status-error transition-all shadow-sm gap-2"
          >
            <X className="w-4 h-4" />
            <span className="text-label-xs font-bold">{locale === 'ar' ? 'إغلاق الماسح الضوئي' : 'Close Scanner'}</span>
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

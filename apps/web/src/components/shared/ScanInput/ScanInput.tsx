'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ScanLine, CheckCircle2, AlertCircle, Keyboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAlwaysFocused } from '@/hooks/useAlwaysFocused';
import { useScannerWedge } from '@/hooks/useScannerWedge';

interface ScanInputProps {
  onScan: (barcode: string) => void | Promise<void>;
  onError?: (barcode: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onCameraActivate?: () => void;
  scanStatus?: "idle" | "success" | "error";
  statusMessage?: string;
  isScanning?: boolean;
  clearOnScan?: boolean;
  scannerMode?: boolean; 
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualTrigger?: () => void;
  size?: "sm" | "md" | "lg";
  label?: string;
  autoFocus?: boolean;
  latencyThreshold?: number;
}

export function ScanInput({
  onScan,
  disabled,
  placeholder,
  className,
  scanStatus = "idle",
  statusMessage,
  isScanning,
  clearOnScan = true,
  scannerMode = false,
  value,
  onChange,
  onManualTrigger,
  onCameraActivate,
  size = "md",
  label,
  autoFocus = true,
  latencyThreshold
}: ScanInputProps) {
  const tc = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Sync internal value if value prop is provided
  useEffect(() => {
    if (value !== undefined && inputRef.current) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Scoped autofocus regain to keep cursor locked to scanner input while respecting standard dropdown, form field, and modal blurs.
  useAlwaysFocused(inputRef, scannerMode && !disabled);

  const processScan = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    const now = Date.now();
    if (lastScanRef.current.code === trimmed && (now - lastScanRef.current.time) < 500) {
      return;
    }

    lastScanRef.current = { code: trimmed, time: now };

    if (clearOnScan && inputRef.current) {
      inputRef.current.value = '';
    }

    await onScan(trimmed);
  };

  // timing-based keyboard wedge handling, deduplication, and synth tones
  const { handleKeyDown: handleWedgeKeyDown } = useScannerWedge({
    onScan: async (barcode) => {
      await processScan(barcode);
    },
    enabled: scannerMode && !disabled,
    latencyThreshold,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Route event through wedge scanner handler (timing keydown checks)
    handleWedgeKeyDown(e);
  };

  const onChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) onChange(e);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.length > 5) {
      debounceTimer.current = setTimeout(() => {
        if (inputRef.current && inputRef.current.value === val) {
          processScan(val);
        }
      }, 300);
    }
  };

  const sizeConfigs = {
    sm: {
      container: "h-12",
      icon: "w-4 h-4",
      input: "text-label-sm px-3",
      button: "px-3 py-1.5 text-[10px]",
      buttonIcon: "w-3 h-3"
    },
    md: {
      container: "h-16",
      icon: "w-5 h-5",
      input: "text-body-md px-4",
      button: "px-5 py-2.5 text-label-xs",
      buttonIcon: "w-4 h-4"
    },
    lg: {
      container: "h-20",
      icon: "w-6 h-6",
      input: "text-title-medium px-6",
      button: "px-6 py-3 text-label-xs",
      buttonIcon: "w-4 h-4"
    }
  };

  const config = sizeConfigs[size];

  return (
    <div className={cn("relative group w-full flex flex-col gap-3", className)}>
      {label && (
        <label className="text-[11px] font-black uppercase tracking-[0.25em] text-operational-cyan ps-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-pulse shadow-[0_0_10px_var(--operational-cyan)]" />
          {label}
        </label>
      )}
      <div className={cn(
        "relative flex items-center transition-all duration-200 rounded-sm border-[4px] shadow-2xl overflow-hidden",
        config.container,
        scanStatus === 'success' ? "border-operational-cyan bg-operational-cyan/10 shadow-[0_0_60px_rgba(var(--operational-cyan-rgb),0.25)]" :
        scanStatus === 'error' ? "border-destructive bg-destructive/10 shadow-[0_0_60px_rgba(var(--destructive-rgb),0.25)]" :
        "border-surface-container-highest bg-surface-container-lowest hover:border-operational-cyan/50 focus-within:border-operational-cyan focus-within:ring-[12px] focus-within:ring-operational-cyan/10 focus-within:bg-surface-container-low"
      )}>
        {/* Background glow when focused */}
        <div className="absolute inset-0 bg-gradient-to-r from-operational-cyan/5 via-transparent to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />

        <div className="ps-6 text-muted-foreground/40 transition-colors group-focus-within:text-operational-cyan z-10">
          {isScanning ? (
            <Loader2 className={cn("animate-spin text-operational-cyan", config.icon)} />
          ) : scanStatus === 'success' ? (
            <CheckCircle2 className={cn("text-operational-cyan animate-in zoom-in duration-300", config.icon)} />
          ) : scanStatus === 'error' ? (
            <AlertCircle className={cn("text-destructive animate-in shake duration-300", config.icon)} />
          ) : (
            <ScanLine className={cn("transition-transform group-hover:scale-125 duration-300", config.icon)} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          dir="ltr"
          disabled={disabled || isScanning}
          placeholder={placeholder || tc('scan_placeholder')}
          onKeyDown={handleKeyDown}
          onChange={onChangeWrapper}
          autoComplete="off"
          className={cn(
            "bg-transparent border-none text-foreground w-full transition-all duration-200 outline-none z-10",
            "placeholder:text-muted-foreground/20 font-mono tracking-[0.25em] font-black",
            config.input
          )}
        />

        <div className="flex items-center pe-4 gap-3 z-10">
          {onManualTrigger && (
            <button
              type="button"
              onClick={onManualTrigger}
              className={cn(
                "bg-operational-cyan/10 border-2 border-operational-cyan/30 hover:border-operational-cyan hover:bg-operational-cyan text-operational-cyan hover:text-white rounded-sm font-black uppercase transition-all whitespace-nowrap flex items-center gap-3 shadow-lg active:scale-95 group/btn",
                config.button
              )}
            >
              <Keyboard className={cn("transition-transform group-hover/btn:-translate-y-0.5", config.buttonIcon)} />
              {tc('manual_entry')}
            </button>
          )}

          {onCameraActivate && (
            <button
              type="button"
              onClick={onCameraActivate}
              className={cn(
                "p-3 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 transition-all rounded-sm active:scale-95",
                config.buttonIcon
              )}
            >
              <ScanLine className="w-full h-full" />
            </button>
          )}
        </div>

        {statusMessage && (
          <div className={cn(
            "absolute -bottom-11 start-0 px-6 py-2.5 rounded-b-sm font-black text-[11px] uppercase tracking-[0.2em] animate-in slide-in-from-top-4 duration-200 shadow-2xl z-20",
            scanStatus === 'success' ? "bg-operational-cyan text-white shadow-operational-cyan/20" : "bg-destructive text-white shadow-destructive/20"
          )}>
            {statusMessage}
          </div>
        )}

        {/* Industrial scan line animation when focused */}
        <div className={cn(
          "absolute top-0 left-0 w-[4px] h-full bg-operational-cyan shadow-[0_0_25px_var(--operational-cyan)] opacity-0 pointer-events-none transition-all duration-[2000ms] ease-in-out z-0",
          "group-focus-within:animate-[scan_2s_infinite]",
          !disabled && !isScanning && scanStatus === 'idle' && "group-focus-within:opacity-60"
        )} />
      </div>
      
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(calc(100% - 4px)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}


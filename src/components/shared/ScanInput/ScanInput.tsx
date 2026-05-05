'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';

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
  scannerMode?: boolean; // New prop for warehouse mode
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onChange
}: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Sync internal value if value prop is provided
  useEffect(() => {
    if (value !== undefined && inputRef.current) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Auto-focus logic for Scanner Mode
  useEffect(() => {
    if (scannerMode && !disabled && inputRef.current && scanStatus === 'idle') {
      // Only steal focus if current focus is not on an input or textarea
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      
      if (!isInputFocused) {
        inputRef.current.focus();
      }
    }
  }, [scannerMode, disabled, scanStatus]);

  // Global Keydown redirection for Scanner Mode
  useEffect(() => {
    if (!scannerMode || disabled) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If we are already focused on an input, don't interfere
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      // If it's a character or number, redirect to ScanInput
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [scannerMode, disabled]);

  const processScan = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    // Prevent Double Trigger (Duplicate scan within 500ms)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape clears input
    if (e.key === 'Escape') {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Enter is the primary trigger
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation();
      processScan(e.currentTarget.value);
    }
  };

  const onChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    if (onChange) onChange(e);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    // Fallback: Auto-process if user pauses typing (300ms) and it looks like a barcode
    if (val.length > 5) {
      debounceTimer.current = setTimeout(() => {
        if (inputRef.current && inputRef.current.value === val) {
          processScan(val);
        }
      }, 300);
    }
  };

  return (
    <div className={cn("relative group w-full", className)}>
      <div className={cn(
        "relative flex items-center transition-all duration-300 rounded-2xl border-2",
        scanStatus === 'success' ? "border-operational-cyan/50 bg-operational-cyan/5 shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.1)]" :
        scanStatus === 'error' ? "border-destructive/50 bg-destructive/5 shadow-[0_0_20px_rgba(var(--destructive-rgb),0.1)]" :
        "border-transparent bg-surface-container-highest"
      )}>
        <div className="ps-6 text-muted-foreground/40">
          {isScanning ? (
            <Loader2 className="w-5 h-5 animate-spin text-operational-cyan" />
          ) : scanStatus === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-operational-cyan animate-in zoom-in duration-300" />
          ) : scanStatus === 'error' ? (
            <AlertCircle className="w-5 h-5 text-destructive animate-in shake duration-300" />
          ) : (
            <ScanLine className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          dir="ltr"
          disabled={disabled || isScanning}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onChange={onChangeWrapper}
          autoComplete="off"
          className={cn(
            "bg-transparent border-none text-foreground rounded-xl text-title-lg px-4 py-5 w-full transition-all duration-[140ms] ease-out",
            "focus:outline-none focus:shadow-none placeholder:text-muted-foreground/30",
            "ring-0 focus-visible:ring-0 disabled:opacity-50 font-mono tracking-[0.08em]"
          )}
        />

        {statusMessage && (
          <div className={cn(
            "absolute -bottom-7 start-4 text-label-xs font-semibold uppercase animate-in fade-in slide-in-from-top-1",
            scanStatus === 'success' ? "text-operational-cyan" : "text-destructive"
          )}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Decorative scanning line animation */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-[2px] bg-operational-cyan/30 opacity-0 pointer-events-none transition-all duration-1000",
        !disabled && !isScanning && scanStatus === 'idle' && "group-hover:opacity-100 group-hover:top-full"
      )} />
    </div>
  );
}

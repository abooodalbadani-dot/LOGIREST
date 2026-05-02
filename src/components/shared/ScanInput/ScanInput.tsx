'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';

interface ScanInputProps {
 onScan: (barcode: string) => void | Promise<void>;
 onError?: (barcode: string) => void;
 disabled?: boolean;
 placeholder?: string;
 className?: string;
 onCameraActivate?: () => void;
 // New props for operational feedback
 scanStatus?: "idle" | "success" | "error";
 statusMessage?: string;
 isScanning?: boolean;
 clearOnScan?: boolean;
}

export function ScanInput({ 
 onScan, 
 onError, 
 disabled, 
 placeholder, 
 className, 
 onCameraActivate,
 scanStatus = "idle",
 statusMessage,
 isScanning,
 clearOnScan = true,
 value,
 onChange
}: ScanInputProps & { value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
 const inputRef = useRef<HTMLInputElement>(null);
 const debounceTimer = useRef<NodeJS.Timeout>(null);

 // Sync internal value if value prop is provided
 useEffect(() => {
 if (value !== undefined && inputRef.current) {
 inputRef.current.value = value;
 }
 }, [value]);

 // Auto-focus on mount and whenever not disabled
 useEffect(() => {
 if (!disabled && inputRef.current && scanStatus === 'idle') {
 inputRef.current.focus();
 }
 }, [disabled, scanStatus]);

 const handleBlur = () => {
 if (disabled) return;
 // Small delay to prevent focus stealing issues
 setTimeout(() => {
 // Only re-focus if nothing else is focused (prevents focus trapping)
 if (document.activeElement === document.body || document.activeElement === null) {
 inputRef.current?.focus();
 }
 }, 150);
 };

 const processScan = async (val: string) => {
 const trimmed = val.trim();
 if (!trimmed) return;
 
 await onScan(trimmed);
 
 if (clearOnScan && inputRef.current) {
 inputRef.current.value = '';
 }
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 processScan(e.currentTarget.value);
 }
 };

 const onChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
 const val = e.target.value;
 
 // Call parent onChange if provided (for react-hook-form etc)
 if (onChange) onChange(e);

 if (debounceTimer.current) clearTimeout(debounceTimer.current);
 
 // Auto-process if it looks like a barcode (length > 4) after a short pause
 if (val.length > 4) {
 debounceTimer.current = setTimeout(() => {
 if (inputRef.current && inputRef.current.value === val) {
 processScan(val);
 }
 }, 100);
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
 onBlur={handleBlur}
 onKeyDown={handleKeyDown}
 onChange={onChangeWrapper}
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

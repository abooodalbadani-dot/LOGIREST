'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ScanInputProps {
  onScan: (barcode: string) => void;
  onError?: (barcode: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onCameraActivate?: () => void;
}

export function ScanInput({ onScan, onError, disabled, placeholder, className, onCameraActivate }: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleBlur = () => {
    if (disabled) return;
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const processScan = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    
    onScan(trimmed);
    
    if (inputRef.current) {
       inputRef.current.value = '';
       inputRef.current.classList.remove('bg-status-error/10');
       inputRef.current.classList.add('bg-operational-cyan/20');
       
       setTimeout(() => {
         if (inputRef.current) {
           inputRef.current.classList.remove('bg-operational-cyan/20');
         }
       }, 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processScan(e.currentTarget.value);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (val.length > 4) {
      debounceTimer.current = setTimeout(() => {
        if (inputRef.current && inputRef.current.value === val) {
           processScan(val);
        }
      }, 80);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      dir="ltr"
      disabled={disabled}
      placeholder={placeholder}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={onChange}
      className={cn(
        "bg-surface-container-highest border-none text-foreground rounded-xl text-lg px-6 py-4 w-full transition-all duration-[140ms] ease-out",
        "focus:outline-none focus:bg-primary-fixed-dim/10 focus:shadow-none",
        "shadow-none ring-0 focus-visible:ring-0 disabled:opacity-50",
        className
      )}
    />
  );
}

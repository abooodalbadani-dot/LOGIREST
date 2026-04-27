'use client';

import { useRef, useEffect } from 'react';

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
       inputRef.current.classList.remove('border-red-500', 'ring-red-500');
       inputRef.current.classList.add('border-cyan-500', 'ring-2', 'ring-cyan-500');
       
       setTimeout(() => {
         if (inputRef.current) {
           inputRef.current.classList.remove('border-cyan-500', 'ring-2', 'ring-cyan-500');
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
      disabled={disabled}
      placeholder={placeholder}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={onChange}
      className={`bg-surface-2 border border-surface-3 text-on-surface rounded text-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 ${className || ''}`}
    />
  );
}

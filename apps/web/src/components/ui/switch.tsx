'use client';

import * as React from 'react';
import { cn } from "@/lib/utils";

interface SwitchProps {
 id?: string;
 checked: boolean;
 onCheckedChange: (checked: boolean) => void;
 disabled?: boolean;
 className?: string;
 activeClassName?: string;
}

export function Switch({ id, checked, onCheckedChange, disabled, className, activeClassName }: SwitchProps) {
 return (
 <button
 id={id}
 dir="ltr"
 role="switch"
 aria-checked={checked}
 disabled={disabled}
 type="button"
 onClick={() => onCheckedChange(!checked)}
 className={cn(
 'relative inline-flex h-5 w-9 items-center rounded-full transition-colors border',
 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1',
 'disabled:opacity-50',
 checked 
    ? (activeClassName ? cn(activeClassName, 'border-transparent') : 'bg-operational-cyan border-transparent') 
    : 'bg-gray-200 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700',
 className
 )}
 >
 <span
 className={cn(
 'inline-block h-4 w-4 rounded-full bg-card shadow transition-transform',
 checked ? 'translate-x-4' : 'translate-x-0.5'
 )}
 />
 </button>
 );
}

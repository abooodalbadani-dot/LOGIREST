'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InlineLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-label-sm text-muted-foreground animate-in fade-in", className)}>
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      {label && <span>{label}</span>}
    </div>
  );
}

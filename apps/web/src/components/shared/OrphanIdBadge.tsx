import * as React from 'react';

interface OrphanIdBadgeProps {
  rawId: string | null | undefined;
  className?: string;
}

export function OrphanIdBadge({ rawId, className }: OrphanIdBadgeProps) {
  if (!rawId) return null;
  return (
    <span
      className={`px-2 py-1 text-[10px] font-mono bg-muted text-muted-foreground rounded-md border border-border inline-block ${className || ''}`}
      title={rawId}
    >
      {rawId.substring(0, 8)}...
    </span>
  );
}

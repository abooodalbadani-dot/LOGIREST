import * as React from 'react';
import { OrphanIdBadge } from './OrphanIdBadge';

interface RelationalNameProps {
  name: string | null | undefined;
  rawId: string | null | undefined;
  fallback?: string;
  className?: string;
}

export function RelationalName({ name, rawId, fallback, className }: RelationalNameProps) {
  if (name && name.trim() !== '') {
    return <span className={className}>{name}</span>;
  }
  if (rawId) {
    return <OrphanIdBadge rawId={rawId} className={className} />;
  }
  return <span className={className}>{fallback || '—'}</span>;
}

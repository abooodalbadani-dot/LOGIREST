'use client';
import { useTranslations } from 'next-intl';

export type BadgeStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'CANCELLED' | 'IN_TRANSIT' | 'OPEN' | 'COUNTING' | 'REVIEW';

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const t = useTranslations('common.status');
  
  let colorClass = 'bg-surface-3 text-on-surface-muted';
  
  switch (status) {
    case 'SUBMITTED':
      colorClass = 'bg-blue-900/40 text-blue-300';
      break;
    case 'APPROVED':
      colorClass = 'bg-neon-green/20 text-neon-green';
      break;
    case 'POSTED':
      colorClass = 'bg-neon-cyan/20 text-neon-cyan';
      break;
    case 'REJECTED':
      colorClass = 'bg-neon-red/20 text-neon-red';
      break;
    case 'CANCELLED':
      colorClass = 'bg-surface-3 text-on-surface-muted opacity-60';
      break;
    case 'IN_TRANSIT':
    case 'OPEN':
      colorClass = 'bg-neon-amber/20 text-neon-amber';
      break;
    case 'COUNTING':
      colorClass = 'bg-blue-900/40 text-blue-300';
      break;
    case 'REVIEW':
      colorClass = 'bg-orange-900/40 text-orange-300';
      break;
    case 'DRAFT':
    default:
      colorClass = 'bg-surface-3 text-on-surface-muted';
      break;
  }
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
      {t(status.toLowerCase())}
    </span>
  );
}

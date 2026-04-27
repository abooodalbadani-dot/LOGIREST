'use client';
import { useTranslations } from 'next-intl';

import { z } from 'zod';

export const BadgeStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'RECEIVED', 'REJECTED', 'CANCELLED', 'IN_TRANSIT', 'OPEN', 'COUNTING', 'REVIEW']);
export type BadgeStatus = z.infer<typeof BadgeStatusSchema>;

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const t = useTranslations('common.status');
  
  let colorClass = 'bg-surface-3 text-on-surface-muted';
  
  switch (status) {
    case 'SUBMITTED':
      colorClass = 'bg-blue-900/20 text-blue-400 border border-blue-500/20';
      break;
    case 'APPROVED':
      colorClass = 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20';
      break;
    case 'POSTED':
    case 'RECEIVED':
      colorClass = 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/20';
      break;
    case 'REJECTED':
      colorClass = 'bg-red-900/20 text-red-400 border border-red-500/20';
      break;
    case 'CANCELLED':
      colorClass = 'bg-surface-3 text-on-surface-muted opacity-60 border border-white/5';
      break;
    case 'IN_TRANSIT':
    case 'OPEN':
      colorClass = 'bg-amber-900/20 text-amber-400 border border-amber-500/20';
      break;
    case 'COUNTING':
      colorClass = 'bg-indigo-900/20 text-indigo-400 border border-indigo-500/20';
      break;
    case 'REVIEW':
      colorClass = 'bg-orange-900/20 text-orange-400 border border-orange-500/20';
      break;
    case 'DRAFT':
    default:
      colorClass = 'bg-surface-3 text-on-surface-muted border border-white/5';
      break;
  }
  
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${colorClass}`}>
      {t(status.toLowerCase())}
    </span>
  );
}

import { ElementType } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { cn } from '@/lib/utils';
import { 
 CheckCircle2, 
 Clock, 
 Send, 
 XCircle, 
 ShieldCheck, 
 FileEdit 
} from 'lucide-react';

export type Status = 
 | 'draft' 
 | 'submitted' 
 | 'approved' 
 | 'posted' 
 | 'rejected' 
 | 'cancelled' 
 | 'in_transit' 
 | 'open' 
 | 'counting' 
 | 'review'
 | 'convert_to_po'
 | 'converted_to_po';

export interface StatusTimelineEntry {
 status: Status;
 at: string;
 by: string;
}

const STATUS_CONFIG: Record<Status, { icon: ElementType, color: string, glow: string }> = {
 draft: { icon: FileEdit, color: 'text-muted-foreground', glow: 'bg-muted-foreground/20' },
 submitted: { icon: Send, color: 'text-cyan-500', glow: 'bg-cyan-500/20' },
 approved: { icon: CheckCircle2, color: 'text-emerald-500', glow: 'bg-emerald-500/20' },
 posted: { icon: ShieldCheck, color: 'text-cyan-400', glow: 'bg-cyan-400/20' },
 rejected: { icon: XCircle, color: 'text-red-500', glow: 'bg-red-500/20' },
 cancelled: { icon: XCircle, color: 'text-red-500', glow: 'bg-red-500/20' },
 in_transit:{ icon: Clock, color: 'text-amber-500', glow: 'bg-amber-500/20' },
 open: { icon: Clock, color: 'text-cyan-500', glow: 'bg-cyan-500/20' },
 counting: { icon: Clock, color: 'text-cyan-500', glow: 'bg-cyan-500/20' },
 review: { icon: Clock, color: 'text-cyan-500', glow: 'bg-cyan-500/20' },
 convert_to_po: { icon: CheckCircle2, color: 'text-amber-500', glow: 'bg-amber-500/20' },
 converted_to_po: { icon: CheckCircle2, color: 'text-amber-500', glow: 'bg-amber-500/20' },
};

export function StatusTimeline({ entries }: { entries: StatusTimelineEntry[] }) {
 const tCommon = useTranslations('common');
 const locale = useLocale() as 'ar' | 'en';

 return (
 <div className="relative space-y-8 before:absolute before:inset-y-0 before:start-[19px] before:w-[2px] before:bg-surface-container-highest/50">
 {entries.map((entry, idx) => {
 const statusKey = (entry.status || 'draft').toLowerCase() as Status;
 const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
 const Icon = config.icon;
 const isLatest = idx === entries.length - 1;

 const statusLabel = tCommon.has(`statuses.${statusKey}`)
   ? tCommon(`statuses.${statusKey}`)
   : statusKey.replace(/_/g, ' ').toUpperCase();

 return (
 <div key={idx} className="relative flex gap-6 animate-in fade-in slide-in-from-start-4 duration-200" style={{ animationDelay: `${idx * 100}ms` }}>
 <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-sm border border-surface-container-highest shadow-xl overflow-hidden group">
 <div className={cn("absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity", config.glow)} />
 <Icon className={cn("w-5 h-5 relative z-10", config.color, isLatest && "animate-pulse")} />
 </div>
 
 <div className="flex flex-col justify-center space-y-1 py-1">
 <div className="flex items-center gap-2">
 <p className={cn(
 "text-label-xs font-semibold uppercase",
 config.color,
 isLatest && "drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
 )}>
 {statusLabel}
 </p>
 {isLatest && (
 <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
 )}
 </div>
 <div className="flex items-center gap-2 text-muted-foreground/60">
    <ClientOnlyTime 
     date={entry.at} 
     mode="datetime" 
     showSeconds={true}
     locale={locale}
     className="text-label-xs font-bold" 
    />
 <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
 <span className="text-label-xs font-semibold uppercase">
 {entry.by}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 );
}

import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
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
  | 'review';

export interface StatusTimelineEntry {
  status: Status;
  at: string;
  by: string;
}

const STATUS_CONFIG: Record<Status, { icon: any, color: string, glow: string }> = {
  draft:     { icon: FileEdit,    color: 'text-muted-foreground', glow: 'bg-muted-foreground/20' },
  submitted: { icon: Send,        color: 'text-cyan-500',         glow: 'bg-cyan-500/20' },
  approved:  { icon: CheckCircle2, color: 'text-emerald-500',      glow: 'bg-emerald-500/20' },
  posted:    { icon: ShieldCheck,  color: 'text-cyan-400',         glow: 'bg-cyan-400/20' },
  rejected:  { icon: XCircle,      color: 'text-red-500',          glow: 'bg-red-500/20' },
  cancelled: { icon: XCircle,      color: 'text-red-500',          glow: 'bg-red-500/20' },
  in_transit:{ icon: Clock,        color: 'text-amber-500',        glow: 'bg-amber-500/20' },
  open:      { icon: Clock,        color: 'text-cyan-500',         glow: 'bg-cyan-500/20' },
  counting:  { icon: Clock,        color: 'text-cyan-500',         glow: 'bg-cyan-500/20' },
  review:    { icon: Clock,        color: 'text-cyan-500',         glow: 'bg-cyan-500/20' },
};

export function StatusTimeline({ entries }: { entries: StatusTimelineEntry[] }) {
  const tCommon = useTranslations('common');
  const locale = useTranslations('common')('locale') === 'ar' ? 'ar' : 'en';

  return (
    <div className="relative space-y-8 before:absolute before:inset-y-0 before:start-[19px] before:w-[2px] before:bg-surface-container-highest/50">
      {entries.map((entry, idx) => {
        const config = STATUS_CONFIG[entry.status.toLowerCase() as Status] || STATUS_CONFIG.draft;
        const Icon = config.icon;
        const isLatest = idx === entries.length - 1;

        return (
          <div key={idx} className="relative flex gap-6 animate-in fade-in slide-in-from-start-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-low border border-surface-container-highest shadow-xl overflow-hidden group">
              <div className={cn("absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity", config.glow)} />
              <Icon className={cn("w-5 h-5 relative z-10", config.color, isLatest && "animate-pulse")} />
            </div>
            
            <div className="flex flex-col justify-center space-y-1 py-1">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-[0.05em]",
                  config.color,
                  isLatest && "drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                )}>
                  {tCommon(`status.${entry.status.toLowerCase() as Status}`) || entry.status}
                </p>
                {isLatest && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <span className="text-[10px] font-bold tracking-tight" dir="ltr">
                  {format(new Date(entry.at), 'PPP pp')}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                <span className="text-[10px] font-black uppercase tracking-tighter">
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

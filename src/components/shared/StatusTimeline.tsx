import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

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

export function StatusTimeline({ entries }: { entries: StatusTimelineEntry[] }) {
  const tCommon = useTranslations('common');

  return (
    <div className="relative border-s-2 border-surface-container-highest ms-4 space-y-4 py-2">
      {entries.map((entry, idx) => (
        <div key={idx} className="relative ps-6">
          <div className="absolute w-3 h-3 bg-primary rounded-full -start-[7px] top-1.5 ring-4 ring-card"></div>
          <p className="text-sm font-medium">
            {tCommon(`status.${entry.status.toLowerCase() as Status}`) || entry.status}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(entry.at), 'PPP pp')} · {entry.by}
          </p>
        </div>
      ))}
    </div>
  );
}

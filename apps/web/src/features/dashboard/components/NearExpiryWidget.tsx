'use client';
import { Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

export function NearExpiryWidget({ locale }: { locale: string }) {
  const t = useTranslations('dashboard.near_expiry');
  const tc = useTranslations('common');
  
  // Mock data for near expiry
  const items = [
    { id: '1', nameKey: 'milk', expiry_date: '2026-05-15', qty: 150, unit: 'l', priority: 'medium' },
    { id: '2', nameKey: 'yogurt', expiry_date: '2026-04-30', qty: 85, unit: 'pcs', priority: 'high' },
    { id: '3', nameKey: 'chicken', expiry_date: '2026-06-10', qty: 240, unit: 'kg', priority: 'low' },
  ];

  const isRtl = locale === 'ar';

  return (
    <section className="bg-surface-container-low/50 rounded-2xl overflow-hidden border-none backdrop-blur-sm" aria-labelledby="near-expiry-title">
      <div className="px-6 py-4 flex items-center justify-between">
        <h3 id="near-expiry-title" className="text-label-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-status-warning" />
          {t('title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-status-error/10 text-status-error text-label-xxs font-semibold uppercase">
            {t('alert')}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="px-6 py-4 transition-all duration-140 ease-industrial flex items-center justify-between group hover:bg-surface-container-high/40"
          >
            <div className="flex flex-col gap-1">
              <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors">
                {t(`mock.${item.nameKey}`)}
              </span>
              <div className="flex items-center gap-3">
                <span className={`text-label-xs flex items-center gap-1.5 font-bold ${ item.priority === 'high' ? 'text-status-error' : 'text-muted-foreground/60' }`}>
                  <Clock className="w-3 h-3" />
                  {t('expires')}{' '}
                  <ClientOnlyTime 
                    date={item.expiry_date} 
                    mode="date" 
                    fallback="--/--/----"
                  />
                </span>
                {item.priority === 'high' && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-status-error animate-pulse" />
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body-md font-semibold text-foreground tabular-nums">
                {item.qty}
              </span>
              <span className="text-label-xxs text-muted-foreground/40 uppercase font-semibold">
                {tc(`units.${item.unit}`)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 bg-surface-container/30 text-center">
        <Link href="/reports">
          <button className="text-label-xxs font-semibold text-muted-foreground/40 hover:text-operational-cyan uppercase transition-all">
            {t('rotation_report')}
          </button>
        </Link>
      </div>
    </section>
  );
}

'use client';
import { Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

export interface ExpiringLot {
  id: string;
  item_name: string;
  lot_number: string;
  expiry_date: string;
  days_left: number;
  warehouse_name: string;
  qty: number;
  uom: string;
}

export function NearExpiryWidget({ 
  locale,
  data
}: { 
  locale: string;
  data?: ExpiringLot[];
}) {
  const t = useTranslations('dashboard.near_expiry');
  const tc = useTranslations('common');
  
  // Map dynamic API data if available, otherwise fall back to mock data
  const items = data
    ? data.map((lot) => ({
        id: lot.id,
        name: lot.item_name,
        lot_number: lot.lot_number,
        expiry_date: lot.expiry_date,
        days_left: lot.days_left,
        warehouse: lot.warehouse_name,
        qty: lot.qty,
        unit: lot.uom,
        priority: lot.days_left <= 7 ? 'high' : lot.days_left <= 15 ? 'medium' : 'low',
        isApi: true,
        nameKey: '',
      }))
    : [
        { id: '1', name: 'Milk / حليب', lot_number: 'L-MK9021', expiry_date: '2026-05-15', days_left: 5, warehouse: 'Main Store', qty: 150, unit: 'l', priority: 'medium', isApi: false, nameKey: 'milk' },
        { id: '2', name: 'Yogurt / زبادي', lot_number: 'L-YG4402', expiry_date: '2026-04-30', days_left: 2, warehouse: 'Main Store', qty: 85, unit: 'pcs', priority: 'high', isApi: false, nameKey: 'yogurt' },
        { id: '3', name: 'Chicken / دجاج', lot_number: 'L-CH9025', expiry_date: '2026-06-10', days_left: 25, warehouse: 'Main Store', qty: 240, unit: 'kg', priority: 'low', isApi: false, nameKey: 'chicken' },
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
                {item.isApi ? item.name : t(`mock.${item.nameKey}`)}
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
                {item.isApi && (
                  <span className="text-label-xxs text-muted-foreground/40 font-semibold uppercase">
                    {item.lot_number} • {item.warehouse}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body-md font-semibold text-foreground tabular-nums">
                {item.qty}
              </span>
              <span className="text-label-xxs text-muted-foreground/40 uppercase font-semibold">
                {item.isApi ? item.unit : tc(`units.${item.unit}`)}
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

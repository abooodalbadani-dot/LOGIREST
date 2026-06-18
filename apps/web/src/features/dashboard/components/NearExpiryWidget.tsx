'use client';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

export interface ExpiringLot {
 id: string;
 itemId?: string;
 itemName: string;
 lotNumber: string;
 expiryDate: string;
 daysLeft: number;
 warehouseName: string;
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
 
 // Map dynamic API data if available, otherwise fall back to empty array
 const items = (data || []).map((lot) => ({
    id: lot.id,
    itemId: lot.itemId || lot.id,
    name: lot.itemName,
    lot_number: lot.lotNumber,
    expiry_date: lot.expiryDate,
    days_left: lot.daysLeft,
    warehouse: lot.warehouseName,
    qty: lot.qty,
    unit: lot.uom,
    priority: lot.daysLeft <= 7 ? 'high' : lot.daysLeft <= 15 ? 'medium' : 'low',
   }));
 return (
  <section className="bg-card border border-border shadow-sm/50 rounded-2xl overflow-hidden backdrop-blur-sm" aria-labelledby="near-expiry-title">
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
    {items.length === 0 && (
     <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <span className="text-label-xs font-semibold text-muted-foreground/30 uppercase my-auto">{tc('no_data', { defaultValue: 'No Data' })}</span>
     </div>
    )}
    {items.map((item) => (
     <div 
      key={item.id} 
      className="px-6 py-4 transition-all duration-140 ease-industrial flex items-center justify-between group hover:bg-muted"
     >
      <div className="flex flex-col gap-1">
       <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors">
        {item.name}
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
        <span className="text-label-xxs text-muted-foreground/40 font-semibold uppercase">
         {item.lot_number} • {item.warehouse}
        </span>
       </div>
      </div>
      <div className="flex items-center gap-4">
       <div className="flex flex-col items-end">
        <span className="text-body-md font-semibold text-foreground tabular-nums">
         {item.qty}
        </span>
        <span className="text-label-xxs text-muted-foreground/40 uppercase font-semibold">
         {item.unit}
        </span>
       </div>
       <PermissionGate action="create" resource="operations_adjustments">
        <Link href={`/adjustments/new?itemId=${item.itemId}&batch=${item.lot_number}&reason=damage`} className="contents">
         <Button variant="ghost" className="rounded-xl bg-card border border-border shadow-sm h-9 w-9 p-0 hover:bg-status-warning hover:text-black transition-all hover:scale-110 active:scale-95">
          <AlertCircle className="w-4 h-4" />
         </Button>
        </Link>
       </PermissionGate>
      </div>
     </div>
    ))}
   </div>
   <div className="p-3 bg-muted/30 border-t border-border text-center">
    <Link href="/reports">
     <button className="text-label-xxs font-semibold text-muted-foreground/40 hover:text-operational-cyan uppercase transition-all">
      {t('rotation_report')}
     </button>
    </Link>
   </div>
  </section>
 );
}

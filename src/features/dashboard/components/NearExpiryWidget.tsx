'use client';
import { AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

export function NearExpiryWidget({ locale }: { locale: string }) {
  const t = useTranslations('dashboard.near_expiry');
  
  // Mock data for near expiry
  const items = [
    { id: '1', name_ar: 'حليب كامل الدسم', name_en: 'Full Cream Milk', expiry_date: '2026-05-15', qty: 150, unit: 'L' },
    { id: '2', name_ar: 'زبادي طبيعي', name_en: 'Natural Yogurt', expiry_date: '2026-04-30', qty: 85, unit: 'PCS' },
    { id: '3', name_ar: 'دجاج مجمد', name_en: 'Frozen Chicken', expiry_date: '2026-06-10', qty: 240, unit: 'KG' },
  ];

  const isRtl = locale === 'ar';

  return (
    <div className="bg-surface-container-lowest rounded overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-surface-container-low/50 flex items-center justify-between">
        <h3 className="text-[10px] font-black text-on-surface-muted uppercase tracking-[0.2em] flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          {t('title')}
        </h3>
        <span className="px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest ghost-border">
          {t('alert')}
        </span>
      </div>
      <div className="flex flex-col">
        {items.map((item, idx) => (
          <div 
            key={item.id} 
            className={`px-5 py-3 transition-colors flex items-center justify-between group ${
              idx % 2 === 0 ? 'bg-transparent' : 'bg-surface-container-low/30'
            } hover:bg-cyan-500/5`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground group-hover:text-cyan-500 transition-colors tracking-tight">
                {isRtl ? item.name_ar : item.name_en}
              </span>
              <span className="text-[9px] text-on-surface-muted/60 flex items-center gap-1.5 font-mono font-medium">
                <AlertCircle className="w-3 h-3 text-red-500/80" />
                {t('expires')}
                {format(new Date(item.expiry_date), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-foreground font-display tabular-nums tracking-tighter">{item.qty}</span>
              <span className="text-[9px] text-on-surface-muted/40 ml-1 uppercase font-black">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

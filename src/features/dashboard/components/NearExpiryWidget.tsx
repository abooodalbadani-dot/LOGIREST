'use client';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function NearExpiryWidget({ locale }: { locale: string }) {
 const t = useTranslations('dashboard.near_expiry');
 
 // Mock data for near expiry
 const items = [
 { id: '1', name_ar: 'حليب كامل الدسم', name_en: 'Full Cream Milk', expiry_date: '2026-05-15', qty: 150, unit: 'L', priority: 'medium' },
 { id: '2', name_ar: 'زبادي طبيعي', name_en: 'Natural Yogurt', expiry_date: '2026-04-30', qty: 85, unit: 'PCS', priority: 'high' },
 { id: '3', name_ar: 'دجاج مجمد', name_en: 'Frozen Chicken', expiry_date: '2026-06-10', qty: 240, unit: 'KG', priority: 'low' },
 ];

 const isRtl = locale === 'ar';

 return (
 <div className="bg-surface-container-low/40 rounded-3xl overflow-hidden border-none backdrop-blur-sm">
 <div className="px-6 py-4 flex items-center justify-between">
 <h3 className="text-label-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
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
 {items.map((item, idx) => (
 <div 
 key={item.id} 
 className="px-6 py-4 transition-all duration-300 flex items-center justify-between group hover:bg-muted/50"
 >
 <div className="flex flex-col gap-1">
 <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors">
 {isRtl ? item.name_ar : item.name_en}
 </span>
 <div className="flex items-center gap-3">
 <span className={`text-label-xs flex items-center gap-1.5 font-bold ${ item.priority === 'high' ? 'text-status-error' : 'text-muted-foreground/60' }`}>
 <Clock className="w-3 h-3" />
 {t('expires')} {format(new Date(item.expiry_date), 'dd/MM/yyyy')}
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
 {item.unit}
 </span>
 </div>
 </div>
 ))}
 </div>
 <div className="p-3 bg-muted/10 text-center">
 <Link href={`/${locale}/reports`}>
 <button className="text-label-xxs font-semibold text-muted-foreground/40 hover:text-operational-cyan uppercase transition-all">
 {t('rotation_report')}
 </button>
 </Link>
 </div>
 </div>
 );
}


'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  History, 
  User, 
  Calendar, 
  Package, 
  ShieldAlert
} from 'lucide-react';

import { formatDate } from '@/utils/currency';

// Mock data for expired overrides
const MOCK_OVERRIDES = [
 {
 id: 'ov-1',
 document_number: 'ISS-2024-001',
 document_type: 'ISSUE',
 item_code: 'ITM-001',
 item_name: 'Fresh Cream 35%',
 lot_number: 'LOT-XP-992',
 expiry_date: '2024-04-15',
 overridden_at: '2024-05-01T10:30:00Z',
 overridden_by: 'Ahmed Manager',
 reason: 'Emergency stock shortage - quality verified by chef',
 qty: 5,
 uom: 'LTR'
 },
 {
 id: 'ov-2',
 document_number: 'ADJ-2024-042',
 document_type: 'ADJUSTMENT',
 item_code: 'ITM-082',
 item_name: 'Unsalted Butter',
 lot_number: 'BT-8821',
 expiry_date: '2024-04-28',
 overridden_at: '2024-05-02T08:15:00Z',
 overridden_by: 'Sara Admin',
 reason: 'Incorrect lot date entry during receiving',
 qty: 12,
 uom: 'KG'
 }
];

export function ExpiredOverrideClient({ locale }: { locale: string }) {
 const t = useTranslations('inventory.expired_override');
 

 return (
 <div className="flex flex-col gap-8 pb-20">
 <PageHeader
 title={t('title')}
 description={t('description')}
 icon={<ShieldAlert className="w-8 h-8 text-rose-500" />}
 />

 <div className="grid grid-cols-1 gap-6">
 {MOCK_OVERRIDES.map((ov) => (
 <Card key={ov.id} className="bg-surface-container-low border-none rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
 <CardContent className="p-0">
 <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[160px]">
 {/* Visual Status Sidebar */}
 <div className="w-full lg:w-2 bg-rose-500/20 group-hover:bg-rose-500 transition-colors" />
 
 <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
 {/* Item & Lot Info */}
 <div className="lg:col-span-1 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
 <Package className="w-5 h-5 text-rose-500" />
 </div>
 <div>
 <p className="text-label-xs font-semibold uppercase text-rose-500/80">
 {ov.item_code}
 </p>
 <h4 className="text-body-md font-bold text-foreground truncate max-w-[180px]">
 {ov.item_name}
 </h4>
 </div>
 </div>
 
 <div className="flex items-center gap-4 pt-2">
 <div className="space-y-0.5">
 <p className="text-label-xxs font-semibold uppercase text-muted-foreground/40">{t('lot_number_label')}</p>
 <p className="font-mono text-label-sm font-bold">{ov.lot_number}</p>
 </div>
 <div className="w-px h-6 bg-white/5" />
 <div className="space-y-0.5">
 <p className="text-label-xxs font-semibold uppercase text-rose-500/40">{t('expired_on_label')}</p>
 <p className="font-mono text-label-sm font-bold text-rose-500" dir="ltr">{ov.expiry_date}</p>
 </div>
 </div>
 </div>

 {/* Override Details */}
 <div className="lg:col-span-2 space-y-4">
 <div className="flex items-center gap-2">
 <AlertTriangle className="w-4 h-4 text-rose-400" />
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('reason_label')}</p>
 </div>
 <div className="bg-surface-container-high/40 rounded-2xl p-4 border border-rose-500/5">
 <p className="text-body-md font-medium leading-relaxed italic text-foreground/90">
 &quot;{ov.reason}&quot;
 </p>
 </div>
 
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2">
 <User className="w-3.5 h-3.5 text-muted-foreground/40" />
 <span className="text-label-xs font-bold uppercase text-muted-foreground/70">{ov.overridden_by}</span>
 </div>
 <div className="flex items-center gap-2">
 <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
 <span className="text-label-xs font-mono text-muted-foreground/60" dir="ltr">
 {formatDate(ov.overridden_at, locale as 'ar' | 'en')}
 </span>
 </div>
 </div>
 </div>

 {/* Document & Actions */}
 <div className="lg:col-span-1 flex flex-col justify-between items-end border-s border-white/5 ps-8">
 <div className="text-end space-y-2">
 <p className="text-label-xxs font-semibold uppercase text-muted-foreground/40">{t('source_document_label')}</p>
 <Badge variant="outline" className="border-operational-cyan/20 bg-operational-cyan/5 text-operational-cyan text-label-xs font-semibold uppercase py-1 px-3">
 {ov.document_type}: {ov.document_number}
 </Badge>
 </div>
 
 <div className="text-end">
 <div className="text-label-xxs font-semibold uppercase text-muted-foreground/40 mb-1">{t('impacted_qty_label')}</div>
 <div className="flex items-center justify-end gap-2">
 <span className="text-headline-lg font-semibold font-mono">{ov.qty}</span>
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{ov.uom}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {MOCK_OVERRIDES.length === 0 && (
 <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-[3rem] border-2 border-dashed border-white/5">
 <div className="w-20 h-20 rounded-full bg-emerald-500/5 flex items-center justify-center mb-6">
 <History className="w-10 h-10 text-emerald-500/30" />
 </div>
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('no_overrides')}</p>
 </div>
 )}
 </div>
 );
}

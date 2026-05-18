import { useTranslations, useLocale } from 'next-intl';
import { formatDate } from '@/utils/currency';
import type { Lot } from '@/types/master-data';
import type { UserRole } from '@/providers/AuthProvider';
import { ExpiredOverrideInline } from './ExpiredOverrideInline';

export function LotRow({ 
 lot, 
 allocatedQty, 
 onQtyChange, 
 isExpired, 
 isNearExpiry, 
 userRole, 
 onExpiredOverride 
}: { 
 lot: Lot; 
 allocatedQty: number; 
 onQtyChange: (qty: number) => void; 
 isExpired: boolean; 
 isNearExpiry: boolean; 
 userRole: UserRole; 
 onExpiredOverride: (reason: string) => void;
}) {
 const t = useTranslations('common.table_headers');
 const tc = useTranslations('operations.issue');
  const locale = useLocale();
  const bgClass = isExpired ? 'bg-status-error/10' : isNearExpiry ? 'bg-status-warning/10' : 'bg-surface-container';
 
 const canOverride = ['ADMIN', 'INV_MGR'].includes(userRole);
 const inputDisabled = isExpired && !canOverride;

 return (
 <div className={`p-3 rounded-xl border ${bgClass}`}>
 <div className="flex justify-between items-center mb-2">
 <div className="flex gap-4">
 <div>
 <span className="text-label-sm text-muted-foreground block mb-1">{t('lot')}</span>
 <span dir="ltr" className="font-mono font-medium text-body-md text-foreground">{lot.lot_number}</span>
 </div>
 <div>
 <span className="text-label-sm text-muted-foreground block mb-1">{t('expiry')}</span>
  <span dir="ltr" className="font-mono text-body-md text-foreground">{formatDate(lot.expiry_date, locale as 'ar' | 'en')}</span>
 </div>
 <div>
 <span className="text-label-sm text-muted-foreground block mb-1">{t('available')}</span>
 <span dir="ltr" className="font-mono text-body-md text-foreground">{lot.qty_available}</span>
 </div>
 </div>
 
 <div className="flex items-center gap-2">
 {isExpired && !canOverride && (
 <span className="text-label-sm bg-status-error text-white px-2 py-1 rounded font-bold">{tc('expired_status')}</span>
 )}
 
 <input 
 type="number" 
 min="0"
 max={lot.qty_available}
 value={allocatedQty || ''} onChange={(e) => onQtyChange(Number(e.target.value))}
 disabled={inputDisabled}
 aria-label="Allocate Quantity"
 className="w-20 bg-surface-container-high border text-foreground rounded-lg p-1 text-center font-mono focus:border-operational-cyan outline-none disabled:opacity-50"
 />
 </div>
 </div>
 
 {isExpired && canOverride && (
 <ExpiredOverrideInline onReasonChange={onExpiredOverride} />
 )}
 </div>
 );
}

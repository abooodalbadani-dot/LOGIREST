'use client';
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
  const bgClass = isExpired ? 'bg-neon-red/10' : isNearExpiry ? 'bg-neon-amber/10' : 'bg-surface-2';
  
  const canOverride = ['ADMIN', 'INV_MGR'].includes(userRole);
  const inputDisabled = isExpired && !canOverride;

  return (
    <div className={`p-3 rounded border border-surface-3 ${bgClass}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-4">
          <div>
            <span className="text-xs text-on-surface-muted block mb-1">Lot</span>
            <span dir="ltr" className="font-mono font-medium text-sm text-on-surface">{lot.lot_number}</span>
          </div>
          <div>
            <span className="text-xs text-on-surface-muted block mb-1">Expiry</span>
            <span dir="ltr" className="font-mono text-sm text-on-surface">{lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs text-on-surface-muted block mb-1">Available</span>
            <span dir="ltr" className="font-mono text-sm text-on-surface">{lot.qty_available}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isExpired && !canOverride && (
            <span className="text-xs bg-neon-red text-surface-0 px-2 py-1 rounded font-bold">⛔ منتهي الصلاحية</span>
          )}
          
          <input 
            type="number" 
            min="0"
            max={lot.qty_available}
            value={allocatedQty || ''}
            onChange={(e) => onQtyChange(Number(e.target.value))}
            disabled={inputDisabled}
            className="w-20 bg-surface-3 border border-surface-4 text-on-surface rounded p-1 text-center font-mono focus:border-neon-cyan outline-none disabled:opacity-50"
          />
        </div>
      </div>
      
      {isExpired && canOverride && (
        <ExpiredOverrideInline onReasonChange={onExpiredOverride} />
      )}
    </div>
  );
}

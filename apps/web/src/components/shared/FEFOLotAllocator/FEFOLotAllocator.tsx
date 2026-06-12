'use client';
import { useState, useMemo } from 'react';
import type { Lot } from '@/types/master-data';
import type { LotAllocation } from '@/types/documents';
import type { UserRole } from '@/providers/AuthProvider';
import { useTranslations } from 'next-intl';
import { sortLotsByFEFO, isExpired, isNearExpiry } from '@/utils/fefo';
import { LotRow } from './LotRow';

interface FEFOLotAllocatorProps {
 lots: Lot[];
 requestedQty: number;
 uomLabel: string;
 userRole?: UserRole;
 onAllocate: (allocations: LotAllocation[]) => void;
 onClose: () => void;
}

export function FEFOLotAllocator({ lots, requestedQty, uomLabel, userRole, onAllocate, onClose }: FEFOLotAllocatorProps) {
 const t = useTranslations('operations.issue');
 const tc = useTranslations('common');
 const sortedLots = useMemo(() => sortLotsByFEFO(lots), [lots]);
 
 const [allocations, setAllocations] = useState<Record<string, { qty: number, reason: string }>>(() => {
 const initialAllocations: Record<string, { qty: number, reason: string }> = {};
 let remaining = requestedQty;
 
 for (const lot of sortedLots) {
 if (remaining <= 0) break;
 if (isExpired(lot.expiryDate) && !['ADMIN', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'].includes(userRole || '')) {
 continue;
 }
 
 const toAllocate = Math.min(remaining, lot.qtyAvailable);
 if (toAllocate > 0) {
 initialAllocations[lot.id] = { qty: toAllocate, reason: '' };
 remaining -= toAllocate;
 }
 }
 return initialAllocations;
 });

 const totalAllocated = Object.values(allocations).reduce((sum, current) => sum + (current.qty || 0), 0);
 
 const isValid = totalAllocated === requestedQty && sortedLots.every(lot => {
 const alloc = allocations[lot.id];
 if (alloc && alloc.qty > 0 && isExpired(lot.expiryDate)) {
 return !!alloc.reason;
 }
 return true;
 });

 const handleConfirm = () => {
 if (!isValid) return;
 const finalAllocations = Object.entries(allocations)
 .filter(([_, data]) => data.qty > 0)
 .map(([id, data]) => {
 const lot = lots.find(l => l.id === id)!;
 return {
 lotId: lot.id,
 lotNumber: lot.lotNumber,
 expiryDate: lot.expiryDate,
 allocatedQty: data.qty,
 overrideReason: isExpired(lot.expiryDate) ? data.reason : null
 };
 });
 onAllocate(finalAllocations);
 };

 return (
 <div className="flex flex-col gap-4">
 <div className="flex justify-between items-center bg-surface-container p-4 rounded-xl border">
 <h3 className="font-bold text-foreground">{t('fefo_allocator_title')}</h3>
 <div className={`font-mono font-bold ${totalAllocated !== requestedQty ? 'text-status-error' : 'text-operational-cyan'}`}>
 {t('allocated')}: <span dir="ltr">{totalAllocated} / {requestedQty}</span> {uomLabel}
 </div>
 </div>
 
 <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
 {sortedLots.map(lot => (
 <LotRow 
 key={lot.id}
 lot={lot}
 allocatedQty={allocations[lot.id]?.qty || 0}
 onQtyChange={(qty) => setAllocations(prev => ({ ...prev, [lot.id]: { ...prev[lot.id], qty } }))}
 isExpired={isExpired(lot.expiryDate)}
 isNearExpiry={isNearExpiry(lot.expiryDate)}
 userRole={userRole}
 onExpiredOverride={(reason) => setAllocations(prev => ({ ...prev, [lot.id]: { ...prev[lot.id], reason } }))}
 />
 ))}
 </div>
 
 <div className="flex justify-end gap-2 mt-4">
 <button onClick={onClose} className="px-4 py-2 bg-surface-container-high text-foreground rounded-xl font-medium hover:bg-surface-container-highest transition-colors">{tc('cancel')}</button>
 <button 
 onClick={handleConfirm}
 disabled={!isValid}
 className="px-6 py-2.5 bg-operational-cyan text-primary-foreground rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-[0.98]"
 >
 {t('confirm_allocation')}
 </button>
 </div>
 </div>
 );
}

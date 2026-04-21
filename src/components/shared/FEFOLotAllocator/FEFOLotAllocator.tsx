'use client';
import { useState, useEffect } from 'react';
import type { Lot } from '@/types/master-data';
import type { LotAllocation } from '@/types/documents';
import type { UserRole } from '@/providers/AuthProvider';
import { sortLotsByFEFO, isExpired, isNearExpiry } from '@/utils/fefo';
import { LotRow } from './LotRow';

interface FEFOLotAllocatorProps {
  lots: Lot[];
  requestedQty: number;
  uomLabel: string;
  userRole: UserRole;
  onAllocate: (allocations: LotAllocation[]) => void;
  onClose: () => void;
}

export function FEFOLotAllocator({ lots, requestedQty, uomLabel, userRole, onAllocate, onClose }: FEFOLotAllocatorProps) {
  const [allocations, setAllocations] = useState<Record<string, { qty: number, reason: string }>>({});
  const [sortedLots, setSortedLots] = useState<Lot[]>([]);

  useEffect(() => {
    const sorted = sortLotsByFEFO(lots);
    setSortedLots(sorted);
    
    const initialAllocations: Record<string, { qty: number, reason: string }> = {};
    let remaining = requestedQty;
    
    for (const lot of sorted) {
      if (remaining <= 0) break;
      if (isExpired(lot.expiry_date) && !['ADMIN', 'INV_MGR'].includes(userRole)) {
        continue;
      }
      
      const toAllocate = Math.min(remaining, lot.qty_available);
      if (toAllocate > 0) {
        initialAllocations[lot.id] = { qty: toAllocate, reason: '' };
        remaining -= toAllocate;
      }
    }
    
    setAllocations(initialAllocations);
  }, [lots, requestedQty, userRole]);

  const totalAllocated = Object.values(allocations).reduce((sum, current) => sum + (current.qty || 0), 0);
  
  const isValid = totalAllocated === requestedQty && sortedLots.every(lot => {
    const alloc = allocations[lot.id];
    if (alloc && alloc.qty > 0 && isExpired(lot.expiry_date)) {
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
          lot_id: lot.id,
          lot_number: lot.lot_number,
          expiry_date: lot.expiry_date,
          allocated_qty: data.qty,
          override_reason: isExpired(lot.expiry_date) ? data.reason : null
        };
      });
    onAllocate(finalAllocations);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-surface-2 p-4 rounded border border-surface-3">
        <h3 className="font-bold text-on-surface">Allocate Lots</h3>
        <div className={`font-mono font-bold ${totalAllocated !== requestedQty ? 'text-neon-red' : 'text-neon-cyan'}`}>
          Allocated: <span dir="ltr">{totalAllocated} / {requestedQty}</span> {uomLabel}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {sortedLots.map(lot => (
          <LotRow 
            key={lot.id}
            lot={lot}
            allocatedQty={allocations[lot.id]?.qty || 0}
            onQtyChange={(qty) => setAllocations(prev => ({ ...prev, [lot.id]: { ...prev[lot.id], qty } }))}
            isExpired={isExpired(lot.expiry_date)}
            isNearExpiry={isNearExpiry(lot.expiry_date)}
            userRole={userRole}
            onExpiredOverride={(reason) => setAllocations(prev => ({ ...prev, [lot.id]: { ...prev[lot.id], reason } }))}
          />
        ))}
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 bg-surface-3 text-on-surface rounded font-medium hover:bg-surface-4 transition-colors">Cancel</button>
        <button 
          onClick={handleConfirm}
          disabled={!isValid}
          className="px-4 py-2 bg-neon-cyan text-surface-0 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neon-cyan/80 transition-colors"
        >
          Confirm Allocation
        </button>
      </div>
    </div>
  );
}

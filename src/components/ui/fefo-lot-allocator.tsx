"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, PackageSearch, Zap, Calendar, ArrowRight, ShieldAlert, BadgeCheck } from "lucide-react";
import { IssueLot } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";

// Mock available lots per item — sorted by expiry ASC (FEFO rule)
const MOCK_AVAILABLE_LOTS: Record<string, (IssueLot & { availableQty: number })[]> = {
  'item-oil':    [{ lotNumber: 'LOT-O01', expiryDate: '2024-11-01', allocatedQuantity: 0, availableQty: 20, isExpired: true },
                  { lotNumber: 'LOT-O02', expiryDate: '2025-08-01', allocatedQuantity: 0, availableQty: 50 }],
  'item-salt':   [{ lotNumber: 'LOT-S01', expiryDate: '2025-06-01', allocatedQuantity: 0, availableQty: 100 }],
  'item-tomato': [{ lotNumber: 'LOT-T01', expiryDate: '2024-12-31', allocatedQuantity: 0, availableQty: 15 }],
  'item-cheese': [{ lotNumber: 'LOT-C01', expiryDate: '2023-01-01', allocatedQuantity: 0, availableQty: 5,  isExpired: true },
                  { lotNumber: 'LOT-C02', expiryDate: '2025-09-15', allocatedQuantity: 0, availableQty: 30 }],
};

interface FEFOLotAllocatorProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  requestedQty: number;
  onAllocate: (lots: IssueLot[]) => void;
}

export function FEFOLotAllocator({ isOpen, onClose, itemId, requestedQty, onAllocate }: FEFOLotAllocatorProps) {
  const availableLots = MOCK_AVAILABLE_LOTS[itemId] ?? [];
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const { now, nearExpiryThreshold } = React.useMemo(() => {
    const n = new Date();
    const t = new Date(n.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { now: n, nearExpiryThreshold: t };
  }, [isOpen]);

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = requestedQty - totalAllocated;
  const isComplete = Math.abs(remaining) < 0.001;
  const isOver = remaining < -0.001;

  const handleQtyChange = (lotNumber: string, value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setAllocations((prev) => ({ ...prev, [lotNumber]: num }));
  };

  const handleAutoAllocate = () => {
    let left = requestedQty;
    const auto: Record<string, number> = {};
    // FEFO: iterate sorted by expiry ASC (earliest first)
    for (const lot of availableLots) {
      if (lot.isExpired) continue; // Skip expired lots in auto-allocation
      if (left <= 0) break;
      const take = Math.min(lot.availableQty, left);
      auto[lot.lotNumber] = take;
      left -= take;
    }
    setAllocations(auto);
  };

  const handleConfirm = () => {
    const result: IssueLot[] = availableLots
      .filter((l) => (allocations[l.lotNumber] ?? 0) > 0)
      .map((l) => ({
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate,
        allocatedQuantity: allocations[l.lotNumber] ?? 0,
        isExpired: l.isExpired,
      }));
    onAllocate(result);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-surface-container-lowest border-none p-0 overflow-hidden rounded-3xl">
        <div className="bg-muted/10 p-8 border-b border-border-surface">
          <DialogHeader>
             <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan border border-operational-cyan/20">
                   <PackageSearch className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                      FEFO Lot Allocation
                   </DialogTitle>
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mt-0.5">
                       Fulfillment Protocol for <span className="text-operational-cyan font-mono">{itemId}</span>
                    </p>
                </div>
                <Badge className="ms-auto bg-muted border-none text-[10px] font-black uppercase tracking-widest px-3 h-8 rounded-lg">
                   SAR-882 System
                </Badge>
             </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          {/* Allocation Progress Bar */}
          <div className="bg-muted/5 p-6 rounded-3xl">
             <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Required Commitment</span>
                   <span className="text-2xl font-black tabular-nums">{requestedQty} <span className="text-xs text-muted-foreground/30">Units</span></span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Allocated Status</span>
                    <div className="flex items-center gap-2">
                       <span className={`text-2xl font-black tabular-nums ${isComplete ? 'text-status-success' : isOver ? 'text-status-error' : 'text-status-warning'}`}>
                          {totalAllocated}
                       </span>
                       {isComplete ? <BadgeCheck className="w-5 h-5 text-status-success" /> : null}
                    </div>
                </div>
             </div>
             
             <div className="h-3 bg-muted/20 rounded-full overflow-hidden border border-black/5 p-0.5">
                  <div 
                     className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-status-success' : isOver ? 'bg-status-error' : 'bg-primary animate-pulse'}`}
                    style={{ width: `${Math.min(100, (totalAllocated / requestedQty) * 100)}%` }}
                 />
             </div>
             
             <div className="flex items-center justify-between mt-4">
                 <p className="text-[10px] font-bold text-muted-foreground/40 italic">
                    {isComplete ? "Allocation parameters satisfied." : isOver ? "Warning: Over-allocation detected." : "Awaiting full allocation sequence..."}
                 </p>
                 <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleAutoAllocate} 
                    className="h-9 px-4 border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                 >
                    <Zap className="w-3 h-3 me-2" />
                    FEFO Smart Allocate
                 </Button>
             </div>
          </div>

          {/* Lot Selection List */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 px-2 flex items-center gap-2">
               <Calendar className="w-3 h-3" />
               Available Batches (Sorted by Expiry)
            </h4>
            
            {availableLots.length === 0 ? (
              <div className="py-12 text-center bg-muted/5 rounded-3xl border border-dashed border-border-surface">
                <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground/10 mb-4" />
                <p className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest">No available lots in inventory</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pe-2 custom-scrollbar">
                {availableLots.map((lot) => {
                  const lotExpiryDate = new Date(lot.expiryDate);
                  const isExpired = lot.isExpired || lotExpiryDate < now;
                  const isNearExpiry = !isExpired && lotExpiryDate < nearExpiryThreshold;
                  
                  return (
                    <div
                      key={lot.lotNumber}
                       className={`p-5 rounded-2xl border transition-all duration-300 group ${
                        isExpired
                          ? 'bg-status-error/5 border-status-error/20 opacity-60'
                          : isNearExpiry
                          ? 'bg-status-warning/5 border-status-warning/20 hover:bg-status-warning/10'
                          : 'bg-surface-container-low border-border-surface hover:border-operational-cyan/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-foreground tracking-tight">{lot.lotNumber}</span>
                            {isExpired ? (
                               <Badge variant="destructive" className="h-5 px-2 rounded-md text-[8px] font-black uppercase tracking-widest bg-status-error/10 text-status-error border-none">
                                <ShieldAlert className="w-2.5 h-2.5 me-1" />
                                Protocol Violation (Expired)
                              </Badge>
                            ) : isNearExpiry ? (
                               <Badge className="h-5 px-2 rounded-md text-[8px] font-black uppercase tracking-widest bg-status-warning/10 text-status-warning border-none">
                                 Urgent Rotation
                               </Badge>
                            ) : (
                                <Badge className="h-5 px-2 rounded-md text-[8px] font-black uppercase tracking-widest bg-status-success/10 text-status-success border-none">
                                  Optimal Batch
                                </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter" dir="ltr">
                            <span className="flex items-center gap-1.5">
                               <Calendar className="w-3 h-3" />
                               Exp: <span className={isExpired ? "text-status-error" : "text-foreground/60"}>{lot.expiryDate}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-muted/20" />
                            <span>In Stock: <span className="text-foreground/60">{lot.availableQty}</span></span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Issuing Qty</Label>
                          <div className="relative">
                             <Input
                                type="number"
                                min="0"
                                max={lot.availableQty}
                                step="0.01"
                                 className="w-32 h-10 bg-muted/50 border-none text-center font-mono font-black text-[11px] rounded-lg transition-all focus:ring-2 focus:ring-operational-cyan/20"
                                dir="ltr"
                                disabled={isExpired}
                                value={allocations[lot.lotNumber] ?? ''}
                                onChange={(e) => handleQtyChange(lot.lotNumber, e.target.value)}
                             />
                             <div className="absolute end-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/20 uppercase tracking-widest pointer-events-none">UNIT</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-muted/10 border-t border-border-surface flex flex-col md:flex-row items-center justify-between gap-4">
           <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground h-12 px-8 rounded-xl"
          >
            Cancel Allocation
          </Button>
          
          <Button
            className="h-12 px-10 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all disabled:opacity-30 disabled:grayscale active:scale-95"
            disabled={!isComplete}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="me-2 w-3.5 h-3.5" />
            Synchronize Fulfillment
            <ArrowRight className="ms-2 w-3.5 h-3.5 opacity-40" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

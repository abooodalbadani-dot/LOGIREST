"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, PackageSearch } from "lucide-react";
import { IssueLot } from "@/features/operations/types";

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

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = requestedQty - totalAllocated;
  const isComplete = totalAllocated === requestedQty;

  const handleQtyChange = (lotNumber: string, value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setAllocations((prev) => ({ ...prev, [lotNumber]: num }));
  };

  const handleAutoAllocate = () => {
    let left = requestedQty;
    const auto: Record<string, number> = {};
    // FEFO: iterate sorted by expiry ASC (earliest first)
    for (const lot of availableLots) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-brand-primary" />
            Allocate Lots — {itemId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Required: <span className="font-bold text-text-primary" dir="ltr">{requestedQty}</span></span>
            <span className={`font-bold ${isComplete ? 'text-brand-primary' : remaining < 0 ? 'text-neon-error' : 'text-neon-amber'}`} dir="ltr">
              {isComplete ? '✓ Allocation complete' : `${remaining > 0 ? remaining : Math.abs(remaining)} ${remaining > 0 ? 'remaining' : 'over-allocated'}`}
            </span>
            <Button size="sm" variant="outline" onClick={handleAutoAllocate} className="text-xs">
              Auto-Allocate (FEFO)
            </Button>
          </div>

          {availableLots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <PackageSearch className="w-10 h-10 mx-auto opacity-20 mb-2" />
              <p>No available lots for this item.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {availableLots.map((lot) => {
                const isExpired = lot.isExpired || new Date(lot.expiryDate) < new Date();
                return (
                  <div
                    key={lot.lotNumber}
                    className={`p-3 rounded-lg border flex gap-4 items-center ${
                      isExpired
                        ? 'bg-neon-error/5 border-neon-error/30'
                        : 'bg-surface-2/50 border-surface-2'
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{lot.lotNumber}</span>
                        {isExpired && (
                          <span className="flex items-center gap-1 text-xs text-neon-error font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            EXPIRED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-tertiary" dir="ltr">
                        Exp: {lot.expiryDate} · Available: {lot.availableQty}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Label className="text-xs text-text-tertiary">Allocate</Label>
                      <Input
                        type="number"
                        min="0"
                        max={lot.availableQty}
                        step="0.01"
                        className="w-24 text-center"
                        dir="ltr"
                        value={allocations[lot.lotNumber] ?? ''}
                        onChange={(e) => handleQtyChange(lot.lotNumber, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            disabled={!isComplete}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="mr-2 w-4 h-4" />
            Confirm Allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

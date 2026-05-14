"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, PackageSearch, Zap, Calendar, ArrowRight, ShieldAlert, BadgeCheck } from "lucide-react";
import { IssueLot } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

// Mock available lots per item — sorted by expiry ASC (FEFO rule)
const MOCK_AVAILABLE_LOTS: Record<string, (IssueLot & { availableQty: number })[]> = {
  'item-oil': [
    { lot_number: 'LOT-O01', expiry_date: '2024-11-01', allocated_qty: 0, availableQty: 20, is_expired: true },
    { lot_number: 'LOT-O02', expiry_date: '2025-08-01', allocated_qty: 0, availableQty: 50 }
  ],
  'item-salt': [
    { lot_number: 'LOT-S01', expiry_date: '2025-06-01', allocated_qty: 0, availableQty: 100 }
  ],
  'item-tomato': [
    { lot_number: 'LOT-T01', expiry_date: '2024-12-31', allocated_qty: 0, availableQty: 15 }
  ],
  'item-cheese': [
    { lot_number: 'LOT-C01', expiry_date: '2023-01-01', allocated_qty: 0, availableQty: 5, is_expired: true },
    { lot_number: 'LOT-C02', expiry_date: '2025-09-15', allocated_qty: 0, availableQty: 30 }
  ],
};

interface FEFOLotAllocatorProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  requestedQty: number;
  onAllocate: (lots: IssueLot[]) => void;
}

export function FEFOLotAllocator({ isOpen, onClose, itemId, requestedQty, onAllocate }: FEFOLotAllocatorProps) {
  const t = useTranslations("common.fefo");
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

  const handleQtyChange = (lot_number: string, value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setAllocations((prev) => ({ ...prev, [lot_number]: num }));
  };

  const handleAutoAllocate = () => {
    let left = requestedQty;
    const auto: Record<string, number> = {};
    // FEFO: iterate sorted by expiry ASC (earliest first)
    for (const lot of availableLots) {
      if (lot.is_expired) continue; // Skip expired lots in auto-allocation
      if (left <= 0) break;
      const take = Math.min(lot.availableQty, left);
      auto[lot.lot_number] = take;
      left -= take;
    }
    setAllocations(auto);
  };

  const handleConfirm = () => {
    const result: IssueLot[] = availableLots
      .filter((l) => (allocations[l.lot_number] ?? 0) > 0)
      .map((l) => ({
        lot_number: l.lot_number,
        expiry_date: l.expiry_date,
        allocated_qty: allocations[l.lot_number] ?? 0,
        is_expired: l.is_expired,
      }));
    onAllocate(result);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-surface-container-lowest border-none p-0 overflow-hidden rounded-2xl">
        <div className="bg-muted/10 p-8 border-b">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan border border-operational-cyan/20">
                <PackageSearch className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-title-lg font-semibold text-foreground">
                  {t("title")}
                </DialogTitle>
                <p className="text-label-xs font-semibold text-muted-foreground/40 uppercase mt-0.5">
                  {t("protocol_for")} <span className="text-operational-cyan font-mono">{itemId}</span>
                </p>
              </div>
              <Badge className="ms-auto bg-muted border-none text-label-xs font-semibold uppercase px-3 h-8 rounded-lg">
                {t("system_id")}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          {/* Allocation Progress Bar */}
          <div className="bg-muted/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t("required_commitment")}</span>
                <span className="text-headline-lg font-semibold tabular-nums">{requestedQty} <span className="text-label-sm text-muted-foreground/30">{t("units")}</span></span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t("allocated_status")}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-headline-lg font-semibold tabular-nums ${isComplete ? 'text-status-success' : isOver ? 'text-status-error' : 'text-status-warning'}`}>
                    {totalAllocated}
                  </span>
                  {isComplete ? <BadgeCheck className="w-5 h-5 text-status-success" /> : null}
                </div>
              </div>
            </div>
            
            <div className="h-3 bg-muted/20 rounded-full overflow-hidden border p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-200 ${isComplete ? 'bg-status-success' : isOver ? 'bg-status-error' : 'bg-primary animate-pulse'}`}
                style={{ width: `${Math.min(100, (totalAllocated / requestedQty) * 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-label-xs font-bold text-muted-foreground/40 italic">
                {isComplete ? t("satisfied") : isOver ? t("over_allocated") : t("awaiting")}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAutoAllocate} 
                className="h-9 px-4 border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground rounded-xl text-label-xxs font-semibold uppercase transition-all"
              >
                <Zap className="w-3 h-3 me-2" />
                {t("smart_allocate")}
              </Button>
            </div>
          </div>

          {/* Lot Selection List */}
          <div className="space-y-4">
            <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/60 px-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {t("available_batches")}
            </h4>
            
            {availableLots.length === 0 ? (
              <div className="py-12 text-center bg-muted/5 rounded-2xl border border-dashed">
                <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground/10 mb-4" />
                <p className="text-label-xs font-bold text-muted-foreground/30 uppercase">{t("no_lots_available")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pe-2 custom-scrollbar">
                {availableLots.map((lot) => {
                  const lotExpiryDate = new Date(lot.expiry_date);
                  const isExpired = lot.is_expired || lotExpiryDate < now;
                  const isNearExpiry = !isExpired && lotExpiryDate < nearExpiryThreshold;
                  
                  return (
                    <div
                      key={lot.lot_number}
                      className={`p-5 rounded-2xl border transition-all duration-300 group ${ isExpired ? 'bg-status-error/5 border-status-error/20 opacity-60' : isNearExpiry ? 'bg-status-warning/5 border-status-warning/20 hover:bg-status-warning/10' : 'bg-surface-container-low hover:border-operational-cyan/30 hover:bg-muted/50' }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-body-md font-semibold text-foreground">{lot.lot_number}</span>
                            {isExpired ? (
                              <Badge variant="destructive" className="h-5 px-2 rounded-md text-label-xxs font-semibold uppercase bg-status-error/10 text-status-error border-none">
                                <ShieldAlert className="w-2.5 h-2.5 me-1" />
                                {t("expired_violation")}
                              </Badge>
                            ) : isNearExpiry ? (
                              <Badge className="h-5 px-2 rounded-md text-label-xxs font-semibold uppercase bg-status-warning/10 text-status-warning border-none">
                                {t("urgent_rotation")}
                              </Badge>
                            ) : (
                              <Badge className="h-5 px-2 rounded-md text-label-xxs font-semibold uppercase bg-status-success/10 text-status-success border-none">
                                {t("optimal_batch")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-label-xs font-bold text-muted-foreground/40 uppercase" dir="ltr">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {t("expiry_label")} <span className={isExpired ? "text-status-error" : "text-foreground/60"}>{lot.expiry_date}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-muted/20" />
                            <span>{t("in_stock")} <span className="text-foreground/60">{lot.availableQty}</span></span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5">
                          <Label className="text-label-xxs font-semibold uppercase text-muted-foreground/40">{t("issuing_qty")}</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max={lot.availableQty}
                              step="0.01"
                              className="w-32 h-10 text-center font-mono font-semibold text-label-xs"
                              dir="ltr"
                              disabled={isExpired}
                              value={allocations[lot.lot_number] ?? ''} onChange={(e) => handleQtyChange(lot.lot_number, e.target.value)}
                            />
                            <div className="absolute end-3 top-1/2 -translate-y-1/2 text-label-xxs font-semibold text-muted-foreground/20 uppercase pointer-events-none">{t("units")}</div>
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

        <div className="p-8 bg-muted/10 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-label-xs font-semibold uppercase text-muted-foreground/40 hover:text-foreground h-12 px-8 rounded-xl"
          >
            {t("cancel")}
          </Button>
          
          <Button
            className="h-12 px-10 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-semibold uppercase rounded-xl transition-all disabled:opacity-30 disabled:grayscale active:scale-95"
            disabled={!isComplete}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="me-2 w-3.5 h-3.5" />
            {t("sync_fulfillment")}
            <ArrowRight className="ms-2 w-3.5 h-3.5 opacity-40" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

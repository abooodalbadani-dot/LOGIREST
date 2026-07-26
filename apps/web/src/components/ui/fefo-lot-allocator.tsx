"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, PackageSearch, Zap, Calendar, ArrowRight, ShieldAlert, BadgeCheck } from "lucide-react";
import { IssueLot } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/utils/currency";

interface AvailableLot extends IssueLot {
 availableQty: number;
 isExpired?: boolean;
 status?: string;
}

interface FEFOLotAllocatorProps {
 isOpen: boolean;
 onClose: () => void;
 itemId: string;
 requestedQty: number;
 onAllocate: (lots: IssueLot[]) => void;
 lots?: AvailableLot[];
}

export function FEFOLotAllocator({ isOpen, onClose, itemId, requestedQty, onAllocate, lots }: FEFOLotAllocatorProps) {
 const t = useTranslations("common.fefo");
 const locale = useLocale();
 const availableLots = lots ?? [];
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
   if (lot.isExpired || lot.status === 'QUARANTINE') continue; // Skip expired or quarantined lots in auto-allocation
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
    allocatedQty: allocations[l.lotNumber] ?? 0,
    isExpired: l.isExpired,
   }));
  onAllocate(result);
  onClose();
 };

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent className="w-full inset-x-0 bottom-0 sm:bottom-auto mb-0 sm:mb-auto sm:max-w-2xl bg-white dark:bg-card border border-gray-200 dark:border-gray-800 shadow-2xl p-0 overflow-hidden rounded-t-2xl rounded-b-none sm:rounded-b-2xl">
    <div className="bg-muted/10 p-4 sm:p-8 border-b">
     <DialogHeader>
      <div className="flex items-center gap-3 sm:gap-4 mb-2">
       <div className="p-2 sm:p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan border border-operational-cyan/20 shrink-0">
        <PackageSearch className="w-5 h-5 sm:w-6 sm:h-6" />
       </div>
       <div className="min-w-0 flex-1">
        <DialogTitle className="text-base sm:text-title-lg font-semibold text-foreground truncate">
         {t("title")}
        </DialogTitle>
        <p className="text-[10px] sm:text-label-xs font-semibold text-muted-foreground/40 uppercase mt-0.5 truncate">
         {t("protocol_for")} <span className="text-operational-cyan font-mono">{itemId}</span>
        </p>
       </div>
       <Badge className="hidden sm:inline-flex ms-auto bg-muted border-none text-label-xs font-semibold uppercase px-3 h-8 rounded-lg shrink-0">
        {t("system_id")}
       </Badge>
      </div>
     </DialogHeader>
    </div>

    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
     {/* Allocation Progress Bar */}
     <div className="bg-muted/5 p-4 sm:p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
       <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] sm:text-label-xs font-semibold uppercase text-muted-foreground/40 truncate">{t("required_commitment")}</span>
        <span className="text-xl sm:text-headline-lg font-semibold tabular-nums">{requestedQty} <span className="text-[10px] sm:text-label-sm text-muted-foreground/30">{t("units")}</span></span>
       </div>
       <div className="flex flex-col items-end shrink-0">
        <span className="text-[10px] sm:text-label-xs font-semibold uppercase text-muted-foreground/40">{t("allocated_status")}</span>
        <div className="flex items-center gap-1 sm:gap-2">
         <span className={`text-xl sm:text-headline-lg font-semibold tabular-nums ${isComplete ? 'text-status-success' : isOver ? 'text-status-error' : 'text-status-warning'}`}>
          {totalAllocated}
         </span>
         {isComplete ? <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-status-success" /> : null}
        </div>
       </div>
      </div>
      
      <div className="h-2 sm:h-3 bg-muted/20 rounded-full overflow-hidden border p-0.5">
       <div 
        className={`h-full rounded-full transition-all duration-200 ${isComplete ? 'bg-status-success' : isOver ? 'bg-status-error' : 'bg-primary animate-pulse'}`}
        style={{ width: `${Math.min(100, (totalAllocated / requestedQty) * 100)}%` }}
       />
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
       <p className="text-[10px] sm:text-label-xs font-bold text-muted-foreground/40 italic">
        {isComplete ? t("satisfied") : isOver ? t("over_allocated") : t("awaiting")}
       </p>
       <Button 
        size="sm" 
        variant="outline" 
        onClick={handleAutoAllocate} 
        className="w-full sm:w-auto h-9 px-4 border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground rounded-xl text-[10px] sm:text-label-xxs font-semibold uppercase transition-all"
       >
        <Zap className="w-3 h-3 me-2" />
        {t("smart_allocate")}
       </Button>
      </div>
     </div>

     {/* Lot Selection List */}
     <div className="space-y-3 sm:space-y-4">
      <h4 className="text-[10px] sm:text-label-xs font-semibold uppercase text-muted-foreground/60 px-2 flex items-center gap-2">
       <Calendar className="w-3 h-3" />
       {t("available_batches")}
      </h4>
      
      {availableLots.length === 0 ? (
       <div className="py-12 text-center bg-muted/5 rounded-2xl border border-dashed">
        <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground/10 mb-4" />
        <p className="text-label-xs font-bold text-muted-foreground/30 uppercase">{t("no_lots_available")}</p>
       </div>
      ) : (
       <div className="grid grid-cols-1 gap-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pe-1 sm:pe-2 custom-scrollbar">
        {availableLots.map((lot) => {
         const lotExpiryDate = new Date(lot.expiryDate);
         const isExpiredFlag = lot.isExpired || lotExpiryDate < now;
         const isNearExpiry = !isExpiredFlag && lotExpiryDate < nearExpiryThreshold;
         const isQuarantined = lot.status === 'QUARANTINE';
         
         return (
          <div
           key={lot.lotNumber}
           className={`p-3 sm:p-5 rounded-2xl border transition-all duration-300 group ${ isQuarantined ? 'bg-status-warning/5 border-status-warning/30 opacity-70' : isExpiredFlag ? 'bg-status-error/5 border-status-error/20 opacity-60' : isNearExpiry ? 'bg-status-warning/5 border-status-warning/20 hover:bg-status-warning/10' : 'bg-card border border-border shadow-sm hover:border-operational-cyan/30 hover:bg-muted/50' }`}
          >
           <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex-1 space-y-1.5 sm:space-y-1 min-w-0">
             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-sm sm:text-body-md font-semibold text-foreground break-all">{lot.lotNumber}</span>
              {isQuarantined ? (
               <Badge className="h-5 px-2 rounded-md text-[9px] sm:text-label-xxs font-semibold uppercase bg-status-warning/20 text-status-warning border-status-warning/30 shrink-0">
                <ShieldAlert className="w-2.5 h-2.5 me-1" />
                QUARANTINED
               </Badge>
              ) : isExpiredFlag ? (
               <Badge variant="destructive" className="h-5 px-2 rounded-md text-[9px] sm:text-label-xxs font-semibold uppercase bg-status-error/10 text-status-error border-none shrink-0">
                <ShieldAlert className="w-2.5 h-2.5 me-1" />
                {t("expired_violation")}
               </Badge>
              ) : isNearExpiry ? (
               <Badge className="h-5 px-2 rounded-md text-[9px] sm:text-label-xxs font-semibold uppercase bg-status-warning/10 text-status-warning border-none shrink-0">
                {t("urgent_rotation")}
               </Badge>
              ) : (
               <Badge className="h-5 px-2 rounded-md text-[9px] sm:text-label-xxs font-semibold uppercase bg-status-success/10 text-status-success border-none shrink-0">
                {t("optimal_batch")}
               </Badge>
              )}
             </div>
             <div className="flex items-center gap-3 sm:gap-4 text-[9px] sm:text-label-xs font-bold text-muted-foreground/40 uppercase flex-wrap" dir="ltr">
              <span className="flex items-center gap-1 sm:gap-1.5 shrink-0">
               <Calendar className="w-3 h-3" />
               {t("expiry_label")} <span className={isExpiredFlag ? "text-status-error ms-1" : "text-foreground/60 ms-1"}>{lot.expiryDate ? formatDate(lot.expiryDate, locale as 'ar' | 'en') : 'N/A'}</span>
              </span>
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-muted/20 shrink-0" />
              <span className="shrink-0">{t("in_stock")} <span className="text-foreground/60 ms-1">{lot.availableQty}</span></span>
             </div>
            </div>
            
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/30">
             <Label className="text-[10px] sm:text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0">{t("issuing_qty")}</Label>
             <div className="relative w-28 sm:w-32 shrink-0">
              <Input
               type="number"
               min="0"
               max={lot.availableQty}
               step="0.01"
               className="w-full h-9 sm:h-10 text-center font-mono font-semibold text-xs sm:text-label-xs"
               dir="ltr"
               disabled={isExpiredFlag || isQuarantined}
               value={allocations[lot.lotNumber] ?? ''} onChange={(e) => handleQtyChange(lot.lotNumber, e.target.value)}
              />
              <div className="absolute end-2 sm:end-3 top-1/2 -translate-y-1/2 text-[9px] sm:text-label-xxs font-semibold text-muted-foreground/20 uppercase pointer-events-none">{t("units")}</div>
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

    <div className="p-4 sm:p-8 bg-muted/10 border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
     <Button 
      variant="ghost" 
      onClick={onClose}
      className="text-[10px] sm:text-label-xs font-semibold uppercase text-muted-foreground/40 hover:text-foreground h-10 sm:h-12 w-full sm:w-auto px-4 sm:px-8 rounded-xl shrink-0"
     >
      {t("cancel")}
     </Button>
     
     <Button
      className="h-10 sm:h-12 w-full sm:w-auto px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-label-xs font-semibold uppercase rounded-xl transition-all disabled:opacity-30 disabled:grayscale active:scale-95 shrink-0"
      disabled={!isComplete}
      onClick={handleConfirm}
     >
      <CheckCircle2 className="me-2 w-3.5 h-3.5" />
      <span className="truncate">{t("sync_fulfillment")}</span>
      <ArrowRight className="ms-2 w-3.5 h-3.5 opacity-40 shrink-0" />
     </Button>
    </div>
   </DialogContent>
  </Dialog>
 );
}

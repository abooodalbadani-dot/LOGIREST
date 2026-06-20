'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
 Lock, 
 Unlock, 
 RefreshCw, 
 Snowflake, 
 Warehouse as WarehouseIcon, 
 Tag, 
 Layers, 
 ArrowLeft,
 Loader2,
 AlertTriangle,
 Info,
 CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { z } from 'zod';
import { useCurrency } from '@/app/[locale]/providers/currency-provider';
import { formatCurrency } from '@/utils/currency';

const FrozenItemSchema = z.object({
 warehouseId: z.string(),
 itemId: z.string(),
 qtyOnHand: z.union([z.string(), z.number()]),
 qtyAllocated: z.union([z.string(), z.number()]),
 wac: z.union([z.string(), z.number()]),
 isFrozen: z.boolean(),
 updatedAt: z.string(),
 warehouse: z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
 }),
 item: z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
 }),
});

const FrozenItemsListSchema = z.array(FrozenItemSchema);

type FrozenItem = z.infer<typeof FrozenItemSchema>;

 export function FrozenItemsClient() {
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { playSound } = useAudioFeedback();
  const { currency } = useCurrency();

 const [isLoading, setIsLoading] = useState(true);
 const [isUnfreezingMap, setIsUnfreezingMap] = useState<Record<string, boolean>>({});
 const [data, setData] = useState<FrozenItem[]>([]);
 const [selectedItem, setSelectedItem] = useState<FrozenItem | null>(null);

 const fetchFrozenItems = async () => {
  setIsLoading(true);
  try {
   const res = await apiClient.get(
    '/admin/inventory/frozen',
    FrozenItemsListSchema
   );
   setData(res);
   if (res.length > 0 && !selectedItem) {
    setSelectedItem(res[0]);
   }
  } catch (err: unknown) {
   const message = err instanceof Error ? err.message : String(err);
   toast.error(message || 'Failed to fetch frozen inventory items');
  } finally {
   setIsLoading(false);
  }
 };

 useEffect(() => {
  fetchFrozenItems();
 }, []);

 const handleUnfreezeItem = async (warehouseId: string, itemId: string) => {
  const key = `${warehouseId}_${itemId}`;
  setIsUnfreezingMap(prev => ({ ...prev, [key]: true }));
  try {
   await apiClient.post(
    `/admin/inventory/${key}/unfreeze`,
    z.unknown(),
    {}
   );
   playSound('success');
   toast.success('Warehouse item successfully unfrozen and operational status restored.');
   
   // Update local state by removing unfrozen item
   setData(prev => prev.filter(item => !(item.warehouseId === warehouseId && item.itemId === itemId)));
   
   if (selectedItem?.warehouseId === warehouseId && selectedItem?.itemId === itemId) {
    setSelectedItem(null);
   }
   
   // Refresh list
   fetchFrozenItems();
  } catch (err: unknown) {
   playSound('error');
   const message = err instanceof Error ? err.message : String(err);
   toast.error(message || 'Failed to unfreeze item');
  } finally {
   setIsUnfreezingMap(prev => ({ ...prev, [key]: false }));
  }
 };

 return (
  <div className="min-w-0 gap-6 flex-1 space-y-8 flex mx-auto flex-col max-w-7xl w-full">
   {/* Premium Header */}
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 min-w-0">
    <div className="space-y-4">
     <Link 
      href="/admin"
      className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-operational-cyan transition-all"
     >
      <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
      Return to Admin
     </Link>
     <div className="space-y-1">
      <div className="flex items-center gap-3">
       <div className="p-2.5 bg-operational-cyan/10 rounded-2xl border border-operational-cyan/20 animate-pulse">
        <Snowflake className="w-6 h-6 text-operational-cyan animate-spin duration-10000" />
       </div>
       <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        Inventory Integrity Dashboard
       </h1>
      </div>
      <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
       Manage frozen inventory records. Frozen items are automatically locked during stocktake discrepancies to protect cost ledger consistency.
      </p>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
    {/* Left Side: Frozen Items List */}
    <div className="lg:col-span-7 space-y-6">
     <div className="p-6 rounded-[2rem] bg-card border border-border shadow-sm border border-white/5 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-highest/10 pb-4">
       <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
         Frozen Warehouse Stock Tiers
        </h3>
        <p className="text-xs text-muted-foreground">
         Total frozen items: <span className="font-bold text-operational-red">{data.length}</span>
        </p>
       </div>
       <Button
        variant="ghost"
        size="sm"
        onClick={fetchFrozenItems}
        disabled={isLoading}
        className="h-10 px-3 hover:bg-surface-container-high rounded-xl text-muted-foreground hover:text-foreground"
       >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
       </Button>
      </div>

      {isLoading ? (
       <div className="py-20 flex flex-col items-center justify-center space-y-4 min-w-0">
        <Loader2 className="w-8 h-8 animate-spin text-operational-cyan" />
        <p className="text-xs text-muted-foreground">Scanning warehouses for frozen assets...</p>
       </div>
      ) : data.length === 0 ? (
       <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 min-w-0">
        <div className="p-4 bg-status-success/10 rounded-full border border-status-success/20">
         <CheckCircle2 className="w-10 h-10 text-status-success" />
        </div>
        <div className="space-y-1">
         <p className="text-sm font-bold text-foreground">Perfect Integrity!</p>
         <p className="text-xs text-muted-foreground max-w-xs">
          All store inventory levels are unlocked and operational.
         </p>
        </div>
       </div>
      ) : (
       <div className="space-y-3">
        {data.map((item) => {
         const key = `${item.warehouseId}_${item.itemId}`;
         return (
          <motion.div
           key={key}
           layoutId={`item-card-${key}`}
           onClick={() => setSelectedItem(item)}
           className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
            selectedItem?.warehouseId === item.warehouseId && selectedItem?.itemId === item.itemId
             ? 'bg-operational-cyan/5 border-operational-cyan/40 shadow-sm'
             : 'bg-card border border-border shadow-sm border-outline-low hover:border-operational-cyan/20'
           }`}
          >
           <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
             <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-error/10 text-status-error border border-status-error/20 uppercase font-bold tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Frozen
             </span>
             <span className="text-[10px] text-muted-foreground/60 font-mono">
              SKU: {item.item.sku}
             </span>
            </div>
            <h4 className="text-xs font-bold text-foreground truncate max-w-sm">
             {item.item.name}
            </h4>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
             <span className="inline-flex items-center gap-1">
              <WarehouseIcon className="w-3 h-3 text-operational-cyan" />
              {item.warehouse.code} — {item.warehouse.name}
             </span>
             <span>•</span>
             <span>
              On Hand: <span className="font-bold text-foreground">{Number(item.qtyOnHand)}</span>
             </span>
            </div>
           </div>

           <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
             size="sm"
             variant="outline"
             onClick={(e) => {
              e.stopPropagation();
              handleUnfreezeItem(item.warehouseId, item.itemId);
             }}
             disabled={isUnfreezingMap[key]}
             className="h-10 px-4 border-outline-low hover:bg-surface-container-high transition-all text-xs font-bold gap-2 rounded-xl group"
            >
             {isUnfreezingMap[key] ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-operational-cyan" />
             ) : (
              <Unlock className="w-3.5 h-3.5 text-operational-cyan group-hover:scale-110 transition-transform" />
             )}
             Unfreeze
            </Button>
           </div>
          </motion.div>
         );
        })}
       </div>
      )}
     </div>
    </div>

    {/* Right Side: Detailed Bento Card */}
    <div className="lg:col-span-5">
     <AnimatePresence mode="wait">
      {selectedItem ? (
       <motion.div
        key={`${selectedItem.warehouseId}_${selectedItem.itemId}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="p-6 md:p-8 rounded-[2.5rem] bg-card border border-border shadow-sm border border-white/5 space-y-8 shadow-sm h-full flex flex-col justify-between min-w-0"
       >
        <div className="space-y-6">
         <div className="flex items-center gap-3 border-b border-surface-highest/10 pb-4">
          <div className="p-2 bg-operational-cyan/10 rounded-xl">
           <Lock className="w-5 h-5 text-operational-cyan" />
          </div>
          <div>
           <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Asset Integrity Details
           </h3>
           <p className="text-[10px] text-muted-foreground/60 uppercase mt-0.5">
            Stock Lock Overview
           </p>
          </div>
         </div>

         <div className="space-y-4">
          {/* Item SKU & Name */}
          <div className="p-4 bg-surface-container-highest/20 rounded-2xl border border-surface-highest/5 space-y-1">
           <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-operational-cyan" />
            Inventory Item
           </span>
           <p className="text-xs font-bold text-foreground">
            {selectedItem.item.name}
           </p>
           <p className="text-[10px] font-mono text-muted-foreground">
            SKU: {selectedItem.item.sku}
           </p>
          </div>

          {/* Warehouse */}
          <div className="p-4 bg-surface-container-highest/20 rounded-2xl border border-surface-highest/5 space-y-1">
           <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider flex items-center gap-1">
            <WarehouseIcon className="w-3.5 h-3.5 text-operational-cyan" />
            Warehouse Scope
           </span>
           <p className="text-xs font-bold text-foreground">
            {selectedItem.warehouse.name}
           </p>
           <p className="text-[10px] font-mono text-muted-foreground">
            Code: {selectedItem.warehouse.code}
           </p>
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-surface-container-highest/20 rounded-2xl border border-surface-highest/5">
           <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider flex items-center gap-1">
             <Layers className="w-3 h-3 text-operational-cyan" />
             On Hand Qty
            </span>
            <p className="text-sm font-bold text-foreground">
             {Number(selectedItem.qtyOnHand)}
            </p>
           </div>
           <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
             Allocated Qty
            </span>
            <p className="text-sm font-bold text-foreground text-muted-foreground/60">
             {Number(selectedItem.qtyAllocated)}
            </p>
           </div>
          </div>

          {/* Costing */}
          <div className="p-4 bg-surface-container-highest/20 rounded-2xl border border-surface-highest/5 space-y-1">
           <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
            Weighted Average Cost (WAC)
           </span>
           <p className="text-xs font-bold text-foreground" dir="ltr">
            {formatCurrency(Number(selectedItem.wac), currency, locale as 'ar' | 'en')}
           </p>
          </div>

          {/* Operational Alert Warning */}
          <div className="p-4 bg-status-error/5 rounded-2xl border border-status-error/10 space-y-2">
           <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-error" />
            <span className="text-[10px] text-status-error uppercase font-bold tracking-wider">
             Operational Lock Warning
            </span>
           </div>
           <p className="text-xs text-muted-foreground leading-relaxed">
            Unfreezing an asset immediately permits procurement receipting, stock issues, and inventory adjustments. Be sure to double-check that any physical stock reconciliation for {selectedItem.item.name} is complete before committing this override.
           </p>
          </div>
         </div>
        </div>

        <div className="pt-6 border-t border-surface-highest/10 flex gap-4">
         <Button
          onClick={() => handleUnfreezeItem(selectedItem.warehouseId, selectedItem.itemId)}
          disabled={isUnfreezingMap[`${selectedItem.warehouseId}_${selectedItem.itemId}`]}
          className="flex-1 h-14 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-bold uppercase text-[10px] tracking-widest gap-3 rounded-2xl shadow-sm"
         >
          {isUnfreezingMap[`${selectedItem.warehouseId}_${selectedItem.itemId}`] ? (
           <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
           <Unlock className="w-4 h-4" />
          )}
          Commit Stock Unfreeze
         </Button>
        </div>
       </motion.div>
      ) : (
       <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-sm border border-white/5 shadow-sm h-full flex flex-col justify-center items-center text-center py-40 min-w-0">
        <Info className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-bold text-foreground">No Item Selected</p>
        <p className="text-xs text-muted-foreground max-w-xs mt-1">
         Click on any frozen warehouse asset row in the list to inspect costing integrity details.
        </p>
       </div>
      )}
     </AnimatePresence>
    </div>
   </div>
  </div>
 );
}

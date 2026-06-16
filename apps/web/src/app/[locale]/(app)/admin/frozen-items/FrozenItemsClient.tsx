'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
 Layers, 
 RefreshCw, 
 AlertTriangle, 
 Unlock, 
 ArrowLeft,
 Loader2,
 Database,
 CheckCircle2,
 Lock,
 Warehouse,
 FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { z } from 'zod';

const FrozenItemSchema = z.object({
 warehouseId: z.string(),
 itemId: z.string(),
 qtyOnHand: z.union([z.number(), z.string()]),
 qtyAllocated: z.union([z.number(), z.string()]),
 isFrozen: z.boolean(),
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

const FrozenItemsResponseSchema = z.array(FrozenItemSchema);

type FrozenItem = z.infer<typeof FrozenItemSchema>;

export function FrozenItemsClient() {
 const { playSound } = useAudioFeedback();

 const [isLoading, setIsLoading] = useState(true);
 const [isUnfreezingMap, setIsUnfreezingMap] = useState<Record<string, boolean>>({});
 const [data, setData] = useState<FrozenItem[]>([]);

 const fetchFrozenItems = async () => {
  setIsLoading(true);
  try {
   const res = await apiClient.get(
    '/admin/inventory/frozen',
    FrozenItemsResponseSchema
   );
   setData(res);
  } catch (err: unknown) {
   const message = err instanceof Error ? err.message : String(err);
   toast.error(message || 'Failed to fetch frozen items');
  } finally {
   setIsLoading(false);
  }
 };

 useEffect(() => {
  fetchFrozenItems();
 }, []);

 const handleUnfreezeItem = async (warehouseId: string, itemId: string, sku: string) => {
  const compositeId = `${warehouseId}_${itemId}`;
  setIsUnfreezingMap(prev => ({ ...prev, [compositeId]: true }));
  try {
   await apiClient.post(
    `/admin/inventory/${compositeId}/unfreeze`,
    z.unknown(),
    {}
   );
   playSound('success');
   toast.success(`Successfully unfrozen stock item ${sku}.`);
   
   // Update local state by removing unfrozen item
   setData(prev => prev.filter(item => !(item.warehouseId === warehouseId && item.itemId === itemId)));
  } catch (err: unknown) {
   playSound('error');
   const message = err instanceof Error ? err.message : String(err);
   toast.error(message || 'Failed to unfreeze item');
  } finally {
   setIsUnfreezingMap(prev => ({ ...prev, [compositeId]: false }));
  }
 };

 return (
  <div className="md:p-8 min-w-0 gap-6 flex-1 space-y-8 flex p-4 mx-auto flex-col max-w-7xl w-full">
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
       <div className="p-2.5 bg-operational-amber/10 rounded-2xl border border-operational-amber/20 animate-pulse">
        <Lock className="w-6 h-6 text-operational-amber" />
       </div>
       <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground animate-fade-in" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        Frozen Inventory Management
       </h1>
      </div>
      <p className="text-sm text-muted-foreground/80 max-w-2xl mt-2" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
       Review inventory stock locked automatically due to reconciliation count discrepancies, and restore standard transaction privileges.
      </p>
     </div>
    </div>
   </div>

   {/* Warnings & Notes Banner */}
   <div className="p-5 bg-operational-amber/5 border border-operational-amber/20 rounded-[2rem] flex flex-col md:flex-row gap-4 items-start md:items-center min-w-0">
    <div className="p-3 bg-operational-amber/10 rounded-2xl text-operational-amber">
     <AlertTriangle className="w-6 h-6" />
    </div>
    <div className="space-y-1 flex-1">
     <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
      Automated Discrepancy Lock Protocol
     </h4>
     <p className="text-xs text-muted-foreground leading-relaxed">
      When the reconciliation job detects differences between your physical count and system balance, affected items are frozen to prevent ghost stock calculations. Please perform a physical audit before unfreezing.
     </p>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-8" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
    <div className="p-6 rounded-[2rem] bg-card border border-border shadow-sm border border-white/5 space-y-6 shadow-sm">
     <div className="flex items-center justify-between border-b border-surface-highest/10 pb-4">
      <div className="space-y-1">
       <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
        Currently Frozen Items
       </h3>
       <p className="text-xs text-muted-foreground">
        Total locked assets: <span className="font-bold text-operational-amber">{data.length}</span>
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
       <p className="text-xs text-muted-foreground">Retrieving frozen database logs...</p>
      </div>
     ) : data.length === 0 ? (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 min-w-0">
       <div className="p-4 bg-status-success/10 rounded-full border border-status-success/20">
        <CheckCircle2 className="w-10 h-10 text-status-success" />
       </div>
       <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">Zero Frozen Items</p>
        <p className="text-xs text-muted-foreground max-w-xs">
         Reconciliation balances are fully aligned. No frozen items are currently registered.
        </p>
       </div>
      </div>
     ) : (
       <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-start border-collapse text-sm whitespace-nowrap">
         <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
          <tr>
           <th className="px-6 py-4 font-medium text-start whitespace-nowrap">Warehouse</th>
           <th className="px-6 py-4 font-medium text-start whitespace-nowrap">SKU / Item</th>
           <th className="px-6 py-4 font-medium text-end whitespace-nowrap">On Hand</th>
           <th className="px-6 py-4 font-medium text-end whitespace-nowrap">Allocated</th>
           <th className="px-6 py-4 font-medium text-end whitespace-nowrap">Action</th>
          </tr>
         </thead>
         <tbody className="bg-card divide-y divide-border">
          <AnimatePresence>
           {data.map((item) => {
            const compositeId = `${item.warehouseId}_${item.itemId}`;
            return (
             <motion.tr
              key={compositeId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors group text-sm"
             >
              <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
               <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-muted-foreground/60" />
                <div>
                 <p className="font-bold text-foreground">{item.warehouse.name}</p>
                 <p className="text-[10px] text-muted-foreground/60 uppercase">{item.warehouse.code}</p>
                </div>
               </div>
              </td>
              <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
               <div>
                <p className="font-bold text-foreground">{item.item.name}</p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/20 font-bold tracking-wider">
                 {item.item.sku}
                </span>
               </div>
              </td>
              <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap text-end font-mono font-bold">
               {Number(item.qtyOnHand).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap text-end font-mono">
               {Number(item.qtyAllocated).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap text-end">
               <Button
                size="sm"
                variant="outline"
                onClick={() => handleUnfreezeItem(item.warehouseId, item.itemId, item.item.sku)}
                disabled={isUnfreezingMap[compositeId]}
                className="h-10 px-4 border-outline-low hover:bg-surface-container-high transition-all text-xs font-bold gap-2 rounded-xl group"
               >
                {isUnfreezingMap[compositeId] ? (
                 <Loader2 className="w-3.5 h-3.5 animate-spin text-operational-cyan" />
                ) : (
                 <Unlock className="w-3.5 h-3.5 text-operational-cyan group-hover:scale-110 transition-transform" />
                )}
                Unfreeze Item
               </Button>
              </td>
             </motion.tr>
            );
           })}
          </AnimatePresence>
         </tbody>
        </table>
       </div>
      )}
    </div>
   </div>
  </div>
 );
}

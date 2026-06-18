'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useItems } from '@/features/items/hooks/useItems';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { useVarianceReasons } from '@/features/operations/api/useVarianceReasons';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { FormFooter } from '@/components/layouts/FormLayout';
import { toast } from 'sonner';
import { audioAlerts } from '@/utils/audio';
import { Info, ArrowUp, ArrowDown, Warehouse, PackagePlus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useAbortController } from '@/hooks/useAbortController';
import { type Item } from '@/features/items/types';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

import { CreateCustomItemDialog } from '@/components/shared/CreateCustomItemDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function CreateLotDialog({ isOpen, onClose, onSave, defaultItemName }: { isOpen: boolean, onClose: () => void, onSave: (lotNumber: string, expiryDate?: string) => void, defaultItemName: string }) {
 const t = useTranslations('operations.adjustment');
 const tCommon = useTranslations('common');
 const [lotNumber, setLotNumber] = useState('');
 const [expiryDate, setExpiryDate] = useState(new Date().toISOString().split('T')[0]);

 const handleSave = () => {
  if (!lotNumber) {
   toast.error(tCommon('required_fields_missing') || "Lot number is required");
   return;
  }
  onSave(lotNumber, expiryDate || undefined);
  setLotNumber('');
  setExpiryDate('');
  onClose();
 };

 return (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
   <DialogContent className="sm:max-w-[425px] bg-card border border-border shadow-sm border-white/10 text-foreground">
    <DialogHeader>
     <DialogTitle className="text-title-md font-semibold text-operational-cyan uppercase">{t('create_lot') || 'Create New Lot'}</DialogTitle>
     <p className="text-label-sm text-muted-foreground/80">{defaultItemName}</p>
    </DialogHeader>
    <div className="grid gap-6 py-4">
     <div className="space-y-2">
      <Label htmlFor="lotNumber" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tCommon('lot_number') || 'Lot Number'} *</Label>
      <Input id="lotNumber" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="bg-surface-container-highest/40 border-white/10" placeholder="LOT-1234" />
     </div>
     <div className="space-y-2">
      <Label htmlFor="expiryDate" className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tCommon('expiry_date') || 'Expiry Date'}</Label>
      <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-surface-container-highest/40 border-white/10" />
     </div>
    </div>
    <DialogFooter>
     <Button variant="ghost" onClick={onClose} className="text-label-sm uppercase font-semibold text-muted-foreground hover:text-foreground">{tCommon('cancel')}</Button>
     <Button onClick={handleSave} className="bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-sm uppercase font-bold px-6">{tCommon('save')}</Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}

interface NewAdjustmentLine extends LineItem {
 itemId: string;
 direction: 'INCREASE' | 'DECREASE';
 lotNumber?: string;
}

interface ItemOption {
 id: string;
 code: string;
 barcode: string;
 name: string;
 nameEn?: string;
 nameAr?: string;
 primaryUom: { id: string; code: string };
}

export function AdjustmentCreateClient({ locale }: { locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.adjustment');
 const tCommon = useTranslations('common');
 const abortController = useAbortController();
 const searchParams = useSearchParams();

 const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
 const { data: itemsData, isLoading: isLoadingItems } = useItems(); const items = itemsData?.data || [];
 const { data: uomsResult } = useUoMs();
 const { data: varianceReasonsData, isLoading: isLoadingReasons } = useVarianceReasons();
 const createAdjustment = useCreateAdjustment();

 const [warehouseId, setWarehouseId] = useState('');
 const [reasonCategory, setReasonCategory] = useState('DAMAGE');
 const [notes, setNotes] = useState('');
 const [lines, setLines] = useState<NewAdjustmentLine[]>([]);

 const [customItems, setCustomItems] = useState<ItemOption[]>([]);
 const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false);
 const [customItemNameQuery, setCustomItemNameQuery] = useState('');
 const [isSuggestingFIFO, setIsSuggestingFIFO] = useState(false);
 const [creatingLotForLineId, setCreatingLotForLineId] = useState<string | null>(null);

 const handleSuggestFIFO = async () => {
  if (!warehouseId) {
   toast.error(t('select_warehouse_error') || "Please select a warehouse first.");
   return;
  }
  
  const emptyLines = lines.filter(l => !l.lotNumber && l.direction === 'DECREASE');
  if (emptyLines.length === 0) return;

  const itemIds = [...new Set(emptyLines.map(l => l.itemId))];

  setIsSuggestingFIFO(true);
  try {
   const qs = new URLSearchParams();
   qs.append('warehouse_id', warehouseId);
   itemIds.forEach(id => qs.append('item_id', id));
   
   const res = await apiClient.get(`/operations/lots-available?${qs.toString()}`, z.object({
    data: z.array(z.object({
     id: z.string(),
     itemId: z.string(),
     lotNumber: z.string(),
     expiryDate: z.string().nullable().optional(),
     totalQty: z.number().optional(),
     qtyAvailable: z.number().optional(),
    }))
   }));

   const lotsAvailable = res.data;

   const lotsByItem = lotsAvailable.reduce((acc, lot) => {
    if (!acc[lot.itemId]) acc[lot.itemId] = [];
    acc[lot.itemId].push({
     id: lot.id,
     lotNumber: lot.lotNumber,
     qtyAvailable: lot.totalQty ?? lot.qtyAvailable ?? 0,
     expiryDate: lot.expiryDate
    });
    return acc;
   }, {} as Record<string, { id: string, lotNumber: string, qtyAvailable: number, expiryDate?: string | null }[]>);

   const manualLines = lines.filter(l => l.lotNumber || l.direction === 'INCREASE');
   manualLines.forEach(l => {
    if (l.direction === 'DECREASE' && l.lotNumber) {
     const itemLots = lotsByItem[l.itemId];
     if (itemLots) {
      const lot = itemLots.find(il => il.id === l.lotNumber || il.lotNumber === l.lotNumber);
      if (lot) {
       lot.qtyAvailable = Math.max(0, lot.qtyAvailable - l.qty);
      }
     }
    }
   });

   Object.keys(lotsByItem).forEach(itemId => {
    lotsByItem[itemId].sort((a, b) => {
     if (!a.expiryDate && !b.expiryDate) return 0;
     if (!a.expiryDate) return 1;
     if (!b.expiryDate) return -1;
     return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
   });

   let hasShortage = false;
   let totalShortage = 0;

   const newLines: NewAdjustmentLine[] = [];
   const linesToKeep = [...manualLines];

   emptyLines.forEach((emptyLine, index) => {
    const itemLots = lotsByItem[emptyLine.itemId] || [];
    let remainingQty = emptyLine.qty;
    let allocatedAny = false;

    for (const lot of itemLots) {
     if (remainingQty <= 0) break;
     if (lot.qtyAvailable <= 0) continue;

     const qtyToAllocate = Math.min(remainingQty, lot.qtyAvailable);
     
     newLines.push({
      ...emptyLine,
      id: `clone-${emptyLine.id}-${lot.id}-${index}-${Date.now()}`,
      lotNumber: lot.id,
      qty: qtyToAllocate
     });

     lot.qtyAvailable -= qtyToAllocate;
     remainingQty -= qtyToAllocate;
     allocatedAny = true;
    }

    if (remainingQty > 0) {
     hasShortage = true;
     totalShortage += remainingQty;
     newLines.push({
      ...emptyLine,
      id: `clone-${emptyLine.id}-unalloc-${index}-${Date.now()}`,
      qty: remainingQty
     });
    }
   });

   setLines([...linesToKeep, ...newLines]);
   
   if (hasShortage) {
    toast.warning(t('shortage_warning', { qty: totalShortage }) || `Partial shortage: ${totalShortage} units could not be allocated due to insufficient stock.`);
   } else {
    toast.success(t('fifo_applied') || "FIFO suggestions applied successfully.");
    audioAlerts.playScanSuccess();
   }
  } catch (err) {
   console.error(err);
   toast.error(tCommon('error_generic') || "An error occurred");
  } finally {
   setIsSuggestingFIFO(false);
  }
 };

 const [idempotencyKey] = useState(() => crypto.randomUUID());

 // Unsaved changes guard
 const isDirty = warehouseId !== '' || notes !== '' || lines.length > 0;
 const { router } = useUnsavedChangesGuard(isDirty);

 // Warehouse locking guard
 const { data: lockState } = useWarehouseLock(warehouseId);
 const isLocked = !!lockState?.isLocked;

 const uoms = uomsResult?.data || [];
 const activeUoMs = uoms;

 const warehouseItems = useMemo(() => {
  return (warehouses || []).map(w => ({
   id: w.id,
   name: w.name || w.code,
   code: w.code,
  }));
 }, [warehouses]);

 const fallbackReasons = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'];
 const reasonItems = useMemo(() => {
  const reasons = varianceReasonsData?.data;
  if (reasons && reasons.length > 0) {
   return reasons.map(r => ({
    id: r.code,
    name: r.name,
   }));
  }
  return fallbackReasons.map(r => ({
   id: r,
   name: t(`reasons.${r.toLowerCase()}`) || r,
  }));
 }, [t, varianceReasonsData]);

 const allItems = useMemo<ItemOption[]>(() => {
  const mappedItems: ItemOption[] = (items || []).map(i => ({
   id: i.id,
   code: i.code,
   barcode: i.barcode,
   name: i.name,
   primaryUom: {
    id: i.primaryUom.id,
    code: i.primaryUom.code,
   },
  }));
  return [...mappedItems, ...customItems];
 }, [items, customItems]);

 // Parse query parameters to pre-populate expiring item disposal
 const paramItemId = searchParams.get('itemId');
 const paramBatch = searchParams.get('batch');
 const paramReason = searchParams.get('reason');

 useEffect(() => {
  if (paramReason === 'damage') {
   setReasonCategory('DAMAGE');
  }
 }, [paramReason]);

 useEffect(() => {
  if (!paramItemId || allItems.length === 0) return;

  setLines(prev => {
   const alreadyAdded = prev.some(l => l.itemId === paramItemId);
   if (alreadyAdded) return prev;

   const item = allItems.find(i => i.id === paramItemId || i.code === paramItemId);
   if (item) {
    return [{
     id: `temp-${item.id}-${Date.now()}`,
     itemId: item.id,
     item: {
      id: item.id,
      code: item.code,
      name: item.name,
      primaryUom: {
       code: item.primaryUom.code
      }
     },
     qty: 1,
     uomId: item.primaryUom.id,
     direction: 'DECREASE',
     lotNumber: paramBatch || ''
    }];
   }
   return prev;
  });
 }, [paramItemId, paramBatch, allItems]);

 const handleAddItem = (barcode: string) => {
  const item = allItems.find((i: ItemOption) => i.barcode === barcode || i.code === barcode);
  if (!item) {
   audioAlerts.playScanInvalid();
   toast.error(tCommon('no_item_found') || "Item not found.");
   return;
  }

  setLines(prev => {
   const existing = prev.find(l => l.itemId === item.id);
   if (existing) {
    return prev.map(l => l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l);
   }
   return [...prev, {
    id: `temp-${item.id}-${Date.now()}`,
    itemId: item.id,
    item: {
     id: item.id,
     code: item.code,
     name: item.name,
     primaryUom: { 
      code: item.primaryUom.code 
     }
    },
    qty: 1,
    uomId: item.primaryUom.id,
    direction: 'INCREASE',
    lotNumber: ''
   }];
  });

  audioAlerts.playScanSuccess();
 };

 const handleSave = () => {
  if (!warehouseId || lines.length === 0) return;

  createAdjustment.mutate({
   payload: {
    warehouseId: warehouseId,
    reason: reasonCategory,
    notes,
    lines: lines.map(l => ({
     itemId: l.itemId,
     qty: l.qty,
     uomId: l.uomId,
     direction: l.direction,
     lotAllocations: l.lotNumber ? [{ lotId: l.lotNumber, qty: l.qty }] : undefined,
     isCustom: l.itemId.startsWith('cust-') ? true : undefined
    }))
   },
   signal: abortController.signal,
   headers: {
    'X-Idempotency-Key': idempotencyKey
   }
  }, {
   onSuccess: (data) => {
    router.push(`/adjustments/${data.id}`, { skipGuard: true });
   }
  });
 };

 const showNotesError = notes.length > 0 && notes.length < 10;
 const isValid = !!(
  warehouseId &&
  reasonCategory &&
  notes.length >= 10 &&
  notes.length <= 1000 &&
  lines.length > 0 &&
  lines.every(l => l.qty > 0)
 );

 const extraColumns = [
  {
   header: t('direction') || 'Direction',
   cell: (line: NewAdjustmentLine) => (
    <div className="flex justify-center bg-card border border-border shadow-sm/40 rounded-lg p-0.5 h-9 w-36 mx-auto">
     <button
      type="button"
      onClick={() => {
       setLines(prev => prev.map(l => l.id === line.id ? { ...l, direction: 'INCREASE' } : l));
      }}
      className={cn(
       "flex flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
       line.direction === 'INCREASE'
        ? "bg-status-success/15 text-status-success shadow-sm"
        : "text-muted-foreground/30 hover:text-muted-foreground/60"
      )}
     >
      <ArrowUp className="w-3 h-3" />
      {t('direction_increase') || 'Inc'}
     </button>
     <button
      type="button"
      onClick={() => {
       setLines(prev => prev.map(l => l.id === line.id ? { ...l, direction: 'DECREASE' } : l));
      }}
      className={cn(
       "flex flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-bold uppercase transition-all active:scale-[0.95] disabled:opacity-50",
       line.direction === 'DECREASE'
        ? "bg-status-error/15 text-status-error shadow-sm"
        : "text-muted-foreground/30 hover:text-muted-foreground/60"
      )}
     >
      <ArrowDown className="w-3 h-3" />
      {t('direction_decrease') || 'Dec'}
     </button>
    </div>
   )
  },
  {
   header: tCommon('lot_number') || 'Lot Number',
   cell: (line: NewAdjustmentLine) => (
    <div className="flex justify-center items-center gap-2">
     <input
      type="text"
      placeholder={t('lot_placeholder') || 'Lot...'}
      value={line.lotNumber || ''}
      onChange={(e) => {
       const val = e.target.value;
       setLines(prev => prev.map(l => l.id === line.id ? { ...l, lotNumber: val } : l));
      }}
      className="w-32 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center h-9 px-2 font-mono text-label-xs font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
     />
     {line.direction === 'INCREASE' && (
      <button
       type="button"
       onClick={() => setCreatingLotForLineId(line.id)}
       className="bg-muted/50 text-foreground border border-cyan-500/20 hover:bg-muted/50 h-9 px-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap shadow-sm shadow-cyan-500/10"
      >
       + {t('new') || 'New'}
      </button>
     )}
    </div>
   )
  }
 ];

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in space-y-8 gap-6 duration-1000 slide-in-from-bottom-4 p-8 mx-auto animate-in flex-col flex pb-32 w-full">
   {createAdjustment.error && (
    <div 
     role="alert"
     aria-live="assertive"
     className="bg-status-error/10 border border-status-error/20 p-4 rounded-2xl flex items-start gap-3 animate-in animate-shake duration-500"
    >
     <div className="w-8 h-8 rounded-xl bg-status-error/10 flex items-center justify-center shrink-0">
      <Info className="w-4 h-4 text-status-error" />
     </div>
     <div className="space-y-1">
      <p className="text-body-sm font-bold text-status-error uppercase tracking-tight">
       {tCommon('submission_failed')}
      </p>
      <p className="text-body-sm text-status-error/80 leading-relaxed">
       {createAdjustment.error instanceof Error ? createAdjustment.error.message : tCommon('error_generic')}
      </p>
     </div>
    </div>
   )}

   <Breadcrumb
    items={[
     { label: tCommon('inventory') || 'Inventory', href: '#' },
     { label: t('title') || 'Adjustments', href: "/adjustments" },
     { label: t('create_new') || 'New Adjustment' }
    ]}
   />

   <PageHeader
    title={t('create_new')}
    description={t('subtitle')} 
   />

   <LockBanner lockState={lockState} />

   <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-8", createAdjustment.isPending && "opacity-60 pointer-events-none transition-opacity")}>
    {/* Left Sidebar Panel - Metadata settings (30%) */}
    <div className="lg:col-span-1 space-y-8">
     <div className="bg-card border border-border shadow-sm/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-visible shadow-2xl group">
      {/* Premium Locale-Mirrored Gradient Accent */}
      <div className={cn(
       "absolute top-0 left-0 right-0 h-1 rounded-t-[2.5rem] from-cyan-500/50 via-cyan-500/20 to-transparent pointer-events-none",
       locale === 'ar' ? "bg-gradient-to-l" : "bg-gradient-to-r"
      )} />
      
      <div className="flex items-center gap-3 mb-6">
       <Warehouse className="w-4 h-4 text-foreground" />
       <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
        {t('details_section')}
       </h3>
      </div>

      <div className="space-y-6">
       {/* Warehouse selection */}
       <div className="space-y-2">
        <label htmlFor="warehouse-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
         {tCommon('warehouse')}
        </label>
        <SmartCombobox
         items={warehouseItems}
         value={warehouseId}
         onSelect={(item) => setWarehouseId(item.id)}
         placeholder={tCommon('select_warehouse') || "Select Warehouse"}
         triggerClassName="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
       </div>

       {/* Reason Category */}
       <div className="space-y-2">
        <label htmlFor="reason-select" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
         {t('reason')}
        </label>
        <SmartCombobox
         items={reasonItems}
         value={reasonCategory}
         onSelect={(item) => setReasonCategory(item.id)}
         placeholder={t('reason') || "Select Reason"}
         triggerClassName="w-full bg-surface-container-highest/40 border-none h-11 px-6 text-label-sm font-bold rounded-2xl shadow-inner shadow-black/5 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
       </div>

       {/* Reason details / notes */}
       <div className="space-y-2">
        <label htmlFor="notes-area" className="text-label-sm font-semibold uppercase text-muted-foreground/70 ms-1">
         {tCommon('notes')}
        </label>
        <Textarea
         id="notes-area"
         value={notes}
         onChange={(e) => setNotes(e.target.value)}
         placeholder={t('notes_placeholder')}
         className="w-full bg-surface-container-highest/40 border border-white/5 rounded-2xl p-4 font-medium text-body-md focus:ring-2 focus:ring-cyan-500/30 transition-all outline-none resize-none min-h-[140px] hover:bg-surface-container-highest/60"
        />
        {showNotesError && (
         <p className="text-[10px] font-bold text-status-error uppercase px-1 mt-1">
          {t('validation.notes_min_length') || 'Reason details must be at least 10 characters'}
         </p>
        )}
       </div>
      </div>
     </div>
    </div>

    {/* Right Operations Deck Panel - Scanning and lines table (70%) */}
    <div className="lg:col-span-2 space-y-6">
     <div className="bg-card border border-border shadow-sm/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-visible shadow-2xl group">
      {/* Premium Emerald Accent Gradient */}
      <div className={cn(
       "absolute top-0 left-0 right-0 h-1 rounded-t-[2.5rem] from-emerald-500/50 via-emerald-500/20 to-transparent pointer-events-none",
       locale === 'ar' ? "bg-gradient-to-l" : "bg-gradient-to-r"
      )} />

      <div className="flex items-center justify-between mb-8">
       <div className="flex items-center gap-3">
        <PackagePlus className="w-5 h-5 text-foreground" />
        <h3 className="text-label-sm font-semibold uppercase tracking-wider text-foreground/70">
         {t('lines_section')}
        </h3>
       </div>
       <div className="flex items-center gap-3">
        <button
         type="button"
         onClick={handleSuggestFIFO}
         disabled={isSuggestingFIFO || lines.length === 0}
         className="flex items-center gap-2 px-4 py-1.5 bg-muted/50 hover:bg-muted/50 rounded-full border border-cyan-500/20 transition-all group disabled:opacity-50"
        >
         <Zap className="w-3.5 h-3.5 text-foreground group-hover:scale-110 transition-transform" />
         <span className="text-label-xxs font-bold uppercase text-foreground">
          {isSuggestingFIFO ? t('fetching_lots') : t('suggest_fifo')}
         </span>
        </button>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/50 rounded-full border border-emerald-500/20">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-label-xxs font-semibold uppercase text-foreground">
          {lines.length} {tCommon('items') || 'Items'}
         </span>
        </div>
       </div>
      </div>

      {/* Input Bars (Scanning + Combobox) */}
      <div className="mb-8 w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
       <div className="space-y-2">
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block">
         {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
        </label>
        <ScanInput 
         onScan={handleAddItem}
         placeholder={t('scan_item_placeholder') || 'Scan item barcode...'} 
         className="w-full"
         scannerMode={true}
         size="lg"
        />
       </div>
       <div className="space-y-2">
        <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block">
         {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
        </label>
        <SmartCombobox
         items={allItems}
         onSelect={(item: ItemOption) => handleAddItem(item.code)}
         placeholder={locale === 'ar' ? 'ابحث عن صنف لإضافته...' : 'Search item to add...'}
         disabled={isLoadingItems}
         onAddCustomItem={(query) => {
          setCustomItemNameQuery(query);
          setIsCustomItemDialogOpen(true);
         }}
        />
       </div>
      </div>

      {/* High-density interactive virtualized table */}
      <div className="bg-card border border-border shadow-sm/30 rounded-[2rem] border border-white/5 overflow-hidden">
       <DocumentLineItemTable
        lines={lines}
        locale={locale}
        isReadOnly={false}
        onRemoveLine={(id) => setLines(prev => prev.filter(l => l.id !== id))}
        hideLotColumns={true}
        dense={true}
        extraColumns={extraColumns}
        headers={{
         code: tCommon('table_headers.code'),
         name: tCommon('table_headers.name'),
         qty: tCommon('table_headers.qty'),
         uom: tCommon('table_headers.uom'),
        }}
        renderQty={(line) => (
         <div className="flex justify-center">
          <input
           type="number"
           min="0.001"
           step="0.001"
           value={line.qty}
           onChange={(e) => {
            const val = parseFloat(e.target.value);
            setLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val || 0 } : l));
           }}
           className="w-24 bg-surface-container-highest/60 border border-white/5 rounded-lg text-center py-1.5 font-mono text-body-md font-semibold focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all hover:bg-surface-container-highest/80 disabled:opacity-50"
          />
         </div>
        )}
        renderUom={(line) => {
         const uomOption = activeUoMs.find(u => u.id === line.uomId);
         return (
          <div className="flex items-center min-w-[120px]">
           <SmartCombobox
            items={activeUoMs}
            value={line.uomId}
            onSelect={(uom) => {
             setLines(prev => prev.map(l => l.id === line.id ? { ...l, uomId: uom.id } : l));
            }}
            placeholder="PCS" // i18n-ignore
           />
          </div>
         );
        }}
       />
      </div>
     </div>
    </div>
   </div>

   <FormFooter
     onCancel={() => router.push('/adjustments', { skipGuard: true })}
     onSubmit={handleSave}
     isSaving={createAdjustment.isPending}
     isDirty={isDirty}
     isValid={isValid}
     isLocked={isLocked}
     saveLabel={t('save_draft') || 'Save Adjustment'}
    />

   <CreateCustomItemDialog
    key={isCustomItemDialogOpen ? customItemNameQuery : 'closed'}
    isOpen={isCustomItemDialogOpen}
    onClose={() => setIsCustomItemDialogOpen(false)}
    defaultName={customItemNameQuery}
    onCreate={async (newItem) => {
     try {
      await apiClient.post('/master-data/items', z.unknown(), {
       id: newItem.id,
       code: newItem.code,
       barcode: newItem.barcode,
       nameEn: newItem.name_en,
       nameAr: newItem.name_ar,
       primaryUom: newItem.primary_uom,
       trackLots: false,
       isActive: true,
       version: 1
      });
     } catch (err) {
      console.error('Failed to register custom item', err);
     }

     setCustomItems(prev => [...prev, {
      id: newItem.id,
      code: newItem.code,
      barcode: newItem.barcode,
      name: newItem.name_en || newItem.name_ar || '',
      primaryUom: newItem.primary_uom,
     }]);
     setLines(prev => {
      const existing = prev.find(l => l.itemId === newItem.id);
      if (existing) return prev;
      return [...prev, {
       id: newItem.id,
       itemId: newItem.id,
       item: {
        id: newItem.id,
        code: newItem.code,
        name: newItem.name_en || newItem.name_ar || '',
        primaryUom: {
         code: newItem.primary_uom.code
        }
       },
       qty: 1,
       uomId: newItem.primary_uom.id,
       direction: 'INCREASE',
       lotNumber: ''
      }];
     });
    }}
   />

   <CreateLotDialog
    isOpen={creatingLotForLineId !== null}
    onClose={() => setCreatingLotForLineId(null)}
    defaultItemName={creatingLotForLineId ? lines.find(l => l.id === creatingLotForLineId)?.item.name || '' : ''}
    onSave={(lotNumber, expiryDate) => {
     if (creatingLotForLineId) {
      setLines(prev => prev.map(l => l.id === creatingLotForLineId ? { ...l, lotNumber: lotNumber } : l));
      // In a real app we might also save the expiryDate to the payload if the API expects it for NEW lots
      // For now, we set the lot_number in the UI. 
      toast.success(tCommon('success') || "Lot created locally.");
     }
    }}
   />
  </div>
 );
}

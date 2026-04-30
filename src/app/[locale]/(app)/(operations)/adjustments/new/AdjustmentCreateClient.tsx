'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useCreateAdjustment } from '@/features/operations/hooks/useCreateAdjustment';
import { useWarehouses } from '@/features/warehouses/api/useWarehouses';
import { useItems } from '@/features/items/api/useItems';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { AlertCircle, Save, Package, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'] as const;

const AdjustmentFormSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  item_id: z.string().min(1, 'Item is required'),
  lot_number: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  direction: z.enum(['INCREASE', 'DECREASE']),
  reason_category: z.string().min(1, 'Reason category is required'),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
});

type AdjustmentFormValues = z.infer<typeof AdjustmentFormSchema>;

export function AdjustmentCreateClient({ locale }: { locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.adjustment');
  const tCommon = useTranslations('common');
  const router = useRouter();
  
  const { data: warehouses } = useWarehouses();
  const { data: items } = useItems();
  const createAdjustment = useCreateAdjustment();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(AdjustmentFormSchema),
    defaultValues: {
      direction: 'INCREASE',
      reason_category: 'DAMAGE',
      quantity: 1,
    }
  });

  const selectedWarehouseId = watch('warehouse_id');
  const selectedItemId = watch('item_id');
  const { data: lockState } = useWarehouseLock(selectedWarehouseId);
  
  const selectedItem = items?.find(i => i.id === selectedItemId);
  const selectedDirection = watch('direction');

  const onSubmit = async (data: AdjustmentFormValues) => {
    if (!!lockState?.is_locked) return;
    
    try {
      await createAdjustment.mutateAsync({
        warehouse_id: data.warehouse_id,
        reason: data.reason_category,
        notes: data.notes,
        lines: [{
          item_id: data.item_id,
          qty: data.quantity,
          uom_id: selectedItem?.uom || 'EA', // Use the UOM from selected item
          direction: data.direction,
          lot_allocations: data.lot_number ? [{ lot_id: data.lot_number, qty: data.quantity }] : undefined
        }]
      });
      router.push(`/${locale}/adjustments`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb 
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: `/${locale}/adjustments` },
          { label: t('create_new') }
        ]} 
      />
      
      <PageHeader
        title={t('create_new')}
        description={t('subtitle') || 'Inventory Calibrate Protocol'}
        actions={
          <Button 
            onClick={handleSubmit(onSubmit)} 
            disabled={!isValid || createAdjustment.isPending || !!lockState?.is_locked}
            className={cn(
              "bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-[10px] font-black uppercase transition-all shadow-lg disabled:opacity-50", 
              locale === 'ar' ? "tracking-normal" : "tracking-[0.08em]"
            )}
          >
            <Save className="w-4 h-4 me-2" />
            {t('save_draft')}
          </Button>
        }
      />

      <LockBanner lockState={lockState} />

      <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Core Settings Panel */}
        <div className="bg-surface-container-low/50 p-8 rounded-[2rem] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-cyan-500/50 via-cyan-500/20 to-transparent" />
          
          <div className="flex items-center gap-3 mb-2">
            <Info className="w-4 h-4 text-cyan-500" />
            <h3 className={cn("text-[10px] font-black uppercase text-foreground/60", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {t('details_section') || 'Document Details'}
            </h3>
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {tCommon('warehouse')}
            </label>
            <Select
              onValueChange={(val) => setValue('warehouse_id', val, { shouldValidate: true })}
            >
              <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-sm border-none hover:bg-surface-container-highest/60 transition-all outline-none ring-0 focus:ring-0 focus:bg-surface-container-highest/80">
                <SelectValue placeholder={tCommon('select_warehouse') || 'Select Warehouse'} />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none">
                {warehouses?.map(w => (
                  <SelectItem key={w.id} value={w.id} className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">
                    {locale === 'ar' ? w.nameAr : w.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouse_id && (
              <p className="text-[10px] font-bold text-red-500 uppercase ms-1">{errors.warehouse_id.message}</p>
            )}
          </div>

          {/* Reason Category */}
          <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {t('reason')}
            </label>
            <Select
              defaultValue="DAMAGE"
              onValueChange={(val) => setValue('reason_category', val, { shouldValidate: true })}
            >
              <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-sm border-none hover:bg-surface-container-highest/60 transition-all outline-none ring-0 focus:ring-0 focus:bg-surface-container-highest/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none">
                {REASON_OPTIONS.map(r => (
                  <SelectItem key={r} value={r} className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">
                    {t(`reasons.${r.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason_category && (
              <p className="text-[10px] font-bold text-red-500 uppercase ms-1">{errors.reason_category.message}</p>
            )}
          </div>

          {/* Adjustment Notes */}
          <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {tCommon('notes')}
            </label>
            <Textarea
              {...register('notes')}
              placeholder={t('notes_placeholder')}
              className="w-full bg-surface-container-highest/40 rounded-xl p-4 font-medium text-sm border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0 resize-none min-h-[120px] hover:bg-surface-container-highest/60"
            />
            {errors.notes && (
              <p className="text-[10px] font-bold text-red-500 uppercase ms-1">{errors.notes.message}</p>
            )}
          </div>
        </div>

        {/* Item Calibration Panel */}
        <div className="bg-surface-container-low/50 p-8 rounded-[2rem] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-emerald-500/30 via-emerald-500/10 to-transparent" />

          <div className="flex items-center gap-3 mb-2">
            <Package className="w-4 h-4 text-emerald-500" />
            <h3 className={cn("text-[10px] font-black uppercase text-foreground/60", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {t('lines_section') || 'Adjustment Lines'}
            </h3>
          </div>

          {/* Item Selection */}
          <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {tCommon('item')}
            </label>
            <Select
              onValueChange={(val) => setValue('item_id', val, { shouldValidate: true })}
            >
              <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-sm border-none hover:bg-surface-container-highest/60 transition-all outline-none ring-0 focus:ring-0 focus:bg-surface-container-highest/80">
                <SelectValue placeholder={tCommon('select_item') || 'Select Item'} />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none max-h-[300px]">
                {items?.map(item => (
                  <SelectItem key={item.id} value={item.id} className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-bold">{locale === 'ar' ? item.nameAr : item.nameEn}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60">{item.sku}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.item_id && (
              <p className="text-[10px] font-bold text-red-500 uppercase ms-1">{errors.item_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Direction */}
            <div className="space-y-2">
              <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
                {t('direction')}
              </label>
              <div className="grid grid-cols-2 bg-surface-container-highest/40 rounded-xl p-1 h-[52px]">
                <button
                  type="button"
                  onClick={() => setValue('direction', 'INCREASE')}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    selectedDirection === 'INCREASE' 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "text-muted-foreground/40 hover:text-muted-foreground/60"
                  )}
                >
                  <ArrowUp className="w-3 h-3" />
                  {t('direction_increase')}
                </button>
                <button
                  type="button"
                  onClick={() => setValue('direction', 'DECREASE')}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase transition-all",
                    selectedDirection === 'DECREASE' 
                      ? "bg-red-500/20 text-red-400" 
                      : "text-muted-foreground/40 hover:text-muted-foreground/60"
                  )}
                >
                  <ArrowDown className="w-3 h-3" />
                  {t('direction_decrease')}
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
                {t('qty_adjusted')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  dir="ltr"
                  step="0.001"
                  min="0.001"
                  {...register('quantity', { valueAsNumber: true })}
                  className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-mono text-lg font-black text-center border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0"
                />
                <span className="absolute end-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground/40">
                  {selectedItem?.uom || '---'}
                </span>
              </div>
              {errors.quantity && (
                <p className="text-[10px] font-bold text-red-500 uppercase ms-1">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          {/* Lot Number */}
          <div className="space-y-2">
            <label className={cn("text-[10px] font-black uppercase text-muted-foreground/60 ms-1", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
              {tCommon('lot_number') || 'Lot Number'}
            </label>
            <Input
              {...register('lot_number')}
              placeholder={t('lot_placeholder') || 'Enter lot number if applicable...'}
              className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-mono text-sm border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0 px-6"
            />
          </div>

          {/* Summary Info */}
          {selectedItem && (
            <div className="p-4 bg-primary-fixed-dim/5 rounded-2xl border border-primary-fixed-dim/10 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-muted-foreground/60">{tCommon('uom') || 'Unit of Measure'}</span>
                <span className="text-cyan-500">{selectedItem.uom}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-muted-foreground/60">{tCommon('sku') || 'SKU Code'}</span>
                <span className="text-foreground/80 font-mono tracking-tighter">{selectedItem.sku}</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

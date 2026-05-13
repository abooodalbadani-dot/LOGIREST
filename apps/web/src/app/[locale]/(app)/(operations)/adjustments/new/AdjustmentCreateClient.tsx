'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useForm, useWatch } from 'react-hook-form';
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
import { Save, Package, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const REASON_OPTIONS = ['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'CORRECTION', 'OTHER'] as const;

const getAdjustmentFormSchema = (t: any) => z.object({
  warehouse_id: z.string().min(1, t('validation.warehouse_required')),
  item_id: z.string().min(1, t('validation.item_required')),
  lot_number: z.string().optional(),
  quantity: z.number().positive(t('validation.quantity_positive')),
  direction: z.enum(['INCREASE', 'DECREASE']),
  reason_category: z.string().min(1, t('validation.reason_required')),
  notes: z.string().min(10, t('validation.notes_min_length')),
});

type AdjustmentFormValues = z.infer<ReturnType<typeof getAdjustmentFormSchema>>;

import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';

export function AdjustmentCreateClient({ locale }: { locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.adjustment');
 const tCommon = useTranslations('common');
 
 const schema = getAdjustmentFormSchema(t);

 const {
 register,
 handleSubmit,
 setValue,
 control,
 formState: { errors, isValid, isDirty },
 } = useForm<AdjustmentFormValues>({
 resolver: zodResolver(schema),
 defaultValues: {
 direction: 'INCREASE',
 reason_category: 'DAMAGE',
 quantity: 1,
 }
 });

 const { router } = useUnsavedChangesGuard(isDirty);
 
 const { data: warehouses } = useWarehouses();
 const { data: items } = useItems();
 const createAdjustment = useCreateAdjustment();
 
 const selectedWarehouseId = useWatch({ control, name: 'warehouse_id' });
 const selectedItemId = useWatch({ control, name: 'item_id' });
 const { data: lockState } = useWarehouseLock(selectedWarehouseId);
 
 const selectedItem = items?.find(i => i.id === selectedItemId);
 const selectedDirection = useWatch({ control, name: 'direction' });

 const onSubmit = (data: AdjustmentFormValues) => {
   if (!!lockState?.isLocked) return;
   
   createAdjustment.mutate({
     payload: {
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
     }
   }, {
     onSuccess: () => {
       router.push("/adjustments", { skipGuard: true });
     }
   });
 };

 return (
 <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <Breadcrumb 
 items={[
 { label: tCommon('inventory'), href: '#' },
 { label: t('title'), href: "/adjustments" },
 { label: t('create_new') }
 ]} 
 />
 
 <PageHeader
 title={t('create_new')}
 description={t('subtitle')} actions={
 <Button 
 onClick={handleSubmit(onSubmit)} 
 disabled={!isValid || createAdjustment.isPending || !!lockState?.isLocked}
 className={cn(
 "bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl h-11 px-8 text-label-xs font-semibold uppercase transition-all shadow-lg disabled:opacity-50"
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
 <h3 className={cn("text-label-xs font-semibold uppercase text-foreground/60")}>
 {t('details_section')}
 </h3>
 </div>

 {/* Warehouse Selection */}
 <div className="space-y-2">
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {tCommon('warehouse')}
 </label>
 <Select
 onValueChange={(val) => setValue('warehouse_id', (val as string) || '', { shouldValidate: true })}
 >
 <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-body-md border-none hover:bg-surface-container-highest/60 transition-all outline-none ring-0 focus:ring-0 focus:bg-surface-container-highest/80">
 <SelectValue placeholder={tCommon('select_warehouse')} />
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
 <p className="text-label-xs font-bold text-red-500 uppercase ms-1">{errors.warehouse_id.message}</p>
 )}
 </div>

 {/* Reason Category */}
 <div className="space-y-2">
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {t('reason')}
 </label>
 <Select
 defaultValue="DAMAGE"
 onValueChange={(val) => setValue('reason_category', val || '', { shouldValidate: true })}
 >
 <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-body-md border-none hover:bg-surface-container-highest/60 transition-all outline-none ring-0 focus:ring-0 focus:bg-surface-container-highest/80">
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
 <p className="text-label-xs font-bold text-red-500 uppercase ms-1">{errors.reason_category.message}</p>
 )}
 </div>

 {/* Adjustment Notes */}
 <div className="space-y-2">
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {tCommon('notes')}
 </label>
 <Textarea
 {...register('notes')}
 placeholder={t('notes_placeholder')}
 className="w-full bg-surface-container-highest/40 rounded-xl p-4 font-medium text-body-md border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0 resize-none min-h-[120px] hover:bg-surface-container-highest/60"
 />
 {errors.notes && (
 <p className="text-label-xs font-bold text-red-500 uppercase ms-1">{errors.notes.message}</p>
 )}
 </div>
 </div>

 {/* Item Calibration Panel */}
 <div className="bg-surface-container-low/50 p-8 rounded-[2rem] space-y-6 relative overflow-hidden">
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-e from-emerald-500/30 via-emerald-500/10 to-transparent" />

 <div className="flex items-center gap-3 mb-2">
 <Package className="w-4 h-4 text-emerald-500" />
 <h3 className={cn("text-label-xs font-semibold uppercase text-foreground/60")}>
 {t('lines_section')}
 </h3>
 </div>

 {/* Item Selection */}
 <div className="space-y-2">
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {tCommon('item')}
 </label>
 <Select
 onValueChange={(val) => setValue('item_id', (val as string) || '', { shouldValidate: true })}
 >
 <SelectTrigger className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-bold text-body-md border-none hover:bg-surface-container-highest/60 transition-all outline-none ring-0 focus:ring-0 focus:bg-surface-container-highest/80">
 <SelectValue placeholder={tCommon('select_item')} />
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none max-h-[300px]">
 {items?.map(item => (
 <SelectItem key={item.id} value={item.id} className="font-medium focus:bg-cyan-500/10 focus:text-cyan-400">
 <div className="flex flex-col items-start gap-0.5">
 <span className="text-body-md font-bold">{locale === 'ar' ? item.nameAr : item.nameEn}</span>
 <span className="text-label-xs font-mono text-muted-foreground/60">{item.sku}</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {errors.item_id && (
 <p className="text-label-xs font-bold text-red-500 uppercase ms-1">{errors.item_id.message}</p>
 )}
 </div>

 <div className="grid grid-cols-2 gap-4">
 {/* Direction */}
 <div className="space-y-2">
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {t('direction')}
 </label>
 <div className="grid grid-cols-2 bg-surface-container-highest/40 rounded-xl p-1 h-[52px]">
 <button
 type="button"
 onClick={() => setValue('direction', 'INCREASE')}
 className={cn(
 "flex items-center justify-center gap-2 rounded-lg text-label-xs font-semibold uppercase transition-all",
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
 "flex items-center justify-center gap-2 rounded-lg text-label-xs font-semibold uppercase transition-all",
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
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {t('qty_adjusted')}
 </label>
 <div className="relative">
 <Input
 type="number"
 dir="ltr"
 step="0.001"
 min="0.001"
 {...register('quantity', { valueAsNumber: true })}
 className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-mono text-title-sm font-semibold text-center border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0"
 />
 <span className="absolute end-4 top-1/2 -translate-y-1/2 text-label-xs font-semibold uppercase text-muted-foreground/40">
 {selectedItem?.uom || '---'}
 </span>
 </div>
 {errors.quantity && (
 <p className="text-label-xs font-bold text-red-500 uppercase ms-1">{errors.quantity.message}</p>
 )}
 </div>
 </div>

 {/* Lot Number */}
 <div className="space-y-2">
 <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1")}>
 {tCommon('lot_number')}
 </label>
 <Input
 {...register('lot_number')}
 placeholder={t('lot_placeholder')} className="w-full bg-surface-container-highest/40 rounded-xl h-[52px] font-mono text-body-md border-none focus:bg-primary-fixed-dim/10 transition-all outline-none shadow-none ring-0 focus-visible:ring-0 px-6"
 />
 </div>

 {/* Summary Info */}
 {selectedItem && (
 <div className="p-4 bg-primary-fixed-dim/5 rounded-2xl border border-primary-fixed-dim/10 space-y-2">
 <div className="flex justify-between items-center text-label-xs font-semibold uppercase">
 <span className="text-muted-foreground/60">{tCommon('uom.label')}</span>
 <span className="text-cyan-500">{selectedItem.uom}</span>
 </div>
 <div className="flex justify-between items-center text-label-xs font-semibold uppercase">
 <span className="text-muted-foreground/60">{tCommon('sku')}</span>
 <span className="text-foreground/80 font-mono">{selectedItem.sku}</span>
 </div>
 </div>
 )}
 </div>
 </form>
 </div>
 );
}

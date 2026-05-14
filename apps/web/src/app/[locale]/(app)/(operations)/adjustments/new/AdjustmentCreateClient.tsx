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

const getAdjustmentFormSchema = (t: (key: string) => string) => z.object({
  warehouse_id: z.string().min(1, t('validation.warehouse_required')),
  item_id: z.string().min(1, t('validation.item_required')),
  lot_number: z.string().optional(),
  quantity: z.number()
    .positive(t('validation.quantity_positive'))
    .max(1000000, t('validation.quantity_max')),
  direction: z.enum(['INCREASE', 'DECREASE']),
  reason_category: z.string().min(1, t('validation.reason_required')),
  notes: z.string()
    .min(10, t('validation.notes_min_length'))
    .max(1000, t('validation.notes_max_length')),
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

  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const { data: items, isLoading: isLoadingItems } = useItems();
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
          uom_id: selectedItem?.primary_uom?.id || 'EA',
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
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
              {tCommon('error.submission_failed')}
            </p>
            <p className="text-body-sm text-status-error/80 leading-relaxed">
              {createAdjustment.error instanceof Error ? createAdjustment.error.message : tCommon('error.generic')}
            </p>
          </div>
        </div>
      )}

      <Breadcrumb
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: "/adjustments" },
          { label: t('create_new') }
        ]}
      />

      <PageHeader
        title={t('create_new')}
        description={t('subtitle')} 
        actions={
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || createAdjustment.isPending || !!lockState?.isLocked}
            className={cn(
              "bg-primary hover:brightness-110 active:scale-[0.98] transition-all text-white rounded-xl h-11 px-8 text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
            )}
          >
            <Save className="w-4 h-4 me-2" />
            {t('save_draft')}
          </Button>
        }
      />

      <LockBanner lockState={lockState} />

      <form 
        className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", createAdjustment.isPending && "opacity-60 pointer-events-none transition-opacity")}
        aria-busy={createAdjustment.isPending}
      >
        {/* Core Settings Panel */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl space-y-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-operational-cyan/20 rounded-full group-hover:bg-operational-cyan/40 transition-colors" />
            <h3 className={cn("text-label-xs font-display font-semibold uppercase text-tertiary/40 group-hover:text-tertiary transition-colors")}>
              {t('details_section')}
            </h3>
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <label htmlFor="warehouse-select" className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
              {tCommon('warehouse')}
            </label>
            <Select
              onValueChange={(val) => setValue('warehouse_id', (val as string) || '', { shouldValidate: true })}
            >
              <SelectTrigger id="warehouse-select" className="w-full bg-surface-container-low/40 rounded-xl h-[52px] font-bold text-body-md border-none hover:bg-surface-container-low transition-all outline-none ring-0 focus:ring-2 focus:ring-operational-cyan/10 focus:bg-surface-container-low">
                <SelectValue placeholder={tCommon('select_warehouse')} />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none">
                {isLoadingWarehouses ? (
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-surface-container-low animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-surface-container-low animate-pulse rounded w-1/2" />
                  </div>
                ) : warehouses?.length === 0 ? (
                  <div className="p-4 text-center text-label-xs text-muted-foreground italic">
                    {tCommon('no_data')}
                  </div>
                ) : (
                  warehouses?.map(w => (
                    <SelectItem key={w.id} value={w.id} className="font-medium focus:bg-operational-cyan/10 focus:text-operational-cyan">
                      {locale === 'ar' ? w.name_ar : w.name_en}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.warehouse_id && (
              <p className="text-label-xs font-bold text-status-error uppercase ms-1">{errors.warehouse_id.message}</p>
            )}
          </div>

          {/* Reason Category */}
          <div className="space-y-2">
            <label htmlFor="reason-select" className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
              {t('reason')}
            </label>
            <Select
              defaultValue="DAMAGE"
              onValueChange={(val) => setValue('reason_category', val || '', { shouldValidate: true })}
            >
              <SelectTrigger id="reason-select" className="w-full bg-surface-container-low/40 rounded-xl h-[52px] font-bold text-body-md border-none hover:bg-surface-container-low transition-all outline-none ring-0 focus:ring-2 focus:ring-operational-cyan/10 focus:bg-surface-container-low">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none">
                {REASON_OPTIONS.map(r => (
                  <SelectItem key={r} value={r} className="font-medium focus:bg-operational-cyan/10 focus:text-operational-cyan">
                    {t(`reasons.${r.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason_category && (
              <p className="text-label-xs font-bold text-status-error uppercase ms-1">{errors.reason_category.message}</p>
            )}
          </div>

          {/* Adjustment Notes */}
          <div className="space-y-2">
            <label htmlFor="notes-area" className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
              {tCommon('notes')}
            </label>
            <Textarea
              id="notes-area"
              {...register('notes')}
              placeholder={t('notes_placeholder')}
              className="w-full bg-surface-container-low/40 rounded-xl p-5 font-medium text-body-md border-none focus:bg-operational-cyan/[0.02] transition-all outline-none shadow-none ring-0 focus-visible:ring-0 resize-none min-h-[140px] hover:bg-surface-container-low leading-relaxed"
            />
            {errors.notes && (
              <p className="text-label-xs font-bold text-status-error uppercase ms-1">{errors.notes.message}</p>
            )}
          </div>
        </div>

        {/* Item Calibration Panel */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl space-y-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-operational-cyan/20 rounded-full group-hover:bg-operational-cyan/40 transition-colors" />
            <h3 className={cn("text-label-xs font-display font-semibold uppercase text-tertiary/40 group-hover:text-tertiary transition-colors")}>
              {t('lines_section')}
            </h3>
          </div>

          {/* Item Selection */}
          <div className="space-y-2">
            <label htmlFor="item-select" className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
              {tCommon('item')}
            </label>
            <Select
              onValueChange={(val) => setValue('item_id', (val as string) || '', { shouldValidate: true })}
            >
              <SelectTrigger id="item-select" className="w-full bg-surface-container-low/40 rounded-xl h-[52px] font-bold text-body-md border-none hover:bg-surface-container-low transition-all outline-none ring-0 focus:ring-2 focus:ring-operational-cyan/10 focus:bg-surface-container-low">
                <SelectValue placeholder={tCommon('select_item')} />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-highest rounded-xl shadow-2xl border-none max-h-[300px]">
                {isLoadingItems ? (
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-surface-container-low animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-surface-container-low animate-pulse rounded w-1/2" />
                  </div>
                ) : items?.length === 0 ? (
                  <div className="p-4 text-center text-label-xs text-muted-foreground italic">
                    {tCommon('no_data')}
                  </div>
                ) : (
                  items?.map(item => (
                    <SelectItem key={item.id} value={item.id} className="font-medium focus:bg-operational-cyan/10 focus:text-operational-cyan">
                      <div className="flex flex-col items-start gap-0.5 max-w-[280px]">
                        <span className="text-body-md font-bold truncate w-full">
                          {locale === 'ar' ? item.name_ar : item.name_en}
                        </span>
                        <span className="text-label-xs font-mono text-muted-foreground/40">{item.code}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.item_id && (
              <p className="text-label-xs font-bold text-status-error uppercase ms-1">{errors.item_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Direction */}
            <div className="space-y-2">
              <label className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
                {t('direction')}
              </label>
              <div className="grid grid-cols-2 bg-surface-container-low/40 rounded-xl p-1 h-[52px]">
                <button
                  type="button"
                  aria-pressed={selectedDirection === 'INCREASE'}
                  onClick={() => setValue('direction', 'INCREASE')}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg text-label-xs font-semibold uppercase transition-all active:scale-[0.98]",
                    selectedDirection === 'INCREASE'
                      ? "bg-status-success/10 text-status-success shadow-sm"
                      : "text-muted-foreground/20 hover:text-muted-foreground/40 hover:bg-surface-container-low/60"
                  )}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  {t('direction_increase')}
                </button>
                <button
                  type="button"
                  aria-pressed={selectedDirection === 'DECREASE'}
                  onClick={() => setValue('direction', 'DECREASE')}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg text-label-xs font-semibold uppercase transition-all active:scale-[0.98]",
                    selectedDirection === 'DECREASE'
                      ? "bg-status-error/10 text-status-error shadow-sm"
                      : "text-muted-foreground/20 hover:text-muted-foreground/40 hover:bg-surface-container-low/60"
                  )}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  {t('direction_decrease')}
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label htmlFor="quantity-input" className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
                {t('qty_adjusted')}
              </label>
              <div className="relative group/input">
                <Input
                  id="quantity-input"
                  type="number"
                  dir="ltr"
                  step="0.001"
                  min="0.001"
                  {...register('quantity', { valueAsNumber: true })}
                  className="w-full bg-surface-container-low/40 rounded-xl h-[52px] font-mono text-title-sm font-semibold text-center border-none focus:bg-operational-cyan/[0.02] transition-all outline-none shadow-none ring-0 focus-visible:ring-0"
                />
                <span className="absolute end-4 top-1/2 -translate-y-1/2 text-label-xs font-semibold uppercase text-muted-foreground/30 group-focus-within/input:text-operational-cyan transition-colors">
                  {selectedItem?.primary_uom?.code || '---'}
                </span>
              </div>
              {errors.quantity && (
                <p className="text-label-xs font-bold text-status-error uppercase ms-1">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          {/* Lot Number */}
          <div className="space-y-2">
            <label htmlFor="lot-input" className={cn("text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1")}>
              {tCommon('lot_number')}
            </label>
            <Input
              id="lot-input"
              {...register('lot_number')}
              placeholder={t('lot_placeholder')} 
              className="w-full bg-surface-container-low/40 rounded-xl h-[52px] font-mono text-body-md border-none focus:bg-operational-cyan/[0.02] transition-all outline-none shadow-none ring-0 focus-visible:ring-0 px-6 placeholder:text-muted-foreground/10"
            />
          </div>

          {/* Summary Info Card */}
          <div className={cn(
            "p-6 rounded-2xl border transition-all duration-500 overflow-hidden relative",
            selectedItem 
              ? "bg-operational-cyan/[0.03] border-operational-cyan/10 opacity-100 translate-y-0" 
              : "bg-surface-container-low/20 border-transparent opacity-40 translate-y-2 pointer-events-none"
          )}>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center group/info">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-operational-cyan/40" />
                  <span className="text-label-xs text-muted-foreground/40 font-semibold uppercase">{tCommon('uom.label')}</span>
                </div>
                <span className="text-label-xs font-bold text-operational-cyan bg-operational-cyan/10 px-2 py-0.5 rounded-lg">{selectedItem?.primary_uom?.code || '---'}</span>
              </div>
              <div className="flex justify-between items-center group/info">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-operational-cyan/40" />
                  <span className="text-label-xs text-muted-foreground/40 font-semibold uppercase">{tCommon('sku')}</span>
                </div>
                <span className="text-label-xs font-mono font-bold text-foreground/60">{selectedItem?.code || '---'}</span>
              </div>
            </div>
            {/* Background Decorative Element */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-operational-cyan pointer-events-none">
              <Package size={120} strokeWidth={1} />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}


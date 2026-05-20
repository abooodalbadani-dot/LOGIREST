'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Wallet,
  PackageSearch,
  MessageSquare,
  Send,
  Scan
} from 'lucide-react';
import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { FormFooter } from '@/components/shared/FormFooter';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { toast } from 'sonner';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useCurrencies } from '@/features/purchasing/hooks/useCurrencies';
import { useFXRates } from '@/features/purchasing/hooks/useFXRates';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/AuthProvider';
import { type GRNDetail, LineItemSchema } from '@/features/purchasing/hooks/useGRN';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { GRN_STATUS } from '@/contracts/statuses';
import { useSuppliers } from '@/features/purchasing/hooks/useSuppliers';
import { useWarehouses } from '@/features/warehouses/api/useWarehouses';
import { useCreateGRN } from '@/features/purchasing/hooks/useCreateGRN';
import { useUpdateGRN } from '@/features/purchasing/hooks/useUpdateGRN';
import { CreateCustomItemDialog } from '@/components/shared/CreateCustomItemDialog';
import { useAdminSettings } from '@/features/admin/hooks/useAdminSettings';
import { formatCurrency } from '@/utils/currency';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { Item, ItemSchema } from '@/types/master-data';
import { useWarehouseLock } from '@/hooks/useWarehouseLock';
import { LockBanner } from '@/components/shared/LockBanner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { cn } from '@/lib/utils';

const grnFormSchema = z.object({
  supplier_id: z.string().min(1, 'Required'),
  currency_id: z.string().min(1, 'Required'),
  warehouse_id: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  lines: z.array(LineItemSchema)
});

type GRNFormValues = z.infer<typeof grnFormSchema>;
type LineItem = z.infer<typeof LineItemSchema>;

interface GRNFormProps {
  actions?: React.ReactNode;
  initialData?: GRNDetail;
  id: string;
  onConflict?: () => void;
}

export function GRNForm({ initialData, id, onConflict, actions }: GRNFormProps) {
  const t = useTranslations('procurement.grn');
  const tc = useTranslations('common');
  const ts = useTranslations('operations.stocktake');
  const locale = useLocale();
  const { user } = useAuth();

  const isNew = id === 'new';
  const lastResetId = useRef<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const { playSound } = useAudioFeedback()

  const { data: suppliers } = useSuppliers();
  const { data: warehouses } = useWarehouses();
  const { data: currencies } = useCurrencies();

  const supplierItems = useMemo(() => {
    return suppliers?.map(s => ({
      id: s.id,
      name_en: `${s.name_en} (${s.code})`,
      name_ar: `${s.name_ar} (${s.code})`,
    })) ?? [];
  }, [suppliers]);

  const warehouseItems = useMemo(() => {
    return warehouses?.map(w => ({
      id: w.id,
      name_en: w.name_en,
      name_ar: w.name_ar,
    })) ?? [];
  }, [warehouses]);

  const currencyItems = useMemo(() => {
    return currencies?.map(c => ({
      id: c.code,
      name_en: `${c.code} — ${locale === 'ar' ? c.name_ar : c.name_en}`,
      name_ar: `${c.code} — ${locale === 'ar' ? c.name_ar : c.name_en}`,
    })) ?? [];
  }, [currencies, locale]);

  const createMutation = useCreateGRN({ onConflict });
  const updateMutation = useUpdateGRN(initialData?.id || '', { onConflict });

  const [scanError, setScanError] = useState('');

  const status = (initialData?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);

  const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false);
  const [customItemBarcode, setCustomItemBarcode] = useState('');
  
  const { handleSubmit, reset, control, register, getValues, formState: { errors, isDirty } } = useForm<GRNFormValues>({
    resolver: zodResolver(grnFormSchema),
    defaultValues: {
      supplier_id: initialData?.supplier_id || '',
      currency_id: initialData?.currency_id || '',
      warehouse_id: initialData?.warehouse_id || 'wh-1',
      notes: initialData?.notes || '',
      lines: initialData?.lines || []
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "lines"
  });

  const { router } = useUnsavedChangesGuard(isDirty);

  const currencyId = useWatch({ control, name: 'currency_id' });
  const warehouseId = useWatch({ control, name: 'warehouse_id' });
  const { data: warehouseLock } = useWarehouseLock(warehouseId || null);
  const isWarehouseLocked = !!warehouseLock?.isLocked;
  const watchedLines = useWatch({ control, name: 'lines' });

  const { data: settings } = useAdminSettings();
  const baseCurrency = settings?.base_currency;
  const { data: fxRates } = useFXRates(currencyId, baseCurrency);
  const currentFxRate = fxRates?.[0]?.rate || 1;

  const { data: itemsData } = useMasterDataList<Item>('items', ItemSchema);

  const totalForeign = useMemo(() => {
    return (watchedLines || []).reduce((acc, line) => acc + (line.received_qty * (line.unit_cost_foreign || 0)), 0);
  }, [watchedLines]);

  useEffect(() => {
    if (initialData && initialData.id !== lastResetId.current) {
      lastResetId.current = initialData.id;
      reset({
        supplier_id: initialData.supplier_id || '',
        currency_id: initialData.currency_id || '',
        warehouse_id: initialData.warehouse_id || 'wh-1',
        notes: initialData.notes || '',
        lines: initialData.lines || []
      }, {
        keepDirty: false,
        keepTouched: false
      });
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [initialData, reset]);


  const handleScan = async (barcode: string) => {
    if (isWarehouseLocked) {
      playSound('error');
      toast.error(ts('warehouse_locked_mutation_blocked') || "Warehouse is locked. Scan mutation blocked.");
      throw new Error('WarehouseLocked');
    }
    const item = itemsData?.data?.find(i => i.code === barcode || i.barcode === barcode);

      if (item) {
      const currentLines = getValues("lines") || [];
      const index = currentLines.findIndex(l => l.item.id === item.id);

      if (index >= 0) {
        const existing = currentLines[index];
        update(index, {
          ...existing,
          received_qty: (existing.received_qty || 0) + 1
        });
        playSound('success');
        toast.success(tc('item_added_quantity_updated', { name: locale === 'ar' ? item.name_ar : item.name_en }));
      } else {
        append({
          id: `new-${Date.now()}`,
          item: {
            id: item.id,
            code: item.code,
            name_ar: item.name_ar,
            name_en: item.name_en,
            primary_uom: {
              id: item.primary_uom?.id || 'EA',
              code: item.primary_uom?.code || 'EA'
            }
          },
          lot: null,
          qty: 1,
          received_qty: 1,
          uom_id: item.primary_uom?.id || 'EA',
          unit_cost_foreign: item.last_purchase_price || 0,
          unit_cost_base: 0
        });
        playSound('success');
        toast.success(tc('item_added', { name: locale === 'ar' ? item.name_ar : item.name_en }));
      }
      setScanError('');
    } else {
      setScanError(t('no_item_found'));
      setCustomItemBarcode(barcode);
      setIsCustomItemDialogOpen(true);
      playSound('error');
      toast.error(tc('item_not_found'));
    }
  };

  const handleLotClick = (_line: LineItem) => {
    toast.info("Standardized lot allocation pending");
  };


  const workflowActions = (
    <div className="flex items-center gap-3">
      <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role || 'WH_KEEPER'}>
        <PermissionGate action="post" resource="grn">
          <Button
            disabled={isLocked || isWarehouseLocked}
            onClick={() => router.push(`/goods-received/${id}/post`)}
            className="h-12 px-8 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-semibold uppercase shadow-xl shadow-operational-cyan/20 transition-all rounded-xl disabled:opacity-50"
          >
            <Send className="w-4 h-4 me-2" />
            {t('post_grn')}
          </Button>
        </PermissionGate>
      </ActionGuard>
    </div>
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: GRNFormValues) => {
    if (!currencies || currencies.length === 0) {
      playSound('error');
      toast.error(t('errors.no_currencies_available'));
      return;
    }
    try {
      const payload = {
        ...values,
        lines: values.lines.map(l => ({
          id: l.id.startsWith('new-') ? undefined : l.id,
          item_id: l.item.id,
          lot_id: l.lot?.id || null,
          qty: l.received_qty,
          received_qty: l.received_qty,
          uom_id: l.uom_id,
          unit_cost_foreign: l.unit_cost_foreign || 0,
        }))
      };

      const headers = { 'X-Idempotency-Key': idempotencyKey };

      if (isNew) {
        const result = await createMutation.mutateAsync({ payload, headers });
        playSound('success');
        toast.success(t('create_success'));
        router.push(`/goods-received/${result.id}`, { skipGuard: true });
      } else if (initialData) {
        await updateMutation.mutateAsync({
          payload: {
            ...payload,
            version: initialData.version
          },
          headers
        });
        playSound('success');
        toast.success(t('update_success'));
      }
    } catch (error) {
      console.error('[GRNForm] Submit Error:', error);
      const isConflict = error && typeof error === 'object' && 'name' in error && error.name === 'ConflictError';
      if (!isConflict) {
        playSound('error');
        toast.error(tc('error_occurred'));
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-container-low pb-32">
      <DocumentLockBanner status={status} isLocked={isLocked} />
      <LockBanner lockState={warehouseLock} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <h1 className="text-headline-lg font-semibold uppercase italic text-foreground flex items-center gap-4">
              {isNew ? t('create_new') : `#${initialData?.document_number}`}
            </h1>
            <p className="text-label-xs font-semibold uppercase text-primary/40 mt-1">
              {isNew ? t('new_manifest_sub') : t('detail_sub')}
            </p>
          </div>
          {!isNew && (
            <Button
              type="button"
              onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
              variant="outline"
              className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-primary/20 text-primary hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <Scan className="w-4 h-4" />
              {t('scan_mode')}
            </Button>
          )}
        </div>

      {isCustomItemDialogOpen && (
        <CreateCustomItemDialog
          isOpen={isCustomItemDialogOpen}
          onClose={() => setIsCustomItemDialogOpen(false)}
          defaultName={customItemBarcode}
          initialBarcode={customItemBarcode}
          onCreate={async (newItem) => {
            try {
              await apiClient.post('/master-data/items', z.any(), {
                id: newItem.id,
                code: newItem.code,
                barcode: newItem.barcode,
                name_en: newItem.name_en,
                name_ar: newItem.name_ar,
                primary_uom: newItem.primary_uom,
                track_lots: false,
                is_active: true,
                version: 1
              });
              append({
                id: `new-${Date.now()}`,
                item: {
                  id: newItem.id,
                  code: newItem.code,
                  name_ar: newItem.name_ar,
                  name_en: newItem.name_en,
                  primary_uom: {
                    id: newItem.primary_uom.id,
                    code: newItem.primary_uom.code
                  }
                },
                lot: null,
                qty: 1,
                received_qty: 1,
                uom_id: newItem.primary_uom.id,
                unit_cost_foreign: 0,
                unit_cost_base: 0
              });
              playSound('success');
              toast.success(tc('item_added', { name: locale === 'ar' ? newItem.name_ar : newItem.name_en }));
            } catch (err) {
              playSound('error');
              toast.error(tc('error_generic'));
            }
          }}
        />
      )}

        <DocumentLockWrapper isLocked={isLocked || isWarehouseLocked}>
          <DocumentReadOnlyOverlay isPosted={isLocked || isWarehouseLocked}>
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-visible">
                  <Label htmlFor="supplier-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('supplier')}</Label>
                  <Controller
                    name="supplier_id"
                    control={control}
                    render={({ field }) => (
                      <SmartCombobox
                        items={supplierItems}
                        value={field.value}
                        onSelect={(item) => field.onChange(item.id)}
                        placeholder={tc('select_supplier')}
                        className="mt-2 h-12 bg-surface-container-low border-none rounded-xl px-4 font-semibold uppercase text-foreground shadow-none"
                        disabled={isLocked || isWarehouseLocked}
                      />
                    )}
                  />
                  {errors.supplier_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.supplier_id.message}</span>}
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-visible">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <Wallet className="w-12 h-12" />
                  </div>
                  <Label htmlFor="currency-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('order_currency')}</Label>
                  <Controller
                    name="currency_id"
                    control={control}
                    render={({ field }) => (
                      <SmartCombobox
                        items={currencyItems}
                        value={field.value}
                        onSelect={(item) => field.onChange(item.id)}
                        placeholder={tc('select_currency')}
                        className="mt-2 h-12 bg-surface-container-low border-none rounded-xl px-4 font-semibold font-mono text-foreground shadow-none"
                        disabled={isLocked || isWarehouseLocked}
                      />
                    )}
                  />
                  {errors.currency_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.currency_id.message}</span>}
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-hidden">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <PackageSearch className="w-12 h-12" />
                  </div>
                  <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('ref_document')}</p>
                  <div className="mt-2">
                    {initialData?.po_number ? (
                      <Badge variant="outline" className="h-8 px-4 bg-primary/5 text-primary border-primary/20 text-label-xs font-semibold uppercase rounded-xl">
                        <span dir="ltr" className="font-mono">{initialData.po_number}</span>
                      </Badge>
                    ) : (
                      <p className="font-semibold text-title-sm text-primary/10 italic uppercase">{t('direct_receipt')}</p>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-visible">
                  <Label htmlFor="warehouse-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('warehouse')}</Label>
                  <Controller
                    name="warehouse_id"
                    control={control}
                    render={({ field }) => (
                      <SmartCombobox
                        items={warehouseItems}
                        value={field.value}
                        onSelect={(item) => field.onChange(item.id)}
                        placeholder={tc('select_warehouse')}
                        className="mt-2 h-12 bg-surface-container-low border-none rounded-xl px-4 font-semibold uppercase text-foreground shadow-none"
                        disabled={isLocked || isWarehouseLocked}
                      />
                    )}
                  />
                  {errors.warehouse_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.warehouse_id.message}</span>}
                </div>

                <div className="col-span-full bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-hidden">
                  <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <MessageSquare className="w-12 h-12" />
                  </div>
                  <Label htmlFor="notes-area" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('notes')}</Label>
                  <Textarea
                    id="notes-area"
                    {...register('notes')}
                    disabled={isLocked || isWarehouseLocked}
                    className="mt-2 w-full bg-surface-container-low border-none rounded-xl p-4 focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10 outline-none transition-all text-body-md font-medium min-h-[100px] resize-none text-foreground shadow-none"
                    placeholder={tc('notes_placeholder')}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-operational-cyan/[0.02] p-8 rounded-2xl">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="p-3 bg-operational-cyan/10 rounded-xl text-operational-cyan">
                      <PackageSearch className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-label-sm font-bold uppercase text-foreground">{t('scan_or_search')}</h3>
                      <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase tracking-wider">{t('specification')}</p>
                    </div>
                  </div>

                  <ScanInput
                    onScan={handleScan}
                    scannerMode={true}
                    disabled={isLocked || isWarehouseLocked}
                    items={itemsData?.data || []}
                    placeholder={t('scan_placeholder')}
                    onError={(bc) => setScanError(t('no_item_found') + ': ' + bc)}
                    size="lg"
                  />
                  {scanError && <div dir="ltr" className="text-destructive text-label-xs font-bold uppercase ps-2 mt-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                    {scanError}
                  </div>}
                </div>

                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
                  <DocumentLineItemTable<LineItem>
                    lines={fields as unknown as LineItem[]}
                    isReadOnly={isLocked || isWarehouseLocked}
                    dense={true}
                    onRemoveLine={(id) => {
                      const idx = fields.findIndex(f => f.id === id);
                      if (idx >= 0) remove(idx);
                    }}
                    extraColumns={[
                      {
                        header: tc('table_headers.received_qty'),
                        cell: (field: LineItem) => {
                          const index = fields.findIndex(f => f.id === field.id);
                          const isOver = field.received_qty > field.qty;
                          return (
                            <input type="number"
                              dir="ltr"
                              disabled={isLocked || isWarehouseLocked}
                              className={cn(
                                "w-20 rounded-sm border border-surface-container-high/30 bg-surface-container-low text-center px-2 py-0.5 font-mono text-xs outline-none transition-all disabled:opacity-50 h-7",
                                isOver ? "border-amber-500 ring-1 ring-amber-500 bg-amber-500/10 text-amber-500 focus:border-amber-400" : "focus:ring-1 focus:ring-primary-fixed-dim/10"
                              )}
                              {...register(`lines.${index}.received_qty` as const, { valueAsNumber: true })}
                              onChange={e => {
                                const val = Number(e.target.value);
                                update(index, { ...fields[index], received_qty: val } as LineItem);
                              }}
                            />
                          );
                        }
                      },
                      {
                        header: tc('table_headers.lot_allocation'),
                        cell: (field: LineItem) => (
                          <button
                            type="button"
                            className="text-primary underline underline-offset-4 decoration-dotted decoration-primary/40 hover:decoration-primary text-label-xs font-semibold uppercase transition-all"
                            onClick={() => handleLotClick(field)}
                          >
                            {field.lot ? (
                              <span dir="ltr" className="font-mono">{field.lot.lot_number}</span>
                            ) : t('allocate_lot')}
                          </button>
                        )
                      }
                    ]}
                  />
                </div>
              </div>
            </div>
          </DocumentReadOnlyOverlay>

          <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8 pt-10">
            <div className="flex flex-col items-end gap-1 px-6">
              <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">
                {t('market_index_ref')}
              </p>
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-3 h-3" />
                <p dir="ltr" className="text-label-sm font-mono font-semibold">
                  1 {currencyId} = {currentFxRate} {baseCurrency}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-xl relative overflow-hidden min-w-[340px] group transition-all hover:shadow-2xl">
              <div className="absolute top-0 end-0 w-1 h-full bg-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group-hover:bg-primary transition-all" />

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-baseline gap-10">
                  <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('receipt_total', { currency: currencyId || '' })}</p>
                  <p dir="ltr" className="text-headline-lg font-display font-semibold text-foreground">
                    {formatCurrency(totalForeign, currencyId, locale as 'ar' | 'en')}
                  </p>
                </div>



                <div className="flex justify-between items-center gap-10">
                  <p className="text-label-xs font-semibold uppercase text-primary/20">{t('base_value', { currency: baseCurrency || '' })}</p>
                  <p dir="ltr" className="text-title-lg font-mono font-semibold text-primary/60">
                    {formatCurrency(totalForeign * currentFxRate, baseCurrency, locale as 'ar' | 'en')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DocumentLockWrapper>

        <FormFooter
          isLocked={isLocked || isWarehouseLocked}
          onCancel={() => router.push('/goods-received', { skipGuard: !isDirty })}
          actions={actions || workflowActions}
          onSubmit={handleSubmit(onSubmit)}
          isPending={isPending}
          submitLabel={isNew ? t('actions.submit') : tc('save')}
        />
      </form>

    </div>
  );
}


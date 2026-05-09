'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { useForm, Controller, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Wallet, 
  PackageSearch, 
  MessageSquare, 
  Send
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
  const locale = useLocale();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const lastResetId = useRef<string | null>(null);

  const { data: suppliers } = useSuppliers();
  const { data: warehouses } = useWarehouses();
  const { data: currencies } = useCurrencies();
  
  const createMutation = useCreateGRN({ onConflict });
  const updateMutation = useUpdateGRN(initialData?.id || '', { onConflict });

  const [scanError, setScanError] = useState('');
  
  const status = (initialData?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);

  const { handleSubmit, reset, control, register, getValues, formState: { errors, isDirty } } = useForm<GRNFormValues>({
    resolver: zodResolver(grnFormSchema),
    defaultValues: {
      supplier_id: initialData?.supplier_id || '',
      currency_id: initialData?.currency_id || 'SAR',
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
  const watchedLines = useWatch({ control, name: 'lines' });

  const baseCurrency = currencies?.find(c => c.is_base)?.code || 'SAR';
  const { data: fxRates } = useFXRates(currencyId, baseCurrency);
  const currentFxRate = fxRates?.[0]?.rate || 1;

  const totalForeign = useMemo(() => {
    return (watchedLines || []).reduce((acc, line) => acc + (line.received_qty * (line.unit_cost_foreign || 0)), 0);
  }, [watchedLines]);

  useEffect(() => {
    if (initialData && initialData.id !== lastResetId.current) {
      lastResetId.current = initialData.id;
      reset({
        supplier_id: initialData.supplier_id || '',
        currency_id: initialData.currency_id || 'SAR',
        warehouse_id: initialData.warehouse_id || 'wh-1',
        notes: initialData.notes || '',
        lines: initialData.lines || []
      }, { 
        keepDirty: false,
        keepTouched: false
      });
    }
  }, [initialData, reset]);


  const handleScan = async (barcode: string) => {
    try {
      setScanError('');
      const ItemSchema = z.object({
        data: z.array(z.object({
          id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
          primary_uom: z.object({ id: z.string(), code: z.string() })
        }))
      });
      const res = await apiClient.get(`/master-data/items?barcode=${barcode}`, ItemSchema);
      
      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        const currentLines = getValues("lines") || [];
        const index = currentLines.findIndex(l => l.item.id === item.id);

        if (index >= 0) {
          const existing = currentLines[index];
          update(index, { 
            ...existing, 
            qty: existing.qty + 1, 
            received_qty: existing.received_qty + 1 
          });
        } else {
          append({
            id: `new-${Date.now()}`,
            item: item,
            lot: null,
            qty: 1,
            received_qty: 1,
            uom_id: item.primary_uom.id,
            unit_cost_foreign: 0,
            unit_cost_base: 0
          });
        }
      } else {
        setScanError(t('no_item_found'));
      }
    } catch {
      setScanError(t('no_item_found'));
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
            onClick={() => router.push(`/goods-received/${id}/post`)}
            className="h-12 px-8 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-semibold uppercase shadow-xl shadow-operational-cyan/20 transition-all rounded-xl"
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

      if (isNew) {
        const result = await createMutation.mutateAsync(payload);
        toast.success(t('create_success'));
        router.push(`/goods-received/${result.id}`, { skipGuard: true });
      } else if (initialData) {
        await updateMutation.mutateAsync({
          ...payload,
          version: initialData.version
        });
        toast.success(t('update_success'));
      }
    } catch (error) {
      console.error('[GRNForm] Submit Error:', error);
      if (!(error as { isConflict?: boolean }).isConflict) {
        toast.error(tc('error_occurred'));
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-container-low pb-32">
      <DocumentLockBanner status={status} isLocked={isLocked} />
      
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
        </div>

        <DocumentLockWrapper isLocked={isLocked}>
          <DocumentReadOnlyOverlay isPosted={isLocked}>
            <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <Label htmlFor="supplier-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('supplier')}</Label>
            <Controller
              name="supplier_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2 h-12 bg-surface-container-low border-none rounded-lg px-4 font-semibold uppercase text-foreground shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all">
                    <SelectValue placeholder={tc('select_supplier')} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">
                        {locale === 'ar' ? s.name_ar : s.name_en} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplier_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.supplier_id.message}</span>}
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
              <Wallet className="w-12 h-12" />
            </div>
            <Label htmlFor="currency-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('order_currency')}</Label>
            <Controller
              name="currency_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2 h-12 bg-surface-container-low border-none rounded-lg px-4 font-semibold font-mono text-foreground shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                    {currencies?.map(c => (
                      <SelectItem key={c.id} value={c.code} className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary font-mono">
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.currency_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.currency_id.message}</span>}
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
              <PackageSearch className="w-12 h-12" />
            </div>
            <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('ref_document')}</p>
            <div className="mt-2">
              {initialData?.po_number ? (
                <Badge variant="outline" className="h-8 px-4 bg-primary/5 text-primary border-primary/20 text-label-xs font-semibold uppercase rounded-lg">
                  <span dir="ltr" className="font-mono">{initialData.po_number}</span>
                </Badge>
              ) : (
                <p className="font-semibold text-title-sm text-primary/10 italic uppercase">{t('direct_receipt')}</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <Label htmlFor="warehouse-select" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('warehouse')}</Label>
            <Controller
              name="warehouse_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2 h-12 bg-surface-container-low border-none rounded-lg px-4 font-semibold uppercase text-foreground shadow-none focus:ring-1 focus:ring-primary-fixed-dim/10 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border-none rounded-lg shadow-2xl">
                    {warehouses?.map(w => (
                      <SelectItem key={w.id} value={w.id} className="text-label-sm font-bold focus:bg-primary/10 focus:text-primary">
                        {locale === 'ar' ? w.nameAr : w.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.warehouse_id && <span className="text-label-xs text-destructive mt-1 font-bold">{errors.warehouse_id.message}</span>}
          </div>

            <div className="col-span-full bg-surface-container-lowest p-6 rounded-lg shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
              <div className="absolute top-0 end-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <MessageSquare className="w-12 h-12" />
              </div>
              <Label htmlFor="notes-area" className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('notes')}</Label>
              <Textarea 
                id="notes-area"
                {...register('notes')}
                disabled={isLocked}
                className="mt-2 w-full bg-surface-container-low border-none rounded-lg p-4 focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10 outline-none transition-all text-body-md font-medium min-h-[100px] resize-none text-foreground shadow-none" 
                placeholder={tc('notes_placeholder')} 
              />
            </div>
          </div>

          <div className="space-y-6">
            <ScanInput 
              onScan={handleScan} 
              placeholder={t('scan_placeholder')} 
              onError={(bc) => setScanError(t('no_item_found') + ': ' + bc)}
              className="bg-surface-container-lowest rounded-lg transition-all focus-within:ring-1 focus-within:ring-primary-fixed-dim/10 shadow-sm border border-surface-variant/5"
            />
            {scanError && <div dir="ltr" className="text-destructive text-label-xs font-semibold uppercase ps-2">{scanError}</div>}
            
            <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm border border-surface-variant/5">
              <DocumentLineItemTable<LineItem> 
                lines={fields as any} 
                isReadOnly={isLocked}
                onRemoveLine={(id) => {
                  const idx = fields.findIndex(f => f.id === id);
                  if (idx >= 0) remove(idx);
                }}
                extraColumns={[
                  {
                    header: tc('table_headers.received_qty'),
                    cell: (field: any) => {
                      const index = fields.findIndex(f => f.id === field.id);
                      return (
                        <input type="number" 
                          dir="ltr"
                          className="w-20 bg-surface-container-low rounded-lg text-center px-2 py-1.5 font-mono text-body-md focus:ring-1 focus:ring-primary-fixed-dim/10 outline-none transition-all"
                          {...register(`lines.${index}.received_qty` as const, { valueAsNumber: true })}
                          onChange={e => {
                            const val = Number(e.target.value);
                            update(index, { ...fields[index] as any, received_qty: val, qty: val });
                          }}
                        />
                      );
                    }
                  },
                  {
                    header: tc('table_headers.lot_allocation'),
                    cell: (field: any) => (
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
          <div className="flex flex-col items-end gap-1 px-6 border-e border-surface-container-high/20">
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

            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-xl relative overflow-hidden min-w-[340px] group transition-all hover:shadow-2xl border border-surface-variant/5">
              <div className="absolute top-0 end-0 w-1 h-full bg-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group-hover:bg-primary transition-all" />
              
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-baseline gap-10">
                  <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('receipt_total', { currency: currencyId })}</p>
                  <p dir="ltr" className="text-headline-lg font-display font-semibold text-foreground">{totalForeign.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                
                <div className="h-px bg-surface-container-high/20 w-full" />
                
                <div className="flex justify-between items-center gap-10">
                  <p className="text-label-xs font-semibold uppercase text-primary/20">{t('base_value', { currency: baseCurrency })}</p>
                  <p dir="ltr" className="text-title-lg font-mono font-semibold text-primary/60">
                    {(totalForeign * currentFxRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DocumentLockWrapper>

        <FormFooter 
          isLocked={isLocked}
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


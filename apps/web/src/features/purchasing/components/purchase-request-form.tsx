'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Trash2,
  Calendar,
  Package,
  Calculator,
  Send,
  Save,
  Building2,
  ShieldCheck,
  Edit3,
  ArrowRight,
  History
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { onFormError } from '@/hooks/useFormError';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { cn } from '@/lib/utils';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SmartCombobox, type ComboboxItem } from '@/components/shared/SmartCombobox';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useCreatePR } from '@/features/purchasing/hooks/useCreatePR';
import { useUpdatePR } from '@/features/purchasing/hooks/useUpdatePR';
import { useSubmitPR } from '@/features/purchasing/hooks/useSubmitPR';
import { useCancelPR } from '@/features/purchasing/hooks/useCancelPR';
import { useDeletePR } from '@/features/purchasing/hooks/useDeletePR';
import { PRDetail } from '@/features/purchasing/hooks/usePR';
import { ConvertToPOModal } from '@/features/purchasing/components/ConvertToPOModal';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { Item, Warehouse, ItemSchema, WarehouseSchema } from '@/types/master-data';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/layouts/FormLayout';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuth } from '@/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';

const lineItemSchema = z.object({
  id: z.string().optional(), // For existing lines
  item_id: z.string().min(1),
  item: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    name_ar: z.string().optional(),
    name_en: z.string().optional(),
    image: z.string().optional().nullable(),
    primary_uom: z.object({
      code: z.string(),
      name: z.string().optional()
    }),
    min_stock_level: z.number().optional(),
    reorder_point: z.number().optional(),
  }),
  req_qty: z.number().min(0.01),
  uom_id: z.string().min(1),
});

const formSchema = z.object({
  department_id: z.string().optional().nullable().or(z.literal('')),
  expected_date: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineItemSchema).min(1),
});

type PurchaseRequestFormValues = z.infer<typeof formSchema>;

interface PurchaseRequestFormProps {
  initialData?: PRDetail;
  onConflict?: () => void;
}

interface QuantityInputProps {
  value: number | string;
  onChange: (val: number | "") => void;
  disabled?: boolean;
  isInvalid?: boolean;
  className?: string;
}

const QuantityInput = React.memo(function QuantityInput({ value, onChange, disabled, isInvalid, className }: QuantityInputProps) {
  const [localValue, setLocalValue] = React.useState(value !== undefined && value !== null ? String(value) : "");

  React.useEffect(() => {
    setLocalValue(value !== undefined && value !== null ? String(value) : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalValue(rawVal);
      if (rawVal === '' || rawVal === '.') {
        onChange('');
      } else {
        const parsed = parseFloat(rawVal);
        onChange(isNaN(parsed) ? '' : parsed);
      }
    }
  };

  const handleBlur = () => {
    let finalVal = 1;
    if (localValue === '' || localValue === '.') {
      finalVal = 1;
    } else {
      const parsed = parseFloat(localValue);
      if (isNaN(parsed) || parsed <= 0) {
        finalVal = 1;
      } else {
        finalVal = parsed;
      }
    }
    setLocalValue(String(finalVal));
    onChange(finalVal);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      aria-invalid={isInvalid}
      value={localValue}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      dir="ltr"
    />
  );
});

export function PurchaseRequestForm({ initialData, onConflict }: PurchaseRequestFormProps) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const { user, activeScope } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = React.useState(false);
  const [convertToPOOpen, setConvertToPOOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<PurchaseRequestFormValues | null>(null);
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());

  const status = initialData?.status as DocumentStatus;
  const isLocked = isDocumentLocked('PR', status);
  const isFormDisabled = initialData ? status !== 'DRAFT' : false;

  // Mocks/Hooks for data selection
  const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
  const { data: itemsData } = useMasterDataList('items', ItemSchema);

  const createPR = useCreatePR();
  const updatePR = useUpdatePR({ onConflict });
  const submitPR = useSubmitPR({ onConflict });
  const cancelPR = useCancelPR({ onConflict });
  const deletePR = useDeletePR();
  const { playSound } = useAudioFeedback();

  const departmentItems = React.useMemo(() => {
    return warehouses?.data?.map((w: Warehouse) => ({
      id: w.id,
      name: w.name || '',
      name_en: w.name || '',
      name_ar: w.name || '',
    })) ?? [];
  }, [warehouses?.data]);

  const comboboxItems = React.useMemo(() => {
    return itemsData?.data?.map((i: Item) => {
      const displayName = i.name || '';
      return {
        id: i.id,
        name: `${i.code} - ${displayName}`,
        name_en: `${i.code} - ${displayName}`,
        name_ar: `${i.code} - ${displayName}`,
      };
    }) ?? [];
  }, [itemsData?.data]);

  const form = useForm<PurchaseRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      department_id: initialData.departmentId || '',
      expected_date: initialData.expectedDate ? initialData.expectedDate.split('T')[0] : '',
      notes: initialData.notes || '',
      lines: initialData.lines.map(l => ({
        id: l.id,
        item_id: l.item.id,
        item: {
          id: l.item.id,
          code: l.item.code,
          name: l.item.name || l.item.nameEn || l.item.nameAr || '',
          name_ar: l.item.nameAr || '',
          name_en: l.item.nameEn || '',
          image: l.item.image || null,
          primary_uom: {
            code: l.item.primaryUom?.code || 'EA',
            name: l.item.primaryUom?.name || l.item.primaryUom?.code || 'EA'
          },
          min_stock_level: l.item.minStockLevel,
          reorder_point: l.item.reorderPoint,
        },
        req_qty: l.reqQty || 0,
        uom_id: l.uomId,
      })),
    } : {
      department_id: '',
      expected_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [],
    },
  });

  const { router } = useUnsavedChangesGuard(form.formState.isDirty);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchLines = form.watch('lines') || [];

  const handleScan = async (barcode: string) => {
    const clean = barcode.trim();
    let item = itemsData?.data?.find((i: Item) => i.barcode === clean || i.code === clean);
    if (!item) {
      try {
        const res = await apiClient.get(
          `/items?search=${encodeURIComponent(clean)}`,
          z.object({ data: z.array(z.unknown()) })
        );
        item = (res as { data: NonNullable<typeof itemsData>['data'] })?.data?.[0];
      } catch {
        // ignore fallback errors
      }
    }
    if (item) {
      const currentLines = form.getValues('lines') || [];
      const index = currentLines.findIndex(l => l.item.id === item.id);

      if (index >= 0) {
        const existing = currentLines[index];
        form.setValue(`lines.${index}.req_qty`, (existing.req_qty || 0) + 1);
        playSound('success');
        toast.success(tc('item_added_quantity_updated', { name: item.name }));
      } else {
        append({
          item_id: item.id,
          item: {
            id: item.id,
            code: item.code,
            name: item.name,
            name_ar: item.name,
            name_en: item.name,
            image: item.image || null,
            primary_uom: {
              code: item.primaryUom?.code || 'EA',
              name: item.primaryUom?.name || item.primaryUom?.code || 'EA'
            },
            min_stock_level: item.minStockLevel,
            reorder_point: item.reorderPoint,
          },
          req_qty: 1,
          uom_id: item.primaryUom?.id || 'EA',
        });
        playSound('success');
        toast.success(tc('item_added', { name: item.name }));
      }
    } else {
      playSound('error');
      toast.error(tc('not_found'));
    }
  };

  const onSave = async (values: PurchaseRequestFormValues, submitAfterSave = false) => {
    setIsSubmitting(true);
    try {
      let prId = initialData?.id;

      // Map back to API format
      const selectedWh = warehouses?.data?.find((w: Warehouse) => w.id === values.department_id) ||
        warehouses?.data?.find((w: Warehouse) => w.id === activeScope.warehouseId);
      const branchId = selectedWh?.branchId || activeScope.branchId || '';
      const warehouseId = selectedWh?.id || activeScope.warehouseId || '';

      const payload = {
        branchId,
        warehouseId,
        departmentId: values.department_id ? values.department_id : undefined,
        notes: values.notes || '',
        lines: values.lines.map(l => ({
          id: l.id,
          itemId: l.item_id,
          quantity: l.req_qty,
        }))
      };

      if (prId) {
        await updatePR.mutateAsync({
          id: prId,
          payload: { ...payload, version: initialData?.version ?? 0 }
        });
      } else {
        const res = await createPR.mutateAsync({
          payload,
          headers: { 'X-Idempotency-Key': idempotencyKey }
        });
        prId = res.id;
      }

      if (submitAfterSave && prId) {
        const currentVersion = initialData ? ((initialData.version ?? 0) + 1) : 1;
        await submitPR.mutateAsync({ id: prId, version: currentVersion });
        playSound('success');
        toast.success(t('submit_success'));
      } else {
        playSound('success');
        toast.success(tc('save') + ' ' + tc('completed'));
      }

      router.push(`/purchase-requests/${prId}`, { skipGuard: true });
    } catch (error) {
      console.error(error);
      playSound('error');
      let isToastShown = false;
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        if (errObj._isToastShown === true) {
          isToastShown = true;
        }
      }
      if (!isToastShown) {
        toast.error(tc('error'));
      }
    } finally {
      setIsSubmitting(false);
      setSubmitConfirmOpen(false);
    }
  };

  const handleSubmitClick = (values: PurchaseRequestFormValues) => {
    setPendingValues(values);
    setSubmitConfirmOpen(true);
  };

  const isStrictlyDraft = initialData?.status === 'DRAFT' || !initialData;

  const workflowActions = (
    <div className="flex items-center gap-3">
      {/* Standard Submit Button for Drafts */}
      {isStrictlyDraft && (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={form.handleSubmit((v) => onSave(v, false), onFormError)}
            className="h-12 px-8 border-none bg-card border border-border shadow-sm text-foreground text-label-xs font-semibold uppercase rounded-xl hover:bg-surface-container-high/50 active:scale-95 transition-all shadow-xl shadow-black/5"
          >
            <Save className="w-3.5 h-3.5 me-2" />
            {tc('save')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmitClick, onFormError)}
            className="w-[300px] md:w-auto flex items-center justify-center h-12 px-10 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-semibold uppercase rounded-xl transition-all active:scale-95 shadow-xl shadow-operational-cyan/20"
          >
            {isSubmitting ? tc('saving') : (
              <>
                <Send className="w-3.5 h-3.5 me-2" />
                {t('submit')}
              </>
            )}
          </Button>

          {/* Cancel Button for Draft Documents */}
          {initialData?.id && (
            <Button
              type="button"
              variant="outline"
              disabled={cancelPR.isPending}
              onClick={async () => {
                const confirmed = window.confirm(t('cancel_confirm') || 'Are you sure you want to cancel this request?');
                if (!confirmed) return;
                try {
                  await cancelPR.mutateAsync({ id: initialData.id, version: initialData.version ?? 0 });
                  toast.success(t('cancel_success'));
                  router.push('/purchase-requests', { skipGuard: true });
                } catch (error) {
                  const isToastShown = error && typeof error === 'object' && (error as Record<string, unknown>)._isToastShown === true;
                  if (!isToastShown) {
                    toast.error(tc('error'));
                  }
                }
              }}
              className="h-12 px-8 border-none bg-red-500/10 text-red-500 text-label-xs font-semibold uppercase rounded-xl hover:bg-red-500/20 active:scale-95 transition-all shadow-xl shadow-black/5"
            >
              <Trash2 className="w-3.5 h-3.5 me-2" />
              {t('cancel_request')}
            </Button>
          )}

          {/* Delete Button for Draft Documents */}
          {initialData?.id && (
            <Button
              type="button"
              variant="outline"
              disabled={deletePR.isPending}
              onClick={async () => {
                const confirmed = window.confirm('Are you sure you want to delete this draft request? This action is permanent.');
                if (!confirmed) return;
                try {
                  await deletePR.mutateAsync({ id: initialData.id, version: initialData.version });
                  toast.success('Draft request deleted successfully');
                  router.push('/purchase-requests', { skipGuard: true });
                } catch (error) {
                  const isToastShown = error && typeof error === 'object' && (error as Record<string, unknown>)._isToastShown === true;
                  if (!isToastShown) {
                    toast.error(tc('error'));
                  }
                }
              }}
              className="w-full md:w-auto flex items-center justify-center h-12 px-8 border-none bg-status-error/10 text-status-error text-label-xs font-semibold uppercase rounded-xl hover:bg-status-error/20 active:scale-95 transition-all shadow-xl shadow-black/5"
            >
              <Trash2 className="w-3.5 h-3.5 me-2" />
              {tc('actions.delete') || 'Delete'}
            </Button>
          )}

          {/* EDIT Action ONLY for Drafts (if needed) */}
          {initialData?.id && (
            <ActionGuard documentType="PR" status={status} action="EDIT" role={user?.role}>
              <PermissionGate action="update" resource="pr">
                <Button
                  onClick={() => router.push(`/purchase-requests/${initialData?.id}/edit`)}
                  variant="outline"
                  className="w-full md:w-auto flex items-center justify-center h-12 px-8 border-none bg-card border border-border shadow-sm text-operational-cyan text-label-xs font-semibold uppercase rounded-xl hover:bg-operational-cyan/5 transition-all shadow-xl shadow-black/5"
                >
                  <Edit3 className="w-4 h-4 me-2 opacity-60" />
                  {tc('edit')}
                </Button>
              </PermissionGate>
            </ActionGuard>
          )}
        </>
      )}

      {/* Workflow Actions for Locked Documents */}
      {isLocked && (
        <>
          <ActionGuard documentType="PR" status={status} action="APPROVE" role={user?.role}>
            <PermissionGate action="approve" resource="pr">
              <Button
                onClick={() => router.push(`/purchase-requests/${initialData?.id}/approve`)}
                className="w-full md:w-auto flex items-center justify-center h-12 px-10 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase shadow-xl shadow-operational-cyan/20 rounded-xl transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 me-2" />
                {t('go_to_approval')}
              </Button>
            </PermissionGate>
          </ActionGuard>

          <ActionGuard documentType="PR" status={status} action="CONVERT_TO_PO" role={user?.role}>
            <PermissionGate action="create" resource="po">
              <Button
                onClick={() => setConvertToPOOpen(true)}
                className="w-full md:w-auto flex items-center justify-center bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors h-12 px-10 text-label-xs font-semibold uppercase rounded-xl active:scale-95 border-none shadow-xl shadow-primary/20"
              >
                <ArrowRight className="w-4 h-4 me-2 rtl:rotate-180" />
                {t('convert_to_po')}
              </Button>
            </PermissionGate>
          </ActionGuard>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full pb-32 h-fit min-h-full shrink-0">
      <DocumentLockBanner status={status} isLocked={isFormDisabled} />

      <Form {...form}>
        <form className="flex-1 w-full max-w-[1400px] mx-auto px-0 sm:px-4 md:px-8 py-2 md:py-8 space-y-4 md:space-y-8">
          <DocumentLockWrapper isLocked={isFormDisabled}>
            <div className="space-y-4 md:space-y-10 w-full bg-card text-card-foreground sm:border border-border shadow-sm px-4 py-4 sm:p-6 md:p-8 rounded-none sm:rounded-2xl relative transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-title-md md:text-title-lg font-semibold text-operational-cyan uppercase flex items-center gap-2 md:gap-3">
                    {t('detail_title')}
                    {isFormDisabled && <Badge variant="outline" className="bg-surface-container-high/50 border-none text-muted-foreground/60 scale-90 md:scale-100 origin-left"><History className="w-3 h-3 me-1" /> {tc('read_only')}</Badge>}
                  </h3>
                </div>
                {initialData?.documentNumber && (
                  <span className="font-mono text-label-xs md:text-label-sm font-semibold text-muted-foreground/40 bg-card border border-border shadow-sm px-3 py-1 md:px-4 md:py-1.5 rounded-full">
                    {initialData.documentNumber}
                  </span>
                )}
              </div>

              {/* Step 1: Request Header */}
              <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm px-0 py-4 sm:px-4 sm:py-6 md:p-8 rounded-none sm:rounded-2xl relative">
                <div className="flex items-center gap-3 mb-4 md:mb-8 pb-4 md:pb-6 border-b border-border/40 md:border-none">
                  <div className="p-2 md:p-3 rounded-xl bg-operational-cyan/10 text-operational-cyan">
                    <Building2 className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div>
                    <h3 className="text-label-md md:text-body-md font-semibold uppercase text-foreground">{t('new_intent')}</h3>
                    <p className="text-label-xxs md:text-label-xs font-bold text-muted-foreground/60 uppercase mt-0.5">{t('specification')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  <FormField<PurchaseRequestFormValues, 'department_id'>
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 flex items-center gap-2 ps-1">
                          <Package className="w-3 h-3" />
                          {t('department')}
                        </FormLabel>
                        <FormControl>
                          <SmartCombobox
                            items={departmentItems}
                            value={field.value ?? undefined}
                            onSelect={(item) => field.onChange(item.id)}
                            placeholder={tc('select_warehouse')}
                            className="bg-card h-11 rounded-xl text-label-xs font-semibold uppercase focus:ring-1 focus:ring-brand-gold/50"
                            disabled={isFormDisabled}
                          />
                        </FormControl>
                        <FormMessage className="text-label-xxs font-semibold uppercase" />
                      </FormItem>
                    )}
                  />

                  <FormField<PurchaseRequestFormValues, 'expected_date'>
                    control={form.control}
                    name="expected_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 flex items-center gap-2 ps-1">
                          <Calendar className="w-3 h-3" />
                          {t('expected_date')}
                        </FormLabel>
                        <FormControl>
                          <Input type="date" dir="ltr" className="bg-card h-11 rounded-xl font-semibold text-label-xs uppercase rtl:text-right" {...field} disabled={isFormDisabled} />
                        </FormControl>
                        <FormMessage className="text-label-xxs font-semibold uppercase" />
                      </FormItem>
                    )}
                  />

                  <FormField<PurchaseRequestFormValues, 'notes'>
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-3">
                        <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 ps-1">{tc('notes')}</FormLabel>
                        <FormControl>
                          <Input placeholder={tc('notes')} className="bg-card h-11 rounded-xl font-semibold text-label-xs uppercase" {...field} disabled={isFormDisabled} />
                        </FormControl>
                        <FormMessage className="text-label-xxs font-semibold uppercase" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Step 2: Line Items */}
              <div className="space-y-4 md:space-y-6">
                <div className="bg-operational-cyan/[0.02] p-4 sm:p-6 md:p-8 rounded-2xl">
                  <div className="flex items-center gap-3 md:gap-6 mb-4 md:mb-6">
                    <div className="p-2 md:p-3 bg-operational-cyan/10 rounded-xl text-operational-cyan">
                      <Calculator className="w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-label-sm font-bold uppercase text-foreground">{tc('items')}</h3>
                      <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase tracking-wider">{t('specification')}</p>
                    </div>
                  </div>

                  {!isFormDisabled && (
                    <ScanInput
                      onScan={handleScan}
                      items={itemsData?.data as ComboboxItem[] || []}
                      placeholder={tc('select_item')}
                      size="lg"
                      label={t('scan_or_search')}
                    />
                  )}
                </div>

                <div className="bg-card border-y border-x-0 sm:border border-border shadow-sm rounded-none sm:rounded-2xl overflow-hidden shadow-sm">
                  <DocumentLineItemTable
                    mobileLayoutPattern="purchase-request-form"
                    lines={fields.map((f, idx) => {
                      const live = watchLines[idx] || {};
                      const item = live.item || f.item || {};
                      const primaryUom = item.primary_uom;
                      return {
                        ...f,
                        ...live,
                        itemId: live.item_id || f.item_id,
                        reqQty: live.req_qty || f.req_qty,
                        uomId: live.uom_id || f.uom_id,
                        qty: live.req_qty || f.req_qty,
                        item: {
                          ...item,
                          image: item.image || null,
                          primaryUom: primaryUom ? {
                            code: primaryUom.code,
                            name: primaryUom.name || primaryUom.code
                          } : undefined
                        }
                      };
                    }) as unknown as LineItem[]}
                    isReadOnly={isFormDisabled}
                    hideLotColumns={true}
                    noCollapse={false}
                    onRemoveLine={(id) => {
                      const idx = fields.findIndex(f => f.id === id);
                      if (idx >= 0) remove(idx);
                    }}
                    renderQty={(line) => {
                      const index = fields.findIndex(f => f.id === line.id);
                      const formLine = fields[index];
                      const minStock = formLine?.item?.min_stock_level;
                      const reorderPt = formLine?.item?.reorder_point;
                      return (
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          {isFormDisabled ? (
                            <span className="text-sm font-black text-brand-gold bg-brand-gold/10 border border-brand-gold rounded-lg px-2 h-9 flex items-center justify-center w-full" dir="ltr">
                              {line.qty}
                            </span>
                          ) : (
                            <QuantityInput
                              value={form.watch(`lines.${index}.req_qty`)}
                              onChange={(val) => {
                                form.setValue(`lines.${index}.req_qty`, val === '' ? 0 : val, { shouldDirty: true, shouldValidate: true });
                              }}
                              disabled={isFormDisabled || isSubmitting}
                              className="w-full text-center font-black text-lg bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-[#b48e67] focus:ring-1 focus:ring-[#b48e67] rounded-lg outline-none transition-all"
                            />
                          )}
                          {(minStock !== undefined || reorderPt !== undefined) && (
                            <span className="text-label-xxs font-semibold text-muted-foreground/50 whitespace-nowrap">
                              {minStock !== undefined ? `Min: ${minStock}` : ''}
                              {minStock !== undefined && reorderPt !== undefined ? ' / ' : ''}
                              {reorderPt !== undefined ? `Reorder: ${reorderPt}` : ''}
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                {/* Summary */}
                <div className="flex items-center justify-end px-4 py-4 sm:p-6 md:px-8 md:py-6 bg-card border-y border-x-0 sm:border border-border shadow-sm rounded-none sm:rounded-xl">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="text-right">
                      <div className="text-label-xxs md:text-label-xs font-semibold uppercase text-muted-foreground/30">{tc('total_items')}</div>
                      <div className="text-title-md md:text-title-lg font-black text-foreground uppercase tracking-tight">
                        {fields.length} <span className="text-operational-cyan">{tc('items')}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-operational-cyan/10 flex items-center justify-center text-operational-cyan">
                      <Package className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DocumentLockWrapper>

          <FormFooter
            isLocked={isFormDisabled}
            cancelLabel={tc('back')}
            onCancel={() => router.push('/purchase-requests')}
            actions={workflowActions}
            isSaving={isSubmitting}
            isDirty={form.formState.isDirty}
            isValid={form.formState.isValid}
          />

          <PostConfirmDialog
            open={submitConfirmOpen}
            onOpenChange={setSubmitConfirmOpen}
            onConfirm={() => { if (pendingValues) onSave(pendingValues, true); }}
            title={t('submit')}
            description={t('approve_confirm_desc')}
            warningText={t('irreversible')}
          />

          {initialData && (
            <ConvertToPOModal
              pr={initialData}
              open={convertToPOOpen}
              onOpenChange={setConvertToPOOpen}
            />
          )}
        </form>
      </Form>
    </div>
  );
}

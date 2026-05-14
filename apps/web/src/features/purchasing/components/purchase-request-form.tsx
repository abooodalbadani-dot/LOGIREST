'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Trash2,
  Plus,
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
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useCreatePR } from '@/features/purchasing/hooks/useCreatePR';
import { useUpdatePR } from '@/features/purchasing/hooks/useUpdatePR';
import { useSubmitPR } from '@/features/purchasing/hooks/useSubmitPR';
import { PRDetail } from '@/features/purchasing/hooks/usePR';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { ScanInput } from '@/components/shared/ScanInput/ScanInput';
import { Item, Warehouse, ItemSchema, WarehouseSchema } from '@/types/master-data';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

import { DocumentLockBanner, DocumentLockWrapper } from '@/components/shared/DocumentLockBanner';
import { FormFooter } from '@/components/shared/FormFooter';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const lineItemSchema = z.object({
  id: z.string().optional(), // For existing lines
  item_id: z.string().min(1),
  item: z.object({
    id: z.string(),
    code: z.string(),
    name_ar: z.string(),
    name_en: z.string(),
    primary_uom: z.object({
      code: z.string()
    })
  }),
  req_qty: z.number().min(0.01),
  uom_id: z.string().min(1),
});

const formSchema = z.object({
  department_id: z.string().min(1),
  expected_date: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineItemSchema).min(1),
});

type PurchaseRequestFormValues = z.infer<typeof formSchema>;

interface PurchaseRequestFormProps {
  initialData?: PRDetail;
  onConflict?: () => void;
}

export function PurchaseRequestForm({ initialData, onConflict }: PurchaseRequestFormProps) {
  const locale = useLocale();
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<PurchaseRequestFormValues | null>(null);

  const status = initialData?.status as DocumentStatus;
  const isLocked = isDocumentLocked('PR', status);

  // Mocks/Hooks for data selection
  const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
  const { data: itemsData } = useMasterDataList('items', ItemSchema);

  const createPR = useCreatePR();
  const updatePR = useUpdatePR({ onConflict });
  const submitPR = useSubmitPR({ onConflict });

  const form = useForm<PurchaseRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      department_id: initialData.department_id || '',
      expected_date: initialData.expected_date ? initialData.expected_date.split('T')[0] : '',
      notes: initialData.notes || '',
      lines: initialData.lines.map(l => ({
        id: l.id,
        item_id: l.item.id,
        item: {
          id: l.item.id,
          code: l.item.code,
          name_ar: l.item.name_ar,
          name_en: l.item.name_en,
          primary_uom: {
            code: l.item.primary_uom?.code || 'EA'
          }
        },
        req_qty: l.req_qty || 0,
        uom_id: l.uom_id,
      })),
    } : {
      department_id: '',
      expected_date: '',
      notes: '',
      lines: [],
    },
  });

  const { router } = useUnsavedChangesGuard(form.formState.isDirty);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const handleScan = (barcode: string) => {
    const item = itemsData?.data?.find((i: Item) => i.barcode === barcode || i.code === barcode);
    if (item) {
      const currentLines = form.getValues('lines') || [];
      const index = currentLines.findIndex(l => l.item.id === item.id);

      if (index >= 0) {
        const existing = currentLines[index];
        form.setValue(`lines.${index}.req_qty`, (existing.req_qty || 0) + 1);
        toast.success(tc('item_added_quantity_updated', { name: locale === 'ar' ? item.name_ar : item.name_en }));
      } else {
        append({
          item_id: item.id,
          item: {
            id: item.id,
            code: item.code,
            name_ar: item.name_ar,
            name_en: item.name_en,
            primary_uom: {
              code: item.primary_uom?.code || 'EA'
            }
          },
          req_qty: 1,
          uom_id: item.primary_uom?.id || 'EA',
        });
        toast.success(tc('item_added', { name: locale === 'ar' ? item.name_ar : item.name_en }));
      }
    } else {
      toast.error(tc('not_found'));
    }
  };

  const onSave = async (values: PurchaseRequestFormValues, submitAfterSave = false) => {
    setIsSubmitting(true);
    try {
      let prId = initialData?.id;

      // Map back to API format
      const payload = {
        ...values,
        lines: values.lines.map(l => ({
          id: l.id,
          item_id: l.item_id,
          req_qty: l.req_qty,
          uom_id: l.uom_id
        }))
      };

      if (prId) {
        await updatePR.mutateAsync({
          id: prId,
          payload: { ...payload, version: initialData?.version ?? 0 }
        });
      } else {
        const res = await createPR.mutateAsync(payload);
        prId = res.id;
      }

      if (submitAfterSave && prId) {
        const currentVersion = initialData ? ((initialData.version ?? 0) + 1) : 1;
        await submitPR.mutateAsync({ id: prId, version: currentVersion });
        toast.success(t('submit_success'));
      } else {
        toast.success(tc('save') + ' ' + tc('completed'));
      }

      router.push('/purchase-requests', { skipGuard: true });
    } catch (error) {
      console.error(error);
      toast.error(tc('error'));
    } finally {
      setIsSubmitting(false);
      setSubmitConfirmOpen(false);
    }
  };

  const handleSubmitClick = (values: PurchaseRequestFormValues) => {
    setPendingValues(values);
    setSubmitConfirmOpen(true);
  };

  const workflowActions = (
    <div className="flex items-center gap-3">
      {/* Standard Submit Button for Drafts */}
      {!isLocked && (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={form.handleSubmit((v) => onSave(v, false))}
            className="h-12 px-8 border-none bg-surface-container-low text-foreground text-label-xs font-semibold uppercase rounded-xl hover:bg-surface-container-high/50 active:scale-95 transition-all shadow-xl shadow-black/5"
          >
            <Save className="w-3.5 h-3.5 me-2" />
            {tc('save')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmitClick)}
            className="h-12 px-10 bg-operational-cyan hover:brightness-110 text-white text-label-xs font-semibold uppercase rounded-xl transition-all active:scale-95 shadow-xl shadow-operational-cyan/20"
          >
            {isSubmitting ? tc('saving') : (
              <>
                <Send className="w-3.5 h-3.5 me-2" />
                {t('submit')}
              </>
            )}
          </Button>
        </>
      )}

      {/* Workflow Actions for Locked Documents */}
      {isLocked && (
        <>
          <ActionGuard documentType="PR" status={status} action="EDIT" role={user?.role || 'WH_KEEPER'}>
            <PermissionGate action="update" resource="pr">
              <Button
                onClick={() => router.push(`/purchase-requests/${initialData?.id}/edit`)}
                variant="outline"
                className="h-12 px-8 border-none bg-surface-container-low text-operational-cyan text-label-xs font-semibold uppercase rounded-xl hover:bg-operational-cyan/5 transition-all shadow-xl shadow-black/5"
              >
                <Edit3 className="w-4 h-4 me-2 opacity-60" />
                {tc('edit')}
              </Button>
            </PermissionGate>
          </ActionGuard>

          <ActionGuard documentType="PR" status={status} action="APPROVE" role={user?.role || 'WH_KEEPER'}>
            <PermissionGate action="approve" resource="pr">
              <Button
                onClick={() => router.push(`/purchase-requests/${initialData?.id}/approve`)}
                className="h-12 px-10 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase shadow-xl shadow-operational-cyan/20 rounded-xl transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 me-2" />
                {t('go_to_approval')}
              </Button>
            </PermissionGate>
          </ActionGuard>

          <ActionGuard documentType="PR" status={status} action="CONVERT_TO_PO" role={user?.role || 'WH_KEEPER'}>
            <PermissionGate action="create" resource="po">
              <Button
                onClick={() => router.push(`/purchase-orders/new?pr_id=${initialData?.id}`)}
                className="primary-gradient h-12 px-10 text-white text-label-xs font-semibold uppercase rounded-xl transition-all active:scale-95 border-none shadow-xl shadow-primary/20"
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
    <div className="flex flex-col min-h-screen bg-surface-container-low pb-32">
      <DocumentLockBanner status={status} isLocked={isLocked} />

      <Form {...form}>
        <form className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
          <DocumentLockWrapper isLocked={isLocked}>
            <div className="space-y-10 w-full bg-surface-container-lowest p-8 rounded-2xl relative transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-title-lg font-semibold text-operational-cyan uppercase flex items-center gap-3">
                    {t('detail_title')}
                    {isLocked && <Badge variant="outline" className="bg-surface-container-high/50 border-none text-muted-foreground/60"><History className="w-3 h-3 me-1" /> {tc('read_only')}</Badge>}
                  </h3>
                </div>
                {initialData?.document_number && (
                  <span className="font-mono text-label-sm font-semibold text-muted-foreground/40 bg-surface-container-low px-4 py-1.5 rounded-full">
                    {initialData.document_number}
                  </span>
                )}
              </div>

              {/* Step 1: Request Header */}
              <div className="bg-surface-container-low p-8 rounded-2xl relative">
                <div className="flex items-center gap-4 mb-8 pb-6 border-none">
                  <div className="p-3 rounded-xl bg-operational-cyan/10 text-operational-cyan">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-body-md font-semibold uppercase text-foreground">{t('new_intent')}</h3>
                    <p className="text-label-xs font-bold text-muted-foreground/60 uppercase mt-0.5">{t('specification')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FormField<PurchaseRequestFormValues, 'department_id'>
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-3 flex items-center gap-2 ps-1">
                          <Package className="w-3 h-3" />
                          {t('department')}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-surface-container-lowest border-none h-11 rounded-xl text-label-xs font-semibold uppercase focus:ring-1 focus:ring-operational-cyan/30">
                              <SelectValue placeholder={tc('select_warehouse')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-surface-container-low border-none rounded-xl">
                            {warehouses?.data?.map((w: Warehouse) => (
                              <SelectItem key={w.id} value={w.id} className="text-label-xs font-bold">
                                {locale === 'ar' ? w.name_ar : w.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Input type="date" className="bg-surface-container-lowest border-none h-11 rounded-xl font-semibold text-label-xs uppercase focus-visible:ring-operational-cyan/30" {...field} />
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
                          <Input placeholder={tc('notes')} className="bg-surface-container-lowest border-none h-11 rounded-xl font-semibold text-label-xs uppercase focus-visible:ring-operational-cyan/30" {...field} />
                        </FormControl>
                        <FormMessage className="text-label-xxs font-semibold uppercase" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Step 2: Line Items */}
              <div className="space-y-6">
                <div className="bg-operational-cyan/[0.02] p-8 rounded-2xl">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="p-3 bg-operational-cyan/10 rounded-xl text-operational-cyan">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-label-sm font-bold uppercase text-foreground">{tc('items')}</h3>
                      <p className="text-label-xxs font-semibold text-muted-foreground/40 uppercase tracking-wider">{t('specification')}</p>
                    </div>
                  </div>

                  {!isLocked && (
                    <ScanInput
                      onScan={handleScan}
                      onManualTrigger={() => append({
                        item_id: '',
                        item: { id: '', code: '', name_ar: '', name_en: '', primary_uom: { code: 'EA' } },
                        req_qty: 1,
                        uom_id: 'EA'
                      })}
                      placeholder={tc('select_item')}
                      size="lg"
                      label={t('scan_or_search')}
                    />
                  )}
                </div>

                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
                  <DocumentLineItemTable
                    lines={fields.map(f => ({ ...f, qty: f.req_qty })) as LineItem[]}
                    isReadOnly={isLocked}
                    hideLotColumns={true}
                    onRemoveLine={(id) => {
                      const idx = fields.findIndex(f => f.id === id);
                      if (idx >= 0) remove(idx);
                    }}
                    renderQty={(line) => {
                      const index = fields.findIndex(f => f.id === line.id);
                      return (
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isLocked}
                            className="w-24 bg-surface-container-low border-none h-10 rounded-xl font-mono font-bold text-center text-body-md focus:ring-1 focus:ring-operational-cyan/30 outline-none"
                            dir="ltr"
                            {...form.register(`lines.${index}.req_qty`, { valueAsNumber: true })}
                          />
                        </div>
                      );
                    }}
                    extraColumns={[
                      {
                        header: tc('item'),
                        cell: (line) => {
                          const index = fields.findIndex(f => f.id === line.id);
                          if (isLocked) return null; // Already shown in name column
                          
                          return (
                            <div className="min-w-[200px]">
                              <Select
                                onValueChange={(val) => {
                                  const item = itemsData?.data?.find((i: Item) => i.id === val);
                                  form.setValue(`lines.${index}.item_id`, val || '');
                                  form.setValue(`lines.${index}.item`, {
                                    id: item?.id || '',
                                    code: item?.code || '',
                                    name_ar: item?.name_ar || '',
                                    name_en: item?.name_en || '',
                                    primary_uom: { code: item?.primary_uom?.code || 'EA' }
                                  });
                                  form.setValue(`lines.${index}.uom_id`, item?.primary_uom?.id || 'EA');
                                }}
                                value={form.watch(`lines.${index}.item_id`)}
                              >
                                <SelectTrigger className="h-10 bg-surface-container-low border-none rounded-xl text-label-xs font-semibold uppercase">
                                  <SelectValue placeholder={tc('select_item')} />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-container-low border-none rounded-xl max-h-[300px]">
                                  {itemsData?.data?.map((i: Item) => (
                                    <SelectItem key={i.id} value={i.id} className="text-label-xs font-bold">
                                      {i.code} - {locale === 'ar' ? i.name_ar : i.name_en}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                      }
                    ]}
                  />
                </div>

                {/* Summary */}
                <div className="flex items-center justify-end p-8 bg-surface-container-low rounded-xl">
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-label-xs font-semibold uppercase text-muted-foreground/30">{tc('total_items')}</div>
                      <div className="text-title-lg font-black text-foreground uppercase tracking-tight">
                        {fields.length} <span className="text-operational-cyan">{tc('items')}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-operational-cyan/10 flex items-center justify-center text-operational-cyan">
                      <Package className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DocumentLockWrapper>

          <FormFooter
            isLocked={isLocked}
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
        </form>
      </Form>
    </div>
  );
}

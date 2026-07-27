'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Plus, Calendar, Package, Calculator, ArrowLeft, Send, Save, Building2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

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
import { Item, Warehouse, ItemSchema, WarehouseSchema, UoMSchema } from '@/types/master-data';
import { getAvailableUomsForItem, resolveUomCode } from '@/utils/uom-helper';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { onFormError } from '@/hooks/useFormError';

const lineItemSchema = z.object({
  id: z.string().optional(), // For existing lines
  item_id: z.string().min(1),
  item_name: z.string().optional(),
  item_code: z.string().optional(),
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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<PurchaseRequestFormValues | null>(null);
  const { playSound } = useAudioFeedback();
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());

  const status = initialData?.status as DocumentStatus;
  const isLocked = isDocumentLocked('PR', status);

  // Mocks/Hooks for data selection
  const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);
  const { data: itemsData } = useMasterDataList('items', ItemSchema);
  const { data: uomsData } = useMasterDataList('units-of-measure', UoMSchema);

  const createPR = useCreatePR();
  const updatePR = useUpdatePR({ onConflict });
  const submitPR = useSubmitPR({ onConflict });

  const form = useForm<PurchaseRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      department_id: initialData.departmentId,
      expected_date: initialData.expectedDate.split('T')[0],
      notes: initialData.notes || '',
      lines: initialData.lines.map(l => ({
        id: l.id,
        item_id: l.item.id,
        item_name: l.item.name,
        item_code: l.item.code,
        req_qty: l.reqQty,
        uom_id: l.uomId,
      })),
    } : {
      department_id: '',
      expected_date: new Date().toISOString().split('T')[0],
      notes: '',
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const handleScan = (barcode: string) => {
    const item = itemsData?.data?.find((i: Item) => i.barcode === barcode || i.code === barcode);
    if (item) {
      append({
        item_id: item.id,
        item_name: item.name,
        item_code: item.code,
        req_qty: 1,
        uom_id: item.primaryUom?.id || 'EA',
      });
      playSound('success');
      toast.success(tc('items') + ': ' + item.name);
    } else {
      playSound('error');
      toast.error(tc('not_found'));
    }
  };

  const onSave = async (values: PurchaseRequestFormValues, submitAfterSave = false) => {
    setIsSubmitting(true);
    try {
      let prId = initialData?.id;

      const selectedWh = warehouses?.data?.find((w: Warehouse) => w.id === values.department_id);
      const branchId = selectedWh?.branchId || '';

      const payload = {
        branchId,
        warehouseId: values.department_id,
        notes: values.notes || '',
        lines: values.lines.map(l => ({
          id: l.id,
          itemId: l.item_id,
          quantity: l.req_qty,
          uomId: l.uom_id,
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

      router.push('/purchase-requests');
    } catch (error) {
      console.error(error);
      playSound('error');
      const isToastShown = error && typeof error === 'object' && (error as Record<string, unknown>)._isToastShown === true;
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => onSave(v, false), onFormError)} className="w-full flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-title-lg font-semibold text-operational-cyan uppercase">{t('detail_title')}</h3>
          {initialData?.documentNumber && (
            <span className="font-mono text-label-sm font-semibold text-muted-foreground/40">
              {initialData.documentNumber}
            </span>
          )}
        </div>

        {/* Step 1: Request Header */}
        <div className="bg-card border border-border shadow-sm p-8 rounded-[2rem] relative">
          <div className="flex items-center gap-4 mb-8 pb-6 border-none">
            <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-body-md font-semibold uppercase text-foreground">{t('new_intent')}</h3>
              <p className="text-label-xs font-bold text-muted-foreground/60 uppercase mt-0.5">{t('specification')}</p>
            </div>
          </div>


          <FormField<PurchaseRequestFormValues, 'department_id'>
            control={form.control}
            name="department_id"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-4 w-full">
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2 ps-1">
                  <Package className="w-3 h-3" />
                  {t('department')}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.department_id ? "border-red-500 focus:ring-red-500" : ""}>
                      <SelectValue placeholder={tc('select_warehouse')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses?.data?.map((w: Warehouse) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-500 mt-1" />
              </FormItem>
            )}
          />

          <FormField<PurchaseRequestFormValues, 'expected_date'>
            control={form.control}
            name="expected_date"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-4 w-full">
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2 ps-1">
                  <Calendar className="w-3 h-3" />
                  {t('expected_date')}
                </FormLabel>
                <FormControl>
                  <Input type="date" className={form.formState.errors.expected_date ? "border-red-500 focus:ring-red-500" : ""} {...field} disabled={isLocked} />
                </FormControl>
                <FormMessage className="text-xs text-red-500 mt-1" />
              </FormItem>
            )}
          />

          <FormField<PurchaseRequestFormValues, 'notes'>
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-4 w-full">
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ps-1 block">{tc('notes')}</FormLabel>
                <FormControl>
                  <Input placeholder={tc('notes')} className={form.formState.errors.notes ? "border-red-500 focus:ring-red-500" : ""} {...field} disabled={isLocked} />
                </FormControl>
                <FormMessage className="text-xs text-red-500 mt-1" />
              </FormItem>
            )}
          />

        </div>

        {/* Step 2: Line Items */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-status-warning/10 text-status-warning">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('items')}</h3>
                <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">{t('specification')}</p>
              </div>
            </div>

            <div className="flex-1 max-w-md">
              <ScanInput
                onScan={handleScan}
                placeholder={tc('select_item')}
                className="h-12"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              onClick={() => append({ item_id: '', item_name: '', item_code: '', req_qty: 1, uom_id: 'EA' })}
            >
              <Plus className="h-3.5 w-3.5 me-2" />
              {tc('create')}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-6 items-end bg-card border border-border shadow-sm p-6 rounded-md group hover:bg-muted dark:hover:bg-neutral-900 transition-all">
                <FormField<PurchaseRequestFormValues, `lines.${number}.item_id`>
                  control={form.control}
                  name={`lines.${index}.item_id`}
                  render={({ field: inputField }) => (
                    <FormItem className="col-span-1 md:col-span-5 w-full">
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{tc('item')}</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          const item = itemsData?.data?.find((i: Item) => i.id === val);
                          form.setValue(`lines.${index}.item_id`, val as string);
                          form.setValue(`lines.${index}.item_name`, item?.name);
                          form.setValue(`lines.${index}.item_code`, item?.code);
                          form.setValue(`lines.${index}.uom_id`, item?.primaryUom?.id || 'EA');
                        }}
                        value={inputField.value}
                      >
                        <FormControl>
                          <SelectTrigger className={form.formState.errors.lines?.[index]?.item_id ? "border-red-500 focus:ring-red-500" : ""}>
                            <SelectValue placeholder={tc('select_item')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {itemsData?.data?.map((i: Item) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.code} - {i.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-red-500 mt-1" />
                    </FormItem>
                  )}
                />

                <FormField<PurchaseRequestFormValues, `lines.${number}.req_qty`>
                  control={form.control}
                  name={`lines.${index}.req_qty`}
                  render={({ field: inputField }) => (
                    <FormItem className="col-span-1 md:col-span-3 w-full">
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('requested_qty')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className={form.formState.errors.lines?.[index]?.req_qty ? "border-red-500 focus:ring-red-500" : ""}
                          dir="ltr"
                          {...inputField}
                          onChange={(e) => inputField.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500 mt-1" />
                    </FormItem>
                  )}
                />

                <FormField<PurchaseRequestFormValues, `lines.${number}.uom_id`>
                  control={form.control}
                  name={`lines.${index}.uom_id`}
                  render={({ field: inputField }) => {
                    const currentItemId = form.watch(`lines.${index}.item_id`);
                    const currentItem = itemsData?.data?.find((i: Item) => i.id === currentItemId);
                    const availableUoms = getAvailableUomsForItem(currentItem);
                    const resolvedCode = resolveUomCode(inputField.value, currentItem, uomsData?.data);

                    if (availableUoms.length <= 1) {
                      return (
                        <FormItem className="col-span-1 md:col-span-3 w-full">
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{tc('uom')}</FormLabel>
                          <FormControl>
                            <Input disabled className="opacity-50 cursor-not-allowed w-full h-10 font-bold uppercase" value={resolvedCode} readOnly />
                          </FormControl>
                          <FormMessage className="text-xs text-red-500 mt-1" />
                        </FormItem>
                      );
                    }

                    return (
                      <FormItem className="col-span-1 md:col-span-3 w-full">
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{tc('uom')}</FormLabel>
                        <Select onValueChange={inputField.onChange} value={inputField.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={resolvedCode}>{resolvedCode}</SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableUoms.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.code}{u.name && u.name !== u.code ? ` (${u.name})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs text-red-500 mt-1" />
                      </FormItem>
                    );
                  }}
                />

                <div className="col-span-12 md:col-span-1 flex justify-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="py-12 border-2 border-dashed border-surface-variant/10 rounded-3xl flex flex-col items-center justify-center text-muted-foreground/20 italic text-label-xs font-semibold uppercase">
                {tc('no_items')}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-card border border-border shadow-sm rounded-[2rem]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-operational-cyan" />
              </div>
              <div>
                <div className="text-label-xs font-semibold uppercase text-muted-foreground/30">{tc('items')}</div>
                <div className="text-body-md font-semibold text-foreground">{fields.length} {tc('items')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="w-full flex items-center justify-end gap-4 mt-8 pt-4 border-t border-border">
          <Button
            variant="ghost"
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="h-10 px-8 text-label-xs font-semibold uppercase rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all text-muted-foreground"
          >
            {tc('cancel')}
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting || createPR.isPending || updatePR.isPending}
            variant="outline"
            className="h-10 px-8 bg-transparent border border-border text-foreground text-label-xs font-semibold uppercase rounded-md hover:bg-muted dark:hover:bg-neutral-900 transition-all shadow-sm"
          >
            <Save className="w-4 h-4 me-2" />
            {tc('save')}
          </Button>
          <Button
            type="button"
            isLoading={isSubmitting || submitPR.isPending}
            onClick={form.handleSubmit(handleSubmitClick, onFormError)}
            className="h-10 px-8 bg-brand-gold hover:bg-brand-gold-hover text-white text-label-xs font-semibold uppercase rounded-md transition-all shadow-sm focus-visible:ring-1 focus-visible:ring-brand-gold"
          >
            <Send className="w-4 h-4 me-2" />
            {t('submit')}
          </Button>
        </div>
      </form>
      <PostConfirmDialog
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        onConfirm={() => { if (pendingValues) onSave(pendingValues, true); }}
        title={t('submit')}
        description={t('approve_confirm_desc')}
        warningText={t('irreversible')}
      />
    </Form>
  );
}

"use client";

import * as React from "react";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";

import { useTranslations, useLocale } from "next-intl";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRightLeft, Plus, Trash2, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { useMasterDataList } from "@/features/master-data/hooks/useMasterDataCRUD";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { Item } from "@/types/master-data";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePO } from "@/features/purchasing/hooks/useCreatePO";
import { useUpdatePO } from "@/features/purchasing/hooks/useUpdatePO";
import { PODetail } from "@/features/purchasing/hooks/usePO";
import { useSuppliers } from "@/features/purchasing/hooks/useSuppliers";
import { useCurrencies } from "@/features/purchasing/hooks/useCurrencies";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useFXRates } from "@/features/purchasing/hooks/useFXRates";
import { useAdminSettings } from "@/features/admin/hooks/useAdminSettings";
import { formatCurrency } from "@/utils/currency";


import { DocumentLockBanner, DocumentLockWrapper } from "@/components/shared/DocumentLockBanner";
import { FormFooter } from "@/components/shared/FormFooter";
import { isDocumentLocked, type DocumentStatus } from "@/core/workflow/document-engine";
import { PO_STATUS } from "@/contracts/statuses";

const lineItemSchema = z.object({
  item_id: z.string().min(1),
  item_name: z.string().optional(),
  item_code: z.string().optional(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  uom_id: z.string().min(1),
  notes: z.string().optional(),
});

const formSchema = z.object({
  supplier_id: z.string().min(1),
  pr_id: z.string().optional(),
  currency_code: z.string().min(1),
  exchange_rate: z.number().min(0.0001),
  expected_date: z.string().min(1),
  target_warehouse_id: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineItemSchema).min(1),
});

type PurchaseOrderFormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  initialData?: PODetail;
  mode?: "create" | "edit";
  onConflict?: () => void;
  actions?: React.ReactNode;
}

export function PurchaseOrderForm({ initialData, mode = "create", onConflict, actions }: PurchaseOrderFormProps) {
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: initialData?.supplier_id || "",
      pr_id: initialData?.pr_id || "",
      currency_code: initialData?.currency_code || "",
      exchange_rate: initialData?.exchange_rate || 1,
      expected_date: initialData?.expected_date || "",
      target_warehouse_id: initialData?.target_warehouse_id || "",
      notes: initialData?.notes || "",
      lines: initialData?.lines.map(l => ({
        item_id: l.item?.id || "",
        item_name: locale === 'ar' ? l.item?.name_ar : l.item?.name_en,
        item_code: l.item?.code || "",
        quantity: l.quantity,
        unit_price: l.unit_price,
        uom_id: l.uom_id,
        notes: l.notes || ""
      })) || [{ item_id: "", item_name: "", item_code: "", quantity: 1, unit_price: 0, uom_id: "PCS", notes: "" }]
    },
  });

  const { router } = useUnsavedChangesGuard(form.formState.isDirty);

  const locale = useLocale();
  const t = useTranslations("procurement.po");
  const tc = useTranslations("common");
  
  const createMutation = useCreatePO();
  const updateMutation = useUpdatePO(initialData?.id || "", { onConflict });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const lines = useWatch({
    control: form.control,
    name: "lines",
  });
  const currency = useWatch({
    control: form.control,
    name: "currency_code",
  });
  const rate = useWatch({
    control: form.control,
    name: "exchange_rate",
  });

  const { data: itemsData } = useMasterDataList<Item>('items');

  const handleScan = async (barcode: string) => {
    const item = itemsData?.data?.find(i => i.code === barcode || i.barcode === barcode);
    if (item) {
      const currentLines = form.getValues('lines');
      const existingIndex = currentLines.findIndex(l => l.item_id === item.id);
      
      if (existingIndex >= 0) {
        const qty = currentLines[existingIndex].quantity + 1;
        form.setValue(`lines.${existingIndex}.quantity`, qty);
        toast.success(tc('item_added_quantity_updated', { name: locale === 'ar' ? item.name_ar : item.name_en }));
      } else {
        append({
          item_id: item.id,
          item_name: locale === 'ar' ? item.name_ar : item.name_en,
          item_code: item.code,
          quantity: 1,
          unit_price: item.last_purchase_price || 0,
          uom_id: item.primary_uom?.id || 'PCS',
          notes: ''
        });
        toast.success(tc('item_added', { name: locale === 'ar' ? item.name_ar : item.name_en }));
      }
    } else {
      toast.error(tc('item_not_found'));
    }
  };

  const supplierTotalAmount = lines.reduce((sum, line) => sum + ((line.quantity || 0) * (line.unit_price || 0)), 0);
  const baseTotalAmount = supplierTotalAmount * (rate || 1);

  // Workflow Integration
  const status = (initialData?.status || PO_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('PO', status);


  async function onSubmit(values: PurchaseOrderFormValues) {
    try {
      if (mode === "edit" && initialData) {
        await updateMutation.mutateAsync({ ...values, version: initialData.version ?? 0 });
        toast.success(t("edit_success"));
      } else {
        if (!currencies || currencies.length === 0) {
          toast.error(t('errors.no_currencies_available'));
          return;
        }
        const result = await createMutation.mutateAsync(values);
        toast.success(t("submit_success"));
        router.push(`/purchase-orders/${result.id}`, { skipGuard: true });

      }
    } catch (error) {
      console.error(error);
      toast.error(tc("error_occurred"));
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies();
  const { data: warehouses, isLoading: loadingWarehouses } = useWarehouses();

  const { data: settings, isLoading: loadingSettings } = useAdminSettings();
  const baseCurrency = settings?.base_currency;
  const { data: fxRates } = useFXRates(currency, baseCurrency || 'SAR');
  
  React.useEffect(() => {
    if (fxRates?.[0]?.rate && !initialData) {
      form.setValue("exchange_rate", fxRates[0].rate);
    }
  }, [fxRates, form, initialData]);

  if (loadingSuppliers || loadingCurrencies || loadingWarehouses || loadingSettings) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-surface-container-low rounded-3xl" />
        <div className="h-96 bg-surface-container-low rounded-3xl" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 w-full min-h-screen bg-surface-container-low flex flex-col pb-32">
        <DocumentLockBanner isLocked={isLocked} status={status} />

        <div className="px-8 pt-8">
          <div className="bg-surface-container-lowest p-8 rounded-[2rem] relative shadow-2xl shadow-black/5">
            <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-6 mb-6">
              <h3 className="text-title-lg font-semibold text-operational-cyan uppercase">
                {isLocked ? t('detail_title') : (mode === "edit" ? t('specification') : t('new_intent'))}
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-operational-cyan/5 text-operational-cyan rounded-full text-label-xs font-semibold uppercase">{/* i18n-ignore */}PO_ENGINE_V2</span>
                {initialData?.document_number && (
                  <span className="px-3 py-1 bg-surface-container-high text-muted-foreground rounded-full text-label-xs font-mono font-bold uppercase tracking-tight">
                    {initialData.document_number}
                  </span>
                )}
              </div>
            </div>

            <DocumentLockWrapper isLocked={isLocked}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('supplier')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                        <FormControl>
                          <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
                            <SelectValue placeholder={t('select_supplier')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface-container-low border-none rounded-xl">
                          {suppliers?.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {locale === 'ar' ? s.name_ar : s.name_en} ({s.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pr_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('linked_pr')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('linked_pr_placeholder')} disabled={isLocked} className="bg-surface-container-low uppercase font-mono border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('expected_date')}</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={isLocked} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_warehouse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('target_warehouse')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                        <FormControl>
                          <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
                            <SelectValue placeholder={t('select_warehouse')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface-container-low border-none rounded-xl">
                          {warehouses?.map(w => (
                            <SelectItem key={w.id} value={w.id}>
                              {locale === 'ar' ? w.nameAr : w.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-surface-container-high/50 mt-4">
                <FormField
                  control={form.control}
                  name="currency_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('supplier_currency')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                        <FormControl>
                          <SelectTrigger className="bg-surface-container-low border-none font-mono h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30">
                            <SelectValue placeholder={t('currency_placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-surface-container-low border-none rounded-xl">
                          {currencies?.map(c => (
                            <SelectItem key={c.id} value={c.code}>
                              {c.code} — {c[(`name_${locale}` as keyof typeof c)]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exchange_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('fx_rate')}</FormLabel>
                      <div className="relative">
                        <ArrowRightLeft className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground/40" />
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.0001" 
                            min="0" 
                            disabled={isLocked}
                            className="bg-surface-container-low border-none h-11 ps-10 rounded-xl focus-visible:ring-operational-cyan/30" 
                            dir="ltr" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3 text-start">
                      <FormLabel className="text-muted-foreground/40 text-label-xs uppercase font-semibold">{t('general_notes')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('notes_placeholder')} disabled={isLocked} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-surface-container-low/20 p-6 rounded-[1.5rem] border border-surface-container-high/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-operational-cyan/10 rounded-2xl flex items-center justify-center text-operational-cyan">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('items')}</h3>
                      <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">{t('specification')}</p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex-1 max-w-2xl">
                      <ScanInput
                        onScan={handleScan}
                        onManualTrigger={() => append({ item_id: "", item_name: "", item_code: "", quantity: 1, unit_price: 0, uom_id: "PCS", notes: "" })}
                        placeholder={tc('select_item')}
                        size="lg"
                        label={t('scan_or_search')}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="text-title-lg font-semibold uppercase flex items-center gap-3">
                    <span className="w-2 h-2 bg-operational-cyan rounded-full" />
                    {t('line_items')}
                  </h3>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-6 items-end bg-surface-container-low/40 p-6 rounded-2xl border border-surface-container-high/20 transition-all hover:bg-surface-container-high/60 group relative">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.item_id`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/30 mb-2">{tc('item')}</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                const item = itemsData?.data?.find(i => i.id === val);
                                if (item) {
                                  form.setValue(`lines.${index}.item_id`, item.id);
                                  form.setValue(`lines.${index}.item_name`, locale === 'ar' ? item.name_ar : item.name_en);
                                  form.setValue(`lines.${index}.item_code`, item.code);
                                  form.setValue(`lines.${index}.uom_id`, item.primary_uom?.id || 'PCS');
                                  form.setValue(`lines.${index}.unit_price`, item.last_purchase_price || 0);
                                }
                              }}
                              value={inputField.value}
                              disabled={isLocked}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl focus:ring-1 focus:ring-operational-cyan/30 text-label-xs font-bold uppercase overflow-hidden">
                                  <SelectValue placeholder={tc('select_item')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-surface-container-low border-none rounded-2xl max-h-[300px]">
                                {itemsData?.data?.map((i: Item) => (
                                  <SelectItem key={i.id} value={i.id} className="text-label-xs font-bold">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-foreground">{locale === 'ar' ? i.name_ar : i.name_en}</span>
                                      <span className="text-[10px] text-muted-foreground font-mono">{i.code}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lines.${index}.quantity`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/30 mb-2">{t('quantity')}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                disabled={isLocked}
                                className="bg-surface-container-low font-mono border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30 text-label-xs font-bold" 
                                dir="ltr" 
                                {...inputField} 
                                onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lines.${index}.uom_id`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/30 mb-2">{tc('uom')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('uom_placeholder')} disabled className="bg-surface-container-high/10 border-none h-11 rounded-xl font-mono uppercase text-label-xs font-bold opacity-50" {...inputField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lines.${index}.unit_price`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/30 mb-2">{t('unit_price')} ({currency})</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                disabled={isLocked}
                                className="bg-surface-container-low font-mono border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30 text-label-xs font-bold" 
                                dir="ltr" 
                                {...inputField} 
                                onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lines.${index}.notes`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormLabel className="text-label-xxs font-semibold uppercase text-muted-foreground/30 mb-2">{t('line_notes')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('notes_placeholder')} disabled={isLocked} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30 text-label-xs font-bold" {...inputField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {!isLocked && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="mb-[1px] text-muted-foreground/30 hover:text-status-error hover:bg-status-error/10 h-11 w-11 transition-colors rounded-xl"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-10 flex flex-col md:flex-row justify-end gap-6">
                  <div className="bg-surface-container-high/20 px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px]">
                    <span className="text-label-xs uppercase font-semibold text-muted-foreground/40">{t('supplier_total')}</span>
                    <span className="text-title-lg font-mono font-semibold text-foreground" dir="ltr">
                      {formatCurrency(supplierTotalAmount, currency, locale as 'ar' | 'en')}
                    </span>
                  </div>
                  <div className="bg-operational-cyan/[0.03] px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px] backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 start-0 w-1 h-full bg-operational-cyan/20" />
                    <span className="text-label-xs uppercase font-semibold text-operational-cyan/60">{t('base_total')}</span>
                    <span className="text-headline-lg font-mono font-semibold text-operational-cyan" dir="ltr">
                      {formatCurrency(baseTotalAmount, baseCurrency || 'SAR', locale as 'ar' | 'en')}
                    </span>
                  </div>
                </div>
              </div>
            </DocumentLockWrapper>
          </div>
        </div>

        <FormFooter 
          isLocked={isLocked}
          onCancel={() => router.push('/purchase-orders', { skipGuard: !form.formState.isDirty })}
          onSubmit={form.handleSubmit(onSubmit)}
          isPending={isSubmitting}
          submitLabel={mode === "edit" ? tc('save') : t('actions.submit')}
          actions={actions}
        />
      </form>
    </Form>
  );
}
